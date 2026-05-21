'use client'

/**
 * Phase 2b.20 — Workflow wizard.
 *
 * Linear step-by-step builder. Output → `graph_json` compatible with
 * the engine + the existing XYFlow canvas. Saves via the 2b.19 CRUD
 * API at POST /api/automations.
 *
 * Designed for the "happy path" Toffee wants for first-launch
 * practices: pick a trigger, set the first reply, optionally add a
 * follow-up after a wait, set what happens when the patient replies,
 * and decide whether to respect quiet hours. Anything more complex
 * (branching, multiple stages, conditional nodes) drops into the
 * Advanced canvas which is unchanged.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { authFetch } from '@/lib/auth-fetch'

type TriggerType =
  | 'inbound_sms'
  | 'inbound_whatsapp'
  | 'form_submitted'
  | 'google_lead_form_submitted'

type ChannelType = 'sms' | 'whatsapp' | 'email'

type ActionKind = 'send_ai_reply' | 'send_sms' | 'send_whatsapp' | 'send_email'

interface WizardActionConfig {
  kind: ActionKind
  channel?: ChannelType
  body?: string
  subject?: string
  tone_override?: string
  fallback_template?: string
}

interface WizardState {
  name: string
  description: string
  trigger: TriggerType
  firstAction: WizardActionConfig
  waitMinutes: number
  followUp: WizardActionConfig | null
  onPatientReply: 'stop' | 'ai_continue'
  respectQuietHours: boolean
  publishImmediately: boolean
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  inbound_sms: 'Inbound SMS',
  inbound_whatsapp: 'Inbound WhatsApp',
  form_submitted: 'Web form submitted',
  google_lead_form_submitted: 'Google Lead Form submitted',
}

const ACTION_LABELS: Record<ActionKind, string> = {
  send_ai_reply: 'AI-drafted reply (uses Practice Brain)',
  send_sms: 'Static SMS',
  send_whatsapp: 'Static WhatsApp',
  send_email: 'Static email',
}

function defaultAction(): WizardActionConfig {
  return { kind: 'send_ai_reply', channel: 'sms' }
}

function actionToNode(
  key: string,
  cfg: WizardActionConfig,
  next: string | null
): Record<string, unknown> {
  if (cfg.kind === 'send_ai_reply') {
    return {
      key,
      type: 'send_ai_reply',
      config: {
        channel: cfg.channel ?? 'sms',
        tone_override: cfg.tone_override || undefined,
        fallback_template: cfg.fallback_template || undefined,
      },
      next,
    }
  }
  return {
    key,
    type: cfg.kind,
    config: {
      subject: cfg.subject || undefined,
      body: cfg.body || '',
    },
    next,
  }
}

function buildGraph(state: WizardState): { start_key: string; nodes: Array<Record<string, unknown>> } {
  const nodes: Array<Record<string, unknown>> = []
  nodes.push({ key: 'trigger', type: 'trigger', next: 'a1' })
  if (state.followUp && state.waitMinutes > 0) {
    nodes.push(actionToNode('a1', state.firstAction, 'wait1'))
    nodes.push({
      key: 'wait1',
      type: 'wait',
      config: { duration: state.waitMinutes, unit: 'minutes' },
      next: 'a2',
    })
    nodes.push(actionToNode('a2', state.followUp, 'done'))
  } else {
    nodes.push(actionToNode('a1', state.firstAction, 'done'))
  }
  nodes.push({ key: 'done', type: 'end' })
  return { start_key: 'trigger', nodes }
}

function categoryFor(trigger: TriggerType): string {
  return 'marketing'
}

export function WorkflowWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [state, setState] = useState<WizardState>({
    name: '',
    description: '',
    trigger: 'inbound_sms',
    firstAction: defaultAction(),
    waitMinutes: 0,
    followUp: null,
    onPatientReply: 'stop',
    respectQuietHours: false,
    publishImmediately: false,
  })

  const graphPreview = useMemo(() => buildGraph(state), [state])

  async function save() {
    if (submitting) return
    if (!state.name.trim()) {
      toast.error('Give your automation a name')
      return
    }
    setSubmitting(true)
    try {
      const res = await authFetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.name.trim(),
          description: state.description.trim() || null,
          category: categoryFor(state.trigger),
          trigger_type: state.trigger,
          trigger_config: {},
          graph_json: graphPreview,
          workflow_config: {
            on_patient_reply: state.onPatientReply,
            respect_quiet_hours: state.respectQuietHours,
          },
          tags: ['wizard'],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.message ?? 'Failed to save automation')
        return
      }
      const { automation_id } = (await res.json()) as { automation_id: string }

      if (state.publishImmediately) {
        const pubRes = await authFetch(`/api/automations/${automation_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        })
        if (!pubRes.ok) {
          toast.warning('Saved as draft (publish failed — toggle it on later from the list)')
        } else {
          toast.success('Automation is live')
        }
      } else {
        toast.success('Saved as draft')
      }
      router.push(`/automations/${automation_id}`)
    } catch (err) {
      console.error(err)
      toast.error('Save crashed — try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-testid="workflow-wizard">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Build an automation</h1>
        <p className="text-sm text-gray-600">
          Step {step} of 4. Plain English, no graphs.
        </p>
      </header>

      {step === 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">When should this start?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setState({ ...state, trigger: t })}
                className={`text-left rounded-lg border p-4 transition ${
                  state.trigger === t ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{TRIGGER_LABELS[t]}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setStep(2)}>Next</Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">What's the first message?</h2>
          <ActionEditor
            value={state.firstAction}
            onChange={(a) => setState({ ...state, firstAction: a })}
          />
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>Next</Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Follow up if no reply?</h2>
          <div className="flex items-center gap-3">
            <input
              id="followup-toggle"
              type="checkbox"
              checked={state.followUp !== null}
              onChange={(e) =>
                setState({
                  ...state,
                  followUp: e.target.checked ? defaultAction() : null,
                  waitMinutes: e.target.checked && state.waitMinutes === 0 ? 60 * 24 * 2 : state.waitMinutes,
                })
              }
            />
            <Label htmlFor="followup-toggle">Yes — send a follow-up after a wait</Label>
          </div>
          {state.followUp !== null && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="w-24">Wait</Label>
                <Input
                  type="number"
                  min={1}
                  value={state.waitMinutes}
                  onChange={(e) =>
                    setState({ ...state, waitMinutes: Math.max(1, Number(e.target.value || 0)) })
                  }
                  className="w-32"
                />
                <span className="text-sm text-gray-600">minutes</span>
              </div>
              <ActionEditor
                value={state.followUp}
                onChange={(a) => setState({ ...state, followUp: a })}
              />
            </div>
          )}
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)}>Next</Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Behaviour</h2>
            <div className="space-y-3 text-sm">
              <div>
                <Label>When the patient replies…</Label>
                <div className="flex gap-3 mt-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={state.onPatientReply === 'stop'}
                      onChange={() => setState({ ...state, onPatientReply: 'stop' })}
                    />
                    Stop (a human takes over)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={state.onPatientReply === 'ai_continue'}
                      onChange={() => setState({ ...state, onPatientReply: 'ai_continue' })}
                    />
                    Continue with AI
                  </label>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state.respectQuietHours}
                    onChange={(e) => setState({ ...state, respectQuietHours: e.target.checked })}
                  />
                  Respect Practice Brain opening hours (wait for next opening before sending)
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              value={state.name}
              onChange={(e) => setState({ ...state, name: e.target.value })}
              placeholder="e.g. SMS reply for new enquiries"
            />
            <Label htmlFor="wf-desc" className="pt-2">Description (optional)</Label>
            <Textarea
              id="wf-desc"
              value={state.description}
              onChange={(e) => setState({ ...state, description: e.target.value })}
              rows={2}
            />
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={state.publishImmediately}
                onChange={(e) => setState({ ...state, publishImmediately: e.target.checked })}
              />
              Turn it on now (otherwise saved as draft)
            </label>
          </div>

          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(3)} disabled={submitting}>Back</Button>
            <Button onClick={save} disabled={submitting}>
              {submitting ? 'Saving…' : state.publishImmediately ? 'Save and turn on' : 'Save as draft'}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function ActionEditor({
  value,
  onChange,
}: {
  value: WizardActionConfig
  onChange: (v: WizardActionConfig) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Action</Label>
        <select
          className="mt-1 block w-full border rounded h-10 px-2"
          value={value.kind}
          onChange={(e) => onChange({ ...value, kind: e.target.value as ActionKind })}
        >
          {(Object.keys(ACTION_LABELS) as ActionKind[]).map((k) => (
            <option key={k} value={k}>
              {ACTION_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {value.kind === 'send_ai_reply' && (
        <>
          <div>
            <Label>Channel</Label>
            <select
              className="mt-1 block w-full border rounded h-10 px-2"
              value={value.channel ?? 'sms'}
              onChange={(e) => onChange({ ...value, channel: e.target.value as ChannelType })}
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <Label>Tone override (optional)</Label>
            <Textarea
              rows={2}
              value={value.tone_override ?? ''}
              onChange={(e) => onChange({ ...value, tone_override: e.target.value })}
              placeholder="e.g. Be extra warm with first-time enquiries"
            />
          </div>
          <div>
            <Label>Fallback if AI is unavailable (optional)</Label>
            <Textarea
              rows={2}
              value={value.fallback_template ?? ''}
              onChange={(e) => onChange({ ...value, fallback_template: e.target.value })}
              placeholder="e.g. Thanks for your message — we'll be back to you within an hour."
            />
          </div>
        </>
      )}

      {value.kind !== 'send_ai_reply' && (
        <>
          {value.kind === 'send_email' && (
            <div>
              <Label>Subject</Label>
              <Input
                value={value.subject ?? ''}
                onChange={(e) => onChange({ ...value, subject: e.target.value })}
              />
            </div>
          )}
          <div>
            <Label>Message</Label>
            <Textarea
              rows={4}
              value={value.body ?? ''}
              onChange={(e) => onChange({ ...value, body: e.target.value })}
              placeholder="Type the message you want to send."
            />
          </div>
        </>
      )}
    </div>
  )
}

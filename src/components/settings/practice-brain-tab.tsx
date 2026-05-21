'use client'

/**
 * Phase 2b.13 — Practice Brain settings tab.
 *
 * Lives under Settings → AI & Automation → Practice Brain. Reads and
 * writes /api/settings/practice-brain. Every AI feature in the CRM
 * (automations drafter, FAQ responder, pipeline router) reads from
 * what the practice owner saves here.
 */

import { useEffect, useState } from 'react'
import { Brain, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { authFetch } from '@/lib/auth-fetch'

// ---------- Types kept local to the tab; the helper source of truth is
// src/lib/automations/practice-brain.ts (server-side). ----------

interface ServiceOffering {
  name: string
  description?: string | null
}

interface PricingItem {
  service: string
  price: string
  notes?: string | null
}

interface FaqItem {
  question: string
  answer: string
}

interface HoursEntry {
  open: string
  close: string
  closed?: boolean
}

const DAYS: { key: string; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

interface PracticeBrainState {
  brand_voice: string
  practice_description: string
  services_offered: ServiceOffering[]
  pricing: PricingItem[]
  opening_hours: Record<string, HoursEntry>
  faqs: FaqItem[]
  escalation_rules: string
  additional_instructions: string
}

function emptyState(): PracticeBrainState {
  return {
    brand_voice: '',
    practice_description: '',
    services_offered: [],
    pricing: [],
    opening_hours: {},
    faqs: [],
    escalation_rules: '',
    additional_instructions: '',
  }
}

function normaliseHours(
  raw: Record<string, unknown> | null | undefined
): Record<string, HoursEntry> {
  if (!raw) return {}
  const out: Record<string, HoursEntry> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>
      const closed = Boolean(obj.closed)
      out[k] = {
        open: typeof obj.open === 'string' ? obj.open : '09:00',
        close: typeof obj.close === 'string' ? obj.close : '17:00',
        closed,
      }
    }
  }
  return out
}

export function PracticeBrainTab() {
  const [state, setState] = useState<PracticeBrainState>(emptyState())
  const [initial, setInitial] = useState<PracticeBrainState>(emptyState())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadBrain()
  }, [])

  async function loadBrain() {
    setLoading(true)
    try {
      const res = await authFetch('/api/settings/practice-brain', { method: 'GET' })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = (await res.json()) as { brain?: Record<string, unknown> }
      const brain = json.brain ?? {}
      const next: PracticeBrainState = {
        brand_voice: typeof brain.brand_voice === 'string' ? brain.brand_voice : '',
        practice_description:
          typeof brain.practice_description === 'string' ? brain.practice_description : '',
        services_offered: Array.isArray(brain.services_offered)
          ? (brain.services_offered as ServiceOffering[])
          : [],
        pricing: Array.isArray(brain.pricing) ? (brain.pricing as PricingItem[]) : [],
        opening_hours: normaliseHours(brain.opening_hours as Record<string, unknown> | null),
        faqs: Array.isArray(brain.faqs) ? (brain.faqs as FaqItem[]) : [],
        escalation_rules:
          typeof brain.escalation_rules === 'string' ? brain.escalation_rules : '',
        additional_instructions:
          typeof brain.additional_instructions === 'string' ? brain.additional_instructions : '',
      }
      setState(next)
      setInitial(next)
    } catch (err) {
      console.error('[PracticeBrainTab] load failed', err)
      toast.error('Could not load Practice Brain')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await authFetch('/api/settings/practice-brain', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_voice: state.brand_voice || null,
          practice_description: state.practice_description || null,
          services_offered: state.services_offered.filter((s) => s.name?.trim()),
          pricing: state.pricing.filter((p) => p.service?.trim() && p.price?.trim()),
          opening_hours: state.opening_hours,
          faqs: state.faqs.filter((f) => f.question?.trim() && f.answer?.trim()),
          escalation_rules: state.escalation_rules || null,
          additional_instructions: state.additional_instructions || null,
        }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`)
      }

      const json = (await res.json()) as { brain?: Record<string, unknown> }
      if (json.brain) {
        setInitial(state)
        toast.success('Practice Brain saved')
      }
    } catch (err) {
      console.error('[PracticeBrainTab] save failed', err)
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const dirty = JSON.stringify(state) !== JSON.stringify(initial)

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading Practice Brain…</div>
    )
  }

  return (
    <div className="space-y-6" data-testid="practice-brain-tab">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-600" />
          Practice Brain
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          The knowledge hub every AI feature in the CRM reads from. Brand voice,
          services, pricing, opening hours, FAQs, and escalation rules.
          Update once — every drafter, router and responder picks it up
          automatically.
        </p>
      </div>

      {/* Practice description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About the practice</CardTitle>
          <CardDescription>
            One paragraph describing who you are. The AI uses this to set
            context in every reply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={state.practice_description}
            onChange={(e) =>
              setState({ ...state, practice_description: e.target.value })
            }
            placeholder="e.g. We're a family-run dental practice in Manchester, focused on cosmetic dentistry and orthodontics for adults."
          />
        </CardContent>
      </Card>

      {/* Brand voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand voice</CardTitle>
          <CardDescription>
            How should the AI sound when it writes to patients? Tone,
            formality, words you love or hate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={state.brand_voice}
            onChange={(e) => setState({ ...state, brand_voice: e.target.value })}
            placeholder="e.g. Warm, conversational, and reassuring. Never use 'dear sir/madam'. Always sign off as 'The team at Smile Studio'."
          />
        </CardContent>
      </Card>

      {/* Services offered */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Services offered</CardTitle>
          <CardDescription>
            The treatments and services you offer. The AI uses these for
            pipeline routing and replies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.services_offered.map((svc, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder="Service name (e.g. Invisalign)"
                value={svc.name}
                onChange={(e) => {
                  const next = [...state.services_offered]
                  next[idx] = { ...next[idx], name: e.target.value }
                  setState({ ...state, services_offered: next })
                }}
              />
              <Input
                placeholder="Short description (optional)"
                value={svc.description ?? ''}
                onChange={(e) => {
                  const next = [...state.services_offered]
                  next[idx] = { ...next[idx], description: e.target.value }
                  setState({ ...state, services_offered: next })
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove service"
                onClick={() =>
                  setState({
                    ...state,
                    services_offered: state.services_offered.filter((_, i) => i !== idx),
                  })
                }
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setState({
                ...state,
                services_offered: [...state.services_offered, { name: '', description: '' }],
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add service
          </Button>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
          <CardDescription>
            Indicative prices the AI is allowed to quote. Use ranges or
            "from £X" if you want to keep flexibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.pricing.map((row, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder="Service"
                value={row.service}
                onChange={(e) => {
                  const next = [...state.pricing]
                  next[idx] = { ...next[idx], service: e.target.value }
                  setState({ ...state, pricing: next })
                }}
              />
              <Input
                placeholder="Price (e.g. from £350)"
                value={row.price}
                onChange={(e) => {
                  const next = [...state.pricing]
                  next[idx] = { ...next[idx], price: e.target.value }
                  setState({ ...state, pricing: next })
                }}
              />
              <Input
                placeholder="Notes (optional)"
                value={row.notes ?? ''}
                onChange={(e) => {
                  const next = [...state.pricing]
                  next[idx] = { ...next[idx], notes: e.target.value }
                  setState({ ...state, pricing: next })
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove price"
                onClick={() =>
                  setState({
                    ...state,
                    pricing: state.pricing.filter((_, i) => i !== idx),
                  })
                }
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setState({
                ...state,
                pricing: [...state.pricing, { service: '', price: '', notes: '' }],
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add price
          </Button>
        </CardContent>
      </Card>

      {/* Opening hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opening hours</CardTitle>
          <CardDescription>
            Used by the FAQ responder when patients ask "what time are you
            open?" and by quiet-hours logic in automations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const entry: HoursEntry = state.opening_hours[key] ?? {
              open: '09:00',
              close: '17:00',
              closed: false,
            }
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-24 text-sm">{label}</span>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(entry.closed)}
                    onChange={(e) => {
                      const next = { ...state.opening_hours }
                      next[key] = { ...entry, closed: e.target.checked }
                      setState({ ...state, opening_hours: next })
                    }}
                  />
                  Closed
                </label>
                <Input
                  type="time"
                  value={entry.open}
                  disabled={Boolean(entry.closed)}
                  className="w-32"
                  onChange={(e) => {
                    const next = { ...state.opening_hours }
                    next[key] = { ...entry, open: e.target.value }
                    setState({ ...state, opening_hours: next })
                  }}
                />
                <span className="text-sm text-gray-500">to</span>
                <Input
                  type="time"
                  value={entry.close}
                  disabled={Boolean(entry.closed)}
                  className="w-32"
                  onChange={(e) => {
                    const next = { ...state.opening_hours }
                    next[key] = { ...entry, close: e.target.value }
                    setState({ ...state, opening_hours: next })
                  }}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frequently asked questions</CardTitle>
          <CardDescription>
            The FAQ responder will reply to patient questions matching these.
            Keep answers patient-friendly and final — they'll be sent as-is
            unless the AI rewrites them in your brand voice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.faqs.map((faq, idx) => (
            <div key={idx} className="space-y-2 border border-gray-200 rounded p-3">
              <div className="flex gap-2 items-start">
                <Label className="w-20 mt-2 text-xs uppercase text-gray-500">
                  Question
                </Label>
                <Input
                  value={faq.question}
                  onChange={(e) => {
                    const next = [...state.faqs]
                    next[idx] = { ...next[idx], question: e.target.value }
                    setState({ ...state, faqs: next })
                  }}
                  placeholder="e.g. Do you take NHS patients?"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Remove FAQ"
                  onClick={() =>
                    setState({
                      ...state,
                      faqs: state.faqs.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
              <div className="flex gap-2 items-start">
                <Label className="w-20 mt-2 text-xs uppercase text-gray-500">
                  Answer
                </Label>
                <Textarea
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => {
                    const next = [...state.faqs]
                    next[idx] = { ...next[idx], answer: e.target.value }
                    setState({ ...state, faqs: next })
                  }}
                  placeholder="e.g. We're a private practice — we don't take NHS patients, but we offer 0% finance over 12 months."
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setState({
                ...state,
                faqs: [...state.faqs, { question: '', answer: '' }],
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add FAQ
          </Button>
        </CardContent>
      </Card>

      {/* Escalation rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Escalation rules</CardTitle>
          <CardDescription>
            When should the AI stop and hand off to a human? List specific
            triggers — e.g. anger, medical urgency, complaint, refund
            requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={state.escalation_rules}
            onChange={(e) => setState({ ...state, escalation_rules: e.target.value })}
            placeholder="e.g. If the patient mentions pain or a dental emergency, stop the AI and notify the duty dentist. If they ask for a refund, escalate to the practice manager."
          />
        </CardContent>
      </Card>

      {/* Additional instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional instructions</CardTitle>
          <CardDescription>
            Anything else the AI should know that doesn't fit above.
            House rules, things to never say, links to share, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={state.additional_instructions}
            onChange={(e) =>
              setState({ ...state, additional_instructions: e.target.value })
            }
            placeholder="e.g. Always mention that consultations are free. Never promise a same-day appointment. Share https://example.com/book for booking."
          />
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between -mx-6">
        <div className="text-xs text-gray-500">
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </div>
        <Button onClick={save} disabled={!dirty || saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving…' : 'Save Practice Brain'}
        </Button>
      </div>
    </div>
  )
}

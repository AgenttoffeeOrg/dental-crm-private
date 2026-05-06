'use client'

/**
 * Phase 2a.3 — Booking widget settings form.
 *
 * Loads the tenant's widget config, renders three sections (General /
 * Treatments / Paths & Branding), and PATCHes changes back. Includes the
 * embed-code generator (script snippet + landing URL with copy buttons)
 * and the live preview pane that mounts <BookingWidget> inline.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Copy, Check, RotateCcw, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { authFetch } from '@/lib/auth-fetch'
import { BookingWidget } from '@/components/booking-widget/booking-widget'
import type { PublicWidgetConfig } from '@/lib/booking-widget/types'
import type { AdminWidgetRow, AdminTreatmentOffering } from './types'

interface ApiResponse {
  widget: AdminWidgetRow
  available_offerings: AdminTreatmentOffering[]
}

const SECTION_KEYS = ['general', 'treatments', 'paths', 'branding'] as const
type SectionKey = (typeof SECTION_KEYS)[number]

function buildPublicConfigFromAdminRow(
  row: AdminWidgetRow,
  offerings: AdminTreatmentOffering[]
): PublicWidgetConfig {
  const byId = new Map(offerings.map((o) => [o.id, o]))
  const treatments = (row.treatment_options ?? [])
    .map((opt) => {
      const off = byId.get(opt.offering_id)
      if (!off) return null
      return {
        offering_id: off.id,
        label: off.custom_label ?? off.treatment_type?.display_name ?? 'Treatment',
        category: off.treatment_type?.category ?? null,
        treatment_key: off.treatment_type?.key ?? null,
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  const meta = row.metadata ?? {}
  const triggerMeta = meta.trigger ?? {}
  const webformMeta = meta.webform ?? {}
  const whatsappMeta = meta.whatsapp ?? {}
  const themeMeta = meta.theme ?? {}

  const pathsEnabled: PublicWidgetConfig['paths_enabled'] = []
  if (row.enable_calendar && row.calendar_redirect_url) pathsEnabled.push('calendar')
  if (row.enable_webform) pathsEnabled.push('webform')
  if (row.enable_whatsapp && row.whatsapp_phone_e164) pathsEnabled.push('whatsapp')

  return {
    widget_id: row.id,
    slug: row.slug,
    practice_name: row.display_name,
    greeting_title: row.greeting_title || 'How can we help you today?',
    greeting_subtitle: row.greeting_subtitle ?? null,
    success_message: row.success_message || "Thanks — we'll be in touch shortly.",
    treatments,
    paths_enabled: pathsEnabled,
    webform: {
      kind: row.webform_kind,
      redirect_url: row.webform_redirect_url,
      open_in_new_tab: row.webform_open_in_new_tab,
      button_label: row.webform_button_label,
      fields:
        Array.isArray(webformMeta.fields) && webformMeta.fields.length > 0
          ? (webformMeta.fields as PublicWidgetConfig['webform']['fields'])
          : [
              { name: 'full_name', label: 'Your name', required: true, type: 'text' },
              { name: 'email', label: 'Email', required: true, type: 'email' },
              { name: 'phone', label: 'Phone', required: true, type: 'tel' },
            ],
      consent_text: webformMeta.consent_text ?? null,
      consent_required: Boolean(webformMeta.consent_required),
    },
    calendar: {
      redirect_url: row.calendar_redirect_url,
      button_label: row.calendar_button_label,
      interstitial_message: row.calendar_interstitial_message,
      interstitial_duration_ms: row.calendar_interstitial_duration_ms,
      capture: {
        full_name: row.calendar_capture_full_name,
        email: row.calendar_capture_email,
        phone: row.calendar_capture_phone,
      },
      consent_text: row.calendar_consent_text,
    },
    whatsapp: {
      phone_e164: row.whatsapp_phone_e164,
      button_label: row.whatsapp_button_label,
      prefill_template: whatsappMeta.prefill_template ?? row.whatsapp_prefilled_message_template ?? null,
    },
    theme: {
      primary_color: themeMeta.primary_color ?? row.brand_primary_color ?? '#0ea5e9',
      text_color: row.brand_text_color ?? '#FFFFFF',
      logo_url: themeMeta.logo_url ?? row.brand_logo_url ?? null,
      hero_image_url: themeMeta.hero_image_url ?? null,
      font_family: row.brand_font_family ?? null,
    },
    trigger: {
      mode: ((triggerMeta.mode ?? 'button') as PublicWidgetConfig['trigger']['mode']),
      position: ((triggerMeta.position ?? 'bottom-right') as PublicWidgetConfig['trigger']['position']),
      button_label: triggerMeta.button_label ?? 'Book a consultation',
    },
  }
}

interface DraftPatch {
  display_name?: string
  is_active?: boolean
  greeting_title?: string
  greeting_subtitle?: string | null
  success_message?: string

  treatment_options?: AdminWidgetRow['treatment_options']

  enable_calendar?: boolean
  calendar_redirect_url?: string | null
  enable_webform?: boolean
  webform_consent_text?: string | null
  webform_consent_required?: boolean
  webform_fields?: Array<{ name: string; label: string; required: boolean; type?: string }>
  enable_whatsapp?: boolean
  whatsapp_phone_e164?: string | null
  whatsapp_prefilled_message_template?: string | null

  brand_primary_color?: string
  brand_logo_url?: string | null

  trigger_mode?: 'button' | 'auto' | 'inline' | 'manual'
  trigger_position?: 'bottom-right' | 'bottom-left'
  trigger_button_label?: string
}

export function WidgetSettingsForm() {
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [widget, setWidget] = useState<AdminWidgetRow | null>(null)
  const [offerings, setOfferings] = useState<AdminTreatmentOffering[]>([])
  const [draft, setDraft] = useState<DraftPatch>({})
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<SectionKey>('general')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/settings/booking-widget')
      const data = await res.json().catch(() => ({}))
      if (res.status === 403) {
        setPermissionDenied(true)
        return
      }
      if (!res.ok) {
        setError(data?.error ?? 'Failed to load widget settings')
        return
      }
      const apiPayload = data as ApiResponse
      setWidget(apiPayload.widget)
      setOfferings(apiPayload.available_offerings ?? [])
      setDraft({})
      setPermissionDenied(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load widget settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const merged: AdminWidgetRow | null = useMemo(() => {
    if (!widget) return null
    const m = { ...widget }
    if (draft.display_name !== undefined) m.display_name = draft.display_name
    if (draft.is_active !== undefined) m.is_active = draft.is_active
    if (draft.greeting_title !== undefined) m.greeting_title = draft.greeting_title
    if (draft.greeting_subtitle !== undefined) m.greeting_subtitle = draft.greeting_subtitle
    if (draft.success_message !== undefined) m.success_message = draft.success_message
    if (draft.treatment_options !== undefined) m.treatment_options = draft.treatment_options
    if (draft.enable_calendar !== undefined) m.enable_calendar = draft.enable_calendar
    if (draft.calendar_redirect_url !== undefined) m.calendar_redirect_url = draft.calendar_redirect_url
    if (draft.enable_webform !== undefined) m.enable_webform = draft.enable_webform
    if (draft.enable_whatsapp !== undefined) m.enable_whatsapp = draft.enable_whatsapp
    if (draft.whatsapp_phone_e164 !== undefined) m.whatsapp_phone_e164 = draft.whatsapp_phone_e164
    if (draft.whatsapp_prefilled_message_template !== undefined) {
      m.whatsapp_prefilled_message_template = draft.whatsapp_prefilled_message_template
    }
    if (draft.brand_primary_color !== undefined) m.brand_primary_color = draft.brand_primary_color
    if (draft.brand_logo_url !== undefined) m.brand_logo_url = draft.brand_logo_url

    const meta = { ...m.metadata }
    if (
      draft.webform_consent_text !== undefined ||
      draft.webform_consent_required !== undefined ||
      draft.webform_fields !== undefined
    ) {
      meta.webform = {
        ...(meta.webform ?? {}),
        ...(draft.webform_fields !== undefined && { fields: draft.webform_fields }),
        ...(draft.webform_consent_text !== undefined && { consent_text: draft.webform_consent_text }),
        ...(draft.webform_consent_required !== undefined && {
          consent_required: draft.webform_consent_required,
        }),
      }
    }
    if (
      draft.trigger_mode !== undefined ||
      draft.trigger_position !== undefined ||
      draft.trigger_button_label !== undefined
    ) {
      meta.trigger = {
        ...(meta.trigger ?? {}),
        ...(draft.trigger_mode !== undefined && { mode: draft.trigger_mode }),
        ...(draft.trigger_position !== undefined && { position: draft.trigger_position }),
        ...(draft.trigger_button_label !== undefined && { button_label: draft.trigger_button_label }),
      }
    }
    m.metadata = meta
    return m
  }, [widget, draft])

  const previewConfig = useMemo(
    () => (merged ? buildPublicConfigFromAdminRow(merged, offerings) : null),
    [merged, offerings]
  )

  const isDirty = Object.keys(draft).length > 0

  const setField = <K extends keyof DraftPatch>(key: K, value: DraftPatch[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    if (!isDirty) return
    setSaving(true)
    try {
      const res = await authFetch('/api/settings/booking-widget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Save failed')
        return
      }
      setWidget(data.widget)
      setDraft({})
      toast.success('Widget settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const regenerateSlug = async () => {
    if (!confirm('Generate a new slug? The existing embed snippet and landing URL will stop working.')) {
      return
    }
    try {
      const res = await authFetch('/api/settings/booking-widget/regenerate-slug', {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to regenerate')
        return
      }
      await reload()
      toast.success('New slug generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-12 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading widget settings…
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <Card className="mx-6 my-12 max-w-2xl border-amber-300 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h2 className="text-base font-semibold text-amber-900">No access</h2>
            <p className="mt-1 text-sm text-amber-800">
              You don’t have permission to manage the booking widget. Ask your owner or admin to grant
              you the <code>contacts.widget_manage</code> permission.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (error || !widget || !merged || !previewConfig) {
    return (
      <Card className="mx-6 my-12 max-w-2xl border-red-300 bg-red-50 p-6 text-sm text-red-900">
        {error ?? 'No widget configured.'}
      </Card>
    )
  }

  const embedSnippet = `<!-- DentalCRM booking widget -->\n<script src="${origin}/widget.js" data-slug="${widget.slug}" async></script>`
  const landingUrl = `${origin}/w/${widget.slug}`

  return (
    <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Booking widget</h1>
            <p className="text-sm text-slate-600">
              Configure the embedded chat-style widget that captures leads from your website and ads.
            </p>
          </div>
          <Button onClick={save} disabled={!isDirty || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isDirty ? 'Save changes' : 'No changes'}
          </Button>
        </div>

        <Tabs value={section} onValueChange={(v) => setSection(v as SectionKey)}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="treatments">Treatments</TabsTrigger>
            <TabsTrigger value="paths">Paths</TabsTrigger>
            <TabsTrigger value="branding">Branding & embed</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSection widget={merged} setField={setField} />
          </TabsContent>
          <TabsContent value="treatments">
            <TreatmentsSection
              selected={merged.treatment_options}
              offerings={offerings}
              onChange={(next) => setField('treatment_options', next)}
            />
          </TabsContent>
          <TabsContent value="paths">
            <PathsSection widget={merged} setField={setField} />
          </TabsContent>
          <TabsContent value="branding">
            <BrandingSection
              widget={merged}
              setField={setField}
              embedSnippet={embedSnippet}
              landingUrl={landingUrl}
              onRegenerateSlug={regenerateSlug}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PreviewPane config={previewConfig} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

interface SectionProps {
  widget: AdminWidgetRow
  setField: <K extends keyof DraftPatch>(key: K, value: DraftPatch[K]) => void
}

function GeneralSection({ widget, setField }: SectionProps) {
  return (
    <Card className="mt-4 space-y-4 p-6">
      <div className="grid gap-2">
        <Label htmlFor="display_name">Practice display name</Label>
        <Input
          id="display_name"
          value={widget.display_name}
          onChange={(e) => setField('display_name', e.target.value)}
        />
        <p className="text-xs text-slate-500">
          Shown above the widget on the landing page and in the modal header.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="greeting_title">Greeting title</Label>
        <Input
          id="greeting_title"
          value={widget.greeting_title ?? ''}
          onChange={(e) => setField('greeting_title', e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="greeting_subtitle">Greeting subtitle (optional)</Label>
        <Textarea
          id="greeting_subtitle"
          rows={2}
          value={widget.greeting_subtitle ?? ''}
          onChange={(e) => setField('greeting_subtitle', e.target.value || null)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="success_message">Success message (after webform submission)</Label>
        <Textarea
          id="success_message"
          rows={2}
          value={widget.success_message ?? ''}
          onChange={(e) => setField('success_message', e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <div>
          <Label htmlFor="is_active" className="text-sm font-medium">Widget active</Label>
          <p className="text-xs text-slate-500">
            When off, the widget hides on practice sites and the landing page returns 403.
          </p>
        </div>
        <Switch
          id="is_active"
          checked={widget.is_active}
          onCheckedChange={(v) => setField('is_active', v)}
        />
      </div>
    </Card>
  )
}

interface TreatmentsSectionProps {
  selected: AdminWidgetRow['treatment_options']
  offerings: AdminTreatmentOffering[]
  onChange: (next: AdminWidgetRow['treatment_options']) => void
}

function TreatmentsSection({ selected, offerings, onChange }: TreatmentsSectionProps) {
  const selectedIds = new Set(selected.map((s) => s.offering_id))

  const toggle = (offeringId: string) => {
    if (selectedIds.has(offeringId)) {
      onChange(selected.filter((s) => s.offering_id !== offeringId))
    } else {
      const nextSortOrder = selected.length
      onChange([...selected, { offering_id: offeringId, sort_order: nextSortOrder }])
    }
  }

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...selected]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next.map((opt, i) => ({ ...opt, sort_order: i })))
  }

  return (
    <Card className="mt-4 space-y-6 p-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Treatments shown in the widget</h3>
        <p className="mt-1 text-xs text-slate-500">
          Pick which of your active offerings appear in the picker. Drag-handle support coming soon —
          for now use the up/down arrows to reorder.
        </p>
      </div>

      {selected.length === 0 ? (
        <p className="text-sm text-slate-500">
          No treatments selected yet. Toggle some on below.
        </p>
      ) : (
        <ol className="space-y-2">
          {selected.map((opt, idx) => {
            const off = offerings.find((o) => o.id === opt.offering_id)
            const label = off?.custom_label ?? off?.treatment_type?.display_name ?? opt.offering_id
            return (
              <li
                key={opt.offering_id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  <span className="mr-2 inline-block w-6 text-right text-xs text-slate-400">
                    {idx + 1}.
                  </span>
                  {label}
                </span>
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => move(idx, 1)}
                    disabled={idx === selected.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(opt.offering_id)}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <div>
        <h4 className="text-sm font-semibold text-slate-900">Available offerings</h4>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {offerings
            .filter((o) => o.is_active && !selectedIds.has(o.id))
            .map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm"
              >
                <span>{o.custom_label ?? o.treatment_type?.display_name ?? o.id}</span>
                <Button variant="outline" size="sm" onClick={() => toggle(o.id)}>
                  Add
                </Button>
              </li>
            ))}
        </ul>
      </div>
    </Card>
  )
}

function PathsSection({ widget, setField }: SectionProps) {
  return (
    <Card className="mt-4 space-y-6 p-6">
      <fieldset className="space-y-4 border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Webform path</Label>
            <p className="text-xs text-slate-500">
              Inline form that captures the lead and writes to your CRM.
            </p>
          </div>
          <Switch
            checked={widget.enable_webform}
            onCheckedChange={(v) => setField('enable_webform', v)}
          />
        </div>
        {widget.enable_webform && (
          <div className="space-y-3 pl-1">
            <div className="grid gap-2">
              <Label htmlFor="webform_consent">Consent text</Label>
              <Textarea
                id="webform_consent"
                rows={2}
                value={widget.metadata?.webform?.consent_text ?? ''}
                onChange={(e) =>
                  setField('webform_consent_text', e.target.value || null)
                }
              />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Require consent checkbox</span>
              <Switch
                checked={Boolean(widget.metadata?.webform?.consent_required)}
                onCheckedChange={(v) => setField('webform_consent_required', v)}
              />
            </label>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4 border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Calendar path</Label>
            <p className="text-xs text-slate-500">
              Sends the lead to an external calendar (Calendly, Saturn, NHS booking, …).
            </p>
          </div>
          <Switch
            checked={widget.enable_calendar}
            onCheckedChange={(v) => setField('enable_calendar', v)}
          />
        </div>
        {widget.enable_calendar && (
          <div className="grid gap-2">
            <Label htmlFor="calendar_url">Calendar redirect URL</Label>
            <Input
              id="calendar_url"
              type="url"
              placeholder="https://calendly.com/your-practice/consultation"
              value={widget.calendar_redirect_url ?? ''}
              onChange={(e) =>
                setField('calendar_redirect_url', e.target.value || null)
              }
            />
            {!widget.calendar_redirect_url && (
              <p className="text-xs text-amber-700">
                A URL is required for the calendar path to be visible to visitors.
              </p>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">WhatsApp path</Label>
            <p className="text-xs text-slate-500">
              Opens WhatsApp with the chosen treatment pre-filled in the message.
            </p>
          </div>
          <Switch
            checked={widget.enable_whatsapp}
            onCheckedChange={(v) => setField('enable_whatsapp', v)}
          />
        </div>
        {widget.enable_whatsapp && (
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="whatsapp_phone">WhatsApp phone (international format)</Label>
              <Input
                id="whatsapp_phone"
                placeholder="+447700900900"
                value={widget.whatsapp_phone_e164 ?? ''}
                onChange={(e) =>
                  setField('whatsapp_phone_e164', e.target.value || null)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp_template">Pre-filled message (use {'{treatment}'} as a placeholder)</Label>
              <Textarea
                id="whatsapp_template"
                rows={2}
                value={widget.whatsapp_prefilled_message_template ?? ''}
                onChange={(e) =>
                  setField('whatsapp_prefilled_message_template', e.target.value || null)
                }
              />
            </div>
          </div>
        )}
      </fieldset>
    </Card>
  )
}

interface BrandingSectionProps extends SectionProps {
  embedSnippet: string
  landingUrl: string
  onRegenerateSlug: () => void
}

function BrandingSection({
  widget,
  setField,
  embedSnippet,
  landingUrl,
  onRegenerateSlug,
}: BrandingSectionProps) {
  const triggerMode = (widget.metadata?.trigger?.mode ?? 'button') as
    | 'button'
    | 'auto'
    | 'inline'
    | 'manual'
  return (
    <Card className="mt-4 space-y-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="primary_color">Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              id="primary_color"
              type="color"
              value={widget.brand_primary_color ?? '#0ea5e9'}
              onChange={(e) => setField('brand_primary_color', e.target.value)}
              className="h-9 w-16 cursor-pointer rounded border border-slate-300"
            />
            <Input
              value={widget.brand_primary_color ?? '#0ea5e9'}
              onChange={(e) => setField('brand_primary_color', e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="logo_url">Logo URL (optional)</Label>
          <Input
            id="logo_url"
            type="url"
            placeholder="https://example.com/logo.svg"
            value={widget.brand_logo_url ?? ''}
            onChange={(e) => setField('brand_logo_url', e.target.value || null)}
          />
        </div>
      </div>

      <fieldset className="space-y-3 border-t border-slate-200 pt-6">
        <Label className="font-medium">Trigger</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="trigger_mode" className="text-xs text-slate-500">
              Mode
            </Label>
            <select
              id="trigger_mode"
              value={triggerMode}
              onChange={(e) =>
                setField('trigger_mode', e.target.value as 'button' | 'auto' | 'inline' | 'manual')
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="button">Floating button</option>
              <option value="auto">Open on load</option>
              <option value="inline">Inline (no modal)</option>
              <option value="manual">Manual (script-controlled)</option>
            </select>
          </div>
          {triggerMode === 'button' && (
            <>
              <div className="grid gap-1">
                <Label htmlFor="trigger_position" className="text-xs text-slate-500">
                  Position
                </Label>
                <select
                  id="trigger_position"
                  value={widget.metadata?.trigger?.position ?? 'bottom-right'}
                  onChange={(e) =>
                    setField(
                      'trigger_position',
                      e.target.value as 'bottom-right' | 'bottom-left'
                    )
                  }
                  className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
                >
                  <option value="bottom-right">Bottom-right</option>
                  <option value="bottom-left">Bottom-left</option>
                </select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="trigger_button_label" className="text-xs text-slate-500">
                  Button label
                </Label>
                <Input
                  id="trigger_button_label"
                  value={widget.metadata?.trigger?.button_label ?? 'Book a consultation'}
                  onChange={(e) => setField('trigger_button_label', e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between">
          <Label className="font-medium">Embed code</Label>
          <Button variant="ghost" size="sm" onClick={onRegenerateSlug}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Regenerate slug
          </Button>
        </div>
        <CopyBlock label="Script tag for your website" value={embedSnippet} />
        <CopyBlock label="CRM-hosted landing page URL" value={landingUrl} />
      </fieldset>
    </Card>
  )
}

interface CopyBlockProps {
  label: string
  value: string
}

function CopyBlock({ label, value }: CopyBlockProps) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy — please select and copy manually')
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-slate-500">{label}</Label>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs text-slate-100">
        {value}
      </pre>
    </div>
  )
}

function PreviewPane({ config }: { config: PublicWidgetConfig }) {
  const inlineConfig: PublicWidgetConfig = {
    ...config,
    trigger: { ...config.trigger, mode: 'inline' },
  }
  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Live preview</h2>
            <p className="text-xs text-slate-500">
              What visitors see. Submissions are simulated — no real lead is created.
            </p>
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <BookingWidget config={inlineConfig} apiBase="" previewMode />
        </div>
      </Card>
    </div>
  )
}

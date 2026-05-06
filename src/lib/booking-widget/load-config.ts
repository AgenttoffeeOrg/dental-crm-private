/**
 * Phase 2a.3 — Load + sanitize a widget config for public consumption.
 *
 * Used by:
 *   - GET /api/widget/config?slug=…
 *   - /w/[slug] landing page (server-side render)
 *
 * Always uses the service-role Supabase client because the lookup happens
 * by slug across all tenants and the RLS policies are tenant-scoped.
 *
 * NOTE: the `practice_booking_widgets` table also has an "Anon read active"
 * RLS policy, so an anon client could in theory read directly — we still
 * route through the service-role client because we want a consistent code
 * path and we read across two more tables (`practice_treatment_offerings`
 * and `tenants`) whose RLS is strict tenant isolation.
 */

import { createServiceClient } from '@/lib/supabase-server'
import type {
  PublicWidgetConfig,
  PublicTreatmentOption,
  WidgetMetadata,
  WidgetPath,
  WebformField,
} from './types'

const DEFAULT_THEME = {
  primary_color: '#0ea5e9',
  text_color: '#FFFFFF',
} as const

const DEFAULT_FIELDS: WebformField[] = [
  { name: 'full_name', label: 'Your name', required: true, type: 'text' },
  { name: 'email', label: 'Email', required: true, type: 'email' },
  { name: 'phone', label: 'Phone', required: true, type: 'tel' },
]

export type LoadWidgetConfigResult =
  | { ok: true; config: PublicWidgetConfig; tenantId: string; widgetId: string }
  | { ok: false; status: 404 | 403 | 500; reason: string }

export async function loadWidgetConfigBySlug(
  slug: string
): Promise<LoadWidgetConfigResult> {
  const supabase = createServiceClient()

  const { data: widget, error } = await supabase
    .from('practice_booking_widgets')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('[loadWidgetConfigBySlug] lookup failed', { slug, error })
    return { ok: false, status: 500, reason: 'lookup_failed' }
  }

  if (!widget) {
    return { ok: false, status: 404, reason: 'not_found' }
  }

  if (!widget.is_active) {
    return { ok: false, status: 403, reason: 'widget_disabled' }
  }

  const treatmentOptions = Array.isArray(widget.treatment_options)
    ? (widget.treatment_options as Array<{ offering_id: string; sort_order?: number }>)
    : []
  const offeringIds = treatmentOptions.map((o) => o.offering_id).filter(Boolean)

  let treatments: PublicTreatmentOption[] = []
  if (offeringIds.length > 0) {
    const { data: offerings } = await supabase
      .from('practice_treatment_offerings')
      .select('id, custom_label, sort_order, treatment_type:treatment_types(id, key, display_name, category)')
      .in('id', offeringIds)
      .eq('tenant_id', widget.tenant_id)
      .eq('is_active', true)
      .is('deleted_at', null)

    const byId = new Map<string, any>()
    for (const off of offerings ?? []) byId.set(off.id, off)

    treatments = treatmentOptions
      .map((opt) => {
        const off = byId.get(opt.offering_id)
        if (!off) return null
        const treatmentType = Array.isArray(off.treatment_type)
          ? off.treatment_type[0]
          : off.treatment_type
        return {
          offering_id: off.id,
          label: off.custom_label ?? treatmentType?.display_name ?? 'Treatment',
          category: treatmentType?.category ?? null,
          treatment_key: treatmentType?.key ?? null,
        }
      })
      .filter((t): t is PublicTreatmentOption => t !== null)
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', widget.tenant_id)
    .maybeSingle()

  const metadata: WidgetMetadata = (widget.metadata ?? {}) as WidgetMetadata

  const pathsEnabled: WidgetPath[] = []
  if (widget.enable_calendar && widget.calendar_redirect_url) pathsEnabled.push('calendar')
  if (widget.enable_webform) pathsEnabled.push('webform')
  if (widget.enable_whatsapp && widget.whatsapp_phone_e164) pathsEnabled.push('whatsapp')

  const trigger = metadata.trigger ?? {}
  const webformMeta = metadata.webform ?? {}
  const themeMeta = metadata.theme ?? {}
  const whatsappMeta = metadata.whatsapp ?? {}

  const config: PublicWidgetConfig = {
    widget_id: widget.id,
    slug: widget.slug,
    practice_name: widget.display_name || tenant?.name || 'Our Practice',
    greeting_title: widget.greeting_title || 'How can we help you today?',
    greeting_subtitle: widget.greeting_subtitle ?? null,
    success_message: widget.success_message || "Thanks — we'll be in touch shortly.",
    treatments,
    paths_enabled: pathsEnabled,
    webform: {
      kind: (widget.webform_kind ?? 'inline') as 'inline' | 'practice_url' | 'crm_form',
      redirect_url: widget.webform_redirect_url ?? null,
      open_in_new_tab: Boolean(widget.webform_open_in_new_tab),
      button_label: widget.webform_button_label || 'Send an Enquiry',
      fields: Array.isArray(webformMeta.fields) && webformMeta.fields.length > 0
        ? (webformMeta.fields as WebformField[])
        : DEFAULT_FIELDS,
      consent_text: webformMeta.consent_text ?? null,
      consent_required: Boolean(webformMeta.consent_required),
    },
    calendar: {
      redirect_url: widget.calendar_redirect_url ?? null,
      button_label: widget.calendar_button_label || 'Book on Calendar',
      interstitial_message: widget.calendar_interstitial_message ?? null,
      interstitial_duration_ms: widget.calendar_interstitial_duration_ms ?? 1500,
      capture: {
        full_name: Boolean(widget.calendar_capture_full_name),
        email: Boolean(widget.calendar_capture_email),
        phone: Boolean(widget.calendar_capture_phone ?? true),
      },
      consent_text: widget.calendar_consent_text ?? null,
    },
    whatsapp: {
      phone_e164: widget.whatsapp_phone_e164 ?? null,
      button_label: widget.whatsapp_button_label || 'WhatsApp Us',
      prefill_template:
        whatsappMeta.prefill_template ??
        widget.whatsapp_prefilled_message_template ??
        null,
    },
    theme: {
      primary_color: themeMeta.primary_color ?? widget.brand_primary_color ?? DEFAULT_THEME.primary_color,
      text_color: widget.brand_text_color ?? DEFAULT_THEME.text_color,
      logo_url: themeMeta.logo_url ?? widget.brand_logo_url ?? null,
      hero_image_url: themeMeta.hero_image_url ?? null,
      font_family: widget.brand_font_family ?? null,
    },
    trigger: {
      mode: (trigger.mode ?? 'button') as PublicWidgetConfig['trigger']['mode'],
      position: (trigger.position ?? 'bottom-right') as PublicWidgetConfig['trigger']['position'],
      button_label: trigger.button_label ?? 'Book a consultation',
    },
  }

  return { ok: true, config, tenantId: widget.tenant_id, widgetId: widget.id }
}

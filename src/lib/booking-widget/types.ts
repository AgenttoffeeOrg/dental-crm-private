/**
 * Phase 2a.3 — Shared types for the booking widget.
 *
 * Source of truth for the public widget config payload, the metadata jsonb
 * shape stored in `practice_booking_widgets.metadata`, and the wire format
 * used by the public session APIs.
 *
 * Both server (API routes) and client (React widget component, JS embed
 * loader) import from here so the widget never sees a payload it doesn't
 * understand.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Stored metadata shape
// ---------------------------------------------------------------------------
// `practice_booking_widgets.metadata` is an open jsonb but we curate these
// keys; everything not listed here is ignored by the widget.

export const triggerModeSchema = z.enum(['button', 'auto', 'inline', 'manual'])
export type TriggerMode = z.infer<typeof triggerModeSchema>

export const triggerPositionSchema = z.enum(['bottom-right', 'bottom-left'])
export type TriggerPosition = z.infer<typeof triggerPositionSchema>

export const webformFieldSchema = z.object({
  name: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  required: z.boolean().default(false),
  placeholder: z.string().max(120).optional(),
  /** "text" is the default; we stick to a small whitelist to avoid surprises. */
  type: z.enum(['text', 'email', 'tel', 'textarea']).optional(),
})
export type WebformField = z.infer<typeof webformFieldSchema>

export const widgetMetadataSchema = z.object({
  trigger: z
    .object({
      mode: triggerModeSchema.default('button'),
      position: triggerPositionSchema.default('bottom-right'),
      button_label: z.string().min(1).max(64).default('Book a consultation'),
    })
    .partial()
    .optional(),
  webform: z
    .object({
      fields: z.array(webformFieldSchema).max(10).optional(),
      consent_text: z.string().max(2000).nullable().optional(),
      consent_required: z.boolean().optional(),
    })
    .optional(),
  whatsapp: z
    .object({
      prefill_template: z.string().max(500).nullable().optional(),
    })
    .optional(),
  theme: z
    .object({
      primary_color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
      logo_url: z.string().url().nullable().optional(),
      hero_image_url: z.string().url().nullable().optional(),
    })
    .optional(),
})
export type WidgetMetadata = z.infer<typeof widgetMetadataSchema>

// ---------------------------------------------------------------------------
// Public widget config — what GET /api/widget/config returns.
// ---------------------------------------------------------------------------

export interface PublicTreatmentOption {
  offering_id: string
  label: string
  category: string | null
  treatment_key: string | null
}

export type WidgetPath = 'calendar' | 'webform' | 'whatsapp'

export interface PublicWidgetConfig {
  widget_id: string
  slug: string
  practice_name: string
  greeting_title: string
  greeting_subtitle: string | null
  success_message: string
  treatments: PublicTreatmentOption[]
  paths_enabled: WidgetPath[]
  webform: {
    kind: 'inline' | 'practice_url' | 'crm_form'
    redirect_url: string | null
    open_in_new_tab: boolean
    button_label: string
    fields: WebformField[]
    consent_text: string | null
    consent_required: boolean
  }
  calendar: {
    redirect_url: string | null
    button_label: string
    interstitial_message: string | null
    interstitial_duration_ms: number
    capture: { full_name: boolean; email: boolean; phone: boolean }
    consent_text: string | null
  }
  whatsapp: {
    phone_e164: string | null
    button_label: string
    prefill_template: string | null
  }
  theme: {
    primary_color: string
    text_color: string
    logo_url: string | null
    hero_image_url: string | null
    font_family: string | null
  }
  trigger: {
    mode: TriggerMode
    position: TriggerPosition
    button_label: string
  }
}

// ---------------------------------------------------------------------------
// Public session API request bodies
// ---------------------------------------------------------------------------

export const startSessionBodySchema = z.object({
  widget_slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/),
  source_url: z.string().max(2000).optional(),
  referrer_url: z.string().max(2000).optional(),
  utm: z
    .object({
      source: z.string().max(120).optional(),
      medium: z.string().max(120).optional(),
      campaign: z.string().max(120).optional(),
      term: z.string().max(120).optional(),
      content: z.string().max(120).optional(),
    })
    .optional(),
  click_ids: z
    .object({
      gclid: z.string().max(200).optional(),
      fbclid: z.string().max(200).optional(),
      ttclid: z.string().max(200).optional(),
      msclkid: z.string().max(200).optional(),
    })
    .optional(),
  user_agent: z.string().max(500).optional(),
})
export type StartSessionBody = z.infer<typeof startSessionBodySchema>

export const updateSessionBodySchema = z.object({
  treatment_offering_id: z.string().uuid().optional(),
  path_chosen: z.enum(['calendar', 'webform', 'whatsapp']).optional(),
  abandoned_step: z.string().max(80).optional(),
})
export type UpdateSessionBody = z.infer<typeof updateSessionBodySchema>

export const submitSessionBodySchema = z.object({
  path: z.enum(['calendar', 'webform', 'whatsapp']),
  treatment_offering_id: z.string().uuid().optional(),
  contact: z
    .object({
      full_name: z.string().min(1).max(200),
      email: z.string().email().optional(),
      phone: z.string().min(3).max(40).optional(),
      consents: z
        .object({
          marketing_consent: z.boolean().optional(),
          email_consent: z.boolean().optional(),
          sms_consent: z.boolean().optional(),
        })
        .optional(),
      // Free-form additional fields the webform can collect.
      extra_fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    })
    .refine((c) => Boolean(c.email || c.phone), {
      message: 'At least one of email or phone is required',
    }),
})
export type SubmitSessionBody = z.infer<typeof submitSessionBodySchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/

export function isValidSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG_REGEX.test(value)
}

/**
 * Build the WhatsApp deeplink. `phoneE164` should already be a digits-only
 * E.164 string (no `+`, spaces, or dashes); we strip non-digits defensively.
 */
export function buildWhatsAppLink(
  phoneE164: string,
  prefillTemplate: string | null,
  treatmentLabel?: string | null
): string {
  const digits = phoneE164.replace(/[^0-9]/g, '')
  let text = prefillTemplate ?? "Hi, I'd like to book an appointment."
  if (text.includes('{treatment}')) {
    text = text.replaceAll('{treatment}', treatmentLabel?.trim() || 'a treatment')
  }
  const url = new URL(`https://wa.me/${digits}`)
  url.searchParams.set('text', text)
  return url.toString()
}

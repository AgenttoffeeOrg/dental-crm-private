/**
 * Phase 2a.3 — Zod schema for admin widget update payloads.
 *
 * The shape mirrors the live `practice_booking_widgets` columns 1:1 so the
 * settings UI can submit a partial patch and the route writes it straight
 * to the table. Anything inside `metadata` is validated separately (see
 * widget-config types) and merged with the existing row's metadata.
 */

import { z } from 'zod'
import {
  triggerModeSchema,
  triggerPositionSchema,
  webformFieldSchema,
} from './types'

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #0ea5e9')

const treatmentOptionSchema = z.object({
  offering_id: z.string().uuid(),
  sort_order: z.number().int().nonnegative().optional(),
})

export const adminUpdateWidgetSchema = z
  .object({
    display_name: z.string().min(1).max(120).optional(),
    is_active: z.boolean().optional(),
    success_message: z.string().min(1).max(500).optional(),
    treatment_options: z.array(treatmentOptionSchema).max(50).optional(),

    enable_calendar: z.boolean().optional(),
    calendar_redirect_url: z.string().url().nullable().optional(),
    calendar_button_label: z.string().min(1).max(64).optional(),
    calendar_capture_full_name: z.boolean().optional(),
    calendar_capture_email: z.boolean().optional(),
    calendar_capture_phone: z.boolean().optional(),
    calendar_consent_text: z.string().max(2000).nullable().optional(),
    calendar_interstitial_message: z.string().max(500).nullable().optional(),
    calendar_interstitial_duration_ms: z.number().int().min(0).max(30_000).optional(),

    enable_webform: z.boolean().optional(),
    webform_kind: z.enum(['inline', 'practice_url', 'crm_form']).optional(),
    webform_redirect_url: z.string().url().nullable().optional(),
    webform_button_label: z.string().min(1).max(64).optional(),
    webform_open_in_new_tab: z.boolean().optional(),
    webform_fields: z.array(webformFieldSchema).max(10).optional(),
    webform_consent_text: z.string().max(2000).nullable().optional(),
    webform_consent_required: z.boolean().optional(),

    enable_whatsapp: z.boolean().optional(),
    whatsapp_phone_e164: z
      .string()
      .regex(/^\+?[1-9][0-9]{6,14}$/u, 'Use international format e.g. +447700900900')
      .nullable()
      .optional(),
    whatsapp_button_label: z.string().min(1).max(64).optional(),
    whatsapp_prefilled_message_template: z.string().max(500).nullable().optional(),

    brand_primary_color: hexColor.optional(),
    brand_text_color: hexColor.optional(),
    brand_logo_url: z.string().url().nullable().optional(),
    brand_font_family: z.string().max(120).nullable().optional(),

    greeting_title: z.string().min(1).max(200).optional(),
    greeting_subtitle: z.string().max(500).nullable().optional(),

    trigger_mode: triggerModeSchema.optional(),
    trigger_position: triggerPositionSchema.optional(),
    trigger_button_label: z.string().min(1).max(64).optional(),

    theme_hero_image_url: z.string().url().nullable().optional(),
  })
  .strict()

export type AdminUpdateWidgetBody = z.infer<typeof adminUpdateWidgetSchema>

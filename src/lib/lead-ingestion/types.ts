/**
 * Phase 2a.2a — shared types for the lead-ingestion engine.
 *
 * Lives at the top of the module so dedup-engine, sla-resolver, ingest-lead,
 * and downstream callers (forms/submit route, future widget endpoints) all
 * share one source of truth.
 */

// Mirrors the live `public.source_channel_enum` values. Keep in sync with the
// DB enum (verified 2026-05-03 against project-0-auth-app-supabase).
export type SourceChannelEnum =
  | 'form_embedded'
  | 'form_hosted_landing'
  | 'booking_widget_calendar'
  | 'booking_widget_webform'
  | 'booking_widget_whatsapp'
  | 'meta_lead_ad'
  | 'meta_messenger_ad'
  | 'google_lead_form'
  | 'google_search_ad'
  | 'google_display_ad'
  | 'whatsapp_website_button'
  | 'whatsapp_meta_ad'
  | 'whatsapp_qr'
  | 'instagram_dm'
  | 'fb_messenger'
  | 'sms_inbound'
  | 'phone_call_inbound'
  | 'phone_call_voicemail'
  | 'online_booking_completed'
  | 'online_booking_abandoned'
  | 'manual_entry'
  | 'csv_import'
  | 'api_partner'
  | 'referral'
  | 'other'

export const SOURCE_CHANNEL_VALUES: ReadonlyArray<SourceChannelEnum> = [
  'form_embedded',
  'form_hosted_landing',
  'booking_widget_calendar',
  'booking_widget_webform',
  'booking_widget_whatsapp',
  'meta_lead_ad',
  'meta_messenger_ad',
  'google_lead_form',
  'google_search_ad',
  'google_display_ad',
  'whatsapp_website_button',
  'whatsapp_meta_ad',
  'whatsapp_qr',
  'instagram_dm',
  'fb_messenger',
  'sms_inbound',
  'phone_call_inbound',
  'phone_call_voicemail',
  'online_booking_completed',
  'online_booking_abandoned',
  'manual_entry',
  'csv_import',
  'api_partner',
  'referral',
  'other',
]

export function isSourceChannel(value: unknown): value is SourceChannelEnum {
  return typeof value === 'string' && (SOURCE_CHANNEL_VALUES as readonly string[]).includes(value)
}

// Channel identifier "kinds" the engine understands. Kept independent of the
// DB enum because `channel_identifiers.channel` is a free-text column today.
export type ChannelIdentifierKind =
  | 'whatsapp_phone'
  | 'instagram_handle'
  | 'fb_messenger_psid'
  | 'tiktok_user_id'
  | 'meta_lead_id'

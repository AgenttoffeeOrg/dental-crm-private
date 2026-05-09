/**
 * Phase 2a.2b — human-readable labels for `public.source_channel_enum`.
 *
 * Used by the dedup queue UI and the `lead.arrived` notification's
 * `source_label` template variable. Kept in lead-ingestion/ so producers and
 * consumers share one source of truth.
 */

import type { SourceChannelEnum } from './types'

const LABELS: Record<SourceChannelEnum, string> = {
  form_embedded: 'Embedded form',
  form_hosted_landing: 'Hosted landing page',
  booking_widget_calendar: 'Booking widget (calendar)',
  booking_widget_webform: 'Booking widget (webform)',
  booking_widget_whatsapp: 'Booking widget (WhatsApp)',
  meta_lead_ad: 'Meta lead ad',
  meta_messenger_ad: 'Meta Messenger ad',
  google_lead_form: 'Google lead form',
  google_search_ad: 'Google search ad',
  google_display_ad: 'Google display ad',
  whatsapp_website_button: 'WhatsApp (website button)',
  whatsapp_meta_ad: 'WhatsApp (Meta ad click)',
  whatsapp_qr: 'WhatsApp (QR code)',
  whatsapp_inbound: 'WhatsApp (inbound message)',
  instagram_dm: 'Instagram DM',
  fb_messenger: 'Facebook Messenger',
  sms_inbound: 'Inbound SMS',
  phone_call_inbound: 'Inbound phone call',
  phone_call_voicemail: 'Voicemail',
  online_booking_completed: 'Online booking (completed)',
  online_booking_abandoned: 'Online booking (abandoned)',
  manual_entry: 'Manual entry',
  csv_import: 'CSV import',
  api_partner: 'Partner API',
  referral: 'Referral',
  other: 'Other',
}

/**
 * Returns a human-readable label for a `source_channel_enum` value. Falls
 * back to the raw value for unknown inputs (e.g. enum drift between DB and
 * TypeScript) so callers never crash on display.
 */
export function sourceChannelToLabel(channel: string | null | undefined): string {
  if (!channel) return 'Unknown source'
  if (channel in LABELS) return LABELS[channel as SourceChannelEnum]
  return channel
}

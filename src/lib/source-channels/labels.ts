/**
 * Phase 2b.30 — Human-readable labels for lead source channels.
 *
 * The DB stores `source_channel_enum` values like `form_embedded`,
 * `whatsapp_inbound`, `sms_inbound`. The contact list was rendering
 * those raw strings — fine for engineers, opaque for practice owners.
 *
 * This module is the single source of truth for converting any
 * source value into a clean label + icon name. Used by:
 *   - the contact list row sub-text
 *   - the contact list Source filter dropdown
 *   - (future) the contact detail page's "First touch" section
 *
 * Unknown / legacy values get a titlecase fallback so nothing
 * silently breaks — old data still renders something sensible.
 */
import type { LucideIcon } from 'lucide-react'
import {
  FormInput,
  Globe,
  Calendar,
  MessageSquare,
  Mail,
  PhoneCall,
  Upload,
  UserPlus,
  Users,
  Facebook,
  Search,
} from 'lucide-react'

export interface SourceLabel {
  /** Short human-readable label (≤ ~22 chars). */
  label: string
  /** Optional one-line description for richer UIs (filter popovers). */
  description?: string
  /** Lucide icon to render alongside the label. */
  icon: LucideIcon
}

/**
 * Live-and-supported channels — these are the ones with working
 * inbound webhooks today. Drives the contact-list Source filter
 * dropdown (we don't want to show options that filter to zero rows
 * because the channel is dead / stubbed).
 */
export const ACTIVE_SOURCE_CHANNELS: readonly string[] = [
  'form_embedded',
  'form_hosted_landing',
  'booking_widget_calendar',
  'booking_widget_webform',
  'booking_widget_whatsapp',
  'whatsapp_inbound',
  'sms_inbound',
  'email_inbound',
  'phone_call_inbound',
  'google_lead_form',
  'csv_import',
  'manual_entry',
  'referral',
]

export const SOURCE_CHANNEL_LABELS: Record<string, SourceLabel> = {
  form_embedded: {
    label: 'Web form',
    description: 'Form embedded on the practice website (iframe).',
    icon: FormInput,
  },
  form_hosted_landing: {
    label: 'Landing page',
    description: 'Hosted form on a /f/<slug> page driven by paid ads.',
    icon: Globe,
  },
  booking_widget_calendar: {
    label: 'Booking widget · Calendar',
    description: 'Practice booking widget — calendar path.',
    icon: Calendar,
  },
  booking_widget_webform: {
    label: 'Booking widget · Form',
    description: 'Practice booking widget — form path.',
    icon: FormInput,
  },
  booking_widget_whatsapp: {
    label: 'Booking widget · WhatsApp',
    description: 'Practice booking widget — WhatsApp path.',
    icon: MessageSquare,
  },
  whatsapp_inbound: {
    label: 'WhatsApp',
    description: 'Patient sent the practice a WhatsApp message.',
    icon: MessageSquare,
  },
  sms_inbound: {
    label: 'SMS',
    description: 'Patient texted the practice number.',
    icon: MessageSquare,
  },
  email_inbound: {
    label: 'Email',
    description: 'Patient emailed the practice.',
    icon: Mail,
  },
  phone_call_inbound: {
    label: 'Phone call',
    description: 'Inbound call to the practice.',
    icon: PhoneCall,
  },
  google_lead_form: {
    label: 'Google ad form',
    description: 'Google Ads lead-form extension submission.',
    icon: Search,
  },
  google_search_ad: { label: 'Google search ad', icon: Search },
  google_display_ad: { label: 'Google display ad', icon: Search },
  meta_lead_ad: { label: 'Meta lead ad', icon: Facebook },
  csv_import: {
    label: 'CSV import',
    description: 'Bulk imported from a CSV file.',
    icon: Upload,
  },
  manual_entry: {
    label: 'Added manually',
    description: 'Created by the practice team from inside the CRM.',
    icon: UserPlus,
  },
  referral: {
    label: 'Referral',
    description: 'Word-of-mouth or partner referral.',
    icon: Users,
  },
}

/**
 * Resolve any string into a friendly label + icon. Unknown values
 * get a titlecase fallback (and a generic Users icon) so legacy
 * data renders something sensible rather than a code string.
 */
export function getSourceLabel(source: string | null | undefined): SourceLabel {
  if (!source) return { label: 'Unknown source', icon: Users }
  const exact = SOURCE_CHANNEL_LABELS[source]
  if (exact) return exact

  // Free-text fallback — match what e.g. older manual entries stored.
  const titled = source
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return { label: titled, icon: Users }
}

/**
 * Phase 2a.3 — Internal types for the booking-widget settings UI.
 *
 * Shape of the row returned by GET /api/settings/booking-widget. Mirrors
 * `practice_booking_widgets` but typed loosely (jsonb columns are unknown).
 */

export interface AdminWidgetRow {
  id: string
  tenant_id: string
  slug: string
  display_name: string
  is_active: boolean
  success_message: string | null
  treatment_options: Array<{ offering_id: string; sort_order?: number }>

  enable_calendar: boolean
  calendar_redirect_url: string | null
  calendar_button_label: string
  calendar_capture_full_name: boolean
  calendar_capture_email: boolean
  calendar_capture_phone: boolean
  calendar_consent_text: string | null
  calendar_interstitial_message: string | null
  calendar_interstitial_duration_ms: number

  enable_webform: boolean
  webform_kind: 'inline' | 'practice_url' | 'crm_form'
  webform_redirect_url: string | null
  webform_button_label: string
  webform_open_in_new_tab: boolean

  enable_whatsapp: boolean
  whatsapp_phone_e164: string | null
  whatsapp_button_label: string
  whatsapp_prefilled_message_template: string | null

  brand_primary_color: string | null
  brand_text_color: string | null
  brand_logo_url: string | null
  brand_font_family: string | null

  greeting_title: string | null
  greeting_subtitle: string | null

  embed_script_secret: string

  metadata: {
    trigger?: { mode?: string; position?: string; button_label?: string }
    webform?: {
      fields?: Array<{ name: string; label: string; required?: boolean; type?: string }>
      consent_text?: string | null
      consent_required?: boolean
    }
    whatsapp?: { prefill_template?: string | null }
    theme?: {
      primary_color?: string
      logo_url?: string | null
      hero_image_url?: string | null
    }
  }
}

export interface AdminTreatmentOffering {
  id: string
  custom_label: string | null
  sort_order: number | null
  is_active: boolean
  treatment_type: {
    id: string
    key: string
    display_name: string
    category: string | null
  } | null
}

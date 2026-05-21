/**
 * Phase 2b.22 — Inbound prebuilt workflows.
 *
 * Five day-1 automations every new tenant gets seeded with (as
 * drafts). Authored in the new `graph_json` shape so they drop
 * straight into the engine / wizard / canvas.
 *
 * All five carry an explicit `prebuilt_key` tag — the seeder uses
 * that as the idempotency key (re-running the seed will not double
 * insert; the "restore defaults" path can re-create a single key
 * after deleting its previous incarnation).
 */

export interface PrebuiltAutomation {
  prebuilt_key: string
  name: string
  description: string
  category: 'marketing'
  trigger_type: string
  trigger_config: Record<string, unknown>
  graph_json: {
    start_key: string
    nodes: Array<Record<string, unknown>>
  }
  workflow_config: {
    on_patient_reply?: 'stop' | 'ai_continue'
    respect_quiet_hours?: boolean
  }
  tags: string[]
}

export const INBOUND_PREBUILTS: PrebuiltAutomation[] = [
  {
    prebuilt_key: 'inbound_sms_auto_reply',
    name: 'Inbound SMS — AI auto-reply',
    description:
      'When a patient texts in, draft a friendly reply using the practice brand voice and services. Continues replying as the patient responds.',
    category: 'marketing',
    trigger_type: 'inbound_sms',
    trigger_config: {},
    graph_json: {
      start_key: 'trigger',
      nodes: [
        { key: 'trigger', type: 'trigger', next: 'reply' },
        {
          key: 'reply',
          type: 'send_ai_reply',
          config: {
            channel: 'sms',
            fallback_template:
              "Thanks for getting in touch — a member of the team will follow up shortly.",
          },
          next: 'done',
        },
        { key: 'done', type: 'end' },
      ],
    },
    workflow_config: { on_patient_reply: 'ai_continue', respect_quiet_hours: true },
    tags: ['prebuilt', 'inbound_sms_auto_reply'],
  },
  {
    prebuilt_key: 'inbound_whatsapp_auto_reply',
    name: 'Inbound WhatsApp — AI auto-reply',
    description:
      'Same AI reply pattern as inbound SMS, on the WhatsApp channel.',
    category: 'marketing',
    trigger_type: 'inbound_whatsapp',
    trigger_config: {},
    graph_json: {
      start_key: 'trigger',
      nodes: [
        { key: 'trigger', type: 'trigger', next: 'reply' },
        {
          key: 'reply',
          type: 'send_ai_reply',
          config: {
            channel: 'whatsapp',
            fallback_template:
              "Thanks for getting in touch — a member of the team will follow up shortly.",
          },
          next: 'done',
        },
        { key: 'done', type: 'end' },
      ],
    },
    workflow_config: { on_patient_reply: 'ai_continue', respect_quiet_hours: true },
    tags: ['prebuilt', 'inbound_whatsapp_auto_reply'],
  },
  {
    prebuilt_key: 'web_form_confirmation_email',
    name: 'Web form — confirmation email + 2-day SMS follow-up',
    description:
      'Sends a confirmation email when a web form is submitted, then SMS follow-up two days later if no reply.',
    category: 'marketing',
    trigger_type: 'form_submitted',
    trigger_config: {},
    graph_json: {
      start_key: 'trigger',
      nodes: [
        { key: 'trigger', type: 'trigger', next: 'confirm' },
        {
          key: 'confirm',
          type: 'send_ai_reply',
          config: {
            channel: 'email',
            fallback_template:
              "Thanks for getting in touch — we'll be in contact within one working day.",
          },
          next: 'wait',
        },
        { key: 'wait', type: 'wait', config: { duration: 2, unit: 'days' }, next: 'followup' },
        {
          key: 'followup',
          type: 'send_ai_reply',
          config: {
            channel: 'sms',
            tone_override:
              "This is a follow-up two days after the patient submitted the web form; reference the original enquiry but keep it short.",
            fallback_template:
              "Just checking in on your enquiry — let us know if you'd still like to book in.",
          },
          next: 'done',
        },
        { key: 'done', type: 'end' },
      ],
    },
    workflow_config: { on_patient_reply: 'stop', respect_quiet_hours: true },
    tags: ['prebuilt', 'web_form_confirmation_email'],
  },
  {
    prebuilt_key: 'google_lead_form_confirmation',
    name: 'Google Lead Form — confirmation email + 2-day SMS follow-up',
    description:
      'Same pattern as the web form confirmation, for Google Lead Form leads.',
    category: 'marketing',
    trigger_type: 'google_lead_form_submitted',
    trigger_config: {},
    graph_json: {
      start_key: 'trigger',
      nodes: [
        { key: 'trigger', type: 'trigger', next: 'confirm' },
        {
          key: 'confirm',
          type: 'send_ai_reply',
          config: {
            channel: 'email',
            fallback_template:
              "Thanks for getting in touch — we'll be in contact within one working day.",
          },
          next: 'wait',
        },
        { key: 'wait', type: 'wait', config: { duration: 2, unit: 'days' }, next: 'followup' },
        {
          key: 'followup',
          type: 'send_ai_reply',
          config: {
            channel: 'sms',
            fallback_template:
              "Just checking in on your enquiry — let us know if you'd still like to book in.",
          },
          next: 'done',
        },
        { key: 'done', type: 'end' },
      ],
    },
    workflow_config: { on_patient_reply: 'stop', respect_quiet_hours: true },
    tags: ['prebuilt', 'google_lead_form_confirmation'],
  },
  {
    prebuilt_key: 'no_reply_2_day_cadence',
    name: 'No reply in 2 days → switch channel',
    description:
      'Generic helper: 2 days after the first send, if the patient hasn\'t replied, try the other channel.',
    category: 'marketing',
    // Manual trigger — practice owner attaches this graph to a custom
    // automation; not auto-fired by an event.
    trigger_type: 'contact_created',
    trigger_config: {},
    graph_json: {
      start_key: 'trigger',
      nodes: [
        { key: 'trigger', type: 'trigger', next: 'wait' },
        { key: 'wait', type: 'wait', config: { duration: 2, unit: 'days' }, next: 'send_sms' },
        {
          key: 'send_sms',
          type: 'send_ai_reply',
          config: { channel: 'sms', fallback_template: "Hope you're well — just checking in." },
          next: 'done',
        },
        { key: 'done', type: 'end' },
      ],
    },
    workflow_config: { on_patient_reply: 'stop', respect_quiet_hours: true },
    tags: ['prebuilt', 'no_reply_2_day_cadence'],
  },
]

export function getInboundPrebuilt(key: string): PrebuiltAutomation | undefined {
  return INBOUND_PREBUILTS.find((p) => p.prebuilt_key === key)
}

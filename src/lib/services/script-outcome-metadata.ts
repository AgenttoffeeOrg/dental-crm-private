export const SCRIPT_OUTCOME_TYPES = [
  'appointment_booked',
  'deal_won',
  'deal_lost',
  'follow_up',
  'not_helpful',
  'other',
] as const

export type ScriptOutcomeType = (typeof SCRIPT_OUTCOME_TYPES)[number]

export const SCRIPT_OUTCOME_LABELS: Record<ScriptOutcomeType, string> = {
  appointment_booked: 'Appointment booked',
  deal_won: 'Deal won',
  deal_lost: 'Deal lost',
  follow_up: 'Follow-up scheduled',
  not_helpful: 'Not helpful',
  other: 'Other',
}

export const POSITIVE_SCRIPT_OUTCOMES: ScriptOutcomeType[] = [
  'appointment_booked',
  'deal_won',
]



import { ScriptTrigger } from '@/types/database';

export const SCRIPT_TRIGGERS: ScriptTrigger[] = [
  'price_objection',
  'dental_anxiety',
  'timing_conflict',
  'trust_and_credibility',
  'finance_and_insurance',
  'alternative_seeking',
  'pain_urgency',
  'second_opinion',
  'universal',
];

export const SCRIPT_TRIGGER_LABELS: Record<ScriptTrigger, string> = {
  price_objection: 'Price objection',
  dental_anxiety: 'Dental anxiety',
  timing_conflict: 'Timing conflict',
  trust_and_credibility: 'Trust & credibility',
  finance_and_insurance: 'Finance & insurance',
  alternative_seeking: 'Comparing alternatives',
  pain_urgency: 'Pain & urgency',
  second_opinion: 'Second opinion',
  universal: 'Universal touchpoints',
};

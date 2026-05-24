/**
 * Phase 2b.61 — AI commitment detector.
 *
 * Takes an activity's message text + channel + direction, asks
 * Claude whether ANYONE in the message made a commitment to a
 * future action, returns a structured suggestion the chat bubble
 * can render as a pill.
 *
 * Per the 2026-05-24 product discussion (Path 1):
 *   - NEVER auto-create the task. Operator confirms via a one-click
 *     pill on the bubble.
 *   - Lazy on first render — same pattern as 2b.43 email summariser.
 *   - Confidence threshold = 0.7. Below that, no pill renders.
 *
 * Output stored on `activities.metadata.ai_commitment_suggestion`
 * so subsequent renders are instant (no re-fire of Claude per page
 * mount).
 */

import { claudeOneShot, isAnthropicConfigured } from '@/lib/anthropic-client'

export interface DetectCommitmentInput {
  /** Channel of the activity — call / sms / whatsapp / email / note. */
  channel: 'call' | 'sms' | 'whatsapp' | 'email' | 'note' | 'meeting'
  /** Inbound = patient said it. Outbound = practice said it. */
  direction: 'inbound' | 'outbound'
  /** The message body / transcript / note content. */
  text: string
  /** Optional contact name — helps Claude phrase the suggested task. */
  contactName?: string | null
  /** Date the activity occurred (so "tomorrow" can resolve to a real date). */
  occurredAt?: string
}

export type CommittedParty = 'patient' | 'practice'

export interface CommitmentSuggestion {
  /** True when AI thinks someone committed to a future action. */
  hasCommitment: boolean
  /** Who made the commitment (only meaningful when hasCommitment). */
  by: CommittedParty | null
  /** A short imperative action ("Call patient", "Send quote"). */
  action: string | null
  /** Best-effort ISO 8601 timestamp of when the action is due. */
  deadlineIso: string | null
  /** 0..1 — bubble pill only renders >= 0.7. */
  confidence: number
  /** "claude-haiku-4-5" / "fallback" — for audit / debugging. */
  modelVersion: string
}

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TEXT_CHARS = 2000

const EMPTY: CommitmentSuggestion = {
  hasCommitment: false,
  by: null,
  action: null,
  deadlineIso: null,
  confidence: 0,
  modelVersion: 'fallback',
}

/**
 * Build the system + user prompt. Exported for unit tests so we can
 * assert prompt-shape invariants without firing a Claude call.
 */
export function buildCommitmentPrompt(input: DetectCommitmentInput): {
  system: string
  user: string
} {
  const system = [
    'You are a CRM assistant for a UK dental practice.',
    'Decide whether anyone in this message made a clear commitment to a future action.',
    'Examples of commitments:',
    '  - Patient: "Call me tomorrow at 3pm" (patient asks practice to call)',
    '  - Practice: "I\'ll get back to you on Thursday with the quote" (practice commits to send)',
    '  - Practice: "I\'ll call you next week" (practice commits to call)',
    'Examples that are NOT commitments:',
    '  - "Maybe call me sometime" (vague, no deadline)',
    '  - "I might call you back if I have questions" (conditional, by patient)',
    '  - "What time works for you?" (a question, not a commitment)',
    '',
    'Return ONLY a strict JSON object with this exact shape:',
    '{',
    '  "has_commitment": true | false,',
    '  "by": "patient" | "practice" | null,',
    '  "action": short imperative string | null  (e.g. "Call Joey Baby"),',
    '  "deadline_iso": ISO 8601 timestamp | null,',
    '  "confidence": number between 0 and 1',
    '}',
    'When the deadline is relative ("tomorrow at 3pm"), resolve it against the OCCURRED_AT timestamp.',
    'If the message contains no clear future-action commitment, return has_commitment: false, action: null, deadline_iso: null, confidence: 0.',
    'UK English. Output JSON only, no prose, no markdown code fences.',
  ].join('\n')

  const text = (input.text ?? '').slice(0, MAX_TEXT_CHARS).trim()
  const user = [
    `CHANNEL: ${input.channel}`,
    `DIRECTION: ${input.direction}`,
    input.occurredAt ? `OCCURRED_AT: ${input.occurredAt}` : null,
    input.contactName ? `CONTACT: ${input.contactName}` : null,
    '',
    'MESSAGE:',
    text || '(empty)',
    '',
    'JSON OUTPUT:',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
  return { system, user }
}

function parseClaudeOutput(raw: string | null): CommitmentSuggestion | null {
  if (!raw) return null
  let s = raw.trim()
  // Strip code fences if Claude wraps the JSON.
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```$/m, '').trim()
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(s) as Record<string, unknown>
  } catch {
    return null
  }
  const hasCommitment = parsed.has_commitment === true
  if (!hasCommitment) {
    return { ...EMPTY, modelVersion: MODEL, confidence: 0, hasCommitment: false }
  }
  const by =
    parsed.by === 'patient' || parsed.by === 'practice' ? parsed.by : null
  const action = typeof parsed.action === 'string' && parsed.action.trim() ? parsed.action.trim() : null
  const deadlineIso =
    typeof parsed.deadline_iso === 'string' && parsed.deadline_iso.length >= 10
      ? parsed.deadline_iso
      : null
  const confidenceRaw =
    typeof parsed.confidence === 'number' ? parsed.confidence : 0
  const confidence = Math.max(0, Math.min(1, confidenceRaw))
  // Require at least an action — Claude sometimes says has_commitment:true
  // but provides no action; useless without one.
  if (!action) return { ...EMPTY, modelVersion: MODEL }
  return {
    hasCommitment: true,
    by,
    action,
    deadlineIso,
    confidence,
    modelVersion: MODEL,
  }
}

/**
 * Detect a commitment in the message text. Never throws — returns
 * the EMPTY shape on any failure path so callers can safely write
 * the result to metadata regardless.
 */
export async function detectCommitment(
  input: DetectCommitmentInput
): Promise<CommitmentSuggestion> {
  // Empty text → nothing to detect.
  if (!input.text || !input.text.trim()) {
    return { ...EMPTY, modelVersion: 'fallback' }
  }

  if (!isAnthropicConfigured()) {
    return { ...EMPTY, modelVersion: 'fallback' }
  }

  const { system, user } = buildCommitmentPrompt(input)
  try {
    const raw = await claudeOneShot({
      system,
      user,
      model: MODEL,
      maxTokens: 250,
      temperature: 0.2,
    })
    const parsed = parseClaudeOutput(raw)
    return parsed ?? { ...EMPTY, modelVersion: MODEL }
  } catch (err) {
    console.warn('[detect-commitment] claudeOneShot failed', {
      channel: input.channel,
      direction: input.direction,
      err: err instanceof Error ? err.message : String(err),
    })
    return { ...EMPTY, modelVersion: 'fallback' }
  }
}

/** Below this confidence, the chat-bubble pill stays hidden. */
export const PILL_RENDER_CONFIDENCE_THRESHOLD = 0.7

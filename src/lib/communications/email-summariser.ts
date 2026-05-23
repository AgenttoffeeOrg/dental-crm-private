/**
 * Phase 2b.43 — Email summariser.
 *
 * Generates a 1-3 sentence AI summary of an email so the chat-bubble
 * timeline (phase 2b.41) can render emails compactly without dumping
 * 600-word bodies inline. Full body is always available via the
 * click-to-detail slide-out.
 *
 * Trigger model (Q3 audit decision): **lazy on first chat-bubble
 * render**. No queue, no background worker. The first time an email
 * bubble mounts without a cached summary, the UI fires
 * `POST /api/activities/[id]/summarise-email`, which calls this
 * helper and persists the result to `activities.metadata.ai_email_summary`.
 * Subsequent renders read the cached value. Costs are negligible for
 * a dental practice's email volume (Claude Haiku 4.5).
 *
 * Failure modes (all graceful — never throws):
 *   - Anthropic not configured → returns deterministic fallback
 *     ("Email sent by/from X with subject Y; first ~120 chars: …").
 *   - Claude returns empty / errors → same fallback.
 *   - Empty body → "Email with no body text — likely an attachment."
 */

import { claudeOneShot, isAnthropicConfigured } from '@/lib/anthropic-client'

export interface SummariseEmailInput {
  /** 'inbound' (from patient) or 'outbound' (from practice). */
  direction: 'inbound' | 'outbound'
  subject: string | null
  body: string | null
  /** Sender email if available — adds context on outbound vs inbound. */
  fromAddress?: string | null
}

export interface SummariseEmailOutput {
  summary: string
  isFallback: boolean
  modelVersion: string
}

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_BODY_CHARS = 4000

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function fallbackSummary(input: SummariseEmailInput): string {
  const cleanBody = input.body ? stripHtml(input.body) : ''
  if (!cleanBody) {
    return input.subject
      ? `Email with subject "${input.subject}" — no body text.`
      : 'Email with no body text — likely an attachment-only message.'
  }
  const subjectPart = input.subject ? `"${input.subject}". ` : ''
  const preview = cleanBody.slice(0, 120)
  const ellipsis = cleanBody.length > 120 ? '…' : ''
  return `${subjectPart}${preview}${ellipsis}`
}

export function buildSummariserPrompt(input: SummariseEmailInput): {
  system: string
  user: string
} {
  const cleanBody = input.body ? stripHtml(input.body).slice(0, MAX_BODY_CHARS) : ''
  const system = [
    'You are a CRM assistant for a UK dental practice.',
    'Summarise this email in 1-3 sentences (~30-60 words).',
    'Capture the key intent or action. Factual, no fluff. UK English.',
    'Do not include the subject in the summary; just describe what the email says.',
    'Output plain prose only — no bullets, no headings, no quotes around it.',
  ].join(' ')
  const user = [
    `DIRECTION: ${input.direction}`,
    `SUBJECT: ${input.subject ?? '(none)'}`,
    input.fromAddress ? `FROM: ${input.fromAddress}` : null,
    '',
    'BODY:',
    cleanBody || '(no body text)',
    '',
    'SUMMARY:',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
  return { system, user }
}

function cleanOutput(raw: string | null): string | null {
  if (!raw) return null
  let s = raw.trim()
  s = s.replace(/^["'"]+|["'"]+$/g, '').trim()
  s = s.replace(/^\s*(SUMMARY|OUTPUT)\s*[:\-—]\s*/i, '').trim()
  s = s.replace(/^```[\s\S]*?```$/m, '').trim()
  if (s.length < 8) return null
  if (s.length > 500) s = s.slice(0, 500).trim() + '…'
  return s
}

/**
 * Generate the summary. Always returns SOMETHING — falls back to a
 * subject-and-first-120-chars string when Claude isn't available.
 */
export async function summariseEmail(
  input: SummariseEmailInput
): Promise<SummariseEmailOutput> {
  if (!isAnthropicConfigured()) {
    return { summary: fallbackSummary(input), isFallback: true, modelVersion: 'fallback' }
  }

  const { system, user } = buildSummariserPrompt(input)
  try {
    const raw = await claudeOneShot({
      system,
      user,
      model: MODEL,
      maxTokens: 220,
      temperature: 0.3,
    })
    const cleaned = cleanOutput(raw)
    if (!cleaned) {
      return { summary: fallbackSummary(input), isFallback: true, modelVersion: 'fallback' }
    }
    return { summary: cleaned, isFallback: false, modelVersion: MODEL }
  } catch (err) {
    console.warn('[email-summariser] claudeOneShot failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return { summary: fallbackSummary(input), isFallback: true, modelVersion: 'fallback' }
  }
}

export { fallbackSummary }

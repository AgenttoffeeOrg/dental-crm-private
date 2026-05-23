/**
 * Phase 2b.40 — AI persona summary generator.
 *
 * Synthesises a 2–3 sentence "what kind of person is this" blurb from
 * a contact's full conversation history. Surfaced on the contact
 * detail page under the KPI strip (see [[contact-detail]] redesign).
 *
 * Design points:
 *   - Pulls the most-recent 200 activities for the contact (cap to
 *     keep the prompt under Claude's window). Older history doesn't
 *     change the persona meaningfully.
 *   - Falls back to a deterministic templated string if Claude isn't
 *     configured OR if the model returns empty/blocked output. The
 *     UI must always have something to render — the persona block
 *     can never be empty when there's any signal.
 *   - Pure function over the inputs you pass; the caller (the POST
 *     route) is responsible for DB reads + writes.
 */

import { claudeOneShot, isAnthropicConfigured } from '@/lib/anthropic-client'

export interface PersonaActivity {
  direction: 'inbound' | 'outbound' | null
  type: string | null
  description: string | null
  snippet: string | null
  body: string | null
  occurred_at: string
}

export interface PersonaDeal {
  title: string | null
  pipeline_name: string | null
  stage_name: string | null
  status: string | null
  value_estimate_cents: number | null
  created_at: string
}

export interface GeneratePersonaInput {
  contactName: string
  source: string | null
  tags: string[] | null
  deals: PersonaDeal[]
  activities: PersonaActivity[]
}

export interface GeneratePersonaOutput {
  summary: string
  isFallback: boolean
  modelVersion: string
}

const MODEL = 'claude-haiku-4-5-20251001'

/**
 * Take the activity list and render it as plain-text lines the model
 * can read. Cap at 200 most recent. Each line is short to keep token
 * cost down.
 */
function renderActivityLog(activities: PersonaActivity[]): string {
  const recent = activities.slice(0, 200)
  return recent
    .map((a) => {
      const direction = a.direction === 'inbound' ? '←' : a.direction === 'outbound' ? '→' : '·'
      const body =
        (a.body ?? a.description ?? a.snippet ?? '')
          .toString()
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 200)
      const when = new Date(a.occurred_at).toISOString().slice(0, 10)
      return `${when} ${direction} ${a.type ?? 'activity'}: ${body || '(no body)'}`
    })
    .join('\n')
}

function renderDealLine(d: PersonaDeal): string {
  const value = d.value_estimate_cents ? `£${Math.round(d.value_estimate_cents / 100)}` : '—'
  return `${d.title ?? '(untitled deal)'} · ${d.pipeline_name ?? '?'} · ${d.stage_name ?? '?'} · ${value}`
}

function buildFallbackSummary(input: GeneratePersonaInput): string {
  const dealCount = input.deals.length
  const activityCount = input.activities.length
  if (activityCount === 0 && dealCount === 0) {
    return 'Not enough history yet — open a conversation to see a summary appear.'
  }
  const last = input.activities[0]
  const lastWhen = last
    ? new Date(last.occurred_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'never'
  const dealLine =
    dealCount === 0
      ? 'No deals yet.'
      : `${dealCount} deal${dealCount === 1 ? '' : 's'} across the relationship.`
  return `${input.contactName}. ${dealLine} Most recent activity: ${lastWhen}. Source: ${input.source ?? 'unknown'}.`
}

/**
 * Build the full system + user prompt for the model. Exported for
 * unit tests so we can assert prompt-shape invariants without firing
 * a Claude call.
 */
export function buildPersonaPrompt(input: GeneratePersonaInput): { system: string; user: string } {
  const system = [
    'You are a CRM assistant for a UK dental practice.',
    "Summarise a patient's communication history in 2-3 sentences (about 50-80 words).",
    'Focus on: how they communicate (channel preference, response speed, tone), ' +
      'what journey stage they are in, and anything specific or memorable about them.',
    'Style: factual, no fluff. No bullets, no headings — just prose. UK English.',
    'If the history is sparse, say so concisely; do not invent specifics.',
  ].join(' ')

  const tagsLine = input.tags && input.tags.length > 0 ? input.tags.join(', ') : '(none)'
  const dealsBlock =
    input.deals.length === 0
      ? '(no deals yet)'
      : input.deals.map(renderDealLine).join('\n')
  const activityBlock =
    input.activities.length === 0
      ? '(no recorded activity yet)'
      : renderActivityLog(input.activities)

  const user = [
    `CONTACT: ${input.contactName || '(unnamed)'}`,
    `SOURCE: ${input.source ?? 'unknown'}`,
    `TAGS: ${tagsLine}`,
    '',
    'DEALS:',
    dealsBlock,
    '',
    'RECENT ACTIVITY (most recent first, capped at 200 lines, "←" = inbound from patient, "→" = outbound from practice):',
    activityBlock,
    '',
    'OUTPUT (2-3 sentences, plain prose):',
  ].join('\n')

  return { system, user }
}

/**
 * Strip wrappers / quoting Claude sometimes adds, and enforce sentence
 * count + length. Returns null if the output is empty or looks
 * malformed (caller falls back to the templated string in that case).
 */
function cleanModelOutput(raw: string | null): string | null {
  if (!raw) return null
  let s = raw.trim()
  // Strip leading "Summary:" or quotes
  // 2b.57.3 (LOW #6) — strip leading/trailing straight quotes ("),
  // straight apostrophes ('), and curly Unicode quotes (“
  // ” ‘ ’). The previous regex had a duplicate "
  // character class element (no smart-quote handling).
  s = s.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim()
  s = s.replace(/^\s*(SUMMARY|OUTPUT|PERSONA)\s*[:\-—]\s*/i, '').trim()
  // Drop any code fences
  s = s.replace(/^```[\s\S]*?```$/m, '').trim()
  if (s.length < 8) return null
  // Hard cap at 600 chars — anything longer means the model rambled.
  if (s.length > 600) s = s.slice(0, 600).trim() + '…'
  return s
}

/**
 * Generate the persona summary. If Anthropic isn't configured (no
 * API key in env), returns the deterministic fallback. If the API
 * call errors, also returns the fallback — never throws.
 */
export async function generatePersonaSummary(
  input: GeneratePersonaInput
): Promise<GeneratePersonaOutput> {
  if (!isAnthropicConfigured()) {
    return {
      summary: buildFallbackSummary(input),
      isFallback: true,
      modelVersion: 'fallback',
    }
  }

  const { system, user } = buildPersonaPrompt(input)
  try {
    const raw = await claudeOneShot({
      system,
      user,
      model: MODEL,
      maxTokens: 300,
      temperature: 0.3,
    })
    const cleaned = cleanModelOutput(raw)
    if (!cleaned) {
      return {
        summary: buildFallbackSummary(input),
        isFallback: true,
        modelVersion: 'fallback',
      }
    }
    return { summary: cleaned, isFallback: false, modelVersion: MODEL }
  } catch (err) {
    console.warn('[persona-summary] claudeOneShot failed', {
      contactName: input.contactName,
      err: err instanceof Error ? err.message : String(err),
    })
    return {
      summary: buildFallbackSummary(input),
      isFallback: true,
      modelVersion: 'fallback',
    }
  }
}

/**
 * Refresh threshold — auto-regenerate when this many new
 * inbound/outbound activities have arrived since the last summary
 * was generated. Per Q2 audit recommendation.
 */
export const AUTO_REFRESH_ACTIVITY_DELTA = 5

export { buildFallbackSummary }

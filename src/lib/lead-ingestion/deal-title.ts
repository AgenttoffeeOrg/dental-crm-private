/**
 * Phase 2b.34.1 — Generate a short, human-readable deal title from
 * the inbound message that triggered the deal.
 *
 * Background: until now every router-driven deal was titled
 * "Inquiry" because nothing read the message content. Joey Baby's
 * contact ended up with three deals all called "Inquiry" — useless
 * for the practice's deal-list / kanban view. This module fixes
 * that by asking Claude haiku (cheap, fast) for a 3-word title.
 *
 * Failure modes are all graceful — empty / vague / API-down all
 * fall back to a sensible default the caller passes in (usually
 * "Inquiry" so the existing behaviour is preserved when AI is
 * unavailable).
 */

import {
  DEFAULT_CLAUDE_MODEL,
  claudeOneShot,
  isAnthropicConfigured,
} from '@/lib/anthropic-client'

export interface DealTitleInput {
  /** The inbound free-text the patient sent. */
  intentText: string | null | undefined
  /**
   * Optional pipeline name — pasted into the prompt so Claude can
   * write a title that fits the pipeline's vocabulary (e.g. when
   * the pipeline is "Cosmetic Dentistry", a message mentioning
   * whitening gets "Whitening consult" rather than just "Whitening").
   */
  pipelineName?: string | null
  /**
   * The fallback we use when AI is off, errors, or returns garbage.
   * Defaults to 'Inquiry' to preserve existing behaviour.
   */
  fallback?: string
}

const DEFAULT_FALLBACK = 'Inquiry'
const MAX_TITLE_LEN = 60
const MIN_INTENT_LEN = 3

/**
 * Pure-ish: only calls Claude. No DB reads or writes. Safe to call
 * from inside deal-creation.ts.
 */
export async function generateDealTitle(input: DealTitleInput): Promise<string> {
  const fallback = (input.fallback ?? DEFAULT_FALLBACK).trim() || DEFAULT_FALLBACK
  const intent = (input.intentText ?? '').trim()

  // Too short to glean intent from. Cheap exit before we hit Claude.
  if (intent.length < MIN_INTENT_LEN) return fallback

  if (!isAnthropicConfigured()) return fallback

  const pipelineHint =
    input.pipelineName && input.pipelineName.trim().length > 0
      ? `The deal will live in the "${input.pipelineName.trim()}" pipeline.`
      : ''

  const system = [
    'You write short titles for dental-practice CRM deals.',
    'You read a single inbound patient message and respond with a 2–5 word title that names the treatment or topic.',
    'Rules:',
    '- Reply with the title only. No quotes, no preamble, no punctuation at the end.',
    '- 2 to 5 words. Title case.',
    '- Mention the treatment when it\'s clearly named (e.g. "Implant Consult", "Invisalign Enquiry", "Hygiene Question").',
    '- For admin or vague messages with no treatment ("opening hours", "thanks", "any update"), return "General Enquiry".',
    '- Never invent details the message doesn\'t contain.',
  ].join('\n')

  const user = [
    pipelineHint,
    'Patient message:',
    `"""${intent.substring(0, 600)}"""`,
    '',
    'Title:',
  ]
    .filter(Boolean)
    .join('\n')

  let raw: string | null
  try {
    raw = await claudeOneShot({
      system,
      user,
      model: DEFAULT_CLAUDE_MODEL,
      maxTokens: 40,
      temperature: 0.2,
    })
  } catch (err) {
    console.warn('[deal-title] Claude error — using fallback', {
      err: err instanceof Error ? err.message : String(err),
    })
    return fallback
  }
  if (!raw) return fallback

  const cleaned = cleanTitle(raw)
  if (!cleaned) return fallback
  return cleaned
}

/**
 * Strip surrounding whitespace / quotes / trailing punctuation, cap
 * length, and reject anything Claude returned that's clearly not a
 * title (newlines mid-string, leading bullets, etc.). Exported for
 * unit tests.
 */
export function cleanTitle(raw: string): string | null {
  let t = raw.trim()
  // Drop leading "Title:" or list bullets — Claude occasionally adds them
  // despite the system prompt.
  t = t.replace(/^(title\s*:\s*|[-*•]\s*)/i, '').trim()
  // Strip surrounding quotes (single, double, smart).
  t = t.replace(/^["'“‘]|["'”’]$/g, '').trim()
  // Drop trailing punctuation but keep internal punctuation (e.g. "Mr. Smith" intact).
  t = t.replace(/[.!?…]+$/g, '').trim()
  // First newline-bounded segment only (Claude sometimes adds explanation).
  const firstLine = t.split(/\n/)[0]?.trim() ?? ''
  if (firstLine.length === 0) return null
  // Word-count and length sanity.
  const words = firstLine.split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  if (words.length > 8) return null // got verbose — bail
  if (firstLine.length > MAX_TITLE_LEN) return null
  return firstLine
}

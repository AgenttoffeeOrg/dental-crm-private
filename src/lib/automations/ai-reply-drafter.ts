/**
 * Phase 2b.15 — AI reply drafter for the automation engine.
 *
 * Takes a tenant + contact + a triggering inbound activity and asks
 * Claude (haiku-4-5 by default) to draft a reply that sounds like the
 * practice. The system prompt is built from the tenant's Practice
 * Brain (brand voice, services, pricing, opening hours, FAQs,
 * escalation rules, additional instructions) so every reply respects
 * the practice's voice and constraints.
 *
 * Used by the `send_ai_reply` engine action. Throws on any failure
 * (missing brain field, API error, empty response) so the engine's
 * fallback-template path can take over.
 */

import { createServiceClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_CLAUDE_MODEL,
  claudeOneShot,
  isAnthropicConfigured,
} from '@/lib/anthropic-client'
import {
  buildPracticeBrainPromptFragment,
  loadPracticeBrain,
  type PracticeBrain,
} from '@/lib/automations/practice-brain'

export type DrafterChannel = 'sms' | 'whatsapp' | 'email'

export interface DraftReplyInput {
  tenantId: string
  contactId: string
  channel: DrafterChannel
  /** Triggering activity id (the inbound message the AI is replying to). */
  triggerActivityId?: string
  /** Override the practice brand voice from Practice Brain. */
  toneOverride?: string
  /** Phrase to inject into system prompt for hard-escalation cases. */
  escalationPhrase?: string
  /** Custom Claude model id (default: claude-haiku-4-5-20251001). */
  model?: string
  /** Max history activities to pull into context (default 6). */
  historyDepth?: number
}

export interface DraftReplyOutput {
  /** The drafted message body. Empty string is never returned — drafter throws on empty. */
  body: string
  /** Channel-shaped subject (only set for email). */
  subject?: string
  /** AI metadata to stamp on the outbound activity. */
  metadata: {
    provider: 'anthropic'
    model: string
    practice_brain_used: boolean
    trigger_activity_id?: string
    /** Hash of the prompt for debugging — not the prompt itself, to keep PII out of long-lived rows. */
    prompt_fingerprint?: string
  }
}

const SMS_CHAR_HINT = 160
const WHATSAPP_CHAR_HINT = 1000

/**
 * Build the system prompt that Claude sees. Includes Practice Brain
 * fragment + channel-shaped instructions + escalation language.
 */
function buildSystemPrompt(
  brain: PracticeBrain,
  channel: DrafterChannel,
  toneOverride?: string,
  escalationPhrase?: string
): string {
  const sections: string[] = []

  sections.push(
    "You are the practice's AI assistant drafting a reply on its behalf. Reply in the practice's voice. Be warm, helpful and brief. Never invent prices, treatments, opening hours, or guarantees the practice has not given you. If the patient mentions pain, an emergency, or anything that needs a human, escalate without trying to solve it."
  )

  // 2b.24.6: personalise. When the patient's name is provided in the
  // user prompt under "Patient name:", use their FIRST name (the first
  // whitespace-separated token, ignoring titles like "Mr"/"Mrs"/"Dr")
  // where it makes the reply feel personal — typically the opener on
  // the first reply of a thread, or naturally inside a sentence. Don't
  // force a greeting on every single message. If no name is provided,
  // just reply without one.
  sections.push(
    "Personalise the reply. If a patient name is given, address them by their first name where it sounds natural — usually once near the start. Skip the name on quick follow-up replies in the same thread (no need to greet on every message). Never use the full name or a surname on its own. If no name is given, reply without one."
  )

  if (toneOverride?.trim()) {
    sections.push(`Tone override for this reply:\n${toneOverride.trim()}`)
  }

  const brainPrompt = buildPracticeBrainPromptFragment(brain)
  if (brainPrompt) {
    sections.push(brainPrompt)
  }

  if (escalationPhrase?.trim()) {
    sections.push(
      `If the patient mentions any of these, escalate immediately by replying once with the line below and stop:\n"${escalationPhrase.trim()}"`
    )
  }

  switch (channel) {
    case 'sms':
      sections.push(
        `Channel: SMS. Keep replies under ${SMS_CHAR_HINT} characters where possible. No greetings on every message. No emoji unless the patient used emoji first.`
      )
      break
    case 'whatsapp':
      sections.push(
        `Channel: WhatsApp. Keep replies under ${WHATSAPP_CHAR_HINT} characters. Casual but professional.`
      )
      break
    case 'email':
      sections.push(
        'Channel: Email. Two short paragraphs at most. End with a friendly sign-off using the practice name from the brand voice. If a subject line is needed, prefix the output with "SUBJECT: <subject>" on the first line, then a blank line, then the body.'
      )
      break
  }

  sections.push(
    'Output the reply directly — no preamble, no "Sure, here is …", no markdown.'
  )

  return sections.join('\n\n')
}

interface ActivityRow {
  id: string
  type: string | null
  direction: string | null
  subject: string | null
  description: string | null
  snippet: string | null
  occurred_at: string | null
}

async function loadConversationContext(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string,
  channel: DrafterChannel,
  triggerActivityId: string | undefined,
  historyDepth: number
): Promise<{
  trigger: ActivityRow | null
  history: ActivityRow[]
  contactName: string | null
}> {
  let trigger: ActivityRow | null = null

  if (triggerActivityId) {
    const { data } = await supabase
      .from('activities')
      .select('id, type, direction, subject, description, snippet, occurred_at')
      .eq('id', triggerActivityId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    trigger = (data as ActivityRow | null) ?? null
  }

  const { data: history } = await supabase
    .from('activities')
    .select('id, type, direction, subject, description, snippet, occurred_at')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .eq('type', channel)
    .order('occurred_at', { ascending: false })
    .limit(historyDepth)

  // 2b.24.6: pull the contact's name so Claude can personalise the
  // reply. Best-effort — if the lookup fails or the name is empty,
  // the prompt simply omits the "Patient name:" line and the
  // drafter falls back to a name-free reply.
  let contactName: string | null = null
  try {
    const { data: contactRow } = await supabase
      .from('contacts')
      .select('full_name')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    const raw = ((contactRow as { full_name?: string | null } | null)?.full_name ?? '')
      .toString()
      .trim()
    if (raw.length > 0) contactName = raw
  } catch {
    contactName = null
  }

  return {
    trigger,
    history: (history as ActivityRow[] | null) ?? [],
    contactName,
  }
}

function buildUserPrompt(
  trigger: ActivityRow | null,
  history: ActivityRow[],
  channel: DrafterChannel,
  contactName: string | null
): string {
  const lines: string[] = []

  if (contactName) {
    lines.push(`Patient name: ${contactName}`)
    lines.push('')
  }

  if (history.length > 0) {
    lines.push(`Previous ${channel} messages (newest first):`)
    for (const row of history) {
      const who = row.direction === 'outbound' ? 'Practice' : 'Patient'
      const body = (row.description ?? row.snippet ?? '').toString().trim()
      if (!body) continue
      lines.push(`- [${who}] ${body.substring(0, 400)}`)
    }
    lines.push('')
  }

  if (trigger) {
    const body = (trigger.description ?? trigger.snippet ?? '').toString().trim()
    if (body) {
      lines.push('Draft a reply to this inbound message:')
      lines.push(`"""${body}"""`)
    }
  } else {
    lines.push('Draft a friendly opening message to the patient.')
  }

  return lines.join('\n')
}

function fingerprint(text: string): string {
  // Cheap non-cryptographic fingerprint. Good enough for "did we ask
  // the same question last time" debugging without writing the full
  // prompt to long-lived rows.
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return `f${(hash >>> 0).toString(16)}`
}

function splitEmailSubject(raw: string): { subject?: string; body: string } {
  const trimmed = raw.trim()
  const m = trimmed.match(/^SUBJECT:\s*(.+?)\n\s*\n([\s\S]+)$/m)
  if (m) return { subject: m[1].trim(), body: m[2].trim() }
  return { body: trimmed }
}

export async function draftAiReply(
  input: DraftReplyInput,
  options: { supabase?: SupabaseClient } = {}
): Promise<DraftReplyOutput> {
  if (!isAnthropicConfigured()) {
    throw new Error(
      'ANTHROPIC_API_KEY not configured. Set it on Vercel before enabling AI auto-replies.'
    )
  }

  const supabase = options.supabase ?? createServiceClient()
  const brain = await loadPracticeBrain(input.tenantId)
  const history = await loadConversationContext(
    supabase,
    input.tenantId,
    input.contactId,
    input.channel,
    input.triggerActivityId,
    input.historyDepth ?? 6
  )

  const systemPrompt = buildSystemPrompt(
    brain,
    input.channel,
    input.toneOverride,
    input.escalationPhrase
  )
  const userPrompt = buildUserPrompt(
    history.trigger,
    history.history,
    input.channel,
    history.contactName
  )

  const completion = await claudeOneShot({
    system: systemPrompt,
    user: userPrompt,
    model: input.model ?? DEFAULT_CLAUDE_MODEL,
    maxTokens: input.channel === 'email' ? 800 : 350,
    temperature: 0.5,
  })

  if (!completion || completion.trim().length === 0) {
    throw new Error('AI drafter returned no text')
  }

  const model = input.model ?? DEFAULT_CLAUDE_MODEL
  const prompt_fingerprint = fingerprint(systemPrompt + '\n' + userPrompt)

  if (input.channel === 'email') {
    const { subject, body } = splitEmailSubject(completion)
    return {
      body,
      subject: subject ?? 'A note from your dental practice',
      metadata: {
        provider: 'anthropic',
        model,
        practice_brain_used:
          Boolean(buildPracticeBrainPromptFragment(brain).length > 0),
        trigger_activity_id: input.triggerActivityId,
        prompt_fingerprint,
      },
    }
  }

  return {
    body: completion.trim(),
    metadata: {
      provider: 'anthropic',
      model,
      practice_brain_used:
        Boolean(buildPracticeBrainPromptFragment(brain).length > 0),
      trigger_activity_id: input.triggerActivityId,
      prompt_fingerprint,
    },
  }
}

/**
 * Phase 2b.93 — Claude-generated pre-call brief.
 *
 * Produces a tight, operator-facing brief for the Call Coaching
 * takeover. Two parts:
 *
 *   1. A 2-3 sentence "what's happened so far" summary of the
 *      relationship — informed by recent activities, persona, and
 *      deal context.
 *
 *   2. 3-5 talking points specific to THIS call — what to bring up,
 *      what to ask, what to anchor on. Not generic; uses the
 *      patient's persona + history to point at the most relevant
 *      angle.
 *
 * Cached on contacts.metadata.pre_call_brief so we don't re-spend
 * tokens per render. Considered stale when ≥3 new activities have
 * happened since `generated_at` (cheap proxy for "the conversation
 * has moved on, regenerate").
 */

import { claudeOneShot } from '@/lib/anthropic-client'

export interface PreCallBriefInput {
  contactName: string | null
  taskTitle: string
  personaSnapshot: {
    dominant_persona?: string | null
    trust_score?: number | null
    anxiety_level?: number | null
    communication_style?: string | null
    decision_style?: string | null
    recommended_approach?: string | null
    key_concerns?: string[] | null
    motivations?: string[] | null
  } | null
  deal: {
    title?: string | null
    stage_name?: string | null
    value_estimate_cents?: number | null
    treatment_tags?: string[] | null
  } | null
  recentActivities: Array<{
    occurred_at: string
    type: string | null
    direction: string | null
    subject: string | null
    body: string | null
    ai_summary?: string | null
  }>
}

export interface PreCallBrief {
  summary: string
  talking_points: string[]
  generated_at: string
  model_version: string
  activity_count: number
}

const SYSTEM_PROMPT = `You are a dental practice sales coach briefing a receptionist before they pick up the phone.

Output STRICT JSON with this shape:
{
  "summary": string,           // 2-3 sentences, plain English. The relationship so far + what state they're in.
  "talking_points": string[]   // 3-5 short bullets. Specific to THIS patient. Each <= 18 words.
}

Rules:
- Speak in plain English. No jargon, no fluff, no "leverage" or "synergy".
- Each talking point starts with a verb ("Acknowledge", "Ask", "Reassure", "Reference", "Propose").
- Tie talking points to what the patient has actually said + their persona, not generic sales script lines.
- Never invent facts. If you don't know something, omit it.
- No markdown, no preamble. Return ONLY the JSON object.`

function summariseActivity(a: PreCallBriefInput['recentActivities'][number]): string {
  const dir = a.direction === 'inbound' ? '← in' : '→ out'
  const when = new Date(a.occurred_at).toISOString().slice(0, 10)
  const channel = a.type ?? 'activity'
  const text = a.ai_summary?.trim() || a.subject?.trim() || a.body?.trim() || '(no content)'
  return `${when} ${dir} ${channel}: ${text.slice(0, 320)}`
}

function formatCurrency(cents: number | null | undefined): string {
  if (!cents) return ''
  return `£${(cents / 100).toLocaleString('en-GB')}`
}

function buildUserPrompt(input: PreCallBriefInput): string {
  const parts: string[] = []
  parts.push(`# Patient`)
  parts.push(`Name: ${input.contactName ?? 'Unknown'}`)
  parts.push(`Call task: ${input.taskTitle}`)

  if (input.personaSnapshot) {
    const p = input.personaSnapshot
    parts.push(``)
    parts.push(`# Persona`)
    if (p.dominant_persona) parts.push(`Dominant: ${p.dominant_persona}`)
    if (p.trust_score != null) parts.push(`Trust: ${p.trust_score}`)
    if (p.anxiety_level != null) parts.push(`Anxiety: ${p.anxiety_level}`)
    if (p.communication_style) parts.push(`Communication: ${p.communication_style}`)
    if (p.decision_style) parts.push(`Decision style: ${p.decision_style}`)
    if (p.recommended_approach) parts.push(`Recommended approach: ${p.recommended_approach}`)
    if (p.key_concerns?.length) parts.push(`Key concerns: ${p.key_concerns.slice(0, 4).join('; ')}`)
    if (p.motivations?.length) parts.push(`Motivations: ${p.motivations.slice(0, 4).join('; ')}`)
  }

  if (input.deal) {
    const d = input.deal
    parts.push(``)
    parts.push(`# Deal`)
    if (d.title) parts.push(`Title: ${d.title}`)
    if (d.stage_name) parts.push(`Stage: ${d.stage_name}`)
    if (d.value_estimate_cents) parts.push(`Value: ${formatCurrency(d.value_estimate_cents)}`)
    if (d.treatment_tags?.length) parts.push(`Treatment: ${d.treatment_tags.slice(0, 3).join(', ')}`)
  }

  if (input.recentActivities.length > 0) {
    parts.push(``)
    parts.push(`# Recent activities (newest first, last 10)`)
    for (const a of input.recentActivities.slice(0, 10)) {
      parts.push(`- ${summariseActivity(a)}`)
    }
  } else {
    parts.push(``)
    parts.push(`# Recent activities`)
    parts.push(`None yet — this is a first touch.`)
  }

  parts.push(``)
  parts.push(
    `Based on this context, produce the briefing JSON. Remember: plain English, specific to this patient, no fluff.`
  )
  return parts.join('\n')
}

const FALLBACK_BRIEF: Omit<PreCallBrief, 'generated_at' | 'model_version' | 'activity_count'> = {
  summary:
    "Patient has no recorded history yet — treat this as a first touch. Open warmly, listen for what's brought them in, and avoid pitching anything specific until you've heard their need.",
  talking_points: [
    'Open warmly and introduce yourself + the practice',
    'Ask what they\'re hoping to get out of the call',
    'Listen for any anxiety signals (past dental experience)',
    'Confirm the best contact details before hanging up',
  ],
}

export async function generatePreCallBrief(
  input: PreCallBriefInput,
  modelVersion = 'claude-haiku-4-5-20251001'
): Promise<PreCallBrief> {
  const now = new Date().toISOString()
  try {
    const raw = await claudeOneShot({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input),
      model: modelVersion,
      maxTokens: 800,
      temperature: 0.3,
    })
    if (!raw) throw new Error('Empty response from Claude')
    // Strip possible code fence + trim
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as { summary?: string; talking_points?: string[] }
    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.talking_points) ||
      parsed.talking_points.length === 0
    ) {
      throw new Error('Malformed JSON from Claude')
    }
    return {
      summary: parsed.summary.trim(),
      talking_points: parsed.talking_points.map((p) => String(p).trim()).filter(Boolean),
      generated_at: now,
      model_version: modelVersion,
      activity_count: input.recentActivities.length,
    }
  } catch (err) {
    console.warn('[pre-call-brief] generation failed — returning fallback', err)
    return {
      ...FALLBACK_BRIEF,
      generated_at: now,
      model_version: modelVersion,
      activity_count: input.recentActivities.length,
    }
  }
}

export const STALE_ACTIVITY_DELTA = 3

/**
 * Phase 2b.18 — Always-on FAQ responder.
 *
 * Subscribes to INBOUND.SMS_RECEIVED and INBOUND.WHATSAPP_RECEIVED.
 * For each inbound, asks Claude (haiku-4-5) whether the message is
 * a generic FAQ-type question (opening hours / pricing / services /
 * directions / NHS-vs-private etc) AND whether the Practice Brain
 * carries enough information to answer it. If yes, dispatches a
 * single concise reply on the same channel. If no, does nothing —
 * a human picks it up.
 *
 * Gating order (any failing check skips this inbound):
 *   1. Tenant must have `tenant_ai_context.faq_responder_enabled = true`.
 *   2. ANTHROPIC_API_KEY must be set.
 *   3. The contact must not have an active automation_run whose
 *      workflow_config.on_patient_reply = 'ai_continue' (nurture wins
 *      coexistence — that workflow already drafts replies).
 *   4. Idempotency: no existing outbound activity in this
 *      conversation_id with integration_metadata.faq_responder = true
 *      within the last 24h (so the responder never double-replies
 *      to the same inbound, and won't loop on a back-and-forth).
 *
 * Server-only. Bootstrapped from `instrumentation.ts`.
 */

import { eventService, type EventMap } from '@/lib/events-unified'
import { createServiceClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

let bootstrapped = false
const unsubscribers: Array<() => void> = []

export function initializeFaqResponder(): void {
  if (bootstrapped) return
  bootstrapped = true

  unsubscribers.push(
    eventService.on('INBOUND.SMS_RECEIVED', async (data) => {
      try {
        await handleInbound(data, 'sms')
      } catch (err) {
        console.error('[faq-responder] SMS handler crashed', err)
      }
    })
  )
  unsubscribers.push(
    eventService.on('INBOUND.WHATSAPP_RECEIVED', async (data) => {
      try {
        await handleInbound(data, 'whatsapp')
      } catch (err) {
        console.error('[faq-responder] WhatsApp handler crashed', err)
      }
    })
  )

  console.log('[faq-responder] listener subscribed')
}

export function teardownFaqResponder(): void {
  unsubscribers.forEach((u) => u())
  unsubscribers.length = 0
  bootstrapped = false
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

type InboundPayload = EventMap['INBOUND.SMS_RECEIVED'] | EventMap['INBOUND.WHATSAPP_RECEIVED']
type Channel = 'sms' | 'whatsapp'

async function handleInbound(data: InboundPayload, channel: Channel): Promise<void> {
  if (!data?.tenantId || !data?.contactId) return
  const body = (data.body ?? '').trim()
  if (!body) return

  const supabase = createServiceClient()

  // 1. Tenant toggle
  const { data: ctxRow } = await supabase
    .from('tenant_ai_context')
    .select('faq_responder_enabled')
    .eq('tenant_id', data.tenantId)
    .maybeSingle()
  if (!(ctxRow as { faq_responder_enabled?: boolean } | null)?.faq_responder_enabled) return

  // 2. Anthropic
  const { isAnthropicConfigured } = await import('@/lib/anthropic-client')
  if (!isAnthropicConfigured()) return

  // 3. Coexistence with ai_continue nurture workflows
  if (await hasAiContinueRun(supabase, data.tenantId, data.contactId)) {
    return
  }

  // 4. Idempotency — recent faq_responder outbound on the same conversation
  if (await recentFaqReplyExists(supabase, data.tenantId, data.contactId, channel)) {
    return
  }

  // 5. Practice Brain
  const { loadPracticeBrain, buildPracticeBrainPromptFragment } = await import(
    '@/lib/automations/practice-brain'
  )
  const brain = await loadPracticeBrain(data.tenantId)

  // 6. Ask Claude — strict JSON
  const { claudeOneShot, DEFAULT_CLAUDE_MODEL } = await import('@/lib/anthropic-client')
  const system = [
    "You are a dental-practice FAQ responder. Decide whether an inbound message is a generic FAQ-type question (opening hours, pricing, services offered, location/directions, NHS-vs-private, payment options, parking) that the practice's knowledge base can answer.",
    "Reply with VALID JSON only, no preamble, no markdown: { \"is_faq\": true|false, \"answer\": \"...\" }. If is_faq is false, set answer to an empty string and do not invent content. Never invent prices, hours, services, or guarantees not present in the knowledge base.",
    "Keep answers under 320 characters. Be warm, helpful, one short paragraph.",
  ].join('\n')

  const brainPrompt = buildPracticeBrainPromptFragment(brain)
  const user = [
    brainPrompt ? `Practice knowledge base:\n${brainPrompt}\n` : 'Practice knowledge base: (mostly empty).\n',
    `Inbound ${channel === 'sms' ? 'SMS' : 'WhatsApp'} from a patient:`,
    `"""${body.substring(0, 1200)}"""`,
  ].join('\n')

  let raw: string | null = null
  try {
    raw = await claudeOneShot({
      system,
      user,
      model: DEFAULT_CLAUDE_MODEL,
      maxTokens: 300,
      temperature: 0.2,
    })
  } catch (err) {
    console.warn('[faq-responder] Claude error (skipping reply)', { err })
    return
  }
  if (!raw) return

  let parsed: { is_faq?: boolean; answer?: string }
  try {
    parsed = JSON.parse(stripJsonFence(raw)) as typeof parsed
  } catch {
    console.warn('[faq-responder] Claude returned non-JSON', { raw: raw.substring(0, 200) })
    return
  }
  if (!parsed.is_faq || !parsed.answer || parsed.answer.trim().length === 0) return

  // 7. Dispatch via dispatcher
  const channelTarget = data.fromNumber || (await contactPhone(supabase, data.contactId))
  if (!channelTarget) return

  const dispatcher = await import('@/lib/communications/dispatcher')
  const dispatch = channel === 'sms' ? dispatcher.dispatchSms : dispatcher.dispatchWhatsApp
  let activityId: string | undefined
  try {
    const result = await dispatch({
      context: {
        tenantId: data.tenantId,
        contactId: data.contactId,
        dealId: data.dealId ?? undefined,
      },
      to: channelTarget,
      message: parsed.answer.trim(),
    })
    activityId = result?.activityId ?? undefined
  } catch (err) {
    console.warn('[faq-responder] dispatch failed', { err })
    return
  }

  // 8. Stamp metadata so idempotency check finds it next time
  if (activityId) {
    const { data: existing } = await supabase
      .from('activities')
      .select('integration_metadata')
      .eq('id', activityId)
      .maybeSingle()
    const current = (existing?.integration_metadata as Record<string, unknown> | null) ?? {}
    await supabase
      .from('activities')
      .update({
        integration_metadata: {
          ...current,
          faq_responder: true,
          ai: { ...((current.ai as Record<string, unknown> | undefined) ?? {}), provider: 'anthropic_faq' },
        },
      })
      .eq('id', activityId)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hasAiContinueRun(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('automation_runs')
    .select('automation_id, automations!inner(workflow_config)')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .in('state', ['running', 'waiting'])
  const rows = (data as Array<{ automations?: { workflow_config?: Record<string, unknown> } | null }> | null) ?? []
  for (const row of rows) {
    const cfg = row.automations?.workflow_config as { on_patient_reply?: string } | undefined
    if (cfg?.on_patient_reply === 'ai_continue') return true
  }
  return false
}

async function recentFaqReplyExists(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string,
  channel: Channel
): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('activities')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .eq('type', channel)
    .eq('direction', 'outbound')
    .gte('occurred_at', cutoff)
    .contains('integration_metadata', { faq_responder: true })
    .limit(1)
  return Array.isArray(data) && data.length > 0
}

async function contactPhone(supabase: SupabaseClient, contactId: string): Promise<string | null> {
  const { data } = await supabase
    .from('contacts')
    .select('primary_phone, secondary_phone')
    .eq('id', contactId)
    .maybeSingle()
  return ((data?.primary_phone as string | null) ?? (data?.secondary_phone as string | null)) ?? null
}

function stripJsonFence(s: string): string {
  const t = s.trim()
  if (t.startsWith('```')) return t.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim()
  return t
}

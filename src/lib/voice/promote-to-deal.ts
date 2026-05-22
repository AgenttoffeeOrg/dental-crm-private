/**
 * Phase 2b.26.4 — Promote a voice activity to a deal when its
 * transcript clearly indicates treatment intent.
 *
 * Locked product rule (2026-05-22 discussion):
 *   - Calls live on the CONTACT by default.
 *   - Missed calls stay on the contact forever (this helper is never
 *     invoked for them — no transcript ever arrives).
 *   - Voicemail / answered-call transcripts run through the SAME AI
 *     judgement we use for inbound SMS / WhatsApp. The decision tree
 *     diverges from SMS only in the "uncertain" branch:
 *       SMS uncertain  → attach to most-recently-active open deal +
 *                         set ai_attachment_uncertain flag
 *       VOICE uncertain → don't attach. Leave on the contact.
 *     Calls are more mixed (admin / billing / reschedule) than SMS,
 *     so we keep the pipeline timeline clean unless we're confident.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { judgeInboundDealAttachment } from '@/lib/lead-ingestion/judge-deal-attachment'
import { createDealForLead } from '@/lib/lead-ingestion/deal-creation'

export type VoicePromotionResult =
  | {
      kind: 'promoted'
      dealId: string
      source: 'reuse_matching_pipeline' | 'new_pipeline'
    }
  | { kind: 'skipped_uncertain' }
  | { kind: 'skipped_no_transcript' }
  | { kind: 'error'; reason: string }

export interface PromoteInput {
  supabase: SupabaseClient
  tenantId: string
  contactId: string
  activityId: string
  /** The recognised text from Twilio's transcription callback. */
  transcript: string | null | undefined
}

export async function promoteVoiceActivityToDeal(
  input: PromoteInput
): Promise<VoicePromotionResult> {
  const text = (input.transcript ?? '').trim()
  if (text.length === 0) {
    return { kind: 'skipped_no_transcript' }
  }

  // 1. Fetch open deals (with pipeline_id) so the judge can decide
  //    whether the transcript matches an existing deal's pipeline or
  //    points at a brand-new one.
  const { data: openDealsRaw, error: openDealsError } = await input.supabase
    .from('deals')
    .select('id, pipeline_id, pipeline_stages!inner(is_won, is_lost)')
    .eq('tenant_id', input.tenantId)
    .eq('contact_id', input.contactId)
    .eq('pipeline_stages.is_won', false)
    .eq('pipeline_stages.is_lost', false)
    .is('deleted_at', null)

  if (openDealsError) {
    console.warn('[voice-promote] open-deals lookup failed', {
      tenantId: input.tenantId,
      contactId: input.contactId,
      error: openDealsError.message,
    })
    return { kind: 'error', reason: 'open_deals_lookup_failed' }
  }

  const openDeals = (
    (openDealsRaw ?? []) as Array<{ id: string; pipeline_id: string }>
  )
    .filter((d) => d.id && d.pipeline_id)
    .map((d) => ({ id: d.id, pipelineId: d.pipeline_id }))

  // 2. Run the same pipeline-aware judgement we use for SMS.
  const judgement = await judgeInboundDealAttachment({
    tenantId: input.tenantId,
    messageText: text,
    openDeals,
    supabase: input.supabase,
  })

  if (judgement.kind === 'uncertain') {
    // Voice's stricter rule — don't pull an admin/billing/social call
    // onto a deal timeline just because the contact has a deal open.
    return { kind: 'skipped_uncertain' }
  }

  let targetDealId: string
  let source: 'reuse_matching_pipeline' | 'new_pipeline'

  if (judgement.kind === 'reuse_matching_pipeline') {
    targetDealId = judgement.dealId
    source = 'reuse_matching_pipeline'
  } else {
    // new_pipeline → fresh deal in the classified pipeline.
    // createDealForLead handles first-stage + owner resolution
    // consistently with every other channel; the intentText we pass
    // routes it to the same pipeline the judge already chose. (The
    // router runs twice — once here, once inside createDealForLead —
    // a small inefficiency we accept for code reuse. The judge call
    // is cheap if no AI is configured, and Claude haiku is sub-£0.01
    // per classification.)
    const outcome = await createDealForLead(input.supabase, {
      tenantId: input.tenantId,
      contactId: input.contactId,
      treatmentOfferingId: null,
      sourceChannel: 'phone_call_inbound',
      intentText: text,
    })
    if (!outcome.ok) {
      console.warn('[voice-promote] new-pipeline deal creation failed', {
        reason: outcome.reason,
        tenantId: input.tenantId,
        contactId: input.contactId,
      })
      return { kind: 'error', reason: `deal_create_failed:${outcome.reason}` }
    }
    targetDealId = outcome.dealId
    source = 'new_pipeline'
  }

  // 3. Link the existing voice activity to the resolved deal +
  //    record the transcript and the promotion source on the metadata
  //    so the UI / operators can see why a call moved.
  const { data: existing } = await input.supabase
    .from('activities')
    .select('integration_metadata')
    .eq('id', input.activityId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  const existingMeta =
    (existing?.integration_metadata as Record<string, unknown> | null) ?? {}

  const { error: updateError } = await input.supabase
    .from('activities')
    .update({
      deal_id: targetDealId,
      integration_metadata: {
        ...existingMeta,
        transcript: text,
        promotion: {
          promoted_at: new Date().toISOString(),
          source,
          pipeline_id:
            judgement.kind === 'reuse_matching_pipeline'
              ? judgement.pipelineId
              : judgement.pipelineId,
        },
      },
    })
    .eq('id', input.activityId)
    .eq('tenant_id', input.tenantId)

  if (updateError) {
    console.error('[voice-promote] activity link update failed', {
      activityId: input.activityId,
      error: updateError.message,
    })
    return { kind: 'error', reason: 'activity_update_failed' }
  }

  return { kind: 'promoted', dealId: targetDealId, source }
}

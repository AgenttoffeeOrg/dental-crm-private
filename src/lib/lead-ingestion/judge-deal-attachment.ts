/**
 * Phase 2b.24 — Inbound deal-attachment judgement.
 *
 * Decides what to do when an inbound text/WhatsApp lands for a
 * contact who ALREADY has one or more open deals. Three outcomes:
 *
 *   1. `reuse_matching_pipeline` — the message's classified pipeline
 *      matches an existing open deal's pipeline. Attach to that
 *      deal. If multiple open deals share that pipeline, the caller
 *      picks the most recently active among them.
 *
 *   2. `new_pipeline` — the message classified into a pipeline that
 *      none of the existing open deals belong to. Caller creates a
 *      new deal in that pipeline.
 *
 *   3. `uncertain` — the classifier could not commit (no keyword
 *      hit, AI below confidence threshold, or unsorted fallback
 *      fired). Caller attaches to the most recently active open
 *      deal AND tags the activity with `ai_attachment_uncertain`
 *      so the operator can review.
 *
 * Product rules locked in 2026-05-22 product discussion:
 *   - Conservative default — only split when AI is clearly confident
 *     it's a different treatment.
 *   - Pipeline-level granularity — same pipeline = same deal even
 *     for distinct treatments inside that pipeline.
 *
 * Implementation note: reuses `routePipeline()` rather than running
 * a second AI prompt. The router already classifies free-text intent
 * into a pipeline_id with the practice's keyword rules + Claude
 * classifier + confidence threshold; the judgement is just a thin
 * comparison layer over that result.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { routePipeline, type RouteResult } from '@/lib/automations/pipeline-router'

export interface OpenDealRef {
  /** The deal id (used by the caller to know which deal to attach to). */
  id: string
  /** The pipeline that deal lives in — compared against the router's classification. */
  pipelineId: string
}

export interface JudgementInput {
  tenantId: string
  /** The inbound message body (SMS body, WhatsApp body). Empty/null short-circuits to uncertain. */
  messageText: string | null | undefined
  /** Existing open deals for this (tenant, contact). Empty array short-circuits to `new_pipeline` via the router. */
  openDeals: OpenDealRef[]
  /** Service-role client passed through to the router. */
  supabase: SupabaseClient
}

export type JudgementResult =
  | {
      kind: 'reuse_matching_pipeline'
      dealId: string
      pipelineId: string
      confidence: number | null
      source: 'keyword' | 'ai'
    }
  | {
      kind: 'new_pipeline'
      pipelineId: string
      confidence: number | null
      source: 'keyword' | 'ai'
    }
  | {
      kind: 'uncertain'
      reason: 'empty_message' | 'no_router_signal' | 'unsorted_fallback' | 'router_error'
    }

/**
 * Pure-ish: no DB writes, only reads (the router reads
 * `tenant_routing_settings`, `pipelines`, Practice Brain).
 */
export async function judgeInboundDealAttachment(
  input: JudgementInput
): Promise<JudgementResult> {
  const text = (input.messageText ?? '').trim()
  if (text.length === 0) {
    return { kind: 'uncertain', reason: 'empty_message' }
  }

  let route: RouteResult | null
  try {
    route = await routePipeline(
      { tenantId: input.tenantId, intentText: text },
      { supabase: input.supabase }
    )
  } catch (err) {
    console.warn('[judge-deal-attachment] router threw', {
      tenantId: input.tenantId,
      err: err instanceof Error ? err.message : String(err),
    })
    return { kind: 'uncertain', reason: 'router_error' }
  }

  if (!route) {
    return { kind: 'uncertain', reason: 'no_router_signal' }
  }

  // The unsorted fallback means: keywords didn't match, AI either
  // didn't run or was below confidence. From the judgement's point
  // of view that's the same as "not sure" — don't spin up a new
  // deal in the Unsorted pipeline; keep the activity on the existing
  // most-recently-active deal and flag it.
  if (route.source === 'unsorted' || route.source === 'none') {
    return { kind: 'uncertain', reason: 'unsorted_fallback' }
  }

  // Confident classification (keyword hit, or AI above threshold).
  const matching = input.openDeals.find((d) => d.pipelineId === route!.pipelineId)
  if (matching) {
    return {
      kind: 'reuse_matching_pipeline',
      dealId: matching.id,
      pipelineId: route.pipelineId,
      confidence: route.confidence ?? null,
      source: route.source,
    }
  }

  return {
    kind: 'new_pipeline',
    pipelineId: route.pipelineId,
    confidence: route.confidence ?? null,
    source: route.source,
  }
}

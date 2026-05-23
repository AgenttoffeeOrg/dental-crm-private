/**
 * Phase 2a.7 — Deal creation for `ingestLead()`.
 *
 * The 2a.6 audit confirmed that `ingestLead()` historically wrote contacts,
 * touchpoints, activities, and notifications — but never deals. This module
 * fills that gap: every non-`review_required` lead now produces a Deal in
 * addition to the contact/touchpoint/activity, with the title, pipeline,
 * stage, owner and value resolved per the product owner's spec.
 *
 * Resolution rules (verbatim from the 2a.7 prompt):
 *   1. Title: `practice_treatment_offerings.custom_label || treatment_types.display_name`
 *      when an offering matches; `'Inquiry'` otherwise.
 *   2. Pipeline: `offering.pipeline_id` when offering matches; tenant's
 *      `pipelines.is_default = true` otherwise.
 *   3. Stage: `offering.stage_id` when set on the offering (per Pre-flight Q1
 *      finding — the column exists and is honoured); else first stage of the
 *      resolved pipeline by `position ASC`.
 *   4. Value: midpoint of `(custom_lead_value_cents_min, custom_lead_value_cents_max)`
 *      when both set; else min; else max; else NULL. Pre-flight Q1 confirmed
 *      `practice_treatment_offerings` does NOT have a single
 *      `default_value_cents` column — a value RANGE was added in an earlier
 *      phase, so we synthesise a single number from it. Future: PMS
 *      integration may overwrite with real treatment estimates — flag below.
 *   5. Owner:
 *      a. Prior-deal inheritance: if the contact already has any deal with a
 *         non-null `owner_user_id`, take the most recent one.
 *      b. SLA-routed user: else look up `practice_notification_routing` for
 *         (tenant_id, 'lead.arrived', resolved_pipeline_id) — same source of
 *         truth as the notification router uses to figure out who to ping.
 *         Pipeline-specific row preferred over tenant-default; fallback to
 *         null if neither exists.
 *      c. NULL: deal lands unassigned.
 *
 *  In dental practice context the resolved owner is typically the front-of-house
 *  staff or treatment coordinator on rota for that channel — NOT the doctor.
 *  Doctors are not in this chain; assignment to clinical staff is downstream.
 *
 * Failure modes (all graceful — return `{ ok: false, reason }`, never throw):
 *   - Offering lookup error → fall through to fallback ('Inquiry') path.
 *   - No `is_default` pipeline for the tenant → skip deal, return reason.
 *   - Resolved pipeline has zero stages → skip deal, return reason.
 *   - `deals.insert(...)` returns a DB error → skip deal, return reason.
 *   - Skip `review_required` cases entirely (caller responsibility).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveMostRecentlyActiveOpenDeal,
  sortDealsByRecentActivity,
  fetchMaxActivityTimestampsForDeals,
} from '@/lib/deal-resolver'
import { judgeInboundDealAttachment } from './judge-deal-attachment'
import { generateDealTitle } from './deal-title'
import type { SourceChannelEnum } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Phase 2a.9: deal-creation is now invoked from two sites — `ingestLead()`
 * (auto-resolved leads) and the dedup queue resolve endpoint (manager-resolved
 * leads). To avoid coupling the helper to `IngestLeadInput`, the public
 * surface accepts a small struct with exactly the fields deal-creation needs.
 * `ingestLead()` builds this from its own input; the resolve endpoint builds
 * it from the queue row's `candidate_payload` + `source_channel` column.
 */
export interface CreateDealForLeadInput {
  tenantId: string
  contactId: string
  treatmentOfferingId: string | null
  sourceChannel: SourceChannelEnum
  /**
   * Phase 2b.16: free-text intent (e.g. inbound SMS body, web-form
   * notes, Google Lead Form first_name + treatment field). Optional;
   * used by the pipeline router when there's no offering match.
   */
  intentText?: string | null
}

export interface DealContext {
  title: string
  pipelineId: string
  stageId: string
  ownerId: string | null
  valueEstimateCents: number | null
  treatmentOfferingId: string | null
  treatmentLabel: string | null
  resolutionPath:
    | 'with_offering'
    | 'no_offering_inquiry'
    | 'fallback_no_offering_match'
    | 'router_keyword'
    | 'router_ai'
    | 'router_unsorted'
}

/**
 * Phase 2b.2.a.3 — added the `reused: true` success variant so
 * `createDealForLead` can return an existing open deal id without inventing
 * a synthetic `DealContext` (we don't re-resolve title / stage / owner on
 * reuse — the existing deal already has them). Callers that only consumed
 * `dealId` are unaffected; callers that read `context.title` (notification
 * metadata) must guard the `reused` branch.
 */
export type DealCreationOutcome =
  | {
      ok: true
      dealId: string
      reused: false
      context: DealContext
      /** Phase 2b.24: always false on the create path — a fresh deal can't be uncertain. */
      attachmentUncertain: false
    }
  | {
      ok: true
      dealId: string
      reused: true
      context: null
      /**
       * Phase 2b.24: true when the AI couldn't confidently decide whether
       * this inbound belonged on the reused deal or warranted a new one
       * (empty / vague message, no router signal, or AI below confidence
       * threshold). The activity insert stamps this onto
       * `activities.metadata.ai_attachment_uncertain` so the UI can show a
       * marker + notification, and the operator can re-assign in one click.
       */
      attachmentUncertain: boolean
    }
  | { ok: false; reason: DealSkipReason; context: DealContext | null }

export type DealSkipReason =
  | 'review_required'
  | 'no_default_pipeline'
  | 'pipeline_has_no_stages'
  | 'deal_insert_failed'

interface OfferingRow {
  id: string
  custom_label: string | null
  pipeline_id: string
  stage_id: string | null
  custom_lead_value_cents_min: number | null
  custom_lead_value_cents_max: number | null
  treatment_types: { display_name: string | null } | { display_name: string | null }[] | null
}

interface PipelineRow {
  id: string
}

interface StageRow {
  id: string
}

interface DealRowOwner {
  owner_user_id: string | null
}

interface NotificationRoutingRow {
  primary_user_id: string | null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compose deal context resolution + insert.
 *
 * Phase 2a.7 wired this into `ingestLead()`'s happy paths. Phase 2a.9
 * generalised the signature so the dedup queue resolve endpoint can call it
 * too: the helper takes only what it actually needs (tenant, contact,
 * offering, channel) and resolves pipeline/stage/owner/value/title from there.
 *
 * Caller MUST short-circuit and not call this when dedup decision is
 * `review_required` (the queue entry IS the resolution; deal creation is
 * deferred to whatever path eventually un-queues the lead — i.e. the resolve
 * endpoint, which calls this helper at that point).
 */
export async function createDealForLead(
  supabase: SupabaseClient,
  input: CreateDealForLeadInput
): Promise<DealCreationOutcome> {
  // Phase 2b.24: AI-aware attachment decision. Replaces the 2b.2.a.3
  // unconditional `findReusableOpenDeal` short-circuit with a three-way
  // judgement:
  //
  //   reuse  — message classifies into the same pipeline as an open deal,
  //            OR no intent text, OR no open deals at all.
  //   create — message classifies into a pipeline that no open deal
  //            currently lives in (new treatment / different lane).
  //   reuse-but-uncertain — open deals exist, intent text exists, but the
  //            classifier returned unsorted / null / threw. Falls back to
  //            most-recently-active reuse and flags the activity.
  //
  // See `judge-deal-attachment.ts` for the decision logic and
  // `docs/2b/2b-24-changes.md` (forthcoming) for the product context.
  const attachment = await decideDealAttachment(supabase, input)

  if (attachment.kind === 'reuse') {
    console.log('[deal-creation] reused open deal', {
      tenantId: input.tenantId,
      contactId: input.contactId,
      dealId: attachment.dealId,
      sourceChannel: input.sourceChannel,
      reason: attachment.reason,
      attachmentUncertain: attachment.attachmentUncertain,
    })
    return {
      ok: true,
      dealId: attachment.dealId,
      reused: true,
      context: null,
      attachmentUncertain: attachment.attachmentUncertain,
    }
  }

  // 2b.34.7 — AI-uncertain → spawn a deal in the configured Unsorted
  // pipeline. The activity still gets the attachmentUncertain flag so
  // the operator's "AI unsure" marker + drag-to-classify UX still
  // apply, but the deal is at least filed somewhere visible in the
  // pipeline view rather than dumped onto whatever existing deal was
  // most recently active.
  if (attachment.kind === 'create_in_unsorted') {
    const stageId = await resolveStageId(supabase, attachment.pipelineId, null)
    if (!stageId) {
      console.warn('[deal-creation] Unsorted pipeline has no stages — falling back to default', {
        tenantId: input.tenantId,
        unsortedPipelineId: attachment.pipelineId,
      })
      // Fall through to the existing resolveDealContext path so the
      // default-pipeline fallback still works.
    } else {
      const ownerId = await resolveOwner(
        supabase,
        input.tenantId,
        input.contactId,
        attachment.pipelineId
      )
      const title = await generateDealTitle({
        intentText: input.intentText,
        pipelineName: 'Unsorted',
        fallback: 'Inquiry',
      })
      const { data, error } = await supabase
        .from('deals')
        .insert({
          tenant_id: input.tenantId,
          contact_id: input.contactId,
          pipeline_id: attachment.pipelineId,
          stage_id: stageId,
          title,
          owner_user_id: ownerId,
          value_estimate_cents: null,
          currency: 'GBP',
          source: input.sourceChannel,
          treatment_tags: null,
          status: 'open',
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (!error && data) {
        return {
          ok: true,
          dealId: (data as { id: string }).id,
          reused: true,
          context: null,
          attachmentUncertain: true,
        }
      }
      console.warn('[deal-creation] Unsorted insert failed — falling back to default', {
        tenantId: input.tenantId,
        error: error?.message ?? 'no row',
      })
    }
  }

  const ctxResult = await resolveDealContext(supabase, input)
  if (!ctxResult.ok) {
    return ctxResult
  }
  const context = ctxResult.context

  // Phase 2a.7: treatment_tags is the legacy text array per pipelines_audit.md.
  // We populate it only when an offering matches, using the offering's display
  // label. 2b/2c can deprecate this in favour of a typed treatment_offering_id
  // FK on deals when the schema lands.
  const treatmentTags = context.treatmentLabel ? [context.treatmentLabel] : null

  const { data, error } = await supabase
    .from('deals')
    .insert({
      tenant_id: input.tenantId,
      contact_id: input.contactId,
      pipeline_id: context.pipelineId,
      stage_id: context.stageId,
      title: context.title,
      owner_user_id: context.ownerId,
      value_estimate_cents: context.valueEstimateCents,
      currency: 'GBP', // tenants are UK-only for now; harden when international lands
      source: input.sourceChannel,
      treatment_tags: treatmentTags,
      // Future: when CareStack / VoiceStack PMS integrations land, value can
      // be overwritten with a real treatment estimate at this insert site.
      status: 'open',
      last_activity_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.warn('[deal-creation] skipped', {
      tenantId: input.tenantId,
      contactId: input.contactId,
      reason: 'deal_insert_failed',
      dealContext: context,
      error: error?.message ?? 'unknown',
    })
    return { ok: false, reason: 'deal_insert_failed', context }
  }

  return {
    ok: true,
    dealId: (data as { id: string }).id,
    reused: false,
    context,
    attachmentUncertain: false,
  }
}

// ---------------------------------------------------------------------------
// Phase 2b.24 — AI-aware attachment decision
// ---------------------------------------------------------------------------

type AttachmentDecision =
  | {
      kind: 'reuse'
      dealId: string
      attachmentUncertain: boolean
      reason:
        | 'no_intent_text'
        | 'matching_pipeline'
        | 'uncertain_fallback'
        | 'uncertain_to_unsorted_reused'
    }
  | { kind: 'create_new' }
  /**
   * Phase 2b.34.7 — AI was uncertain about the inbound and the tenant
   * has a configured "Unsorted" pipeline. Caller creates a fresh deal
   * in that pipeline so every activity always lands somewhere (the
   * locked Q5 answer from the 2026-05-23 product discussion). The
   * activity still gets the `attachmentUncertain` flag so the operator
   * can move it to a real pipeline with one click.
   */
  | { kind: 'create_in_unsorted'; pipelineId: string }

/**
 * Decide whether to reuse an existing open deal for this contact or
 * create a new one. AI-driven for inbound channels carrying intent
 * text; falls back to most-recently-active-open for everything else.
 *
 * Three branches:
 *   1) No open deals → create_new.
 *   2) Open deals + no intent text → reuse most-recent (legacy behaviour).
 *   3) Open deals + intent text → run `judgeInboundDealAttachment`:
 *      - reuse_matching_pipeline → reuse that deal (most-recent if multiple)
 *      - new_pipeline → create_new (resolveDealContext will route to that
 *        same pipeline because both call routePipeline)
 *      - uncertain → reuse most-recent + flag `attachmentUncertain = true`
 */
async function decideDealAttachment(
  supabase: SupabaseClient,
  input: CreateDealForLeadInput
): Promise<AttachmentDecision> {
  const intent = (input.intentText ?? '').trim()

  // No intent signal (forms with offering-only, booking widget calendar,
  // dedup-queue resolve, etc.) → use the legacy most-recently-active rule
  // unchanged. The AI judgement is only meaningful for free-text inbound
  // (SMS, WhatsApp) where the patient could be raising a different topic.
  if (intent.length === 0) {
    const reuseId = await findReusableOpenDeal(supabase, {
      tenantId: input.tenantId,
      contactId: input.contactId,
    })
    if (reuseId) {
      return {
        kind: 'reuse',
        dealId: reuseId,
        attachmentUncertain: false,
        reason: 'no_intent_text',
      }
    }
    return { kind: 'create_new' }
  }

  // Intent text present → consult judgement. fetch the open-deals-with-
  // pipelines list only here (the legacy `findReusableOpenDeal` lookup
  // doesn't need pipeline ids; this query does).
  const openDeals = await fetchOpenDealsWithPipelines(
    supabase,
    input.tenantId,
    input.contactId
  )
  if (openDeals.length === 0) {
    return { kind: 'create_new' }
  }

  const judgement = await judgeInboundDealAttachment({
    tenantId: input.tenantId,
    messageText: intent,
    openDeals: openDeals.map((d) => ({ id: d.id, pipelineId: d.pipelineId })),
    supabase,
  })

  if (judgement.kind === 'reuse_matching_pipeline') {
    const matchingIds = openDeals
      .filter((d) => d.pipelineId === judgement.pipelineId)
      .map((d) => d.id)
    const targetDealId =
      matchingIds.length === 1
        ? matchingIds[0]
        : (await pickMostRecentlyActiveFromIds(supabase, input.tenantId, matchingIds)) ??
          matchingIds[0]
    return {
      kind: 'reuse',
      dealId: targetDealId,
      attachmentUncertain: false,
      reason: 'matching_pipeline',
    }
  }

  if (judgement.kind === 'new_pipeline') {
    return { kind: 'create_new' }
  }

  // uncertain — per 2b.34.7 / Q5: route to the tenant's Unsorted
  // pipeline so every activity has a home. If the contact already has
  // an open deal in the Unsorted pipeline, reuse it. Otherwise the
  // outer caller creates one. Fall back to legacy most-recent reuse
  // if there's no Unsorted pipeline configured for the tenant.
  const unsortedPipelineId = await getUnsortedPipelineId(supabase, input.tenantId)
  if (unsortedPipelineId) {
    const existingUnsorted = openDeals.find((d) => d.pipelineId === unsortedPipelineId)
    if (existingUnsorted) {
      return {
        kind: 'reuse',
        dealId: existingUnsorted.id,
        attachmentUncertain: true,
        reason: 'uncertain_to_unsorted_reused',
      }
    }
    return { kind: 'create_in_unsorted', pipelineId: unsortedPipelineId }
  }

  const reuseId = await findReusableOpenDeal(supabase, {
    tenantId: input.tenantId,
    contactId: input.contactId,
  })
  if (reuseId) {
    return { kind: 'reuse', dealId: reuseId, attachmentUncertain: true, reason: 'uncertain_fallback' }
  }
  return { kind: 'create_new' }
}

async function getUnsortedPipelineId(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenant_routing_settings')
    .select('unsorted_pipeline_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) {
    console.warn('[deal-creation] unsorted-pipeline lookup failed', {
      tenantId,
      error: error.message,
    })
    return null
  }
  return (
    (data as { unsorted_pipeline_id?: string | null } | null)?.unsorted_pipeline_id ?? null
  )
}

async function fetchOpenDealsWithPipelines(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string
): Promise<Array<{ id: string; pipelineId: string }>> {
  const { data, error } = await supabase
    .from('deals')
    .select('id, pipeline_id, pipeline_stages!inner(is_won, is_lost)')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .eq('pipeline_stages.is_won', false)
    .eq('pipeline_stages.is_lost', false)
    .is('deleted_at', null)

  if (error) {
    console.warn('[deal-creation] open-deals lookup for judgement failed', {
      tenantId,
      contactId,
      error: error.message,
    })
    return []
  }

  return ((data ?? []) as Array<{ id: string; pipeline_id: string }>)
    .filter((row) => row.id && row.pipeline_id)
    .map((row) => ({ id: row.id, pipelineId: row.pipeline_id }))
}

async function pickMostRecentlyActiveFromIds(
  supabase: SupabaseClient,
  tenantId: string,
  dealIds: string[]
): Promise<string | null> {
  if (dealIds.length === 0) return null
  const maxByDeal = await fetchMaxActivityTimestampsForDeals(
    supabase,
    tenantId,
    dealIds
  )
  const sorted = sortDealsByRecentActivity(
    dealIds.map((id) => ({ id, updated_at: null })),
    maxByDeal
  )
  return sorted[0]?.id ?? null
}

// ---------------------------------------------------------------------------
// Phase 2b.2.a.3 — reusable-open-deal lookup
// ---------------------------------------------------------------------------

/**
 * Look up the most-recently-touched OPEN deal for this contact in this tenant.
 *
 * "Open" predicate (resolved at the SQL layer): the deal's stage row in
 * `pipeline_stages` has BOTH `is_won = false` AND `is_lost = false`.
 * Stage flags were added in migration
 * `20260509_phase_2b_2_a_3_pipeline_stages_won_lost_flags.sql` — both default
 * to `false`, so every existing stage is treated as open until an operator
 * marks it terminal.
 *
 * Returns the deal id, or `null` when:
 *   - the contact has no deals at all,
 *   - all deals are in terminal (is_won OR is_lost) stages,
 *   - or the lookup itself errors (logged; non-fatal — the caller falls
 *     through to the create path so a transient DB error doesn't block lead
 *     capture).
 *
 * Engineering decisions embedded:
 *   - **No pipeline filter.** Any open deal qualifies regardless of which
 *     pipeline / treatment offering it belongs to. The practice can split
 *     conversations later via UI work that's deferred (see §10 of the change
 *     log). Mixing pipelines is the explicit product call.
 *   - **No time-gap heuristic.** A 6-month-old open deal still reuses. If
 *     the practice considers it stale they mark it Lost, and the next
 *     inbound naturally creates a fresh deal.
 *   - **Most recently touched** uses `deals.last_activity_at` (the live
 *     "last activity on this deal" timestamp — `last_touch_at` does not
 *     exist on `deals` per the live schema; per §3 of the change log we use
 *     `last_activity_at` as the canonical column with `updated_at` as the
 *     tiebreaker via a secondary ORDER BY).
 *   - Returns at most ONE deal id. Multi-open-deal edge case is resolved
 *     deterministically by the ORDER BY + LIMIT 1.
 *
 * Service-role expectation: this function is only called from inside the
 * lead-ingestion engine, which already runs with elevated privilege; we
 * don't add an extra RLS-bypass layer here.
 */
export async function findReusableOpenDeal(
  supabase: SupabaseClient,
  args: { tenantId: string; contactId: string }
): Promise<string | null> {
  const resolved = await resolveMostRecentlyActiveOpenDeal({
    tenantId: args.tenantId,
    contactId: args.contactId,
    supabase,
  })
  return resolved?.id ?? null
}

// ---------------------------------------------------------------------------
// Context resolution
// ---------------------------------------------------------------------------

type PartialDealContext = Pick<
  DealContext,
  | 'title'
  | 'pipelineId'
  | 'valueEstimateCents'
  | 'treatmentOfferingId'
  | 'treatmentLabel'
  | 'resolutionPath'
> & { stageOverride: string | null }

async function resolveDealContext(
  supabase: SupabaseClient,
  input: CreateDealForLeadInput
): Promise<
  | { ok: true; context: DealContext }
  | { ok: false; reason: DealSkipReason; context: DealContext | null }
> {
  const offering = await fetchOffering(supabase, input)
  let partial: PartialDealContext | null

  if (offering) {
    partial = buildOfferingPartial(offering)
  } else {
    // 2b.16: try the pipeline router (keyword + AI + unsorted) before
    // falling all the way back to the default pipeline.
    partial = await buildRoutedPartial(supabase, input)
    if (!partial) {
      partial = await buildFallbackPartial(supabase, input)
    }
  }

  if (!partial) {
    console.warn('[deal-creation] skipped', {
      tenantId: input.tenantId,
      contactId: input.contactId,
      reason: 'no_default_pipeline',
    })
    return { ok: false, reason: 'no_default_pipeline', context: null }
  }

  const stageId = await resolveStageId(supabase, partial.pipelineId, partial.stageOverride)
  if (!stageId) {
    console.warn('[deal-creation] skipped', {
      tenantId: input.tenantId,
      contactId: input.contactId,
      reason: 'pipeline_has_no_stages',
      pipelineId: partial.pipelineId,
    })
    return { ok: false, reason: 'pipeline_has_no_stages', context: null }
  }

  const ownerId = await resolveOwner(supabase, input.tenantId, input.contactId, partial.pipelineId)

  return {
    ok: true,
    context: {
      title: partial.title,
      pipelineId: partial.pipelineId,
      stageId,
      ownerId,
      valueEstimateCents: partial.valueEstimateCents,
      treatmentOfferingId: partial.treatmentOfferingId,
      treatmentLabel: partial.treatmentLabel,
      resolutionPath: partial.resolutionPath,
    },
  }
}

async function fetchOffering(
  supabase: SupabaseClient,
  input: CreateDealForLeadInput
): Promise<OfferingRow | null> {
  if (!input.treatmentOfferingId) return null

  // Phase 2a.8: practices can toggle an offering off via the Settings UI when
  // they temporarily stop offering that treatment. Filtering `is_active = true`
  // here means a lead arriving with `treatment_offering_id` pointing at an
  // inactive offering routes to the 'Inquiry' fallback path (default pipeline,
  // generic title) instead of being misdirected onto the disabled lane.
  const { data, error } = await supabase
    .from('practice_treatment_offerings')
    .select(
      'id, custom_label, pipeline_id, stage_id, custom_lead_value_cents_min, custom_lead_value_cents_max, treatment_types ( display_name )'
    )
    .eq('tenant_id', input.tenantId)
    .eq('id', input.treatmentOfferingId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.warn(
      '[deal-creation] practice_treatment_offerings lookup failed; falling back to default pipeline',
      { tenantId: input.tenantId, offeringId: input.treatmentOfferingId, error: error.message }
    )
    return null
  }
  return (data as unknown as OfferingRow) ?? null
}

function buildOfferingPartial(offering: OfferingRow): PartialDealContext {
  const ttRow = Array.isArray(offering.treatment_types)
    ? offering.treatment_types[0] ?? null
    : offering.treatment_types
  const canonicalDisplayName = ttRow?.display_name ?? null
  const treatmentLabel = offering.custom_label || canonicalDisplayName

  return {
    title: treatmentLabel ?? 'Inquiry',
    pipelineId: offering.pipeline_id,
    stageOverride: offering.stage_id,
    valueEstimateCents: midpointOrNull(
      offering.custom_lead_value_cents_min,
      offering.custom_lead_value_cents_max
    ),
    treatmentOfferingId: offering.id,
    treatmentLabel,
    resolutionPath: 'with_offering',
  }
}

async function buildRoutedPartial(
  supabase: SupabaseClient,
  input: CreateDealForLeadInput
): Promise<PartialDealContext | null> {
  if (!input.intentText || input.intentText.trim().length === 0) return null
  try {
    const { routePipeline } = await import('@/lib/automations/pipeline-router')
    const route = await routePipeline(
      { tenantId: input.tenantId, intentText: input.intentText },
      { supabase }
    )
    if (!route) return null
    const resolutionPath: DealContext['resolutionPath'] =
      route.source === 'keyword'
        ? 'router_keyword'
        : route.source === 'ai'
        ? 'router_ai'
        : 'router_unsorted'

    // 2b.34.1 — fetch pipeline name (for the title prompt's hint) and
    // ask Claude for a 3-word title. Both calls are best-effort:
    // failures fall back to 'Inquiry' so deal creation never stalls.
    const { data: pipelineRow } = await supabase
      .from('pipelines')
      .select('name')
      .eq('id', route.pipelineId)
      .eq('tenant_id', input.tenantId)
      .maybeSingle()
    const pipelineName = (pipelineRow as { name?: string | null } | null)?.name ?? null

    const title = await generateDealTitle({
      intentText: input.intentText,
      pipelineName,
      fallback: 'Inquiry',
    })

    return {
      title,
      pipelineId: route.pipelineId,
      stageOverride: route.stageId ?? null,
      valueEstimateCents: null,
      treatmentOfferingId: null,
      treatmentLabel: null,
      resolutionPath,
    }
  } catch (err) {
    console.warn('[deal-creation] pipeline router crashed (non-fatal)', {
      tenantId: input.tenantId,
      error: (err as Error)?.message,
    })
    return null
  }
}

async function buildFallbackPartial(
  supabase: SupabaseClient,
  input: CreateDealForLeadInput
): Promise<PartialDealContext | null> {
  const defaultPipeline = await fetchDefaultPipeline(supabase, input.tenantId)
  if (!defaultPipeline) return null

  return {
    title: 'Inquiry',
    pipelineId: defaultPipeline.id,
    stageOverride: null,
    valueEstimateCents: null,
    treatmentOfferingId: null,
    treatmentLabel: null,
    resolutionPath: input.treatmentOfferingId
      ? 'fallback_no_offering_match'
      : 'no_offering_inquiry',
  }
}

// ---------------------------------------------------------------------------
// Sub-resolvers
// ---------------------------------------------------------------------------

function midpointOrNull(min: number | null, max: number | null): number | null {
  if (min != null && max != null) {
    // Round to integer pence — `deals.value_estimate_cents` is INTEGER (Pre-flight
    // discovery showed it's not bigint, despite the audit prompt's assumption).
    return Math.round((min + max) / 2)
  }
  if (min != null) return min
  if (max != null) return max
  return null
}

async function fetchDefaultPipeline(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PipelineRow | null> {
  const { data, error } = await supabase
    .from('pipelines')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[deal-creation] default-pipeline lookup failed', {
      tenantId,
      error: error.message,
    })
    return null
  }
  return (data as PipelineRow | null) ?? null
}

async function resolveStageId(
  supabase: SupabaseClient,
  pipelineId: string,
  stageOverride: string | null
): Promise<string | null> {
  if (stageOverride) {
    // Validate the override actually belongs to the resolved pipeline before
    // trusting it. Defends against drift if an offering's stage_id was
    // populated when the offering pointed at a different pipeline.
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('id', stageOverride)
      .eq('pipeline_id', pipelineId)
      .maybeSingle()

    if (!error && data) return (data as StageRow).id
    // Drop through to first-stage fallback on miss.
  }

  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[deal-creation] first-stage lookup failed', {
      pipelineId,
      error: error.message,
    })
    return null
  }
  return data ? (data as StageRow).id : null
}

async function resolveOwner(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string,
  pipelineId: string
): Promise<string | null> {
  // Phase 2a.7 — Owner resolution: prior deals always win because the
  // front-of-house staff or treatment coordinator already in the relationship
  // should keep continuity. Falls back to the SLA-routed user (typically
  // front-of-house on rota for the channel) for first-time contacts. Doctors
  // are not in this chain — assignment to clinical staff is downstream.
  const inherited = await fetchMostRecentDealOwner(supabase, tenantId, contactId)
  if (inherited) return inherited

  return fetchSlaRoutedOwner(supabase, tenantId, pipelineId)
}

async function fetchMostRecentDealOwner(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('deals')
    .select('owner_user_id')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .not('owner_user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[deal-creation] prior-deal owner lookup failed (non-fatal)', {
      tenantId,
      contactId,
      error: error.message,
    })
    return null
  }
  return (data as DealRowOwner | null)?.owner_user_id ?? null
}

/**
 * Mirrors the resolution `notification-router.ts` performs for the
 * `lead_routing` audience: pipeline-specific row preferred, then
 * tenant-default. Same source of truth, same person — we read it here so the
 * deal owner matches the user the lead.arrived notification is about to ping.
 */
async function fetchSlaRoutedOwner(
  supabase: SupabaseClient,
  tenantId: string,
  pipelineId: string
): Promise<string | null> {
  const { data: pipelineRow, error: pipelineErr } = await supabase
    .from('practice_notification_routing')
    .select('primary_user_id')
    .eq('tenant_id', tenantId)
    .eq('event_key', 'lead.arrived')
    .eq('pipeline_id', pipelineId)
    .eq('is_active', true)
    .maybeSingle()

  if (!pipelineErr && pipelineRow) {
    return (pipelineRow as NotificationRoutingRow).primary_user_id
  }

  const { data: defaultRow, error: defaultErr } = await supabase
    .from('practice_notification_routing')
    .select('primary_user_id')
    .eq('tenant_id', tenantId)
    .eq('event_key', 'lead.arrived')
    .is('pipeline_id', null)
    .eq('is_active', true)
    .maybeSingle()

  if (defaultErr) {
    console.warn('[deal-creation] sla-routed-owner lookup failed (non-fatal)', {
      tenantId,
      pipelineId,
      error: defaultErr.message,
    })
    return null
  }
  return (defaultRow as NotificationRoutingRow | null)?.primary_user_id ?? null
}

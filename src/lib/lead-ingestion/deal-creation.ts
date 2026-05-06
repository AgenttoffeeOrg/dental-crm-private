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
}

export type DealCreationOutcome =
  | { ok: true; dealId: string; context: DealContext }
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

  return { ok: true, dealId: (data as { id: string }).id, context }
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
  const partial = offering
    ? buildOfferingPartial(offering)
    : await buildFallbackPartial(supabase, input)

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

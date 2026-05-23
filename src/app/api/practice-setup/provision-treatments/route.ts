/**
 * Phase 2b.35.4 — Practice-setup batch provisioner.
 *
 * Powers the Practice Setup wizard's "Apply" button. Given a list of
 * treatment picks (each either "create a new pipeline" or "merge into
 * an existing pipeline"), provisions:
 *   - new `pipelines` rows + their default stages
 *   - new `practice_treatment_offerings` rows linking each picked
 *     treatment to a pipeline (new or merged-into)
 *   - the tenant's "Unsorted" pipeline if one doesn't exist yet,
 *     plus the `tenant_routing_settings.unsorted_pipeline_id` pointer
 *     so AI-uncertain inbound lands somewhere visible (the 2b.34.7
 *     contract).
 *
 * Idempotent: treatments that already have an active offering are
 * skipped (no duplicate offerings, no duplicate pipelines). Safe to
 * re-run after a partial failure.
 *
 * Permission: `pipeline.edit` (matches the existing offerings API).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PERMISSION_CODE = 'pipeline.edit'

const PickSchema = z.discriminatedUnion('action', [
  z.object({
    treatment_type_id: z.string().uuid(),
    action: z.literal('create_pipeline'),
  }),
  z.object({
    treatment_type_id: z.string().uuid(),
    action: z.literal('merge_into_pipeline'),
    merge_pipeline_id: z.string().uuid(),
  }),
])

const BodySchema = z.object({
  picks: z.array(PickSchema).min(1).max(40),
  /** Whether to ensure the Unsorted pipeline exists. Default true. */
  ensure_unsorted: z.boolean().optional(),
})

const DEFAULT_STAGES: Array<{ name: string; position: number; is_won?: boolean; is_lost?: boolean }> = [
  { name: 'New', position: 1 },
  { name: 'Qualified', position: 2 },
  { name: 'Booked', position: 3 },
  { name: 'Closed Won', position: 4, is_won: true },
  { name: 'Closed Lost', position: 5, is_lost: true },
]

const UNSORTED_STAGES: Array<{ name: string; position: number; is_won?: boolean; is_lost?: boolean }> = [
  { name: 'New', position: 1 },
  { name: 'Reviewed', position: 2 },
]

type ServiceClient = ReturnType<typeof createServiceClient>

async function requirePermission(
  supabase: { rpc: (name: string, args: unknown) => Promise<{ data: unknown; error: unknown }> },
  userId: string,
  tenantId: string
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc('user_has_permission', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_permission_code: PERMISSION_CODE,
  })
  if (error) {
    console.error('[practice-setup/provision] permission check failed', error)
    return NextResponse.json({ error: 'permission_check_failed' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'permission_denied' }, { status: 403 })
  }
  return null
}

interface CreatePipelineResult {
  id: string
  firstStageId: string
}

async function createPipelineWithDefaultStages(
  service: ServiceClient,
  tenantId: string,
  name: string,
  stages: typeof DEFAULT_STAGES = DEFAULT_STAGES
): Promise<{ ok: true; pipeline: CreatePipelineResult } | { ok: false; error: string }> {
  const { data: pipeline, error: pipelineErr } = await service
    .from('pipelines')
    .insert({
      tenant_id: tenantId,
      name,
      is_default: false,
    })
    .select('id')
    .single()

  if (pipelineErr || !pipeline) {
    return { ok: false, error: `pipeline_insert_failed: ${pipelineErr?.message ?? 'unknown'}` }
  }

  const pipelineId = (pipeline as { id: string }).id
  const stagesPayload = stages.map((s) => ({
    tenant_id: tenantId,
    pipeline_id: pipelineId,
    name: s.name,
    position: s.position,
    is_won: s.is_won ?? false,
    is_lost: s.is_lost ?? false,
  }))

  const { data: insertedStages, error: stagesErr } = await service
    .from('pipeline_stages')
    .insert(stagesPayload)
    .select('id, position')

  if (stagesErr || !insertedStages || insertedStages.length === 0) {
    // Compensate — delete the orphan pipeline so a retry can succeed.
    await service.from('pipelines').delete().eq('id', pipelineId)
    return { ok: false, error: `pipeline_stages_insert_failed: ${stagesErr?.message ?? 'unknown'}` }
  }

  const sortedStages = [...(insertedStages as Array<{ id: string; position: number }>)].sort(
    (a, b) => a.position - b.position
  )
  return {
    ok: true,
    pipeline: { id: pipelineId, firstStageId: sortedStages[0].id },
  }
}

async function ensureUnsortedPipeline(
  service: ServiceClient,
  tenantId: string
): Promise<{ pipelineId: string | null; created: boolean; error?: string }> {
  // Check existing pointer first — cheapest read.
  const { data: routing } = await service
    .from('tenant_routing_settings')
    .select('unsorted_pipeline_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const existingPointer = (routing as { unsorted_pipeline_id?: string | null } | null)?.unsorted_pipeline_id

  if (existingPointer) {
    // Verify the pointer still resolves to a live pipeline.
    const { data: pipe } = await service
      .from('pipelines')
      .select('id')
      .eq('id', existingPointer)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    if (pipe) return { pipelineId: existingPointer, created: false }
    // Pointer is stale — fall through and re-create.
  }

  // Try to find an existing pipeline named "Unsorted" before creating a new one.
  const { data: byName } = await service
    .from('pipelines')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', 'Unsorted')
    .is('deleted_at', null)
    .maybeSingle()

  let unsortedPipelineId: string | null = (byName as { id?: string } | null)?.id ?? null
  let createdNow = false

  if (!unsortedPipelineId) {
    const created = await createPipelineWithDefaultStages(service, tenantId, 'Unsorted', UNSORTED_STAGES)
    if (!created.ok) return { pipelineId: null, created: false, error: created.error }
    unsortedPipelineId = created.pipeline.id
    createdNow = true
  }

  // Upsert the routing pointer.
  const { error: upsertErr } = await service
    .from('tenant_routing_settings')
    .upsert(
      { tenant_id: tenantId, unsorted_pipeline_id: unsortedPipelineId },
      { onConflict: 'tenant_id' }
    )
  if (upsertErr) {
    return { pipelineId: unsortedPipelineId, created: createdNow, error: upsertErr.message }
  }
  return { pipelineId: unsortedPipelineId, created: createdNow }
}

interface ProvisionResult {
  treatment_type_id: string
  status: 'skipped_already_offered' | 'merged' | 'created'
  pipeline_id: string | null
  offering_id: string | null
  pipeline_name?: string
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)
    const denied = await requirePermission(ctx.supabase, ctx.user.id, ctx.tenantId)
    if (denied) return denied

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const body = parsed.data
    const service = createServiceClient()
    const tenantId = ctx.tenantId

    // Pre-load treatment names + existing offerings + valid merge pipelines
    // in one round-trip each so we don't fan out reads per pick.
    const treatmentIds = body.picks.map((p) => p.treatment_type_id)
    const mergeTargetIds = body.picks
      .filter((p) => p.action === 'merge_into_pipeline')
      .map((p) => (p as { merge_pipeline_id: string }).merge_pipeline_id)

    const [treatmentsRes, existingOfferingsRes, mergePipelinesRes] = await Promise.all([
      service
        .from('treatment_types')
        .select('id, display_name')
        .in('id', treatmentIds),
      service
        .from('practice_treatment_offerings')
        .select('id, treatment_type_id, pipeline_id')
        .eq('tenant_id', tenantId)
        .in('treatment_type_id', treatmentIds)
        .is('deleted_at', null),
      mergeTargetIds.length > 0
        ? service
            .from('pipelines')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .in('id', mergeTargetIds)
            .is('deleted_at', null)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (treatmentsRes.error) {
      return NextResponse.json({ error: 'treatment_lookup_failed' }, { status: 500 })
    }
    if (existingOfferingsRes.error) {
      return NextResponse.json({ error: 'offerings_lookup_failed' }, { status: 500 })
    }
    if (mergePipelinesRes.error) {
      return NextResponse.json({ error: 'merge_pipeline_lookup_failed' }, { status: 500 })
    }

    const treatmentNameById = new Map<string, string>(
      ((treatmentsRes.data ?? []) as Array<{ id: string; display_name: string }>).map((t) => [
        t.id,
        t.display_name,
      ])
    )
    const existingOfferingByTreatmentId = new Map<string, { id: string; pipeline_id: string }>(
      ((existingOfferingsRes.data ?? []) as Array<{ id: string; treatment_type_id: string; pipeline_id: string }>).map(
        (o) => [o.treatment_type_id, { id: o.id, pipeline_id: o.pipeline_id }]
      )
    )
    const validMergePipelineIds = new Set<string>(
      ((mergePipelinesRes.data ?? []) as Array<{ id: string }>).map((p) => p.id)
    )

    const results: ProvisionResult[] = []
    const createdPipelineIds: string[] = []

    for (const pick of body.picks) {
      const name = treatmentNameById.get(pick.treatment_type_id)
      if (!name) {
        results.push({
          treatment_type_id: pick.treatment_type_id,
          status: 'skipped_already_offered',
          pipeline_id: null,
          offering_id: null,
          error: 'unknown_treatment_type',
        })
        continue
      }

      const existing = existingOfferingByTreatmentId.get(pick.treatment_type_id)
      if (existing) {
        results.push({
          treatment_type_id: pick.treatment_type_id,
          status: 'skipped_already_offered',
          pipeline_id: existing.pipeline_id,
          offering_id: existing.id,
        })
        continue
      }

      let targetPipelineId: string

      if (pick.action === 'create_pipeline') {
        const created = await createPipelineWithDefaultStages(service, tenantId, name)
        if (!created.ok) {
          results.push({
            treatment_type_id: pick.treatment_type_id,
            status: 'created',
            pipeline_id: null,
            offering_id: null,
            error: created.error,
          })
          continue
        }
        targetPipelineId = created.pipeline.id
        createdPipelineIds.push(targetPipelineId)
      } else {
        // merge_into_pipeline
        if (!validMergePipelineIds.has(pick.merge_pipeline_id)) {
          results.push({
            treatment_type_id: pick.treatment_type_id,
            status: 'merged',
            pipeline_id: null,
            offering_id: null,
            error: 'invalid_merge_pipeline',
          })
          continue
        }
        targetPipelineId = pick.merge_pipeline_id
      }

      const { data: offering, error: offeringErr } = await service
        .from('practice_treatment_offerings')
        .insert({
          tenant_id: tenantId,
          treatment_type_id: pick.treatment_type_id,
          pipeline_id: targetPipelineId,
          is_active: true,
          created_by_user_id: ctx.user.id,
        })
        .select('id')
        .single()

      if (offeringErr || !offering) {
        results.push({
          treatment_type_id: pick.treatment_type_id,
          status: pick.action === 'create_pipeline' ? 'created' : 'merged',
          pipeline_id: targetPipelineId,
          offering_id: null,
          error: `offering_insert_failed: ${offeringErr?.message ?? 'unknown'}`,
        })
        continue
      }

      results.push({
        treatment_type_id: pick.treatment_type_id,
        status: pick.action === 'create_pipeline' ? 'created' : 'merged',
        pipeline_id: targetPipelineId,
        offering_id: (offering as { id: string }).id,
        pipeline_name: name,
      })
    }

    let unsorted: { pipelineId: string | null; created: boolean; error?: string } = {
      pipelineId: null,
      created: false,
    }
    if (body.ensure_unsorted !== false) {
      unsorted = await ensureUnsortedPipeline(service, tenantId)
    }

    return NextResponse.json({
      ok: true,
      results,
      created_pipeline_count: createdPipelineIds.length,
      unsorted_pipeline_id: unsorted.pipelineId,
      unsorted_created: unsorted.created,
      unsorted_error: unsorted.error,
    })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[practice-setup/provision] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

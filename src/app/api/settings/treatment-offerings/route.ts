/**
 * Phase 2a.8 \u2014 Treatment-offerings settings API (collection routes).
 *
 *   GET   /api/settings/treatment-offerings
 *     Returns everything the Settings UI needs in one round-trip:
 *       \u2022 the 20 canonical `treatment_types`
 *       \u2022 every active-or-inactive offering for the tenant (no soft-deleted rows)
 *       \u2022 the tenant's pipelines + stages (drawer dropdowns)
 *
 *   POST  /api/settings/treatment-offerings
 *     Creates one offering. Used for *custom* treatments only \u2014 canonical
 *     offerings are created on first toggle-ON via the toggle endpoint, so
 *     the row's pipeline default lives in one place.
 *
 * Permission: `pipeline.edit`. Treatment offerings are workflow configuration
 * (they steer pipeline routing in `deal-creation.ts`), so the same permission
 * that gates pipeline editing gates this. Reusing avoids seeding a new
 * permission across role mappings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import {
  offeringCreatePayloadSchema,
  poundsToPence,
} from '@/lib/treatment-offerings/schema'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PERMISSION_CODE = 'pipeline.edit'

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
    console.error('[settings/treatment-offerings] permission check failed', error)
    return NextResponse.json({ error: 'permission_check_failed' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'permission_denied' }, { status: 403 })
  }
  return null
}

type ServiceClient = ReturnType<typeof createServiceClient>

async function loadSettingsPayload(service: ServiceClient, tenantId: string) {
  const [treatmentTypesRes, offeringsRes, pipelinesRes, stagesRes] = await Promise.all([
    service
      .from('treatment_types')
      .select('id, display_name, sort_order')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('display_name', { ascending: true }),
    service
      .from('practice_treatment_offerings')
      .select(
        'id, treatment_type_id, custom_label, pipeline_id, stage_id, custom_lead_value_cents_min, custom_lead_value_cents_max, is_active, created_at'
      )
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    service
      .from('pipelines')
      .select('id, name, is_default')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true }),
    service
      .from('pipeline_stages')
      .select('id, pipeline_id, name, position')
      .order('position', { ascending: true }),
  ])

  const firstError =
    treatmentTypesRes.error ?? offeringsRes.error ?? pipelinesRes.error ?? stagesRes.error
  if (firstError) {
    return { error: firstError as { message?: string } }
  }

  // pipeline_stages is read tenant-wide via the service client; filter to the
  // tenant's pipelines defensively in case the global stages table grew
  // cross-tenant rows (the FK is on `pipelines.tenant_id`, not stages directly).
  const tenantPipelineIds = new Set((pipelinesRes.data ?? []).map((p) => p.id))
  const stages = (stagesRes.data ?? []).filter((s) => tenantPipelineIds.has(s.pipeline_id))

  return {
    treatment_types: treatmentTypesRes.data ?? [],
    offerings: offeringsRes.data ?? [],
    pipelines: pipelinesRes.data ?? [],
    stages,
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)
    const denied = await requirePermission(ctx.supabase, ctx.user.id, ctx.tenantId)
    if (denied) return denied

    const service = createServiceClient()
    const result = await loadSettingsPayload(service, ctx.tenantId)
    if ('error' in result) {
      console.error('[settings/treatment-offerings GET] read failed', result.error)
      return NextResponse.json({ error: 'read_failed' }, { status: 500 })
    }
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[settings/treatment-offerings GET] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
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

    const parsed = offeringCreatePayloadSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const body = parsed.data
    const service = createServiceClient()

    // Cross-row validation: pipeline must belong to tenant, stage (if any) must
    // belong to that pipeline. Done in one round-trip per check rather than a
    // single multi-table query for clarity \u2014 these are config writes, not hot path.
    const { data: pipelineRow, error: pipelineErr } = await service
      .from('pipelines')
      .select('id')
      .eq('id', body.pipeline_id)
      .eq('tenant_id', ctx.tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    if (pipelineErr) {
      console.error('[settings/treatment-offerings POST] pipeline lookup', pipelineErr)
      return NextResponse.json({ error: 'pipeline_lookup_failed' }, { status: 500 })
    }
    if (!pipelineRow) {
      return NextResponse.json({ error: 'invalid_pipeline' }, { status: 400 })
    }

    if (body.stage_id) {
      const { data: stageRow, error: stageErr } = await service
        .from('pipeline_stages')
        .select('id')
        .eq('id', body.stage_id)
        .eq('pipeline_id', body.pipeline_id)
        .maybeSingle()
      if (stageErr) {
        console.error('[settings/treatment-offerings POST] stage lookup', stageErr)
        return NextResponse.json({ error: 'stage_lookup_failed' }, { status: 500 })
      }
      if (!stageRow) {
        return NextResponse.json({ error: 'invalid_stage_for_pipeline' }, { status: 400 })
      }
    }

    // For canonical offerings the unique-per-tenant invariant ((tenant_id,
    // treatment_type_id, deleted_at IS NULL)) is application-enforced \u2014 the DB
    // doesn't have a partial unique index on this. Reactivation of an existing
    // canonical row should go through the toggle endpoint; refuse here.
    if (body.treatment_type_id) {
      const { data: existing, error: existingErr } = await service
        .from('practice_treatment_offerings')
        .select('id')
        .eq('tenant_id', ctx.tenantId)
        .eq('treatment_type_id', body.treatment_type_id)
        .is('deleted_at', null)
        .maybeSingle()
      if (existingErr) {
        console.error('[settings/treatment-offerings POST] dup check', existingErr)
        return NextResponse.json({ error: 'dup_check_failed' }, { status: 500 })
      }
      if (existing) {
        return NextResponse.json(
          { error: 'canonical_offering_already_exists', existing_id: existing.id },
          { status: 409 }
        )
      }
    }

    const { data: inserted, error: insertErr } = await service
      .from('practice_treatment_offerings')
      .insert({
        tenant_id: ctx.tenantId,
        treatment_type_id: body.treatment_type_id ?? null,
        custom_label: body.custom_label ?? null,
        pipeline_id: body.pipeline_id,
        stage_id: body.stage_id ?? null,
        custom_lead_value_cents_min: poundsToPence(body.custom_lead_value_pounds_min),
        custom_lead_value_cents_max: poundsToPence(body.custom_lead_value_pounds_max),
        is_active: true,
        created_by_user_id: ctx.user.id,
      })
      .select(
        'id, treatment_type_id, custom_label, pipeline_id, stage_id, custom_lead_value_cents_min, custom_lead_value_cents_max, is_active, created_at'
      )
      .single()

    if (insertErr || !inserted) {
      console.error('[settings/treatment-offerings POST] insert failed', insertErr)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }

    return NextResponse.json({ offering: inserted }, { status: 201 })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[settings/treatment-offerings POST] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

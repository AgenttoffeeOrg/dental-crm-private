/**
 * Phase 2a.8 \u2014 Treatment-offerings settings API (per-row routes).
 *
 *   PATCH  /api/settings/treatment-offerings/[id]
 *     Update an offering's editable fields (label override, pipeline, stage,
 *     value range, is_active). Tenant-scoped by ownership check on the row.
 *
 *   DELETE /api/settings/treatment-offerings/[id]
 *     Soft-delete (sets `deleted_at = now()`). Restricted to *custom* offerings
 *     (treatment_type_id IS NULL). Canonical offerings can only be toggled off
 *     so their toggle history is preserved \u2014 see toggle/route.ts.
 *
 * Permission: `pipeline.edit` (same as the collection route).
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import {
  offeringUpdatePayloadSchema,
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
    console.error('[settings/treatment-offerings/:id] permission check failed', error)
    return NextResponse.json({ error: 'permission_check_failed' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'permission_denied' }, { status: 403 })
  }
  return null
}

interface RouteContext {
  params: Promise<{ id: string }>
}

type ServiceClient = ReturnType<typeof createServiceClient>

interface ExistingOfferingRow {
  id: string
  tenant_id: string
  treatment_type_id: string | null
  pipeline_id: string
  stage_id: string | null
}

type UpdateBody = ReturnType<typeof offeringUpdatePayloadSchema.parse>

async function fetchExistingOffering(
  service: ServiceClient,
  id: string,
  tenantId: string
): Promise<ExistingOfferingRow | null | { errored: true }> {
  const { data, error } = await service
    .from('practice_treatment_offerings')
    .select('id, tenant_id, treatment_type_id, pipeline_id, stage_id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    console.error('[settings/treatment-offerings PATCH] lookup', error)
    return { errored: true }
  }
  if (!data || (data as ExistingOfferingRow).tenant_id !== tenantId) return null
  return data as ExistingOfferingRow
}

async function validatePipelineForTenant(
  service: ServiceClient,
  pipelineId: string,
  tenantId: string
): Promise<NextResponse | null> {
  const { data, error } = await service
    .from('pipelines')
    .select('id')
    .eq('id', pipelineId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    console.error('[settings/treatment-offerings PATCH] pipeline lookup', error)
    return NextResponse.json({ error: 'pipeline_lookup_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'invalid_pipeline' }, { status: 400 })
  return null
}

async function validateStageForPipeline(
  service: ServiceClient,
  stageId: string,
  pipelineId: string
): Promise<NextResponse | null> {
  const { data, error } = await service
    .from('pipeline_stages')
    .select('id')
    .eq('id', stageId)
    .eq('pipeline_id', pipelineId)
    .maybeSingle()
  if (error) {
    console.error('[settings/treatment-offerings PATCH] stage lookup', error)
    return NextResponse.json({ error: 'stage_lookup_failed' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'invalid_stage_for_pipeline' }, { status: 400 })
  return null
}

function buildPatchObject(body: UpdateBody): Record<string, unknown> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.custom_label !== undefined) patch.custom_label = body.custom_label
  if (body.pipeline_id !== undefined) patch.pipeline_id = body.pipeline_id
  if (body.stage_id !== undefined) patch.stage_id = body.stage_id
  if (body.custom_lead_value_pounds_min !== undefined) {
    patch.custom_lead_value_cents_min = poundsToPence(body.custom_lead_value_pounds_min)
  }
  if (body.custom_lead_value_pounds_max !== undefined) {
    patch.custom_lead_value_cents_max = poundsToPence(body.custom_lead_value_pounds_max)
  }
  if (body.is_active !== undefined) patch.is_active = body.is_active
  return patch
}

async function maybeClearStageOnPipelineChange(
  service: ServiceClient,
  body: UpdateBody,
  existing: ExistingOfferingRow,
  patch: Record<string, unknown>
): Promise<void> {
  // Pipeline changed but caller didn't specify a new stage: drop the old
  // stage if it doesn't belong to the new pipeline. Avoids leaving a
  // referential mismatch the deal-creation engine would silently fall back on.
  if (
    body.pipeline_id === undefined ||
    body.pipeline_id === existing.pipeline_id ||
    body.stage_id !== undefined ||
    !existing.stage_id
  ) {
    return
  }
  const { data } = await service
    .from('pipeline_stages')
    .select('id')
    .eq('id', existing.stage_id)
    .eq('pipeline_id', body.pipeline_id)
    .maybeSingle()
  if (!data) {
    patch.stage_id = null
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const ctx = await getApiRequestContext(req)
    const denied = await requirePermission(ctx.supabase, ctx.user.id, ctx.tenantId)
    if (denied) return denied

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const parsed = offeringUpdatePayloadSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const body = parsed.data
    const service = createServiceClient()

    const existing = await fetchExistingOffering(service, id, ctx.tenantId)
    if (existing === null) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if ('errored' in existing) return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })

    if (body.pipeline_id !== undefined) {
      const err = await validatePipelineForTenant(service, body.pipeline_id, ctx.tenantId)
      if (err) return err
    }

    const targetPipelineId = body.pipeline_id ?? existing.pipeline_id
    if (body.stage_id !== undefined && body.stage_id !== null) {
      const err = await validateStageForPipeline(service, body.stage_id, targetPipelineId)
      if (err) return err
    }

    // For custom offerings (treatment_type_id IS NULL) the CHECK constraint
    // requires `custom_label` to remain set. Don't let a PATCH null it out.
    if (existing.treatment_type_id === null && body.custom_label === null) {
      return NextResponse.json(
        { error: 'custom_label_required_for_custom_offering' },
        { status: 400 }
      )
    }

    const patch = buildPatchObject(body)
    await maybeClearStageOnPipelineChange(service, body, existing, patch)

    const { data: updated, error: updateErr } = await service
      .from('practice_treatment_offerings')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select(
        'id, treatment_type_id, custom_label, pipeline_id, stage_id, custom_lead_value_cents_min, custom_lead_value_cents_max, is_active, created_at'
      )
      .single()

    if (updateErr || !updated) {
      console.error('[settings/treatment-offerings PATCH] update', updateErr)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ offering: updated })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[settings/treatment-offerings PATCH] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const ctx = await getApiRequestContext(req)
    const denied = await requirePermission(ctx.supabase, ctx.user.id, ctx.tenantId)
    if (denied) return denied

    const service = createServiceClient()

    const { data: existing, error: existingErr } = await service
      .from('practice_treatment_offerings')
      .select('id, tenant_id, treatment_type_id')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (existingErr) {
      console.error('[settings/treatment-offerings DELETE] lookup', existingErr)
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
    }
    if (!existing || existing.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    if (existing.treatment_type_id !== null) {
      return NextResponse.json(
        {
          error: 'standard_offering_not_deletable',
          message: 'Standard treatments can only be toggled off, not deleted',
        },
        { status: 400 }
      )
    }

    const { error: updateErr } = await service
      .from('practice_treatment_offerings')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)

    if (updateErr) {
      console.error('[settings/treatment-offerings DELETE] update', updateErr)
      return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[settings/treatment-offerings DELETE] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * Phase 2a.8 \u2014 Toggle a canonical treatment on/off.
 *
 *   POST /api/settings/treatment-offerings/toggle
 *     Body: { treatment_type_id: uuid, is_active: boolean }
 *
 * Behaviour:
 *   \u2022 ON  + no row exists     \u2192 INSERT with tenant default pipeline (or the
 *                                first pipeline by name if no default exists)
 *                                and is_active = true.
 *   \u2022 ON  + row exists         \u2192 set is_active = true (reactivation; preserves
 *                                pipeline/stage/value-range overrides intact).
 *                                If a soft-deleted row exists we resurrect it
 *                                rather than creating a fresh one \u2014 toggle
 *                                history is the product invariant.
 *   \u2022 OFF + active row exists  \u2192 set is_active = false (no soft-delete).
 *   \u2022 OFF + no active row      \u2192 no-op, returns 200 with `state: 'noop'`.
 *
 * Permission: `pipeline.edit`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { offeringTogglePayloadSchema } from '@/lib/treatment-offerings/schema'

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
    console.error('[settings/treatment-offerings/toggle] permission check', error)
    return NextResponse.json({ error: 'permission_check_failed' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'permission_denied' }, { status: 403 })
  }
  return null
}

interface ServiceLikeClient {
  from: (table: string) => any
}

async function resolveDefaultPipelineId(
  service: ServiceLikeClient,
  tenantId: string
): Promise<string | null> {
  // Prefer the explicit `is_default = true` pipeline. If none exists, fall back
  // to the alphabetically first pipeline so a tenant whose default flag was
  // never set still gets a workable toggle path. Mirrors the same fallback the
  // booking-widget page uses when seeding treatment lists.
  const { data: defaultRow, error: defaultErr } = await service
    .from('pipelines')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (!defaultErr && defaultRow) return defaultRow.id as string

  const { data: firstRow } = await service
    .from('pipelines')
    .select('id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .limit(1)
    .maybeSingle()
  return firstRow ? (firstRow.id as string) : null
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

    const parsed = offeringTogglePayloadSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { treatment_type_id, is_active } = parsed.data
    const service = createServiceClient()

    // Refuse to toggle for unknown treatment_type_id values \u2014 the UI's catalogue
    // and the DB seed should always be in sync, but defending here means a
    // misconfigured client can't sneak custom rows in via the toggle endpoint.
    const { data: typeRow, error: typeErr } = await service
      .from('treatment_types')
      .select('id')
      .eq('id', treatment_type_id)
      .maybeSingle()
    if (typeErr) {
      console.error('[settings/treatment-offerings/toggle] type lookup', typeErr)
      return NextResponse.json({ error: 'type_lookup_failed' }, { status: 500 })
    }
    if (!typeRow) {
      return NextResponse.json({ error: 'invalid_treatment_type' }, { status: 400 })
    }

    // Look up *any* row for (tenant, type), including soft-deleted, so we can
    // prefer reactivation over creating a duplicate.
    const { data: existingRow, error: existingErr } = await service
      .from('practice_treatment_offerings')
      .select(
        'id, is_active, deleted_at, pipeline_id, stage_id, custom_lead_value_cents_min, custom_lead_value_cents_max, custom_label'
      )
      .eq('tenant_id', ctx.tenantId)
      .eq('treatment_type_id', treatment_type_id)
      .order('deleted_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingErr) {
      console.error('[settings/treatment-offerings/toggle] existing lookup', existingErr)
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
    }

    if (is_active) {
      if (existingRow) {
        const { data: updated, error: updateErr } = await service
          .from('practice_treatment_offerings')
          .update({
            is_active: true,
            // Resurrect a soft-deleted row in the same call \u2014 product wants the
            // toggle to be the single source of truth for "is offered".
            deleted_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRow.id)
          .eq('tenant_id', ctx.tenantId)
          .select(
            'id, treatment_type_id, custom_label, pipeline_id, stage_id, custom_lead_value_cents_min, custom_lead_value_cents_max, is_active, created_at'
          )
          .single()
        if (updateErr || !updated) {
          console.error('[settings/treatment-offerings/toggle] reactivate', updateErr)
          return NextResponse.json({ error: 'update_failed' }, { status: 500 })
        }
        return NextResponse.json({ state: 'reactivated', offering: updated })
      }

      const pipelineId = await resolveDefaultPipelineId(service, ctx.tenantId)
      if (!pipelineId) {
        return NextResponse.json({ error: 'no_pipeline_available' }, { status: 400 })
      }
      const { data: inserted, error: insertErr } = await service
        .from('practice_treatment_offerings')
        .insert({
          tenant_id: ctx.tenantId,
          treatment_type_id,
          pipeline_id: pipelineId,
          stage_id: null,
          custom_label: null,
          custom_lead_value_cents_min: null,
          custom_lead_value_cents_max: null,
          is_active: true,
          created_by_user_id: ctx.user.id,
        })
        .select(
          'id, treatment_type_id, custom_label, pipeline_id, stage_id, custom_lead_value_cents_min, custom_lead_value_cents_max, is_active, created_at'
        )
        .single()
      if (insertErr || !inserted) {
        console.error('[settings/treatment-offerings/toggle] insert', insertErr)
        return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
      }
      return NextResponse.json({ state: 'created', offering: inserted }, { status: 201 })
    }

    // is_active === false branch
    if (!existingRow || existingRow.deleted_at !== null || existingRow.is_active === false) {
      return NextResponse.json({ state: 'noop' })
    }
    const { data: updated, error: updateErr } = await service
      .from('practice_treatment_offerings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', existingRow.id)
      .eq('tenant_id', ctx.tenantId)
      .select(
        'id, treatment_type_id, custom_label, pipeline_id, stage_id, custom_lead_value_cents_min, custom_lead_value_cents_max, is_active, created_at'
      )
      .single()
    if (updateErr || !updated) {
      console.error('[settings/treatment-offerings/toggle] deactivate', updateErr)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }
    return NextResponse.json({ state: 'deactivated', offering: updated })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[settings/treatment-offerings/toggle POST] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

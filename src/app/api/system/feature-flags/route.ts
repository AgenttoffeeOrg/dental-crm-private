import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getApiRequestContext, ApiContextError } from '@/lib/api/context'
import { loadFeatureFlagsForTenant } from '@/lib/services/feature-flags'
import { recordMetric } from '@/lib/monitoring/metrics'

const updateSchema = z.object({
  flagKey: z.string().min(1),
  enabled: z.boolean().nullable(),
  variant: z.string().max(255).nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const flags = await loadFeatureFlagsForTenant(context.tenantId, { supabase: context.supabase })
    return NextResponse.json(
      {
        tenantId: context.tenantId,
        flags,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('[feature-flags] Failed to load flags', error)
    return NextResponse.json({ error: 'Failed to load feature flags' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof updateSchema>

  try {
    payload = updateSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid request payload',
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 }
    )
  }

  let context: Awaited<ReturnType<typeof getApiRequestContext>>
  try {
    context = await getApiRequestContext(request)
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
  }

  const supabase = context.supabase
  const tenantId = context.tenantId
  const environment = process.env.FEATURE_FLAG_ENVIRONMENT || 'production'

  const { data: registryRows, error: registryError } = await supabase
    .from('feature_flag_registry')
    .select('*')
    .eq('flag_key', payload.flagKey)
    .single()

  if (registryError || !registryRows) {
    return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 })
  }

  const flag = registryRows

  const { data: existingAssignment } = await supabase
    .from('feature_flag_assignments')
    .select('*')
    .eq('flag_id', flag.id)
    .eq('tenant_id', tenantId)
    .eq('environment', environment)
    .maybeSingle()

  const nowIso = new Date().toISOString()

  if (payload.enabled === null) {
    if (existingAssignment) {
      await supabase
        .from('feature_flag_assignments')
        .delete()
        .eq('id', existingAssignment.id)

      await supabase.from('feature_flag_audit_log').insert({
        flag_id: flag.id,
        tenant_id: tenantId,
        environment,
        action: 'deleted',
        previous_state: existingAssignment,
        new_state: null,
        context: {
          reason: payload.reason,
        },
        performed_by_user_id: context.user.id,
        performed_at: nowIso,
      })
    }

    const flags = await loadFeatureFlagsForTenant(tenantId, { supabase })

    recordMetric('api', 'feature_flag_override_removed', {
      tenantId,
      flagKey: payload.flagKey,
      userId: context.user.id,
    })

    return NextResponse.json({ flags }, { status: 200 })
  }

  const record = {
    flag_id: flag.id,
    tenant_id: tenantId,
    environment,
    enabled: payload.enabled,
    variant: payload.variant ?? null,
    reason: payload.reason ?? null,
    expires_at: payload.expiresAt ?? null,
    metadata: payload.metadata ?? {},
    created_by_user_id: context.user.id,
    created_at: existingAssignment?.created_at ?? nowIso,
    updated_at: nowIso,
  }

  const { error: upsertError } = await supabase
    .from('feature_flag_assignments')
    .upsert(record, { onConflict: 'flag_id,tenant_id,environment' })

  if (upsertError) {
    console.error('[feature-flags] upsert failed', upsertError)
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 })
  }

  await supabase.from('feature_flag_audit_log').insert({
    flag_id: flag.id,
    tenant_id: tenantId,
    environment,
    action: payload.enabled ? 'override_enabled' : 'override_disabled',
    previous_state: existingAssignment ?? null,
    new_state: record,
    context: {
      reason: payload.reason,
      variant: payload.variant ?? null,
    },
    performed_by_user_id: context.user.id,
    performed_at: nowIso,
  })

  const flags = await loadFeatureFlagsForTenant(tenantId, { supabase })

  recordMetric('api', 'feature_flag_override_updated', {
    tenantId,
    flagKey: payload.flagKey,
    enabled: payload.enabled,
    userId: context.user.id,
    source: existingAssignment ? 'update' : 'create',
  })

  return NextResponse.json({ flags }, { status: 200 })
}



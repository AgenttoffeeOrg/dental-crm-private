/**
 * /api/tenant-routing-settings/default-assignee-policy (Phase 2b.77)
 *
 * GET   — read the tenant's current default_assignee_policy.
 * PATCH — update it.
 *
 * Policy shape:
 *   {
 *     mode: 'contact_owner' | 'group' | 'everyone' | 'fallback_user',
 *     group_id?: uuid,
 *     fallback_user_id?: uuid,
 *   }
 *
 * Used by `resolveDefaultAssignee` in the accept-commitment-suggestion
 * route + the automation engine for system-generated tasks. Default
 * is `{ mode: 'contact_owner' }` if the row is missing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, deleteAuditRowServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PolicySchema = z
  .object({
    mode: z.enum(['contact_owner', 'group', 'everyone', 'fallback_user']),
    group_id: z.string().uuid().nullable().optional(),
    fallback_user_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (p) => (p.mode !== 'group' || !!p.group_id),
    { message: "group_id required when mode = 'group'", path: ['group_id'] }
  )
  .refine(
    (p) => (p.mode !== 'fallback_user' || !!p.fallback_user_id),
    { message: "fallback_user_id required when mode = 'fallback_user'", path: ['fallback_user_id'] }
  )

const PatchSchema = z.object({ default_assignee_policy: PolicySchema })

const DEFAULT_POLICY = { mode: 'contact_owner' as const }

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:default-assignee-policy] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()
    const { data } = await service
      .from('tenant_routing_settings')
      .select('default_assignee_policy')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    const policy = (data as { default_assignee_policy?: any } | null)?.default_assignee_policy ?? DEFAULT_POLICY
    return NextResponse.json({ default_assignee_policy: policy })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.errors },
        { status: 400 }
      )
    }
    const newPolicy = parsed.data.default_assignee_policy
    const service = createServiceClient()

    const { data: existing } = await service
      .from('tenant_routing_settings')
      .select('default_assignee_policy')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()
    const beforePolicy =
      (existing as { default_assignee_policy?: any } | null)?.default_assignee_policy ?? DEFAULT_POLICY

    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'update',
        category: 'setting',
        entityType: 'tenant_routing_settings',
        entityId: ctx.tenantId,
        description: 'Default assignee policy updated',
        beforeState: { default_assignee_policy: beforePolicy },
        afterState: { default_assignee_policy: newPolicy },
        changedFields: ['default_assignee_policy'],
        severity: 'info',
        tags: ['tenant', 'routing', 'default_assignee_policy'],
      })
    } catch (err) {
      if (err instanceof AuditLogWriteError) {
        return NextResponse.json(
          { error: 'audit_log_failed', internal_error_id: err.internalErrorId },
          { status: 500 }
        )
      }
      throw err
    }

    // Upsert: a tenant might not have a tenant_routing_settings row yet.
    const { error: upsertErr } = await service
      .from('tenant_routing_settings')
      .upsert(
        { tenant_id: ctx.tenantId, default_assignee_policy: newPolicy },
        { onConflict: 'tenant_id' }
      )

    if (upsertErr) {
      if (auditId) {
        try {
          await deleteAuditRowServer(auditId, ctx.tenantId)
        } catch {
          /* best-effort */
        }
      }
      return NextResponse.json(
        { error: 'update_failed', message: upsertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, default_assignee_policy: newPolicy })
  } catch (error) {
    return handleError(error)
  }
}

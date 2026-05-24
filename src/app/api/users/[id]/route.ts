/**
 * /api/users/[id] (Phase 2b.85)
 *
 * PATCH — update a team member's full_name, role, status, and
 *         manager_user_id. Audit-first per CLAUDE.md.
 *
 * Auth: standard session. The route enforces tenant scoping by
 * checking the target user belongs to the caller's tenant via
 * user_tenant_memberships before the write.
 *
 * Drives the EditUserModal (Settings → Team → Team Members → Edit).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, deleteAuditRowServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid user id') })

const PatchSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  role: z.enum(['owner', 'admin', 'manager', 'staff', 'viewer']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  manager_user_id: z.string().uuid().nullable().optional(),
})

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:users/id] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const okParams = ParamsSchema.safeParse(params)
    if (!okParams.success) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })

    const ctx = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const service = createServiceClient()

    // Tenant scoping — the target must belong to the caller's tenant.
    const { data: targetMembership } = await service
      .from('user_tenant_memberships')
      .select('user_id')
      .eq('user_id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()
    if (!targetMembership) {
      return NextResponse.json({ error: 'user_not_in_tenant' }, { status: 404 })
    }

    // Validate manager_user_id (if provided) also belongs to the tenant.
    if (parsed.data.manager_user_id) {
      if (parsed.data.manager_user_id === params.id) {
        return NextResponse.json(
          { error: 'self_manager', message: 'A user cannot be their own manager.' },
          { status: 400 }
        )
      }
      const { data: managerMembership } = await service
        .from('user_tenant_memberships')
        .select('user_id')
        .eq('user_id', parsed.data.manager_user_id)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle()
      if (!managerMembership) {
        return NextResponse.json(
          { error: 'manager_not_in_tenant' },
          { status: 400 }
        )
      }
    }

    // Read the before-state for the audit.
    const { data: before } = await service
      .from('app_users')
      .select('full_name, role, status, manager_user_id')
      .eq('id', params.id)
      .maybeSingle()

    const patch: Record<string, unknown> = {}
    if (parsed.data.full_name !== undefined) patch.full_name = parsed.data.full_name
    if (parsed.data.role !== undefined) patch.role = parsed.data.role
    if (parsed.data.status !== undefined) patch.status = parsed.data.status
    if (parsed.data.manager_user_id !== undefined) patch.manager_user_id = parsed.data.manager_user_id
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, no_change: true })
    }

    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'update',
        category: 'user',
        entityType: 'app_user',
        entityId: params.id,
        description: `Team member updated`,
        beforeState: before ?? undefined,
        afterState: patch,
        changedFields: Object.keys(patch),
        severity: 'info',
        tags: ['team', 'team_member_update'],
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

    const { error: updateErr } = await service
      .from('app_users')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', params.id)

    if (updateErr) {
      if (auditId) {
        try {
          await deleteAuditRowServer(auditId, ctx.tenantId)
        } catch {
          /* best-effort */
        }
      }
      return NextResponse.json(
        { error: 'update_failed', message: updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}

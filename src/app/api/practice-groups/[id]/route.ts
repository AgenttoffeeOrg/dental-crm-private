/**
 * /api/practice-groups/[id] (Phase 2b.76)
 *
 * PATCH  — rename / update description.
 * DELETE — remove group; user_group_memberships rows cascade.
 *
 * Audit-first on every mutation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, deleteAuditRowServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid group id') })
const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
})

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:practice-groups/id] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const okParams = ParamsSchema.safeParse(params)
    if (!okParams.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const ctx = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.description !== undefined) patch.description = parsed.data.description
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, no_change: true })
    }

    const service = createServiceClient()
    const { data: before, error: readErr } = await service
      .from('practice_groups')
      .select('id, tenant_id, name, description')
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    if (readErr || !before) {
      return NextResponse.json({ error: 'group_not_found' }, { status: 404 })
    }

    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'update',
        category: 'user',
        entityType: 'practice_group',
        entityId: params.id,
        description: `Practice group updated`,
        beforeState: { name: (before as any).name, description: (before as any).description },
        afterState: patch,
        changedFields: Object.keys(patch),
        severity: 'info',
        tags: ['team', 'practice_group_update'],
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
      .from('practice_groups')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)

    if (updateErr) {
      if (auditId) {
        try {
          await deleteAuditRowServer(auditId, ctx.tenantId)
        } catch {
          /* best-effort */
        }
      }
      return NextResponse.json({ error: 'update_failed', message: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const okParams = ParamsSchema.safeParse(params)
    if (!okParams.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const { data: before, error: readErr } = await service
      .from('practice_groups')
      .select('id, tenant_id, name, description')
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    if (readErr || !before) {
      return NextResponse.json({ error: 'group_not_found' }, { status: 404 })
    }

    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'delete',
        category: 'user',
        entityType: 'practice_group',
        entityId: params.id,
        description: `Practice group deleted: ${(before as any).name}`,
        beforeState: { name: (before as any).name, description: (before as any).description },
        afterState: undefined,
        changedFields: ['deleted'],
        severity: 'warning',
        tags: ['team', 'practice_group_delete'],
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

    const { error: deleteErr } = await service
      .from('practice_groups')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)

    if (deleteErr) {
      if (auditId) {
        try {
          await deleteAuditRowServer(auditId, ctx.tenantId)
        } catch {
          /* best-effort */
        }
      }
      return NextResponse.json({ error: 'delete_failed', message: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}

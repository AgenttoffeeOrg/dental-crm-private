/**
 * /api/practice-groups/[id]/members (Phase 2b.76)
 *
 * GET    — list members of a group.
 * POST   — add a user to the group ({ user_id }).
 * DELETE — remove a user from the group ({ user_id }).
 *
 * Audit-first for add + remove (creates a user_group_memberships row).
 */

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, deleteAuditRowServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid group id') })
const BodySchema = z.object({ user_id: z.string().uuid('Invalid user id') })

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:practice-groups/members] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const okParams = ParamsSchema.safeParse(params)
    if (!okParams.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const { data: memberships, error } = await service
      .from('user_group_memberships')
      .select('user_id, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('group_id', params.id)

    if (error) {
      return NextResponse.json({ error: 'lookup_failed', message: error.message }, { status: 500 })
    }
    const userIds = ((memberships ?? []) as Array<{ user_id: string }>).map((m) => m.user_id)
    let users: Array<{ id: string; full_name: string | null; email: string | null }> = []
    if (userIds.length > 0) {
      const { data: usersData } = await service
        .from('app_users')
        .select('id, full_name, email')
        .in('id', userIds)
      users = (usersData ?? []) as typeof users
    }

    return NextResponse.json({
      members: users.map((u) => {
        const m = (memberships ?? []).find((mm: any) => mm.user_id === u.id) as any
        return { ...u, joined_at: m?.created_at ?? null }
      }),
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const okParams = ParamsSchema.safeParse(params)
    if (!okParams.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const ctx = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', details: parsed.error.errors }, { status: 400 })
    }

    const service = createServiceClient()

    // Confirm the user belongs to this tenant before adding.
    const { data: membership } = await service
      .from('user_tenant_memberships')
      .select('user_id')
      .eq('user_id', parsed.data.user_id)
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'active')
      .maybeSingle()
    if (!membership) {
      return NextResponse.json({ error: 'user_not_in_tenant' }, { status: 400 })
    }

    const newMembershipId = randomUUID()
    const insertPayload = {
      id: newMembershipId,
      tenant_id: ctx.tenantId,
      group_id: params.id,
      user_id: parsed.data.user_id,
    }

    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'create',
        category: 'user',
        entityType: 'user_group_membership',
        entityId: newMembershipId,
        description: `User added to practice group`,
        beforeState: undefined,
        afterState: insertPayload,
        changedFields: Object.keys(insertPayload),
        severity: 'info',
        tags: ['team', 'practice_group_member_add'],
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

    const { error: insertErr } = await service.from('user_group_memberships').insert([insertPayload])
    if (insertErr) {
      if (auditId) {
        try {
          await deleteAuditRowServer(auditId, ctx.tenantId)
        } catch {
          /* best-effort */
        }
      }
      const status = insertErr.message.includes('duplicate') ? 409 : 500
      return NextResponse.json(
        { error: status === 409 ? 'already_member' : 'insert_failed', message: insertErr.message },
        { status }
      )
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
    const body = await request.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', details: parsed.error.errors }, { status: 400 })
    }

    const service = createServiceClient()

    const { data: membership } = await service
      .from('user_group_memberships')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('group_id', params.id)
      .eq('user_id', parsed.data.user_id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ ok: true, already_absent: true })
    }
    const membershipId = (membership as { id: string }).id

    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'delete',
        category: 'user',
        entityType: 'user_group_membership',
        entityId: membershipId,
        description: `User removed from practice group`,
        beforeState: { group_id: params.id, user_id: parsed.data.user_id },
        afterState: undefined,
        changedFields: ['removed'],
        severity: 'info',
        tags: ['team', 'practice_group_member_remove'],
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
      .from('user_group_memberships')
      .delete()
      .eq('id', membershipId)

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

/**
 * /api/practice-groups (Phase 2b.76)
 *
 * GET  — list practice groups for the current tenant (+ member counts).
 * POST — create a new group with name + optional description.
 *
 * Write path uses service-role since RLS blocks user writes on
 * practice_groups (per migration 2b.59). Audit row written for every
 * mutation per audit-first pattern.
 */

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, deleteAuditRowServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CreateSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(80),
  description: z.string().max(500).nullable().optional(),
})

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:practice-groups] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const { data: groups, error } = await service
      .from('practice_groups')
      .select('id, name, description, created_at, updated_at')
      .eq('tenant_id', ctx.tenantId)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'lookup_failed', message: error.message }, { status: 500 })
    }

    const groupIds = ((groups ?? []) as Array<{ id: string }>).map((g) => g.id)
    const memberCounts: Record<string, number> = {}
    if (groupIds.length > 0) {
      const { data: memberships } = await service
        .from('user_group_memberships')
        .select('group_id')
        .eq('tenant_id', ctx.tenantId)
        .in('group_id', groupIds)
      for (const m of (memberships ?? []) as Array<{ group_id: string }>) {
        memberCounts[m.group_id] = (memberCounts[m.group_id] ?? 0) + 1
      }
    }

    return NextResponse.json({
      groups: (groups ?? []).map((g: any) => ({
        ...g,
        member_count: memberCounts[g.id] ?? 0,
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const service = createServiceClient()

    // Pre-generate id so we can audit FIRST per the audit-first pattern.
    const newGroupId = randomUUID()
    const insertPayload = {
      id: newGroupId,
      tenant_id: ctx.tenantId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    }

    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'create',
        category: 'user',
        entityType: 'practice_group',
        entityId: newGroupId,
        description: `Practice group created: ${parsed.data.name}`,
        beforeState: undefined,
        afterState: insertPayload,
        changedFields: Object.keys(insertPayload),
        severity: 'info',
        tags: ['team', 'practice_group_create'],
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

    const { error: insertErr } = await service.from('practice_groups').insert([insertPayload])
    if (insertErr) {
      if (auditId) {
        try {
          await deleteAuditRowServer(auditId, ctx.tenantId)
        } catch {
          /* best-effort */
        }
      }
      // Unique constraint on (tenant_id, name) — surface as 409.
      const status = insertErr.message.includes('duplicate') ? 409 : 500
      return NextResponse.json(
        { error: status === 409 ? 'name_already_taken' : 'insert_failed', message: insertErr.message },
        { status }
      )
    }

    return NextResponse.json({
      ok: true,
      group: { ...insertPayload, member_count: 0 },
    })
  } catch (error) {
    return handleError(error)
  }
}

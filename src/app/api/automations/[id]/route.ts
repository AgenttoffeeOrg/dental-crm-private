/**
 * Phase 2b.19 — Automation CRUD per-id routes.
 *
 * GET    /api/automations/[id]       — fetch one
 * PATCH  /api/automations/[id]       — update (incl. publish/unpublish via status)
 * DELETE /api/automations/[id]       — soft-delete via deleted_at
 *
 * Auth: requireAuthenticatedTenantUser. RLS enforces tenant on
 * select, but we always re-filter `tenant_id = auth.tenantId` to
 * surface 404 cleanly instead of leaking presence.
 *
 * Audit-trail: writes a row on publish (`status: draft→active`),
 * unpublish (`status: active→paused`), and delete. Audit-first
 * pattern: write audit BEFORE mutate, compensate-delete the audit
 * row on mutation failure.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authErrorResponse,
  requireAuthenticatedTenantUser,
} from '@/lib/auth/api-auth-helpers'
import { createServiceClient } from '@/lib/supabase-server'
import {
  AuditLogWriteError,
  deleteAuditRowServer,
  logAuditServer,
} from '@/lib/auto-audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().nullish(),
  category: z.enum(['deal', 'pipeline', 'task', 'marketing']).optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
  trigger_type: z.string().trim().min(1).optional(),
  trigger_config: z.record(z.unknown()).optional(),
  graph_json: z
    .object({
      start_key: z.string(),
      nodes: z.array(z.record(z.unknown())),
    })
    .passthrough()
    .optional(),
  workflow_config: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAuthenticatedTenantUser(request)
    const { id } = await ctx.params
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) {
      console.error('[api/automations/[id] GET] db error', error)
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, automation: data }, { status: 200 })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  let auditId: string | null = null
  let auth: Awaited<ReturnType<typeof requireAuthenticatedTenantUser>> | null = null
  try {
    auth = await requireAuthenticatedTenantUser(request)
    const { id } = await ctx.params

    const supabase = createServiceClient()

    const { data: before, error: beforeErr } = await supabase
      .from('automations')
      .select('id, status, name, category, trigger_type')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (beforeErr) {
      return NextResponse.json({ error: 'db_error', message: beforeErr.message }, { status: 500 })
    }
    if (!before) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const rawBody = (await request.json()) as Record<string, unknown>
    const parsed = patchSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const update: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }
    const statusTransition = parsed.data.status && parsed.data.status !== before.status
    const willActivate = statusTransition && parsed.data.status === 'active'
    const willPause = statusTransition && parsed.data.status === 'paused'

    if (willActivate) {
      update.activated_at = new Date().toISOString()
      update.activated_by_user_id = auth.userId
    }

    // Audit-first for status transitions that are customer-visible.
    if (statusTransition && (willActivate || willPause || parsed.data.status === 'archived')) {
      try {
        auditId = await logAuditServer({
          userId: auth.userId,
          tenantId: auth.tenantId,
          actionType: 'update',
          category: 'setting',
          entityType: 'automation',
          entityId: id,
          entityName: before.name as string,
          description: `Automation status: ${before.status} → ${parsed.data.status}`,
          beforeState: { status: before.status as string },
          afterState: { status: parsed.data.status as string },
          changedFields: ['status'],
          severity: willActivate ? 'warning' : 'info',
          tags: ['automation', parsed.data.status as string],
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
    }

    const { error: updErr } = await supabase
      .from('automations')
      .update(update)
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)

    if (updErr) {
      console.error('[api/automations/[id] PATCH] update failed', updErr)
      if (auditId) await deleteAuditRowServer(auditId, auth.tenantId)
      return NextResponse.json({ error: 'db_error', message: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, audit_id: auditId }, { status: 200 })
  } catch (err) {
    if (auditId && auth) await deleteAuditRowServer(auditId, auth.tenantId)
    return authErrorResponse(err)
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  let auditId: string | null = null
  let auth: Awaited<ReturnType<typeof requireAuthenticatedTenantUser>> | null = null
  try {
    auth = await requireAuthenticatedTenantUser(request)
    const { id } = await ctx.params

    const supabase = createServiceClient()
    const { data: before } = await supabase
      .from('automations')
      .select('id, name, status')
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!before) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    try {
      auditId = await logAuditServer({
        userId: auth.userId,
        tenantId: auth.tenantId,
        actionType: 'delete',
        category: 'setting',
        entityType: 'automation',
        entityId: id,
        entityName: before.name as string,
        description: `Automation deleted (was ${before.status})`,
        beforeState: { status: before.status as string },
        changedFields: ['deleted_at'],
        severity: 'warning',
        tags: ['automation', 'delete'],
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

    const { error: updErr } = await supabase
      .from('automations')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId)

    if (updErr) {
      if (auditId) await deleteAuditRowServer(auditId, auth.tenantId)
      return NextResponse.json({ error: 'db_error', message: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, audit_id: auditId }, { status: 200 })
  } catch (err) {
    if (auditId && auth) await deleteAuditRowServer(auditId, auth.tenantId)
    return authErrorResponse(err)
  }
}

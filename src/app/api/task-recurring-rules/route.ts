/**
 * /api/task-recurring-rules (Phase 2b.81)
 *
 * POST — create a recurring rule. Body matches the simple-cadence
 * schema from migration 2b.58:
 *   {
 *     frequency: 'daily' | 'weekly' | 'monthly',
 *     interval_count: integer >= 1,
 *     weekly_days?: number[] (0=Sunday … 6=Saturday) — weekly only,
 *     monthly_day?: 1-31 — monthly only,
 *     occurrences_limit?: integer >= 1,
 *     ends_at?: ISO timestamptz,
 *   }
 *
 * Returns { id } so the caller can stamp tasks.recurring_rule_id.
 * Custom RRULE not exposed via this route — that's a future phase.
 *
 * Audit-first with pre-generated UUID.
 */

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, deleteAuditRowServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RuleSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval_count: z.number().int().min(1).max(365),
    weekly_days: z.array(z.number().int().min(0).max(6)).optional(),
    monthly_day: z.number().int().min(1).max(31).nullable().optional(),
    occurrences_limit: z.number().int().min(1).max(1000).nullable().optional(),
    ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine(
    (r) => r.frequency !== 'weekly' || !r.weekly_days || r.weekly_days.length > 0,
    {
      message: 'weekly_days must contain at least one day when provided for weekly cadence',
      path: ['weekly_days'],
    }
  )

export async function POST(request: NextRequest) {
  try {
    const ctx = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = RuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const service = createServiceClient()

    const newId = randomUUID()
    const insertPayload: Record<string, unknown> = {
      id: newId,
      tenant_id: ctx.tenantId,
      frequency: parsed.data.frequency,
      interval_count: parsed.data.interval_count,
      weekly_days: parsed.data.weekly_days ?? null,
      monthly_day: parsed.data.monthly_day ?? null,
      occurrences_limit: parsed.data.occurrences_limit ?? null,
      ends_at: parsed.data.ends_at ?? null,
    }

    let auditId: string | null = null
    try {
      auditId = await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'create',
        category: 'task',
        entityType: 'task_recurring_rule',
        entityId: newId,
        description: `Recurring rule created: ${parsed.data.frequency} x${parsed.data.interval_count}`,
        beforeState: undefined,
        afterState: insertPayload,
        changedFields: Object.keys(insertPayload),
        severity: 'info',
        tags: ['task', 'recurring_rule_create'],
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

    const { error: insertErr } = await service.from('task_recurring_rules').insert([insertPayload])
    if (insertErr) {
      if (auditId) {
        try {
          await deleteAuditRowServer(auditId, ctx.tenantId)
        } catch {
          /* best-effort */
        }
      }
      return NextResponse.json(
        { error: 'insert_failed', message: insertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ id: newId })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[API:task-recurring-rules] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

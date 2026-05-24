/**
 * Phase 2b.67 — Deal-close cascade for open tasks.
 *
 *   GET  /api/deals/[id]/close-open-tasks
 *     Returns the deal's open tasks so the modal can render
 *     checkboxes (default all checked) without a second round-trip.
 *
 *   POST /api/deals/[id]/close-open-tasks
 *     Body: { task_ids: string[] }
 *     Bulk-cancels the supplied tasks. Per-task audit row via
 *     logAuditServer. Returns counts so the toast can show
 *     "3 tasks closed".
 *
 * Per the 2026-05-24 product decision (Q4): default close-all,
 * operator un-ticks anything she wants to keep. Recurring chain
 * termination on cancel is enforced by the 2b.58 schema rule (a
 * task with recurrence != 'none' going to status='cancelled'
 * stops the next-instance daily cron).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid deal id') })

const BodySchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1, 'At least one task id'),
})

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:close-open-tasks] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

interface TaskRow {
  id: string
  title: string
  due_at: string | null
  priority: string | null
  task_type: string | null
  status: string
}

// ---------------------------------------------------------------------------
// GET — list open tasks for the deal (for the modal to render)
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = ParamsSchema.safeParse(params)
    if (!ok.success) {
      return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })
    }
    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const { data: tasks, error } = await service
      .from('tasks')
      .select('id, title, due_at, priority, task_type, status')
      .eq('tenant_id', ctx.tenantId)
      .eq('deal_id', params.id)
      .in('status', ['open', 'in_progress'])
      .order('due_at', { ascending: true, nullsFirst: false })

    if (error) {
      console.warn('[API:close-open-tasks] GET failed', error.message)
      return NextResponse.json({ error: 'read_failed' }, { status: 500 })
    }

    return NextResponse.json({
      open_tasks: (tasks ?? []) as TaskRow[],
    })
  } catch (error) {
    return handleError(error)
  }
}

// ---------------------------------------------------------------------------
// POST — bulk cancel the supplied tasks
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = ParamsSchema.safeParse(params)
    if (!ok.success) {
      return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })
    }
    const ctx = await getApiRequestContext(request)
    const raw = (await request.json().catch(() => ({}))) as unknown
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const service = createServiceClient()

    // 1. Read the candidate task rows (tenant + deal scoped) so we
    //    can audit per-task with their before-state intact.
    const { data: candidates, error: readErr } = await service
      .from('tasks')
      .select('id, title, status, task_type, priority, due_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('deal_id', params.id)
      .in('id', parsed.data.task_ids)
      .in('status', ['open', 'in_progress'])

    if (readErr) {
      return NextResponse.json(
        { error: 'read_failed', message: readErr.message },
        { status: 500 }
      )
    }

    const toClose = (candidates ?? []) as TaskRow[]
    if (toClose.length === 0) {
      return NextResponse.json({
        ok: true,
        closed_count: 0,
        skipped_count: parsed.data.task_ids.length,
        note: 'No open tasks matched — all were already closed or moved by another operator.',
      })
    }

    // 2. Bulk UPDATE to cancelled. Recurring chain terminates per
    //    the 2b.58 schema rule (cancellation stops next-instance).
    const nowIso = new Date().toISOString()
    const { error: updateErr } = await service
      .from('tasks')
      .update({
        status: 'cancelled',
        completed_at: nowIso,
        updated_at: nowIso,
      })
      .in('id', toClose.map((t) => t.id))
      .eq('tenant_id', ctx.tenantId)

    if (updateErr) {
      return NextResponse.json(
        { error: 'bulk_cancel_failed', message: updateErr.message },
        { status: 500 }
      )
    }

    // 3. Audit per task. Failures are logged but don't roll back the
    //    cancel — the operator already saw the deal close + chose
    //    these tasks to close. Audit best-effort.
    let auditWritten = 0
    let auditFailed = 0
    for (const t of toClose) {
      try {
        await logAuditServer({
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          actionType: 'update',
          category: 'task',
          entityType: 'task',
          entityId: t.id,
          description: 'Task cancelled because deal closed',
          beforeState: { status: t.status },
          afterState: { status: 'cancelled', completed_at: nowIso },
          changedFields: ['status', 'completed_at'],
          severity: 'info',
          tags: ['task', 'deal_close_cancel'],
        })
        auditWritten += 1
      } catch (err) {
        auditFailed += 1
        if (err instanceof AuditLogWriteError) {
          console.warn(
            '[API:close-open-tasks] audit write failed',
            err.internalErrorId
          )
        }
      }
    }

    const skippedCount = parsed.data.task_ids.length - toClose.length

    return NextResponse.json({
      ok: true,
      closed_count: toClose.length,
      skipped_count: skippedCount,
      audit_written: auditWritten,
      audit_failed: auditFailed,
    })
  } catch (error) {
    return handleError(error)
  }
}

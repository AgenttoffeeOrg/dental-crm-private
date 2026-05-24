/**
 * /api/task-recurring-rules/[id] (Phase 2b.86)
 *
 * DELETE — drop a recurring rule. Used as the compensating cleanup
 * when the upstream task INSERT fails after we've already created
 * the rule (per the audit-first principle, an orphan row should be
 * removed rather than abandoned).
 *
 * Audit-first per CLAUDE.md: writes the "delete" audit row before
 * dropping, compensate-undeletes is impossible (the row is gone), so
 * if the actual DELETE fails we surface 500 and leave the audit row
 * in place (the orphan is now visible in the audit trail).
 *
 * Tenant-scoped: `.eq('tenant_id', ctx.tenantId)` on both the read
 * and the delete so callers cannot drop rules from other tenants.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logAuditServer, AuditLogWriteError } from '@/lib/auto-audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid rule id') })

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const okParams = ParamsSchema.safeParse(params)
    if (!okParams.success) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const ctx = await getApiRequestContext(request)
    const service = createServiceClient()

    const { data: existing, error: readErr } = await service
      .from('task_recurring_rules')
      .select('id, tenant_id, frequency, interval_count')
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle()

    if (readErr || !existing) {
      // Already gone is success — orphan cleanup is idempotent.
      return NextResponse.json({ ok: true, already_absent: !existing })
    }

    try {
      await logAuditServer({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        actionType: 'delete',
        category: 'task',
        entityType: 'task_recurring_rule',
        entityId: params.id,
        description: 'Recurring rule deleted (orphan cleanup or manual)',
        beforeState: existing,
        afterState: undefined,
        changedFields: ['deleted'],
        severity: 'info',
        tags: ['task', 'recurring_rule_delete'],
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
      .from('task_recurring_rules')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', ctx.tenantId)

    if (deleteErr) {
      // Audit row stays; the rule didn't actually delete. Surface so
      // the operator knows.
      return NextResponse.json(
        { error: 'delete_failed', message: deleteErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ApiContextError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[API:task-recurring-rules/id] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Phase 2b.58 — Task reminders + escalations cron tick.
 *
 * Fires every 5 minutes per `vercel.json`. Iterates every tenant
 * with at least one open task, and invokes the previously-dead
 * helpers `sendTaskReminders()` + `checkTaskEscalations()` for each.
 *
 * Both helpers existed in `task-automation-actions.ts` since the
 * automations work but were never wired to a cron — the 2b.58 rebuild
 * audit flagged them as dead code.
 *
 * Auth: matches the other cron routes — `Authorization: Bearer
 * ${CRON_SECRET}`. Fails closed when the env is missing so the route
 * isn't publicly callable.
 *
 * Tenant iteration scope: any tenant with at least one open task
 * with a non-null `due_at` in the next 7 days OR overdue in the last
 * 7 days. Avoids hitting every-tenant-every-tick when most tenants
 * have nothing to remind about.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import {
  sendTaskReminders,
  checkTaskEscalations,
} from '@/lib/automations/task-automation-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIVE_WINDOW_DAYS = 7

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    console.error('[cron/task-reminders] CRON_SECRET is unset')
    return NextResponse.json(
      { error: 'cron_not_configured', message: 'CRON_SECRET env var is required' },
      { status: 500 }
    )
  }
  const header = request.headers.get('authorization') ?? ''
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()
  const windowStart = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 3600 * 1000).toISOString()
  const windowEnd = new Date(now.getTime() + ACTIVE_WINDOW_DAYS * 24 * 3600 * 1000).toISOString()

  // 1. Find tenants with active task work in the +/-7d window.
  // Cheap distinct-tenant scan on the open-status partial index.
  const { data: activeTenantsRaw, error: scanErr } = await service
    .from('tasks')
    .select('tenant_id')
    .in('status', ['open', 'in_progress'])
    .gte('due_at', windowStart)
    .lte('due_at', windowEnd)
    .not('due_at', 'is', null)

  if (scanErr) {
    console.error('[cron/task-reminders] tenant scan failed', scanErr)
    return NextResponse.json(
      { error: 'scan_failed', message: scanErr.message },
      { status: 500 }
    )
  }

  const tenantIds = Array.from(
    new Set(((activeTenantsRaw ?? []) as Array<{ tenant_id: string }>).map((r) => r.tenant_id))
  )

  const summary: Array<{
    tenant_id: string
    reminders_checked: number
    reminders_sent: number
    escalations_checked: number
    escalations_fired: number
    error?: string
  }> = []

  // 2. Loop tenants, run both helpers per tenant. Failures on one
  // tenant don't stop the rest.
  for (const tenantId of tenantIds) {
    try {
      const [remindersResult, escalationsResult] = await Promise.all([
        sendTaskReminders(tenantId),
        checkTaskEscalations(tenantId),
      ])
      summary.push({
        tenant_id: tenantId,
        reminders_checked: remindersResult.checked,
        reminders_sent: remindersResult.reminded,
        escalations_checked: escalationsResult.checked,
        escalations_fired: escalationsResult.escalated,
      })
    } catch (err) {
      console.error('[cron/task-reminders] tenant tick failed', {
        tenantId,
        err: err instanceof Error ? err.message : String(err),
      })
      summary.push({
        tenant_id: tenantId,
        reminders_checked: 0,
        reminders_sent: 0,
        escalations_checked: 0,
        escalations_fired: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json(
    {
      ok: true,
      ran_at: new Date().toISOString(),
      tenants_scanned: tenantIds.length,
      summary,
    },
    { status: 200 }
  )
}

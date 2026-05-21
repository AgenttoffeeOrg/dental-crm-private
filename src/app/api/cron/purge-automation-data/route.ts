/**
 * Phase 2b.23 — Daily TTL purge for automation observability tables.
 *
 * Deletes:
 *   - automation_runs older than 90d in terminal states.
 *   - automation_execution_logs older than 30d.
 *   - automation_event_log older than 14d.
 *
 * Runs daily on Vercel cron. Same CRON_SECRET bearer pattern as
 * /api/cron/process-automation-waits.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'cron_not_configured', message: 'CRON_SECRET env var is required' },
      { status: 500 }
    )
  }
  const header = request.headers.get('authorization') ?? ''
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = Date.now()
  const runsCutoff = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()
  const logsCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const eventCutoff = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()

  const results: Record<string, unknown> = {}

  try {
    const r1 = await supabase
      .from('automation_runs')
      .delete({ count: 'exact' })
      .in('state', ['completed', 'stopped', 'failed', 'cancelled'])
      .lt('updated_at', runsCutoff)
    results.automation_runs = { count: r1.count ?? null, error: r1.error?.message ?? null }

    const r2 = await supabase
      .from('automation_execution_logs')
      .delete({ count: 'exact' })
      .lt('executed_at', logsCutoff)
    results.automation_execution_logs = {
      count: r2.count ?? null,
      error: r2.error?.message ?? null,
    }

    const r3 = await supabase
      .from('automation_event_log')
      .delete({ count: 'exact' })
      .lt('created_at', eventCutoff)
    results.automation_event_log = { count: r3.count ?? null, error: r3.error?.message ?? null }

    return NextResponse.json(
      { ok: true, ranAt: new Date(now).toISOString(), results },
      { status: 200 }
    )
  } catch (err) {
    console.error('[cron/purge-automation-data] crashed', err)
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message ?? 'unknown error', results },
      { status: 500 }
    )
  }
}

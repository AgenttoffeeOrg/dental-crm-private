/**
 * Phase 2b.14 — Vercel cron tick for resuming waiting automation runs.
 *
 * Fires every minute (see `vercel.json`). Picks up to 50 runs whose
 * `waiting_until` has elapsed, resumes them in process, and returns a
 * compact JSON summary. Auth: `CRON_SECRET` matching Vercel cron's
 * `Authorization: Bearer …` header. Idempotent at the run level —
 * walking starts from `current_node_key` so a duplicate tick produces
 * no extra side effects beyond the next node executing once.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAutomationEngine } from '@/lib/automations/automation-engine'
import { initializeAutomationEventListener } from '@/lib/automations/automation-event-listener'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const header = request.headers.get('authorization') ?? ''
    if (header !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  // Defence-in-depth listener boot. The cron is one of the cold-start
  // surfaces a Vercel instance hits — make sure the in-process pub/sub
  // subscriber is up before we touch the engine. (instrumentation.ts
  // is the primary path; this is the safety net.)
  initializeAutomationEventListener()

  try {
    const engine = getAutomationEngine()
    const result = await engine.processWaitingRuns()
    return NextResponse.json(
      { ok: true, resumed: result.resumed, failed: result.failed, ranAt: new Date().toISOString() },
      { status: 200 }
    )
  } catch (err) {
    console.error('[cron/process-automation-waits] crashed', err)
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message ?? 'unknown error' },
      { status: 500 }
    )
  }
}

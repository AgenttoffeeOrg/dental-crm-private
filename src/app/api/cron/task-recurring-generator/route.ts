/**
 * Phase 2b.75 — Recurring task next-instance daily cron.
 *
 * Schedule: `0 1 * * *` (1am UTC daily). Picked off the morning-digest
 * (8am tenant-local) window so the spawned tasks are ready before
 * operators get their morning email.
 *
 * Auth: Bearer ${CRON_SECRET}, same as other crons.
 *
 * Logic lives in src/lib/tasks/recurring-generator.ts so a unit test
 * can hit the function directly without HTTP.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { generateRecurringNextInstances } from '@/lib/tasks/recurring-generator'

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

  const service = createServiceClient()
  const result = await generateRecurringNextInstances(service)

  return NextResponse.json(
    {
      ok: true,
      ran_at: new Date().toISOString(),
      ...result,
    },
    { status: 200 }
  )
}

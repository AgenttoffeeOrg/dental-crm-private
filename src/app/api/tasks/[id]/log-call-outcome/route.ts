/**
 * Phase 2b.65 — Endpoint for the post-call outcome panel.
 *
 *   POST /api/tasks/[id]/log-call-outcome
 *   Body: { outcome: 'connected' | 'voicemail' | 'no_answer' |
 *                    'busy' | 'wrong_number', note?: string }
 *
 * Returns the result of `logCallOutcome` — whether the task closed,
 * whether a follow-up was auto-created, and the new follow-up id
 * (so the UI can show "Created follow-up for tomorrow 14:00" in
 * the toast).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { createServiceClient } from '@/lib/supabase-server'
import { logCallOutcome, type CallOutcome } from '@/lib/tasks/log-call-outcome'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ParamsSchema = z.object({ id: z.string().uuid('Invalid task id') })
const BodySchema = z.object({
  outcome: z.enum(['connected', 'voicemail', 'no_answer', 'busy', 'wrong_number']),
  note: z.string().max(2000).optional(),
})

function handleError(error: unknown) {
  if (error instanceof ApiContextError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[API:log-call-outcome] Unexpected error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = ParamsSchema.safeParse(params)
    if (!ok.success) {
      return NextResponse.json({ error: 'Invalid task id' }, { status: 400 })
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
    const result = await logCallOutcome(service, {
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      taskId: params.id,
      outcome: parsed.data.outcome as CallOutcome,
      note: parsed.data.note,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: 'log_outcome_failed', message: result.error ?? 'unknown' },
        { status: result.error === 'task_not_found' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      task_closed: result.taskClosed,
      follow_up_task_id: result.followUpTaskId,
      error: result.error ?? null,
    })
  } catch (error) {
    return handleError(error)
  }
}

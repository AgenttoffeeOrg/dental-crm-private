/**
 * /api/me/notification-preferences (Phase 2b.70)
 *
 * GET    — read current user's notification preferences from app_users.
 * PATCH  — update one or more boolean toggles.
 *
 * Backs the /settings → Notifications → Basic tab. Columns live on
 * app_users (added in migration 2b.59):
 *   - task_morning_digest_enabled       (default true)
 *   - urgent_task_email_enabled         (default false)
 *   - urgent_task_sms_enabled           (default false)
 *   - manager_overdue_alerts_enabled    (default true)
 *
 * Auth: standard user session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { z } from 'zod'

const PrefsSchema = z.object({
  task_morning_digest_enabled: z.boolean().optional(),
  urgent_task_email_enabled: z.boolean().optional(),
  urgent_task_sms_enabled: z.boolean().optional(),
  manager_overdue_alerts_enabled: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const { data, error } = await context.supabase
      .from('app_users')
      .select(
        'task_morning_digest_enabled, urgent_task_email_enabled, urgent_task_sms_enabled, manager_overdue_alerts_enabled'
      )
      .eq('id', context.user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'lookup_failed', message: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        prefs: {
          task_morning_digest_enabled: data?.task_morning_digest_enabled ?? true,
          urgent_task_email_enabled: data?.urgent_task_email_enabled ?? false,
          urgent_task_sms_enabled: data?.urgent_task_sms_enabled ?? false,
          manager_overdue_alerts_enabled: data?.manager_overdue_alerts_enabled ?? true,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getApiRequestContext(request)
    const body = await request.json().catch(() => ({}))
    const parsed = PrefsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_payload', details: parsed.error.errors },
        { status: 400 }
      )
    }

    // Strip undefineds — we don't want to write nulls.
    const patch: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(parsed.data)) {
      if (typeof v === 'boolean') patch[k] = v
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, no_change: true }, { status: 200 })
    }

    const { error: updateErr } = await context.supabase
      .from('app_users')
      .update(patch)
      .eq('id', context.user.id)

    if (updateErr) {
      return NextResponse.json(
        { error: 'update_failed', message: updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, prefs: patch }, { status: 200 })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * Phase 2b.69 — Morning task digest cron.
 *
 * Fires hourly per vercel.json (added in this phase). For each
 * tenant whose local-time hour is currently 8 (8am–8:59am window),
 * sends a digest email to every user with
 * `app_users.task_morning_digest_enabled = true` AND who hasn't
 * received a digest today (dedup via
 * `task_morning_digest_last_sent_date`).
 *
 * Per the 2026-05-24 product decision:
 *   - 8am tenant-local.
 *   - Default ON per user; opt-out per /settings/notifications.
 *   - Single CTA: "Open today's queue" → /tasks?mode=queue.
 *   - Empty queue → no email (don't bother the operator with
 *     "you have 0 tasks").
 *
 * Auth: matches the other cron routes — Bearer ${CRON_SECRET}.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { buildDigestForUser } from '@/lib/tasks/morning-digest'
import { sendEmailWithIntegration } from '@/lib/integrations/email-provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TARGET_HOUR = 8 // 8am tenant-local
const TZ_DEFAULT = 'Europe/London'

function tenantLocalHour(timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    })
    const parts = fmt.formatToParts(new Date())
    const hourPart = parts.find((p) => p.type === 'hour')
    return hourPart ? parseInt(hourPart.value, 10) : -1
  } catch {
    return -1
  }
}

function tenantLocalDateIso(timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    console.error('[cron/task-morning-digest] CRON_SECRET is unset')
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

  // 1. Find all tenants. We need their timezone to figure out which
  // ones are at 8am right now. (Could pre-filter with SQL, but
  // there aren't many tenants and the per-tenant tz lookup is cheap.)
  const { data: tenants, error: tenantsErr } = await service
    .from('tenants')
    .select('id, name, timezone')

  if (tenantsErr) {
    console.error('[cron/task-morning-digest] tenant scan failed', tenantsErr)
    return NextResponse.json(
      { error: 'scan_failed', message: tenantsErr.message },
      { status: 500 }
    )
  }

  let totalEmailsSent = 0
  let totalErrors = 0
  const perTenant: Array<{
    tenant_id: string
    skipped_reason?: string
    users_eligible?: number
    emails_sent?: number
    emails_skipped?: number
    error?: string
  }> = []

  for (const tenant of (tenants ?? []) as Array<{
    id: string
    name: string | null
    timezone: string | null
  }>) {
    const tz = tenant.timezone || TZ_DEFAULT
    const localHour = tenantLocalHour(tz)
    if (localHour !== TARGET_HOUR) {
      perTenant.push({
        tenant_id: tenant.id,
        skipped_reason: `local_hour=${localHour} (target ${TARGET_HOUR})`,
      })
      continue
    }

    const todayIso = tenantLocalDateIso(tz)

    // 2. Eligible users: opted in AND not already digested today.
    const { data: users, error: usersErr } = await service
      .from('app_users')
      .select('id, full_name, email, task_morning_digest_enabled, task_morning_digest_last_sent_date')
      .eq('task_morning_digest_enabled', true)

    if (usersErr) {
      perTenant.push({
        tenant_id: tenant.id,
        error: `users_lookup_failed: ${usersErr.message}`,
      })
      totalErrors += 1
      continue
    }

    // Tenant membership filter — only users who belong to this
    // tenant via user_tenant_memberships AND active.
    const { data: members } = await service
      .from('user_tenant_memberships')
      .select('user_id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
    const memberIds = new Set(((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id))

    const eligibleUsers = ((users ?? []) as Array<{
      id: string
      full_name: string | null
      email: string | null
      task_morning_digest_last_sent_date: string | null
    }>).filter(
      (u) =>
        memberIds.has(u.id) &&
        u.email &&
        u.task_morning_digest_last_sent_date !== todayIso
    )

    // 3. Load tenant email settings once.
    const { data: settings } = await service
      .from('integration_settings')
      .select('email_provider, email_provider_api_key, email_from_address, email_from_name, email_reply_to_address')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (!settings || !(settings as any).email_provider) {
      perTenant.push({
        tenant_id: tenant.id,
        skipped_reason: 'email_provider_unset',
        users_eligible: eligibleUsers.length,
      })
      continue
    }

    let sentForTenant = 0
    let skippedForTenant = 0

    for (const user of eligibleUsers) {
      try {
        const digest = await buildDigestForUser(
          service,
          { id: user.id, full_name: user.full_name, email: user.email },
          tenant.id,
          tz
        )
        if (digest.empty) {
          skippedForTenant += 1
          continue
        }

        const sendResult = await sendEmailWithIntegration(
          {
            email_provider: (settings as any).email_provider,
            email_api_key: (settings as any).email_provider_api_key ?? null,
            email_from_address: (settings as any).email_from_address ?? null,
            email_from_name: (settings as any).email_from_name ?? null,
            email_oauth_token: undefined,
            email_oauth_refresh_token: undefined,
            email_oauth_expires_at: undefined,
          } as any,
          {
            to: [user.email as string],
            subject: digest.subject,
            html: digest.htmlBody,
            fromEmail: (settings as any).email_from_address ?? undefined,
            fromName: (settings as any).email_from_name ?? 'Limelight Dental CRM',
            replyTo: (settings as any).email_reply_to_address ?? undefined,
          }
        )

        if (!sendResult.success) {
          console.warn('[cron/task-morning-digest] send failed', {
            tenantId: tenant.id,
            userId: user.id,
            error: sendResult.error,
          })
          totalErrors += 1
          continue
        }

        sentForTenant += 1
        totalEmailsSent += 1

        // 4. Dedup mark — record we sent today.
        await service
          .from('app_users')
          .update({ task_morning_digest_last_sent_date: todayIso })
          .eq('id', user.id)
      } catch (err) {
        console.warn('[cron/task-morning-digest] user tick failed', {
          tenantId: tenant.id,
          userId: user.id,
          err: err instanceof Error ? err.message : String(err),
        })
        totalErrors += 1
      }
    }

    perTenant.push({
      tenant_id: tenant.id,
      users_eligible: eligibleUsers.length,
      emails_sent: sentForTenant,
      emails_skipped: skippedForTenant,
    })
  }

  return NextResponse.json(
    {
      ok: true,
      ran_at: new Date().toISOString(),
      tenants_scanned: tenants?.length ?? 0,
      total_emails_sent: totalEmailsSent,
      total_errors: totalErrors,
      per_tenant: perTenant,
    },
    { status: 200 }
  )
}

/**
 * Phase 2b.70 — Task push notifications cron.
 *
 * Vercel schedule: every 5 minutes (vercel.json). Per the
 * 2026-05-24 product spec:
 *
 *   - Due-soon: tasks coming due within the next 5 minutes →
 *     push "Your call/message with X is due now"
 *     to the assignee. Once per task.
 *
 *   - Overdue: tasks overdue ≥30 minutes that haven't been pinged
 *     for overdue yet → push "Overdue: X". Once per task.
 *
 * Dedup uses tasks.notified_at and tasks.notified_overdue_at
 * (columns added in 2b.59). A task that's been notified for due-soon
 * won't be re-pinged unless it stays open and slips into overdue,
 * in which case the overdue rail fires.
 *
 * Assignee scope:
 *   - assignee_user_id IS NOT NULL → that user.
 *   - assigned_to_group_id IS NOT NULL → every member of the group.
 *   - assigned_to_everyone = true → every active member of the
 *     tenant. (Capped at 25 in case someone marks a huge tenant —
 *     practical for v1; the morning digest carries the rest.)
 *
 * Auth: Bearer ${CRON_SECRET}.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { isPushConfigured, sendPushToUser } from '@/lib/notifications/push-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DUE_SOON_LOOKAHEAD_MIN = 5
const OVERDUE_THRESHOLD_MIN = 30
const MANAGER_ESCALATION_THRESHOLD_HOURS_DEFAULT = 24
const EVERYONE_FANOUT_CAP = 25

/**
 * 2b.82 — Per-tenant manager threshold cache. Built once per cron run
 * to avoid re-querying notification_policies for every task.
 */
const tenantManagerThresholdCache = new Map<string, number>()

async function getTenantManagerThresholdHours(
  service: ReturnType<typeof createServiceClient>,
  tenantId: string
): Promise<number> {
  const cached = tenantManagerThresholdCache.get(tenantId)
  if (cached !== undefined) return cached
  const { data } = await service
    .from('notification_policies')
    .select('manager_overdue_hours')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  const hours =
    (data as { manager_overdue_hours?: number | null } | null)?.manager_overdue_hours ??
    MANAGER_ESCALATION_THRESHOLD_HOURS_DEFAULT
  tenantManagerThresholdCache.set(tenantId, hours)
  return hours
}

/**
 * 2b.82 — Per-user quiet-hours check. Returns true if the user has
 * quiet hours enabled AND the current instant falls inside the window
 * (interpreted in the user's local timezone, falling back to the
 * tenant's, falling back to UTC).
 *
 * Stored shape: { enabled: bool, start: "HH:MM", end: "HH:MM" }.
 * Windows wrap midnight when start > end (e.g. 21:00–08:00).
 */
async function isUserInQuietHours(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  tenantTimezone: string | null
): Promise<boolean> {
  const { data } = await service
    .from('notification_preferences')
    .select('quiet_hours')
    .eq('user_id', userId)
    .maybeSingle()
  const qh = (data as { quiet_hours?: any } | null)?.quiet_hours
  if (!qh || !qh.enabled || typeof qh.start !== 'string' || typeof qh.end !== 'string') {
    return false
  }

  // Resolve user's local hh:mm via the user's timezone (falls back to
  // tenant timezone, then UTC).
  const { data: userRow } = await service
    .from('app_users')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle()
  const tz =
    (userRow as { timezone?: string | null } | null)?.timezone ?? tenantTimezone ?? 'UTC'

  let hh: string
  let mm: string
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
    hh = parts.find((p) => p.type === 'hour')?.value ?? '00'
    mm = parts.find((p) => p.type === 'minute')?.value ?? '00'
  } catch {
    return false
  }
  const hhmm = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`
  const start = qh.start as string
  const end = qh.end as string
  if (start <= end) return hhmm >= start && hhmm < end
  // Wrap-around window (e.g. 21:00 → 08:00).
  return hhmm >= start || hhmm < end
}

const tenantTimezoneCache = new Map<string, string | null>()
async function getTenantTimezone(
  service: ReturnType<typeof createServiceClient>,
  tenantId: string
): Promise<string | null> {
  if (tenantTimezoneCache.has(tenantId)) return tenantTimezoneCache.get(tenantId) ?? null
  const { data } = await service
    .from('tenants')
    .select('timezone')
    .eq('id', tenantId)
    .maybeSingle()
  const tz = (data as { timezone?: string | null } | null)?.timezone ?? null
  tenantTimezoneCache.set(tenantId, tz)
  return tz
}

interface TaskRow {
  id: string
  tenant_id: string
  title: string
  due_at: string | null
  status: string
  assignee_user_id: string | null
  assigned_to_group_id: string | null
  assigned_to_everyone: boolean | null
  contact_id: string | null
  deal_id: string | null
  notified_at: string | null
  notified_overdue_at: string | null
  escalated_to_manager_at: string | null
  priority: string | null
  task_type: string | null
}

async function resolveRecipients(
  service: ReturnType<typeof createServiceClient>,
  task: TaskRow
): Promise<string[]> {
  if (task.assignee_user_id) return [task.assignee_user_id]

  if (task.assigned_to_group_id) {
    const { data } = await service
      .from('user_group_memberships')
      .select('user_id')
      .eq('tenant_id', task.tenant_id)
      .eq('group_id', task.assigned_to_group_id)
    return ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id)
  }

  if (task.assigned_to_everyone) {
    // 2b.79 — deterministic order so consecutive cron runs notify the
    // SAME 25 users when a tenant overflows the fanout cap. Without
    // `.order()`, Postgres can return any 25 and the unlucky 26+ never
    // get notified for any task.
    const { data } = await service
      .from('user_tenant_memberships')
      .select('user_id, created_at')
      .eq('tenant_id', task.tenant_id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(EVERYONE_FANOUT_CAP)
    return ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id)
  }

  return []
}

function bodyForTask(task: TaskRow, isOverdue: boolean): { title: string; body: string; url: string } {
  const verb = isOverdue ? 'Overdue' : 'Due now'
  const title = `${verb}: ${task.title}`
  // Body is the channel hint, helpful at a glance on lockscreen.
  const channel =
    task.task_type === 'call' ? 'Phone call' :
    task.task_type === 'sms' ? 'SMS' :
    task.task_type === 'whatsapp' ? 'WhatsApp' :
    task.task_type === 'email' ? 'Email' :
    task.task_type === 'note' ? 'Internal note' :
    'Task'

  const url = `/tasks?taskId=${task.id}`

  return { title, body: channel, url }
}

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

  if (!isPushConfigured()) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: 'vapid_not_configured' },
      { status: 200 }
    )
  }

  const service = createServiceClient()
  // 2b.85 — clear the module-scoped caches at the top of each cron
  // invocation so a tenant editing notification_policies.manager_overdue_hours
  // or app_users.timezone sees the change on the next 5-min tick, not
  // whenever Vercel happens to cold-start.
  tenantManagerThresholdCache.clear()
  tenantTimezoneCache.clear()
  const nowIso = new Date().toISOString()
  const dueSoonCutoffIso = new Date(Date.now() + DUE_SOON_LOOKAHEAD_MIN * 60 * 1000).toISOString()
  const overdueThresholdIso = new Date(Date.now() - OVERDUE_THRESHOLD_MIN * 60 * 1000).toISOString()

  let dueSoonPinged = 0
  let overduePinged = 0
  let recipientsTotal = 0
  let prunedTotal = 0

  // --- 1. Due-soon: open tasks due in next 5 min, not yet pinged. ---
  const { data: dueSoon, error: dueErr } = await service
    .from('tasks')
    .select(
      'id, tenant_id, title, due_at, status, assignee_user_id, assigned_to_group_id, assigned_to_everyone, contact_id, deal_id, notified_at, notified_overdue_at, escalated_to_manager_at, priority, task_type'
    )
    .in('status', ['open', 'in_progress'])
    .is('notified_at', null)
    .not('due_at', 'is', null)
    .gte('due_at', nowIso)
    .lte('due_at', dueSoonCutoffIso)
    .limit(200)

  if (dueErr) {
    console.error('[cron/task-push-notifications] due_soon query failed', dueErr)
  }

  for (const task of (dueSoon ?? []) as TaskRow[]) {
    // 2b.79 — wrap each task so a mid-fanout exception doesn't skip
    // the notified_at stamp. Without the stamp, the next 5-min tick
    // would re-ping recipients who already got the notification.
    try {
      const recipients = await resolveRecipients(service, task)
      recipientsTotal += recipients.length
      const payload = bodyForTask(task, false)
      const tenantTz = await getTenantTimezone(service, task.tenant_id)
      const isUrgent = task.priority === 'urgent'
      for (const userId of recipients) {
        // 2b.82 — quiet hours: non-urgent due-soon pings get
        // suppressed during the receiving user's quiet window. We
        // still stamp notified_at so we don't ping when they wake
        // up either (they'll see it in the dashboard + queue —
        // the cron's job was the live ping, which has now passed).
        if (!isUrgent && (await isUserInQuietHours(service, userId, tenantTz))) {
          continue
        }
        const { delivered, pruned } = await sendPushToUser(userId, {
          ...payload,
          taskId: task.id,
          tag: `task-${task.id}`,
        })
        if (delivered > 0) dueSoonPinged += 1
        prunedTotal += pruned
      }
    } catch (err) {
      console.warn('[cron/task-push-notifications] due_soon recipient loop threw', task.id, err)
    } finally {
      await service.from('tasks').update({ notified_at: nowIso }).eq('id', task.id)
    }
  }

  // --- 2. Overdue: open tasks past threshold not yet pinged overdue. ---
  const { data: overdue, error: overdueErr } = await service
    .from('tasks')
    .select(
      'id, tenant_id, title, due_at, status, assignee_user_id, assigned_to_group_id, assigned_to_everyone, contact_id, deal_id, notified_at, notified_overdue_at, escalated_to_manager_at, priority, task_type'
    )
    .in('status', ['open', 'in_progress'])
    .is('notified_overdue_at', null)
    .not('due_at', 'is', null)
    .lte('due_at', overdueThresholdIso)
    .limit(200)

  if (overdueErr) {
    console.error('[cron/task-push-notifications] overdue query failed', overdueErr)
  }

  for (const task of (overdue ?? []) as TaskRow[]) {
    try {
      const recipients = await resolveRecipients(service, task)
      recipientsTotal += recipients.length
      const payload = bodyForTask(task, true)
      for (const userId of recipients) {
        const { delivered, pruned } = await sendPushToUser(userId, {
          ...payload,
          taskId: task.id,
          tag: `task-${task.id}-overdue`,
          requireInteraction: true,
        })
        if (delivered > 0) overduePinged += 1
        prunedTotal += pruned
      }
    } catch (err) {
      console.warn('[cron/task-push-notifications] overdue recipient loop threw', task.id, err)
    } finally {
      await service
        .from('tasks')
        .update({ notified_overdue_at: nowIso })
        .eq('id', task.id)
    }
  }

  // --- 3. Manager-overdue: urgent/high tasks past the per-tenant
  //        threshold (default 24h), assigned to a user with a
  //        registered manager, manager opted in to overdue alerts.
  //        Once per task. ---
  //
  // 2b.82 — pre-load every tenant's threshold once before the scan
  // so we can use the tightest threshold (smallest hours value) in the
  // initial query. We then re-check per-task with the tenant-specific
  // value to filter out tasks that aren't quite overdue yet for their
  // own tenant.
  //
  // First pass: find candidate tasks using the SMALLEST tenant
  // threshold (or default if no overrides exist). Per-tenant trim
  // happens in the loop below.
  let smallestThresholdHours = MANAGER_ESCALATION_THRESHOLD_HOURS_DEFAULT
  const { data: allPolicies } = await service
    .from('notification_policies')
    .select('tenant_id, manager_overdue_hours')
  for (const p of (allPolicies ?? []) as Array<{
    tenant_id: string
    manager_overdue_hours: number | null
  }>) {
    if (p.manager_overdue_hours != null) {
      tenantManagerThresholdCache.set(p.tenant_id, p.manager_overdue_hours)
      if (p.manager_overdue_hours < smallestThresholdHours) {
        smallestThresholdHours = p.manager_overdue_hours
      }
    }
  }
  const managerCutoffIso = new Date(
    Date.now() - smallestThresholdHours * 3600 * 1000
  ).toISOString()
  let managerPinged = 0

  const { data: managerCandidates, error: mgrErr } = await service
    .from('tasks')
    .select(
      'id, tenant_id, title, due_at, status, assignee_user_id, assigned_to_group_id, assigned_to_everyone, contact_id, deal_id, notified_at, notified_overdue_at, escalated_to_manager_at, priority, task_type'
    )
    .in('status', ['open', 'in_progress'])
    .is('escalated_to_manager_at', null)
    .not('assignee_user_id', 'is', null)
    .not('due_at', 'is', null)
    .lte('due_at', managerCutoffIso)
    .in('priority', ['high', 'urgent'])
    .limit(200)

  if (mgrErr) {
    console.error('[cron/task-push-notifications] manager_overdue query failed', mgrErr)
  }

  for (const task of (managerCandidates ?? []) as TaskRow[]) {
    if (!task.assignee_user_id || !task.due_at) continue

    // 2b.82 — per-tenant threshold trim.
    const tenantThresholdHours = await getTenantManagerThresholdHours(service, task.tenant_id)
    const taskAgeMs = Date.now() - new Date(task.due_at).getTime()
    if (taskAgeMs < tenantThresholdHours * 3600 * 1000) continue

    // 2b.83 — wrap the per-task work in try/finally so a mid-send
    // exception still stamps escalated_to_manager_at (same race
    // protection as the due-soon and overdue rails).
    let shouldStamp = false
    try {
    // Look up the assignee's manager (and whether they opted in).
    const { data: assigneeRow } = await service
      .from('app_users')
      .select('manager_user_id, full_name')
      .eq('id', task.assignee_user_id)
      .maybeSingle()

    const managerId = (assigneeRow as { manager_user_id?: string | null } | null)?.manager_user_id
    if (!managerId) {
      // No manager → no escalation possible. Don't stamp; if a
      // manager gets set later we want this task to flow through.
      continue
    }

    const { data: managerRow } = await service
      .from('app_users')
      .select('manager_overdue_alerts_enabled')
      .eq('id', managerId)
      .maybeSingle()

    if (!(managerRow as { manager_overdue_alerts_enabled?: boolean } | null)?.manager_overdue_alerts_enabled) {
      // 2b.79 asymmetry note: if the manager later flips the toggle
      // back ON, the stamp means this task will NOT retroactively
      // escalate. New overdue tasks will. Opt-in does not back-fill;
      // that's by design (avoids the "I just turned this on and got
      // 200 historical pings" antipattern).
      shouldStamp = true
      continue
    }

    const assigneeName = (assigneeRow as { full_name?: string | null } | null)?.full_name ?? 'someone'

    const { delivered, pruned } = await sendPushToUser(managerId, {
      title: `${assigneeName}'s task is overdue`,
      body: task.title,
      url: `/tasks?taskId=${task.id}`,
      taskId: task.id,
      tag: `task-${task.id}-manager`,
      requireInteraction: false,
    })
    if (delivered > 0) managerPinged += 1
    prunedTotal += pruned
    shouldStamp = true
    } catch (err) {
      console.warn('[cron/task-push-notifications] manager rail loop threw', task.id, err)
      shouldStamp = true
    } finally {
      if (shouldStamp) {
        await service
          .from('tasks')
          .update({ escalated_to_manager_at: nowIso })
          .eq('id', task.id)
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      ran_at: nowIso,
      due_soon_tasks: dueSoon?.length ?? 0,
      overdue_tasks: overdue?.length ?? 0,
      manager_overdue_tasks: managerCandidates?.length ?? 0,
      due_soon_pinged: dueSoonPinged,
      overdue_pinged: overduePinged,
      manager_overdue_pinged: managerPinged,
      recipients_total: recipientsTotal,
      dead_subscriptions_pruned: prunedTotal,
    },
    { status: 200 }
  )
}

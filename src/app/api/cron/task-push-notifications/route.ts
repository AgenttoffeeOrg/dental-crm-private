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
const MANAGER_ESCALATION_THRESHOLD_HOURS = 24
const EVERYONE_FANOUT_CAP = 25

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
      for (const userId of recipients) {
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

  // --- 3. Manager-overdue: urgent/high tasks ≥24h overdue,
  //        assigned to a user with a registered manager, manager
  //        opted in to overdue alerts. Once per task. ---
  const managerCutoffIso = new Date(
    Date.now() - MANAGER_ESCALATION_THRESHOLD_HOURS * 3600 * 1000
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
    if (!task.assignee_user_id) continue

    // Look up the assignee's manager (and whether they opted in).
    const { data: assigneeRow } = await service
      .from('app_users')
      .select('manager_user_id, full_name')
      .eq('id', task.assignee_user_id)
      .maybeSingle()

    const managerId = (assigneeRow as { manager_user_id?: string | null } | null)?.manager_user_id
    if (!managerId) continue

    const { data: managerRow } = await service
      .from('app_users')
      .select('manager_overdue_alerts_enabled')
      .eq('id', managerId)
      .maybeSingle()

    if (!(managerRow as { manager_overdue_alerts_enabled?: boolean } | null)?.manager_overdue_alerts_enabled) {
      // Still stamp escalated_to_manager_at so we don't keep
      // re-querying the same dead task next tick. Operator opted
      // OUT — respect that.
      //
      // 2b.79 asymmetry note: if the manager later flips the toggle
      // back ON, the stamp means this task will NOT retroactively
      // escalate. New overdue tasks will. Opt-in does not back-fill;
      // that's by design (avoids the "I just turned this on and got
      // 200 historical pings" antipattern).
      await service
        .from('tasks')
        .update({ escalated_to_manager_at: nowIso })
        .eq('id', task.id)
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

    await service
      .from('tasks')
      .update({ escalated_to_manager_at: nowIso })
      .eq('id', task.id)
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

/**
 * Phase 2b.69 — Morning task digest builder.
 *
 * For a given user, builds a tiny daily summary of today's tasks
 * (counts grouped by channel + first task per bucket as teaser).
 * Renders plain text + minimal HTML for the email body.
 *
 * Per the 2026-05-24 product spec:
 *   - Sent at 8am tenant-local time (cron resolves the timezone).
 *   - Default ON per user; opt-out via app_users.task_morning_digest_enabled.
 *   - Counts grouped: calls / messages / general.
 *   - First task per bucket named as a teaser.
 *   - Single CTA: open today's queue.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface DigestTaskRow {
  id: string
  title: string
  due_at: string | null
  task_type: string | null
  priority: string | null
}

export interface DigestUser {
  id: string
  full_name: string | null
  email: string | null
}

export interface DigestPayload {
  /** True when the user has zero tasks today — caller skips send. */
  empty: boolean
  callsCount: number
  messagesCount: number
  generalCount: number
  totalCount: number
  firstCallTeaser: string | null
  firstMessageTeaser: string | null
  /** Plain-text body (used by SMS-style notifications too). */
  textBody: string
  /** Minimal HTML body for the email. */
  htmlBody: string
  /** Subject line. */
  subject: string
}

const TZ_DEFAULT = 'Europe/London'

function formatTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    })
  } catch {
    return ''
  }
}

function classifyBucket(taskType: string | null): 'calls' | 'messages' | 'general' {
  if (taskType === 'call') return 'calls'
  if (taskType === 'sms' || taskType === 'whatsapp' || taskType === 'email' || taskType === 'note') {
    return 'messages'
  }
  return 'general'
}

/**
 * Read today's open tasks for a user (or unassigned + group tasks
 * the user belongs to — same rules as the dashboard "Today's
 * priorities" lane). Returns a sorted DigestPayload ready to email.
 */
export async function buildDigestForUser(
  supabase: SupabaseClient,
  user: DigestUser,
  tenantId: string,
  tenantTimezone: string = TZ_DEFAULT,
  appBaseUrl = 'https://dental-crm-nine.vercel.app'
): Promise<DigestPayload> {
  // "Today" in the tenant's timezone — compute the local-midnight
  // window and translate to UTC for the query.
  const now = new Date()
  const localFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tenantTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const ymd = localFormatter.format(now) // e.g. "2026-05-24"
  // Naive ISO at local midnight + 24h. Crude but accurate enough for
  // a day-bucket filter.
  const localStart = new Date(`${ymd}T00:00:00`)
  const localEnd = new Date(localStart.getTime() + 24 * 3600 * 1000)

  // Find tasks assigned to user OR shared (group with the user as
  // a member, or assigned_to_everyone) within today.
  // Free-floating queries: do the assignment dimensions as one OR.
  // SQL via PostgREST: we'll fetch in three slices + union client-side
  // (simpler than constructing a complex .or() string).
  const [meRes, groupRes, everyoneRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, due_at, task_type, priority')
      .eq('tenant_id', tenantId)
      .eq('assignee_user_id', user.id)
      .in('status', ['open', 'in_progress'])
      .gte('due_at', localStart.toISOString())
      .lt('due_at', localEnd.toISOString()),
    supabase
      .from('user_group_memberships')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId),
    supabase
      .from('tasks')
      .select('id, title, due_at, task_type, priority')
      .eq('tenant_id', tenantId)
      .eq('assigned_to_everyone', true)
      .in('status', ['open', 'in_progress'])
      .gte('due_at', localStart.toISOString())
      .lt('due_at', localEnd.toISOString()),
  ])

  const groupIds = ((groupRes.data ?? []) as Array<{ group_id: string }>).map((g) => g.group_id)
  let groupTasks: DigestTaskRow[] = []
  if (groupIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_at, task_type, priority')
      .eq('tenant_id', tenantId)
      .in('assigned_to_group_id', groupIds)
      .in('status', ['open', 'in_progress'])
      .gte('due_at', localStart.toISOString())
      .lt('due_at', localEnd.toISOString())
    groupTasks = (data ?? []) as DigestTaskRow[]
  }

  // Dedup by id (a task might match more than one criterion).
  const byId = new Map<string, DigestTaskRow>()
  for (const t of (meRes.data ?? []) as DigestTaskRow[]) byId.set(t.id, t)
  for (const t of (everyoneRes.data ?? []) as DigestTaskRow[]) byId.set(t.id, t)
  for (const t of groupTasks) byId.set(t.id, t)
  const tasks = Array.from(byId.values()).sort((a, b) => {
    const ta = a.due_at ?? ''
    const tb = b.due_at ?? ''
    return ta.localeCompare(tb)
  })

  // Bucket counts + teasers.
  let callsCount = 0
  let messagesCount = 0
  let generalCount = 0
  let firstCall: DigestTaskRow | null = null
  let firstMessage: DigestTaskRow | null = null

  for (const t of tasks) {
    const bucket = classifyBucket(t.task_type)
    if (bucket === 'calls') {
      callsCount += 1
      if (!firstCall) firstCall = t
    } else if (bucket === 'messages') {
      messagesCount += 1
      if (!firstMessage) firstMessage = t
    } else {
      generalCount += 1
    }
  }

  const totalCount = tasks.length
  if (totalCount === 0) {
    return {
      empty: true,
      callsCount: 0,
      messagesCount: 0,
      generalCount: 0,
      totalCount: 0,
      firstCallTeaser: null,
      firstMessageTeaser: null,
      textBody: '',
      htmlBody: '',
      subject: '',
    }
  }

  const firstName = (user.full_name ?? '').split(' ')[0] || 'there'
  const firstCallTeaser = firstCall
    ? `${formatTime(firstCall.due_at ?? '', tenantTimezone)} — ${firstCall.title}`
    : null
  const firstMessageTeaser = firstMessage
    ? `${formatTime(firstMessage.due_at ?? '', tenantTimezone)} — ${firstMessage.title}`
    : null

  const subject = `Your ${totalCount} task${totalCount === 1 ? '' : 's'} for today`

  const bulletLines: string[] = []
  if (callsCount > 0) bulletLines.push(`  • ${callsCount} call${callsCount === 1 ? '' : 's'}`)
  if (messagesCount > 0) bulletLines.push(`  • ${messagesCount} message${messagesCount === 1 ? '' : 's'} (SMS / WhatsApp / Email)`)
  if (generalCount > 0) bulletLines.push(`  • ${generalCount} general task${generalCount === 1 ? '' : 's'}`)

  const teaserLines: string[] = []
  if (firstCallTeaser) teaserLines.push(`First call: ${firstCallTeaser}`)
  if (firstMessageTeaser) teaserLines.push(`First message: ${firstMessageTeaser}`)

  const cta = `${appBaseUrl}/tasks?mode=queue`

  const textBody = [
    `Good morning, ${firstName} —`,
    '',
    `You have ${totalCount} task${totalCount === 1 ? '' : 's'} today:`,
    ...bulletLines,
    '',
    ...teaserLines,
    '',
    `Open today's queue: ${cta}`,
    '',
    '— Limelight Dental CRM',
    '',
    'You can turn off this daily digest in Settings → Notifications.',
  ].join('\n')

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; padding: 24px; color: #1f2937;">
  <p style="margin: 0 0 12px;">Good morning, <strong>${escapeHtml(firstName)}</strong> —</p>
  <p style="margin: 0 0 8px;">You have <strong>${totalCount}</strong> task${totalCount === 1 ? '' : 's'} today:</p>
  <ul style="margin: 0 0 16px; padding-left: 20px; color: #374151;">
    ${callsCount > 0 ? `<li>${callsCount} call${callsCount === 1 ? '' : 's'}</li>` : ''}
    ${messagesCount > 0 ? `<li>${messagesCount} message${messagesCount === 1 ? '' : 's'} (SMS / WhatsApp / Email)</li>` : ''}
    ${generalCount > 0 ? `<li>${generalCount} general task${generalCount === 1 ? '' : 's'}</li>` : ''}
  </ul>
  ${
    firstCallTeaser
      ? `<p style="margin: 0 0 4px; font-size: 14px;"><strong>First call:</strong> ${escapeHtml(firstCallTeaser)}</p>`
      : ''
  }
  ${
    firstMessageTeaser
      ? `<p style="margin: 0 0 16px; font-size: 14px;"><strong>First message:</strong> ${escapeHtml(firstMessageTeaser)}</p>`
      : ''
  }
  <p style="margin: 24px 0;">
    <a href="${cta}" style="display: inline-block; background: #2563eb; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">
      Open today's queue →
    </a>
  </p>
  <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px;">
    — Limelight Dental CRM<br>
    You can turn off this daily digest in Settings → Notifications.
  </p>
</div>
  `.trim()

  return {
    empty: false,
    callsCount,
    messagesCount,
    generalCount,
    totalCount,
    firstCallTeaser,
    firstMessageTeaser,
    textBody,
    htmlBody,
    subject,
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Phase 2b.64 — Path X auto-done on outbound.
 *
 * When the dispatcher writes an outbound activity (email / SMS /
 * WhatsApp), check for any open tasks matching (tenant_id,
 * contact_id, task_type=channel). For each match, mark the task
 * done and stamp `auto_completed_via_activity_id` so the UI can
 * render the "Auto-completed because you sent an [email] to [Joey]"
 * hint + Reopen button.
 *
 * Per the 2026-05-24 product discussion (Path X — channel match):
 *   - Channel match is the rule. If task_type='email' and the
 *     outbound is an email to the same contact → done.
 *   - Created-after-the-task rule: the outbound must have occurred
 *     AFTER the task was created. Otherwise a brand-new task
 *     created right after a send would auto-close before the
 *     operator even saw it.
 *   - All open matching tasks close (not just one). If the operator
 *     had multiple "send email to Joey" tasks pending, sending one
 *     email closes all of them — the operator intends to satisfy
 *     them as a batch.
 *
 * Fail-soft: any error logs + returns 0 without throwing. The
 * outbound activity itself has already been written; we don't want
 * a task-side hiccup to bubble up as a dispatcher failure.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type AutoCompleteChannel = 'email' | 'sms' | 'whatsapp' | 'call' | 'note'

export interface AutoCompleteInput {
  tenantId: string
  contactId: string | null
  channel: AutoCompleteChannel
  activityId: string
  activityOccurredAt: string
  /**
   * Phase 2b.79 — assignee scoping. When provided, only close tasks
   * assigned to this user (or unassigned/group/everyone). Without it,
   * the original 2b.64 behaviour (cross-assignee batch close) stays
   * as the default — useful when a single send legitimately satisfies
   * the practice's collective intent across operators.
   *
   * Recommended: dispatcher passes the sender's user id when known.
   * Leave undefined when the send originates from an automation
   * (no operator owner) or when an admin wants the broad sweep.
   */
  operatorUserId?: string | null
}

export interface AutoCompleteResult {
  completedTaskIds: string[]
  error?: string
}

/**
 * Find open tasks for this (tenant, contact, channel) and mark them
 * done with auto_completed_via_activity_id = the source outbound.
 * Returns the list of task IDs closed.
 */
export async function autoCompleteTasksOnOutbound(
  supabase: SupabaseClient,
  input: AutoCompleteInput
): Promise<AutoCompleteResult> {
  // Free-floating outbound (no contact) can't match — bail.
  if (!input.contactId) {
    return { completedTaskIds: [] }
  }

  try {
    // 1. Find candidate tasks: open status, matching tenant+contact+type,
    //    created BEFORE the outbound happened. The
    //    created_at < occurred_at guard prevents closing a brand-new
    //    task that was created moments after the send.
    let query = supabase
      .from('tasks')
      .select('id, assignee_user_id')
      .eq('tenant_id', input.tenantId)
      .eq('contact_id', input.contactId)
      .eq('task_type', input.channel)
      .in('status', ['open', 'in_progress'])
      .lt('created_at', input.activityOccurredAt)

    // 2b.79 — if an operator user id is provided, scope the close to
    // tasks owned by THAT user (or unassigned / group / everyone, since
    // a shared task can legitimately be satisfied by anyone). Pure
    // "wrong assignee" tasks (someone ELSE specifically assigned) stay
    // open.
    //
    // 2b.83 — widened: group-assigned and everyone-assigned tasks also
    // close, since any operator can satisfy a shared task by sending.
    if (input.operatorUserId) {
      query = query.or(
        [
          `assignee_user_id.eq.${input.operatorUserId}`,
          'assignee_user_id.is.null',
          'assigned_to_group_id.not.is.null',
          'assigned_to_everyone.is.true',
        ].join(',')
      )
    }
    const { data: candidates, error: findErr } = await query

    if (findErr) {
      console.warn('[auto-complete-on-outbound] candidates lookup failed', findErr.message)
      return { completedTaskIds: [], error: findErr.message }
    }

    const ids = ((candidates ?? []) as Array<{ id: string; assignee_user_id: string | null }>).map((t) => t.id)
    if (ids.length === 0) {
      return { completedTaskIds: [] }
    }

    // 2. Bulk close — mark done + stamp auto-complete provenance.
    const nowIso = new Date().toISOString()
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({
        status: 'done',
        completed_at: nowIso,
        updated_at: nowIso,
        auto_completed_via_activity_id: input.activityId,
      })
      .in('id', ids)
      .eq('tenant_id', input.tenantId)

    if (updateErr) {
      console.warn('[auto-complete-on-outbound] bulk update failed', updateErr.message)
      return { completedTaskIds: [], error: updateErr.message }
    }

    return { completedTaskIds: ids }
  } catch (err) {
    console.warn('[auto-complete-on-outbound] unexpected error', err)
    return {
      completedTaskIds: [],
      error: err instanceof Error ? err.message : 'unknown',
    }
  }
}

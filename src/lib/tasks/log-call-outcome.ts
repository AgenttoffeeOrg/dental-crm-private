/**
 * Phase 2b.65 — Call outcome logic for the task queue.
 *
 * When a call task ends, the operator logs the outcome via the
 * post-call panel. This helper applies the 2026-05-24 product
 * rules:
 *
 *   - Connected             → task done, no follow-up.
 *   - Voicemail             → task done + auto-create "Call back —
 *                              left voicemail" task tomorrow.
 *   - No answer             → task done + auto-create follow-up
 *                              task +3 hours (same day re-try).
 *   - Busy / Wrong number   → leave task OPEN (operator decides
 *                              what to do; the auto-rules don't
 *                              know if it's the right number or
 *                              just bad timing).
 *
 * The follow-up tasks inherit the original task's assignee,
 * contact, deal, and location. Type stays 'call'. Priority stays
 * the same.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'wrong_number'

export interface LogCallOutcomeInput {
  tenantId: string
  taskId: string
  outcome: CallOutcome
  /** Optional note the operator typed in the post-call panel. */
  note?: string
}

export interface LogCallOutcomeResult {
  ok: boolean
  taskClosed: boolean
  followUpTaskId: string | null
  error?: string
}

interface TaskRow {
  id: string
  tenant_id: string
  title: string
  contact_id: string | null
  deal_id: string | null
  location_id: string | null
  assignee_user_id: string | null
  assigned_to_group_id: string | null
  assigned_to_everyone: boolean | null
  priority: string | null
}

function shiftIso(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString()
}

export async function logCallOutcome(
  supabase: SupabaseClient,
  input: LogCallOutcomeInput
): Promise<LogCallOutcomeResult> {
  // 1. Load the original task so we can copy fields onto a follow-up.
  const { data: task, error: loadErr } = await supabase
    .from('tasks')
    .select(
      'id, tenant_id, title, contact_id, deal_id, location_id, assignee_user_id, assigned_to_group_id, assigned_to_everyone, priority'
    )
    .eq('id', input.taskId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  if (loadErr || !task) {
    return { ok: false, taskClosed: false, followUpTaskId: null, error: 'task_not_found' }
  }
  const t = task as TaskRow

  // Busy / wrong-number → leave open. Operator decides.
  if (input.outcome === 'busy' || input.outcome === 'wrong_number') {
    return { ok: true, taskClosed: false, followUpTaskId: null }
  }

  // Connected / voicemail / no_answer → close the task.
  const nowIso = new Date().toISOString()
  const { error: closeErr } = await supabase
    .from('tasks')
    .update({
      status: 'done',
      completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', input.taskId)
    .eq('tenant_id', input.tenantId)

  if (closeErr) {
    return { ok: false, taskClosed: false, followUpTaskId: null, error: closeErr.message }
  }

  // Connected → no follow-up.
  if (input.outcome === 'connected') {
    return { ok: true, taskClosed: true, followUpTaskId: null }
  }

  // Voicemail → tomorrow follow-up. No-answer → +3h follow-up.
  const followUpDueAt =
    input.outcome === 'voicemail'
      ? shiftIso(24)
      : shiftIso(3)
  const followUpTitle =
    input.outcome === 'voicemail'
      ? `Call back — left voicemail: ${t.title}`
      : `Try again — no answer: ${t.title}`

  const followUpPayload = {
    tenant_id: t.tenant_id,
    title: followUpTitle,
    status: 'open' as const,
    priority: t.priority ?? 'normal',
    task_type: 'call',
    due_at: followUpDueAt,
    contact_id: t.contact_id,
    deal_id: t.deal_id,
    location_id: t.location_id,
    assignee_user_id: t.assignee_user_id,
    assigned_to_group_id: t.assigned_to_group_id,
    assigned_to_everyone: t.assigned_to_everyone ?? false,
    auto_created: true,
    // No source_activity_id — the follow-up isn't from an AI
    // suggestion; it's from a call outcome rule.
  }

  const { data: followUp, error: createErr } = await supabase
    .from('tasks')
    .insert([followUpPayload])
    .select('id')
    .single()

  if (createErr || !followUp) {
    // The original task is already closed; don't fail the whole
    // operation just because the follow-up couldn't be created.
    console.warn('[log-call-outcome] follow-up insert failed', createErr?.message)
    return {
      ok: true,
      taskClosed: true,
      followUpTaskId: null,
      error: `follow_up_create_failed: ${createErr?.message ?? 'unknown'}`,
    }
  }

  return {
    ok: true,
    taskClosed: true,
    followUpTaskId: (followUp as { id: string }).id,
  }
}

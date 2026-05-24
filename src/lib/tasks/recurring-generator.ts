/**
 * Phase 2b.75 — Recurring task next-instance generator.
 *
 * For each anchor task that:
 *   - has a recurring_rule_id, AND
 *   - has reached a terminal state (done / cancelled), AND
 *   - has not yet spawned a child (last_recurring_generated_at IS NULL),
 *
 * compute the next due_at from the rule (frequency + interval_count +
 * weekly_days + monthly_day) and INSERT a new task with the same
 * shape and recurring_rule_id, then stamp the anchor.
 *
 * Series cap:
 *   - occurrences_limit caps the chain length. Counted as "anchor
 *     plus children" via recurring_rule_id grouping.
 *   - ends_at terminates the series at a date.
 *
 * Custom RRULE: not yet implemented. Such anchors are skipped with a
 * console.warn; importing a full RFC 5545 parser belongs in a
 * dedicated phase.
 *
 * Dedup is at-most-once thanks to last_recurring_generated_at — if
 * the cron retries, the anchor's stamp blocks a second insert.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface AnchorTask {
  id: string
  tenant_id: string
  title: string
  description: string | null
  priority: string | null
  task_type: string | null
  due_at: string | null
  contact_id: string | null
  deal_id: string | null
  location_id: string | null
  assignee_user_id: string | null
  assigned_to_group_id: string | null
  assigned_to_everyone: boolean | null
  recurring_rule_id: string | null
  status: string | null
  last_recurring_generated_at: string | null
}

interface RecurringRule {
  id: string
  tenant_id: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  interval_count: number | null
  weekly_days: number[] | null
  monthly_day: number | null
  rrule: string | null
  occurrences_limit: number | null
  ends_at: string | null
}

export interface GeneratorResult {
  scanned: number
  spawned: number
  skipped_no_due_at: number
  skipped_custom_rrule: number
  skipped_series_capped: number
  errors: number
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

function addMonths(iso: string, months: number, dayOfMonth: number | null): string {
  const d = new Date(iso)
  // Use UTC math to stay deterministic on Vercel.
  const targetMonth = d.getUTCMonth() + months
  d.setUTCMonth(targetMonth)
  if (dayOfMonth != null) {
    d.setUTCDate(dayOfMonth)
  }
  return d.toISOString()
}

function nextWeeklyDueAt(
  anchorIso: string,
  intervalCount: number,
  weeklyDays: number[] | null
): string {
  // Step `interval_count` weeks ahead, then snap to the next allowed
  // weekday (or stay put if no weekly_days filter).
  let candidate = addDays(anchorIso, intervalCount * 7)
  if (!weeklyDays || weeklyDays.length === 0) return candidate
  const allowed = new Set(weeklyDays)
  // Walk forward up to 7 days to find a match.
  for (let i = 0; i < 7; i++) {
    const d = new Date(candidate)
    if (allowed.has(d.getUTCDay())) return candidate
    candidate = addDays(candidate, 1)
  }
  return candidate // shouldn't hit
}

export function computeNextDueAt(rule: RecurringRule, anchorDueAt: string): string | null {
  const interval = rule.interval_count ?? 1
  switch (rule.frequency) {
    case 'daily':
      return addDays(anchorDueAt, interval)
    case 'weekly':
      return nextWeeklyDueAt(anchorDueAt, interval, rule.weekly_days)
    case 'monthly':
      return addMonths(anchorDueAt, interval, rule.monthly_day)
    case 'custom':
      return null // RRULE — not yet implemented.
    default:
      return null
  }
}

export async function generateRecurringNextInstances(
  service: SupabaseClient
): Promise<GeneratorResult> {
  const result: GeneratorResult = {
    scanned: 0,
    spawned: 0,
    skipped_no_due_at: 0,
    skipped_custom_rrule: 0,
    skipped_series_capped: 0,
    errors: 0,
  }

  // Candidates: terminal anchors with a rule, not yet spawned.
  const { data: anchors, error: anchorErr } = await service
    .from('tasks')
    .select(
      'id, tenant_id, title, description, priority, task_type, due_at, contact_id, deal_id, location_id, assignee_user_id, assigned_to_group_id, assigned_to_everyone, recurring_rule_id, status, last_recurring_generated_at'
    )
    .not('recurring_rule_id', 'is', null)
    .is('last_recurring_generated_at', null)
    .in('status', ['done', 'cancelled'])
    .limit(500)

  if (anchorErr) {
    console.error('[recurring-generator] anchor scan failed', anchorErr)
    result.errors += 1
    return result
  }

  for (const raw of (anchors ?? []) as AnchorTask[]) {
    result.scanned += 1
    if (!raw.due_at) {
      result.skipped_no_due_at += 1
      // Still stamp so we don't re-evaluate every tick forever.
      const { error: stampErr } = await service
        .from('tasks')
        .update({ last_recurring_generated_at: new Date().toISOString() })
        .eq('id', raw.id)
      if (stampErr) console.warn('[recurring-generator] no_due_at stamp failed', raw.id, stampErr.message)
      continue
    }
    if (!raw.recurring_rule_id) continue

    const { data: ruleRaw, error: ruleErr } = await service
      .from('task_recurring_rules')
      .select('id, tenant_id, frequency, interval_count, weekly_days, monthly_day, rrule, occurrences_limit, ends_at')
      .eq('id', raw.recurring_rule_id)
      .maybeSingle()

    if (ruleErr || !ruleRaw) {
      result.errors += 1
      console.warn('[recurring-generator] rule lookup failed', raw.recurring_rule_id, ruleErr?.message)
      continue
    }
    const rule = ruleRaw as RecurringRule

    if (rule.frequency === 'custom') {
      result.skipped_custom_rrule += 1
      console.info('[recurring-generator] custom RRULE not yet implemented — skipping', rule.id)
      // Don't stamp; if/when RRULE support lands we want to re-evaluate.
      continue
    }

    // Series cap check.
    if (rule.occurrences_limit != null) {
      const { count } = await service
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('recurring_rule_id', rule.id)
      if ((count ?? 0) >= rule.occurrences_limit) {
        result.skipped_series_capped += 1
        const { error: stampErr } = await service
          .from('tasks')
          .update({ last_recurring_generated_at: new Date().toISOString() })
          .eq('id', raw.id)
        if (stampErr) console.warn('[recurring-generator] cap stamp failed', raw.id, stampErr.message)
        continue
      }
    }
    if (rule.ends_at && new Date(rule.ends_at).getTime() < Date.now()) {
      result.skipped_series_capped += 1
      const { error: stampErr } = await service
        .from('tasks')
        .update({ last_recurring_generated_at: new Date().toISOString() })
        .eq('id', raw.id)
      if (stampErr) console.warn('[recurring-generator] ends_at stamp failed', raw.id, stampErr.message)
      continue
    }

    const nextDueAt = computeNextDueAt(rule, raw.due_at)
    if (!nextDueAt) {
      result.errors += 1
      console.warn('[recurring-generator] could not compute next due_at', raw.id)
      continue
    }

    // Insert child. Same fields except status=open, due_at=next, no
    // last_recurring_generated_at (so it can spawn its own child).
    const { error: insertErr } = await service.from('tasks').insert([
      {
        tenant_id: raw.tenant_id,
        title: raw.title,
        description: raw.description,
        priority: raw.priority ?? 'normal',
        task_type: raw.task_type ?? 'todo',
        status: 'open',
        due_at: nextDueAt,
        contact_id: raw.contact_id,
        deal_id: raw.deal_id,
        location_id: raw.location_id,
        assignee_user_id: raw.assignee_user_id,
        assigned_to_group_id: raw.assigned_to_group_id,
        assigned_to_everyone: raw.assigned_to_everyone ?? false,
        recurring_rule_id: raw.recurring_rule_id,
        auto_created: true,
      },
    ])

    if (insertErr) {
      result.errors += 1
      console.error('[recurring-generator] insert failed', raw.id, insertErr.message)
      continue
    }

    // Stamp anchor so it won't spawn again.
    const { error: anchorStampErr } = await service
      .from('tasks')
      .update({ last_recurring_generated_at: new Date().toISOString() })
      .eq('id', raw.id)
    if (anchorStampErr) {
      // Insert already succeeded — log loudly so an operator can manually
      // stamp before the next daily tick (which would otherwise create
      // a duplicate).
      console.error(
        '[recurring-generator] anchor stamp failed — duplicate risk next tick',
        raw.id,
        anchorStampErr.message
      )
      result.errors += 1
    }
    result.spawned += 1
  }

  return result
}

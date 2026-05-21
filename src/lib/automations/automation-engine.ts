/**
 * Phase 2b.14 — Automation engine (rewrite on canonical tables).
 *
 * Operates on `automations` + `automation_runs` + `automation_execution_logs`.
 * Replaces the legacy `lib/marketing/automation-engine.ts` which read
 * `marketing_journeys` / `marketing_journey_states` and was never
 * reachable from production traffic (0 runs ever recorded).
 *
 * Scope of this phase:
 *   * Start a run from a matched automation + contact + optional deal.
 *   * Walk `automations.graph_json` node-by-node.
 *   * Persist progress on `automation_runs` (`state`, `current_node_key`,
 *     `nodes_completed`, `waiting_until`).
 *   * Log every node executed to `automation_execution_logs`.
 *   * Handle `wait`, `wait_until`, `send_email`, `send_sms`,
 *     `send_whatsapp`, `add_tag`, `create_task`, `condition`,
 *     `update_contact`, plus a no-op fall-through.
 *   * Resume waiting runs whose `waiting_until` has elapsed
 *     (`processWaitingRuns`, called by the Vercel cron at
 *     `/api/cron/process-automation-waits`).
 *
 * Out of scope (later phases):
 *   * Real dispatcher integration on `send_*` actions (2b.15). Today
 *     these write a single `activities` row with `direction='outbound'`
 *     and `marketing_event_type='automation_send_stub'` so the run
 *     completes; no real message is sent. The stub is wired so the
 *     swap in 2b.15 is a single function replacement.
 *   * AI-drafted replies (`send_ai_reply` action, 2b.15).
 *   * Stop conditions on manual engagement (2b.17).
 *   * Quiet hours (2b.17).
 *   * FAQ responder coexistence (2b.18).
 *
 * Service-role only: this module is invoked from the listener and the
 * cron route, both server-side. RLS does not apply to the engine.
 */

import { createServiceClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Graph shapes
// ---------------------------------------------------------------------------

export type AutomationNodeType =
  | 'trigger'
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'wait'
  | 'wait_until'
  | 'add_tag'
  | 'remove_tag'
  | 'update_contact'
  | 'create_task'
  | 'condition'
  | 'send_ai_reply'
  | 'webhook'
  | 'end'

export interface AutomationNode {
  /** Stable string key — index into graph for next-node lookups. */
  key: string
  type: AutomationNodeType
  config?: Record<string, unknown>
  /** Default outgoing edge (linear graph). */
  next?: string | null
  /** Branching for condition nodes. */
  next_true?: string | null
  next_false?: string | null
}

export interface AutomationGraph {
  /** Key of the first executable node after the trigger. */
  start_key: string
  nodes: AutomationNode[]
}

export interface StartRunInput {
  tenantId: string
  automationId: string
  contactId: string
  dealId?: string | null
  triggerEventType?: string
  triggerPayload?: Record<string, unknown>
}

export interface RunResult {
  runId: string
  finalState: 'running' | 'waiting' | 'completed' | 'failed'
  nodesExecuted: string[]
  failureReason?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseGraph(raw: unknown): AutomationGraph | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as { start_key?: unknown; nodes?: unknown }
  if (typeof g.start_key !== 'string' || !Array.isArray(g.nodes)) return null
  const nodes = g.nodes.filter(
    (n): n is AutomationNode =>
      typeof n === 'object' &&
      n !== null &&
      typeof (n as AutomationNode).key === 'string' &&
      typeof (n as AutomationNode).type === 'string'
  )
  if (nodes.length === 0) return null
  return { start_key: g.start_key, nodes }
}

function findNode(graph: AutomationGraph, key: string | null | undefined): AutomationNode | null {
  if (!key) return null
  return graph.nodes.find((n) => n.key === key) ?? null
}

function pickNextKey(node: AutomationNode, conditionResult?: boolean): string | null {
  if (node.type === 'condition') {
    return (conditionResult ? node.next_true : node.next_false) ?? null
  }
  return node.next ?? null
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class AutomationEngine {
  constructor(private supabase: SupabaseClient = createServiceClient()) {}

  /**
   * Start a fresh automation_run for a matched automation + contact.
   * Idempotency: callers can pre-check; engine does not dedupe across
   * runs of the same (automation, contact). 2b.17 will add stop
   * conditions and a "one-active-run-per-(automation, contact)" guard.
   */
  async startRun(input: StartRunInput): Promise<RunResult> {
    const automation = await this.loadAutomation(input.automationId)
    if (!automation) {
      throw new Error(`automation ${input.automationId} not found`)
    }
    if (automation.status !== 'active') {
      throw new Error(`automation ${input.automationId} not active (status=${automation.status})`)
    }

    const graph = parseGraph(automation.graph_json)
    if (!graph) {
      throw new Error(`automation ${input.automationId} has no executable graph`)
    }

    const { data: run, error: runErr } = await this.supabase
      .from('automation_runs')
      .insert({
        tenant_id: input.tenantId,
        automation_id: input.automationId,
        contact_id: input.contactId,
        deal_id: input.dealId ?? null,
        state: 'running',
        current_node_key: graph.start_key,
        nodes_completed: [],
        nodes_failed: [],
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (runErr || !run) {
      throw new Error(
        `automation_runs insert failed: ${runErr?.message ?? 'no row returned'}`
      )
    }

    await this.supabase
      .from('automations')
      .update({ active_runs: (automation.active_runs ?? 0) + 1, total_runs: (automation.total_runs ?? 0) + 1 })
      .eq('id', input.automationId)

    return await this.walk(run.id, input.tenantId, automation, graph, graph.start_key, [], 0)
  }

  /**
   * Resume any runs whose `waiting_until` has elapsed. Called by the
   * `/api/cron/process-automation-waits` Vercel cron every minute.
   */
  async processWaitingRuns(now: Date = new Date()): Promise<{ resumed: number; failed: number }> {
    const { data: runs, error } = await this.supabase
      .from('automation_runs')
      .select('id, tenant_id, automation_id, current_node_key, nodes_completed')
      .eq('state', 'waiting')
      .lte('waiting_until', now.toISOString())
      .limit(50)

    if (error) {
      console.error('[automation-engine] processWaitingRuns query failed', error)
      return { resumed: 0, failed: 0 }
    }
    if (!runs || runs.length === 0) {
      return { resumed: 0, failed: 0 }
    }

    let resumed = 0
    let failed = 0

    for (const run of runs) {
      try {
        const automation = await this.loadAutomation(run.automation_id as string)
        if (!automation || automation.status !== 'active') {
          await this.markFailed(run.id as string, 'automation removed or paused', run.tenant_id as string)
          failed++
          continue
        }
        const graph = parseGraph(automation.graph_json)
        if (!graph) {
          await this.markFailed(run.id as string, 'graph parse failed on resume', run.tenant_id as string)
          failed++
          continue
        }

        // The waiting node's outgoing edge has already been chosen when
        // the run was put to sleep — `current_node_key` points at the
        // *next* node to execute. So we start walking from there.
        const nextKey = run.current_node_key as string | null
        const completed = (run.nodes_completed as string[] | null) ?? []

        await this.supabase
          .from('automation_runs')
          .update({
            state: 'running',
            waiting_until: null,
            waiting_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', run.id as string)

        await this.walk(
          run.id as string,
          run.tenant_id as string,
          automation,
          graph,
          nextKey,
          completed,
          0
        )
        resumed++
      } catch (err) {
        console.error('[automation-engine] resume failed', { runId: run.id, err })
        await this.markFailed(
          run.id as string,
          (err as Error)?.message ?? 'unknown resume error',
          run.tenant_id as string
        )
        failed++
      }
    }
    return { resumed, failed }
  }

  // -------------------------------------------------------------------------
  // Private — walk
  // -------------------------------------------------------------------------

  private async walk(
    runId: string,
    tenantId: string,
    automation: AutomationRow,
    graph: AutomationGraph,
    fromKey: string | null,
    completed: string[],
    depth: number
  ): Promise<RunResult> {
    if (depth > 100) {
      await this.markFailed(runId, 'max walk depth 100 exceeded — possible loop', tenantId)
      await this.bumpAutomationCounters(automation, 'failed')
      return { runId, finalState: 'failed', nodesExecuted: completed, failureReason: 'depth' }
    }

    if (!fromKey) {
      await this.markCompleted(runId, tenantId)
      await this.bumpAutomationCounters(automation, 'completed')
      return { runId, finalState: 'completed', nodesExecuted: completed }
    }

    const node = findNode(graph, fromKey)
    if (!node) {
      await this.markFailed(runId, `missing node ${fromKey}`, tenantId)
      await this.bumpAutomationCounters(automation, 'failed')
      return { runId, finalState: 'failed', nodesExecuted: completed, failureReason: 'missing_node' }
    }

    const startedAt = Date.now()
    const idempotencyKey = `run:${runId}:node:${node.key}`

    try {
      const outcome = await this.executeNode(runId, tenantId, automation, node)
      const tookMs = Date.now() - startedAt

      await this.supabase.from('automation_execution_logs').insert({
        tenant_id: tenantId,
        automation_id: automation.id,
        run_id: runId,
        node_key: node.key,
        node_type: node.type,
        status: 'completed',
        execution_time_ms: tookMs,
        action_output: 'output' in outcome ? outcome.output ?? null : null,
        idempotency_key: idempotencyKey,
        origin_tag: 'engine',
        retry_count: 0,
        executed_at: new Date().toISOString(),
      })

      const nextCompleted = [...completed, node.key]

      // Terminal node — end.
      if (node.type === 'end') {
        await this.supabase
          .from('automation_runs')
          .update({
            state: 'completed',
            current_node_key: null,
            nodes_completed: nextCompleted,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', runId)
        await this.bumpAutomationCounters(automation, 'completed')
        return { runId, finalState: 'completed', nodesExecuted: nextCompleted }
      }

      // Wait node — persist waiting state and bail out of the walk.
      if (outcome.kind === 'wait') {
        const nextKey = pickNextKey(node)
        await this.supabase
          .from('automation_runs')
          .update({
            state: 'waiting',
            current_node_key: nextKey,
            nodes_completed: nextCompleted,
            waiting_until: outcome.waitUntil.toISOString(),
            waiting_reason: outcome.reason ?? 'wait',
            updated_at: new Date().toISOString(),
          })
          .eq('id', runId)
        return { runId, finalState: 'waiting', nodesExecuted: nextCompleted }
      }

      const nextKey =
        outcome.kind === 'branch'
          ? pickNextKey(node, outcome.conditionResult)
          : pickNextKey(node)

      await this.supabase
        .from('automation_runs')
        .update({
          current_node_key: nextKey,
          nodes_completed: nextCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', runId)

      return await this.walk(runId, tenantId, automation, graph, nextKey, nextCompleted, depth + 1)
    } catch (err) {
      const tookMs = Date.now() - startedAt
      const msg = (err as Error)?.message ?? String(err)
      console.error('[automation-engine] node failed', { runId, nodeKey: node.key, err })

      await this.supabase.from('automation_execution_logs').insert({
        tenant_id: tenantId,
        automation_id: automation.id,
        run_id: runId,
        node_key: node.key,
        node_type: node.type,
        status: 'failed',
        error_message: msg,
        execution_time_ms: tookMs,
        idempotency_key: idempotencyKey,
        origin_tag: 'engine',
        retry_count: 0,
        executed_at: new Date().toISOString(),
      })

      await this.markFailed(runId, `node ${node.key} (${node.type}): ${msg}`, tenantId)
      await this.bumpAutomationCounters(automation, 'failed')
      return { runId, finalState: 'failed', nodesExecuted: completed, failureReason: msg }
    }
  }

  // -------------------------------------------------------------------------
  // Private — node execution
  // -------------------------------------------------------------------------

  private async executeNode(
    runId: string,
    tenantId: string,
    automation: AutomationRow,
    node: AutomationNode
  ): Promise<NodeOutcome> {
    switch (node.type) {
      case 'trigger':
        // Pass-through. Trigger nodes don't do work — they only define where the run begins.
        return { kind: 'continue' }

      case 'wait': {
        const cfg = (node.config ?? {}) as { duration?: number; unit?: string }
        const ms = computeWaitMs(cfg.duration ?? 0, cfg.unit ?? 'minutes')
        return { kind: 'wait', waitUntil: new Date(Date.now() + ms), reason: 'wait' }
      }

      case 'wait_until': {
        const cfg = (node.config ?? {}) as { iso?: string }
        if (!cfg.iso) throw new Error('wait_until requires config.iso')
        return { kind: 'wait', waitUntil: new Date(cfg.iso), reason: 'wait_until' }
      }

      case 'send_email':
      case 'send_sms':
      case 'send_whatsapp':
        // 2b.14 stub: write an activity row so the run completes. 2b.15
        // replaces this with the real dispatcher call.
        await this.writeStubSendActivity(runId, tenantId, automation, node)
        return { kind: 'continue', output: { stubbed: true, action: node.type } }

      case 'send_ai_reply':
        // 2b.15 will wire AI drafter + dispatcher. Stub-fail for now so
        // a workflow author can't ship one before then.
        throw new Error('send_ai_reply is not implemented until 2b.15')

      case 'add_tag': {
        const tag = ((node.config ?? {}) as { tag?: string }).tag
        if (!tag) return { kind: 'continue' }
        const { data: contactRow } = await this.supabase
          .from('contacts')
          .select('tags, id')
          .eq('id', (await this.runContactId(runId)) as string)
          .single()
        const tags = (contactRow?.tags as string[] | null) ?? []
        if (!tags.includes(tag)) {
          await this.supabase
            .from('contacts')
            .update({ tags: [...tags, tag] })
            .eq('id', contactRow!.id as string)
        }
        return { kind: 'continue', output: { added_tag: tag } }
      }

      case 'remove_tag': {
        const tag = ((node.config ?? {}) as { tag?: string }).tag
        if (!tag) return { kind: 'continue' }
        const contactId = await this.runContactId(runId)
        const { data: contactRow } = await this.supabase
          .from('contacts')
          .select('tags')
          .eq('id', contactId as string)
          .single()
        const tags = (contactRow?.tags as string[] | null) ?? []
        if (tags.includes(tag)) {
          await this.supabase
            .from('contacts')
            .update({ tags: tags.filter((t) => t !== tag) })
            .eq('id', contactId as string)
        }
        return { kind: 'continue', output: { removed_tag: tag } }
      }

      case 'update_contact': {
        const updates = ((node.config ?? {}) as { updates?: Record<string, unknown> }).updates ?? {}
        if (Object.keys(updates).length > 0) {
          const contactId = await this.runContactId(runId)
          await this.supabase
            .from('contacts')
            .update(updates)
            .eq('id', contactId as string)
        }
        return { kind: 'continue', output: { updated_fields: Object.keys(updates) } }
      }

      case 'create_task': {
        const cfg = (node.config ?? {}) as {
          title?: string
          description?: string
          due_in_days?: number
          assigned_to?: string
        }
        const dueDate = new Date()
        if (typeof cfg.due_in_days === 'number') {
          dueDate.setDate(dueDate.getDate() + cfg.due_in_days)
        }
        const contactId = await this.runContactId(runId)
        await this.supabase.from('tasks').insert({
          tenant_id: tenantId,
          contact_id: contactId,
          title: cfg.title ?? 'Follow up',
          description: cfg.description ?? 'Automated task',
          due_date: dueDate.toISOString(),
          status: 'pending',
          assigned_to: cfg.assigned_to ?? null,
          created_by: 'automation',
        })
        return { kind: 'continue', output: { created_task: true } }
      }

      case 'condition': {
        const cfg = (node.config ?? {}) as {
          field?: string
          operator?: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt'
          value?: unknown
        }
        if (!cfg.field || !cfg.operator) {
          return { kind: 'branch', conditionResult: false }
        }
        const contactId = await this.runContactId(runId)
        const { data: contact } = await this.supabase
          .from('contacts')
          .select('*')
          .eq('id', contactId as string)
          .single()
        const actual = (contact as Record<string, unknown> | null)?.[cfg.field]
        const result = evaluateCondition(actual, cfg.operator, cfg.value)
        return { kind: 'branch', conditionResult: result }
      }

      case 'webhook':
        // No outbound webhooks in 2b.14 — placeholder.
        return { kind: 'continue', output: { skipped: true, reason: 'webhook not implemented' } }

      case 'end':
        return { kind: 'continue' }

      default:
        throw new Error(`unknown node type ${node.type}`)
    }
  }

  // -------------------------------------------------------------------------
  // Private — small helpers
  // -------------------------------------------------------------------------

  private async runContactId(runId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('automation_runs')
      .select('contact_id')
      .eq('id', runId)
      .single()
    return (data?.contact_id as string | null) ?? null
  }

  private async loadAutomation(id: string): Promise<AutomationRow | null> {
    const { data, error } = await this.supabase
      .from('automations')
      .select('id, tenant_id, name, status, graph_json, active_runs, total_runs, successful_runs, failed_runs')
      .eq('id', id)
      .maybeSingle()
    if (error) {
      console.error('[automation-engine] loadAutomation failed', { id, error })
      return null
    }
    return (data as AutomationRow | null) ?? null
  }

  private async markCompleted(runId: string, _tenantId: string): Promise<void> {
    await this.supabase
      .from('automation_runs')
      .update({
        state: 'completed',
        current_node_key: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
  }

  private async markFailed(runId: string, reason: string, _tenantId: string): Promise<void> {
    await this.supabase
      .from('automation_runs')
      .update({
        state: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
  }

  private async bumpAutomationCounters(
    automation: AutomationRow,
    outcome: 'completed' | 'failed'
  ): Promise<void> {
    const patch: Record<string, number> = {
      active_runs: Math.max((automation.active_runs ?? 0) - 1, 0),
    }
    if (outcome === 'completed') patch.successful_runs = (automation.successful_runs ?? 0) + 1
    if (outcome === 'failed') patch.failed_runs = (automation.failed_runs ?? 0) + 1
    await this.supabase.from('automations').update(patch).eq('id', automation.id)
  }

  private async writeStubSendActivity(
    runId: string,
    tenantId: string,
    automation: AutomationRow,
    node: AutomationNode
  ): Promise<void> {
    const channelMap: Record<string, 'email' | 'sms' | 'whatsapp'> = {
      send_email: 'email',
      send_sms: 'sms',
      send_whatsapp: 'whatsapp',
    }
    const channel = channelMap[node.type]
    if (!channel) return
    const contactId = await this.runContactId(runId)
    if (!contactId) return
    const cfg = (node.config ?? {}) as { body?: string; subject?: string }
    await this.supabase.from('activities').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      type: channel,
      direction: 'outbound',
      subject: cfg.subject ?? null,
      description: cfg.body ?? '[automation 2b.14 stub — real dispatcher integration in 2b.15]',
      marketing_campaign_id: automation.id,
      marketing_event_type: 'automation_send_stub',
      occurred_at: new Date().toISOString(),
    })
  }
}

interface AutomationRow {
  id: string
  tenant_id: string
  name: string
  status: string
  graph_json: unknown
  active_runs: number | null
  total_runs: number | null
  successful_runs: number | null
  failed_runs: number | null
}

type NodeOutcome =
  | { kind: 'continue'; output?: Record<string, unknown> }
  | { kind: 'wait'; waitUntil: Date; reason?: string }
  | { kind: 'branch'; conditionResult: boolean; output?: Record<string, unknown> }

function computeWaitMs(duration: number, unit: string): number {
  const minute = 60_000
  switch (unit) {
    case 'minutes':
      return duration * minute
    case 'hours':
      return duration * 60 * minute
    case 'days':
      return duration * 24 * 60 * minute
    case 'weeks':
      return duration * 7 * 24 * 60 * minute
    case 'seconds':
      return duration * 1000
    default:
      return duration * minute
  }
}

function evaluateCondition(
  actual: unknown,
  op: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt',
  expected: unknown
): boolean {
  switch (op) {
    case 'equals':
      return actual === expected
    case 'not_equals':
      return actual !== expected
    case 'contains':
      return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)
    case 'gt':
      return Number(actual) > Number(expected)
    case 'lt':
      return Number(actual) < Number(expected)
    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let engineInstance: AutomationEngine | null = null
export function getAutomationEngine(): AutomationEngine {
  if (!engineInstance) engineInstance = new AutomationEngine()
  return engineInstance
}

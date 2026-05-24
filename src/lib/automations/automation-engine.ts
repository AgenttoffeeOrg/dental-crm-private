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
// dispatcher + ai-reply-drafter are lazy-required inside their use
// sites — dispatcher pulls in DOMPurify/jsdom on the cold-start path
// and the locked principle #12 in CLAUDE.md mandates lazy-require for
// heavy server-side libs. Engine should be importable from tests and
// non-send paths without that cost.
import type { DrafterChannel } from '@/lib/automations/ai-reply-drafter'

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

    // 2b.15: stash the triggering activity id for downstream send_ai_reply
    // nodes. Cleared in walk() on terminal state.
    const triggerActivityId =
      (input.triggerPayload?.activityId as string | undefined) ??
      (input.triggerPayload?.['activityId'] as string | undefined)
    if (triggerActivityId) {
      runTriggerContext.set(run.id as string, {
        activityId: triggerActivityId,
        eventType: input.triggerEventType,
      })
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
      // Surface to the caller so the cron route returns 500 rather
      // than masking a persistent DB issue behind a 200/resumed=0
      // response. (Originally swallowed; flagged by code-review HIGH.)
      console.error('[automation-engine] processWaitingRuns query failed', error)
      throw new Error(`processWaitingRuns query failed: ${error.message ?? 'unknown'}`)
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
        // Quiet-hours defer wants to re-run the SAME node on resume.
        // Regular wait nodes advance to the next node before sleeping.
        const resumeKey = outcome.resumeAtSameNode ? node.key : pickNextKey(node)
        const completedAfter = outcome.resumeAtSameNode ? completed : nextCompleted
        await this.supabase
          .from('automation_runs')
          .update({
            state: 'waiting',
            current_node_key: resumeKey,
            nodes_completed: completedAfter,
            waiting_until: outcome.waitUntil.toISOString(),
            waiting_reason: outcome.reason ?? 'wait',
            updated_at: new Date().toISOString(),
          })
          .eq('id', runId)
        return { runId, finalState: 'waiting', nodesExecuted: completedAfter }
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
        // 2b.15: real dispatcher integration. Dispatcher stamps
        // conversation_id + Message-ID and writes the activity row;
        // engine just calls it.
        return await this.executeSendStatic(runId, tenantId, automation, node)

      case 'send_ai_reply':
        // 2b.15: draft via Claude, send via dispatcher. If AI throws,
        // attempt the configured fallback template.
        return await this.executeSendAiReply(runId, tenantId, automation, node)

      case 'add_tag': {
        const tag = ((node.config ?? {}) as { tag?: string }).tag
        if (!tag) return { kind: 'continue' }
        const contactId = await this.runContactId(runId)
        if (!contactId) return { kind: 'continue' }
        // Atomic — guards against the read-modify-write race on
        // contacts.tags when two automations target the same contact.
        await this.supabase.rpc('automation_add_contact_tag', {
          p_tenant_id: tenantId,
          p_contact_id: contactId,
          p_tag: tag,
        })
        return { kind: 'continue', output: { added_tag: tag } }
      }

      case 'remove_tag': {
        const tag = ((node.config ?? {}) as { tag?: string }).tag
        if (!tag) return { kind: 'continue' }
        const contactId = await this.runContactId(runId)
        if (!contactId) return { kind: 'continue' }
        await this.supabase.rpc('automation_remove_contact_tag', {
          p_tenant_id: tenantId,
          p_contact_id: contactId,
          p_tag: tag,
        })
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
        // 2b.58 P0 fix — every column name here was wrong against the
        // live `tasks` schema (due_date / assigned_to / created_by /
        // status:'pending'). Result: every automation-fired task
        // INSERT silently errored at the DB. Caught by the rebuild
        // audit. Now uses the real column names; surfaces insert
        // errors instead of swallowing them; flags auto_created so the
        // UI can distinguish system-fired tasks from operator-created.
        const cfg = (node.config ?? {}) as {
          title?: string
          description?: string
          due_in_days?: number
          assignee_user_id?: string
          task_type?: string
          priority?: string
        }
        const dueAt = new Date()
        if (typeof cfg.due_in_days === 'number') {
          dueAt.setDate(dueAt.getDate() + cfg.due_in_days)
        }
        const contactId = await this.runContactId(runId)

        // Inherit location_id from the contact when one is linked.
        // Free-floating automations (no contact) leave it null.
        let locationId: string | null = null
        if (contactId) {
          const { data: contact } = await this.supabase
            .from('contacts')
            .select('location_id')
            .eq('id', contactId as string)
            .single()
          locationId =
            (contact as { location_id?: string | null } | null)?.location_id ?? null
        }

        const { error } = await this.supabase.from('tasks').insert({
          tenant_id: tenantId,
          contact_id: contactId,
          title: cfg.title ?? 'Follow up',
          description: cfg.description ?? 'Automated task',
          due_at: dueAt.toISOString(),
          status: 'open',
          task_type: cfg.task_type ?? 'todo',
          priority: cfg.priority ?? 'normal',
          assignee_user_id: cfg.assignee_user_id ?? null,
          location_id: locationId,
          auto_created: true,
        })

        if (error) {
          console.error('[automation-engine] create_task INSERT failed', {
            tenantId,
            contactId,
            cfg,
            error: error.message,
          })
          return {
            kind: 'continue',
            output: { created_task: false, error: error.message },
          }
        }
        return { kind: 'continue', output: { created_task: true } }
      }

      case 'condition': {
        const cfg = (node.config ?? {}) as {
          field?: string
          operator?: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt'
          value?: unknown
        }
        if (!cfg.field || !cfg.operator || !isWhitelistedConditionField(cfg.field)) {
          return { kind: 'branch', conditionResult: false }
        }
        const contactId = await this.runContactId(runId)
        const { data: contact } = await this.supabase
          .from('contacts')
          // Narrow the column read so we don't pull every PII column
          // of the contact into the engine process on each evaluation.
          .select(cfg.field)
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

  // -------------------------------------------------------------------------
  // Private — send_* via dispatcher (2b.15)
  // -------------------------------------------------------------------------

  private async executeSendStatic(
    runId: string,
    tenantId: string,
    automation: AutomationRow,
    node: AutomationNode
  ): Promise<NodeOutcome> {
    const ctx = await this.runContext(runId)
    if (!ctx.contactId) {
      throw new Error('send_* node requires a contact_id on the run')
    }

    const quiet = await this.maybeDeferForQuietHours(tenantId, automation, 'send_static')
    if (quiet) return quiet

    const cfg = (node.config ?? {}) as {
      subject?: string
      body?: string
      to?: string
      message?: string
      html?: string
    }
    const body = cfg.body ?? cfg.message ?? ''
    if (!body.trim()) {
      throw new Error(`${node.type} node has empty body/message config`)
    }

    const channelContact = await this.resolveChannelTarget(ctx.contactId, node.type)
    if (!channelContact) {
      throw new Error(`${node.type}: contact ${ctx.contactId} has no usable address for this channel`)
    }

    const dispatcher = await import('@/lib/communications/dispatcher')

    if (node.type === 'send_email') {
      const result = await dispatcher.dispatchEmail({
        context: { tenantId, contactId: ctx.contactId, dealId: ctx.dealId ?? undefined },
        to: [channelContact],
        subject: cfg.subject ?? 'A note from your dental practice',
        html: cfg.html ?? `<p>${escapeHtml(body)}</p>`,
      })
      return { kind: 'continue', output: { dispatched: true, channel: 'email', activity_id: result?.activityId } }
    }
    if (node.type === 'send_sms') {
      const result = await dispatcher.dispatchSms({
        context: { tenantId, contactId: ctx.contactId, dealId: ctx.dealId ?? undefined },
        to: channelContact,
        message: body,
      })
      return { kind: 'continue', output: { dispatched: true, channel: 'sms', activity_id: result?.activityId } }
    }
    if (node.type === 'send_whatsapp') {
      const result = await dispatcher.dispatchWhatsApp({
        context: { tenantId, contactId: ctx.contactId, dealId: ctx.dealId ?? undefined },
        to: channelContact,
        message: body,
      })
      return { kind: 'continue', output: { dispatched: true, channel: 'whatsapp', activity_id: result?.activityId } }
    }
    throw new Error(`executeSendStatic: unsupported node type ${node.type}`)
  }

  private async executeSendAiReply(
    runId: string,
    tenantId: string,
    automation: AutomationRow,
    node: AutomationNode
  ): Promise<NodeOutcome> {
    const quiet = await this.maybeDeferForQuietHours(tenantId, automation, 'send_ai_reply')
    if (quiet) return quiet

    const cfg = (node.config ?? {}) as {
      channel?: DrafterChannel
      tone_override?: string
      escalation_phrase?: string
      fallback_template?: string
      model?: string
    }
    const channel = cfg.channel
    if (!channel || !['sms', 'whatsapp', 'email'].includes(channel)) {
      throw new Error('send_ai_reply requires config.channel = sms|whatsapp|email')
    }

    const ctx = await this.runContext(runId)
    if (!ctx.contactId) {
      throw new Error('send_ai_reply requires a contact_id on the run')
    }
    const trigger = runTriggerContext.get(runId)
    const channelContact = await this.resolveChannelTarget(ctx.contactId, `send_${channel}`)
    if (!channelContact) {
      throw new Error(`send_ai_reply: contact ${ctx.contactId} has no usable address for channel ${channel}`)
    }

    let draftBody: string
    let draftSubject: string | undefined
    let metadata: Record<string, unknown> = {}

    try {
      const { draftAiReply } = await import('@/lib/automations/ai-reply-drafter')
      const draft = await draftAiReply(
        {
          tenantId,
          contactId: ctx.contactId,
          channel,
          triggerActivityId: trigger?.activityId,
          toneOverride: cfg.tone_override,
          escalationPhrase: cfg.escalation_phrase,
          model: cfg.model,
        },
        { supabase: this.supabase }
      )
      draftBody = draft.body
      draftSubject = draft.subject
      metadata = draft.metadata as unknown as Record<string, unknown>
    } catch (aiErr) {
      // AI failure → fallback template path.
      const fallback = cfg.fallback_template?.trim()
      if (!fallback) {
        throw new Error(
          `AI draft failed and no fallback_template configured: ${(aiErr as Error)?.message ?? aiErr}`
        )
      }
      console.warn('[automation-engine] AI draft failed; falling back to template', {
        runId,
        nodeKey: node.key,
        error: (aiErr as Error)?.message,
      })
      draftBody = fallback
      metadata = {
        provider: 'fallback_template',
        ai_error: (aiErr as Error)?.message ?? String(aiErr),
      }
    }

    const dispatcher = await import('@/lib/communications/dispatcher')

    if (channel === 'email') {
      const result = await dispatcher.dispatchEmail({
        context: { tenantId, contactId: ctx.contactId, dealId: ctx.dealId ?? undefined },
        to: [channelContact],
        subject: draftSubject ?? 'A note from your dental practice',
        html: `<p>${escapeHtml(draftBody).replace(/\n/g, '<br/>')}</p>`,
      })
      await this.stampAiMetadata(result?.activityId, metadata)
      return { kind: 'continue', output: { dispatched: true, channel, ai: metadata.provider } }
    }
    if (channel === 'sms') {
      const result = await dispatcher.dispatchSms({
        context: { tenantId, contactId: ctx.contactId, dealId: ctx.dealId ?? undefined },
        to: channelContact,
        message: draftBody,
      })
      await this.stampAiMetadata(result?.activityId, metadata)
      return { kind: 'continue', output: { dispatched: true, channel, ai: metadata.provider } }
    }
    const result = await dispatcher.dispatchWhatsApp({
      context: { tenantId, contactId: ctx.contactId, dealId: ctx.dealId ?? undefined },
      to: channelContact,
      message: draftBody,
    })
    await this.stampAiMetadata(result?.activityId, metadata)
    return { kind: 'continue', output: { dispatched: true, channel, ai: metadata.provider } }
  }

  private async stampAiMetadata(
    activityId: string | undefined,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!activityId) return
    // Merge into existing integration_metadata.ai so dispatcher's own
    // error/raw subkeys are preserved.
    const { data: row } = await this.supabase
      .from('activities')
      .select('integration_metadata')
      .eq('id', activityId)
      .maybeSingle()
    const current = ((row?.integration_metadata as Record<string, unknown> | null) ?? {})
    const next = { ...current, ai: { ...((current.ai as Record<string, unknown> | undefined) ?? {}), ...metadata } }
    await this.supabase
      .from('activities')
      .update({ integration_metadata: next })
      .eq('id', activityId)
  }

  /**
   * Check the automation's workflow_config.respect_quiet_hours. If
   * set AND the tenant's Practice Brain opening_hours says we're
   * outside open hours, return a `wait` outcome that resumes at the
   * SAME node at the next opening. Otherwise return null and let the
   * send proceed.
   */
  private async maybeDeferForQuietHours(
    tenantId: string,
    automation: AutomationRow,
    _kind: 'send_static' | 'send_ai_reply'
  ): Promise<NodeOutcome | null> {
    const cfg = (automation.workflow_config ?? {}) as WorkflowConfig
    if (cfg.respect_quiet_hours !== true) return null

    try {
      const [{ loadPracticeBrain }, { evaluateQuietHours }] = await Promise.all([
        import('@/lib/automations/practice-brain'),
        import('@/lib/automations/quiet-hours'),
      ])
      const brain = await loadPracticeBrain(tenantId)
      const check = evaluateQuietHours(brain.opening_hours)
      if (check.isOpenNow) return null
      if (!check.nextOpenAt) return null
      return {
        kind: 'wait',
        waitUntil: check.nextOpenAt,
        reason: 'quiet_hours',
        resumeAtSameNode: true,
      }
    } catch (err) {
      // Quiet-hours load failure should not block sends.
      console.warn('[automation-engine] quiet-hours check failed (allowing send)', {
        tenantId,
        err,
      })
      return null
    }
  }

  private async resolveChannelTarget(
    contactId: string,
    forNodeType: string
  ): Promise<string | null> {
    const { data } = await this.supabase
      .from('contacts')
      .select('primary_email, primary_phone, secondary_email, secondary_phone')
      .eq('id', contactId)
      .maybeSingle()
    if (!data) return null
    if (forNodeType === 'send_email') {
      return (data.primary_email as string | null) ?? (data.secondary_email as string | null) ?? null
    }
    if (forNodeType === 'send_sms' || forNodeType === 'send_whatsapp') {
      return (data.primary_phone as string | null) ?? (data.secondary_phone as string | null) ?? null
    }
    return null
  }

  private async runContext(
    runId: string
  ): Promise<{ contactId: string | null; dealId: string | null }> {
    const { data } = await this.supabase
      .from('automation_runs')
      .select('contact_id, deal_id')
      .eq('id', runId)
      .maybeSingle()
    return {
      contactId: (data?.contact_id as string | null) ?? null,
      dealId: (data?.deal_id as string | null) ?? null,
    }
  }

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
      .select(
        'id, tenant_id, name, status, graph_json, active_runs, total_runs, successful_runs, failed_runs, workflow_config'
      )
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
  workflow_config?: WorkflowConfig | null
}

export interface WorkflowConfig {
  on_patient_reply?: 'stop' | 'ai_continue'
  respect_quiet_hours?: boolean
  stop_rules?: Array<{ when: string; reason?: string }>
}

// In-memory per-run trigger payload, used by send_ai_reply to know
// which inbound activity it's replying to. Set by startRun + walk
// resume (loaded from automation_runs metadata in a future phase;
// 2b.15 keeps it in-process — Vercel functions are stateful for the
// duration of a single startRun cascade, which is enough).
const runTriggerContext = new Map<string, { activityId?: string; eventType?: string }>()

type NodeOutcome =
  | { kind: 'continue'; output?: Record<string, unknown> }
  | { kind: 'wait'; waitUntil: Date; reason?: string; resumeAtSameNode?: boolean }
  | { kind: 'branch'; conditionResult: boolean; output?: Record<string, unknown> }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

/**
 * Whitelist of `contacts` columns a condition node is allowed to read.
 * Keeps PII columns (medical_conditions, allergies, etc.) and free-text
 * audit columns out of the condition path. Extend deliberately as the
 * UI exposes more fields.
 */
const CONDITION_FIELD_WHITELIST = new Set([
  'full_name',
  'primary_email',
  'primary_phone',
  'preferred_name',
  'city',
  'country',
  'lead_score',
  'source',
  'tags',
  'title',
])

function isWhitelistedConditionField(field: string): boolean {
  return CONDITION_FIELD_WHITELIST.has(field)
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

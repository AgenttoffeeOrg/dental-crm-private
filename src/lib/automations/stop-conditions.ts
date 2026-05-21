/**
 * Phase 2b.17 — Stop conditions + reply branching listener.
 *
 * Subscribes to:
 *   - ACTIVITY.CREATED — when an activity is a note or a call on a
 *     contact that has an active/waiting automation_run, stop the
 *     run (the practice is handling it manually).
 *   - INBOUND.SMS_RECEIVED / INBOUND.WHATSAPP_RECEIVED — when a
 *     patient replies, look up the workflow's on_patient_reply
 *     config: 'stop' (default) marks the run stopped; 'ai_continue'
 *     leaves the run running so the next AI-reply node fires.
 *
 * Server-only. Service-role client. Bootstrapped from
 * instrumentation.ts (idempotent — same singleton pattern as the
 * main automation event listener).
 */

import { eventService, type EventMap } from '@/lib/events-unified'
import { createServiceClient } from '@/lib/supabase-server'

interface ActiveRun {
  id: string
  automation_id: string
  state: string
}

interface WorkflowConfig {
  on_patient_reply?: 'stop' | 'ai_continue'
  respect_quiet_hours?: boolean
  stop_rules?: Array<{ when: 'note' | 'call' | 'manual_outbound_then_reply'; reason?: string }>
}

let bootstrapped = false
const unsubscribers: Array<() => void> = []

export function initializeStopConditionsListener(): void {
  if (bootstrapped) return
  bootstrapped = true

  unsubscribers.push(
    eventService.on('ACTIVITY.CREATED', async (data) => {
      try {
        await onActivityCreated(data as unknown as ActivityCreatedPayload)
      } catch (err) {
        console.error('[stop-conditions] ACTIVITY.CREATED handler crashed', err)
      }
    })
  )

  unsubscribers.push(
    eventService.on('INBOUND.SMS_RECEIVED', async (data) => {
      try {
        await onInboundReply(data, 'sms')
      } catch (err) {
        console.error('[stop-conditions] INBOUND.SMS_RECEIVED handler crashed', err)
      }
    })
  )
  unsubscribers.push(
    eventService.on('INBOUND.WHATSAPP_RECEIVED', async (data) => {
      try {
        await onInboundReply(data, 'whatsapp')
      } catch (err) {
        console.error('[stop-conditions] INBOUND.WHATSAPP_RECEIVED handler crashed', err)
      }
    })
  )

  console.log('[stop-conditions] listener subscribed')
}

export function teardownStopConditionsListener(): void {
  unsubscribers.forEach((u) => u())
  unsubscribers.length = 0
  bootstrapped = false
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

interface ActivityCreatedPayload {
  tenantId: string
  contactId?: string | null
  activityId?: string
  type?: string
  direction?: string
}

async function onActivityCreated(payload: ActivityCreatedPayload): Promise<void> {
  if (!payload.tenantId || !payload.contactId) return
  // Notes and calls = practice is handling this manually → stop.
  if (payload.type === 'note' || payload.type === 'call') {
    await stopRuns(payload.tenantId, payload.contactId, `${payload.type}_added`)
  }
}

async function onInboundReply(
  data: EventMap['INBOUND.SMS_RECEIVED'] | EventMap['INBOUND.WHATSAPP_RECEIVED'],
  _channel: 'sms' | 'whatsapp'
): Promise<void> {
  const supabase = createServiceClient()
  const runs = await fetchActiveRuns(supabase, data.tenantId, data.contactId)
  if (runs.length === 0) return

  for (const run of runs) {
    const config = await fetchWorkflowConfig(supabase, run.automation_id)
    const decision = config.on_patient_reply ?? 'stop'
    if (decision === 'stop') {
      await markStopped(supabase, run.id, 'patient_reply')
    }
    // 'ai_continue' = leave run alone; engine's next send_ai_reply
    // node will pick up the new inbound activity via its trigger
    // context lookup. (2b.15 trigger-context Map is per-run, so a
    // running ai_continue workflow keeps replying.)
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchActiveRuns(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  contactId: string
): Promise<ActiveRun[]> {
  const { data } = await supabase
    .from('automation_runs')
    .select('id, automation_id, state')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .in('state', ['running', 'waiting'])
  return (data as ActiveRun[] | null) ?? []
}

async function fetchWorkflowConfig(
  supabase: ReturnType<typeof createServiceClient>,
  automationId: string
): Promise<WorkflowConfig> {
  const { data } = await supabase
    .from('automations')
    .select('workflow_config')
    .eq('id', automationId)
    .maybeSingle()
  return ((data?.workflow_config as WorkflowConfig | null) ?? {}) as WorkflowConfig
}

async function stopRuns(
  tenantId: string,
  contactId: string,
  reason: string
): Promise<void> {
  const supabase = createServiceClient()
  const runs = await fetchActiveRuns(supabase, tenantId, contactId)
  if (runs.length === 0) return
  for (const run of runs) {
    await markStopped(supabase, run.id, reason)
  }
}

async function markStopped(
  supabase: ReturnType<typeof createServiceClient>,
  runId: string,
  reason: string
): Promise<void> {
  await supabase
    .from('automation_runs')
    .update({
      state: 'stopped',
      stop_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .in('state', ['running', 'waiting'])
}

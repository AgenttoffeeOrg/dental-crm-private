/**
 * AUTOMATION EVENT LISTENER (Phase 2b.14 rewrite)
 *
 * Subscribes to unified events, maps each one to a `trigger_type`
 * string from `automation_trigger_metadata`, finds all active
 * automations matching that trigger on the tenant, and asks the new
 * engine (`lib/automations/automation-engine.ts`) to start a run.
 *
 * Server-only. Uses the service-role Supabase client so the listener
 * is not blocked by RLS. Bootstrapped from `instrumentation.ts` plus
 * lazy init in `ingest-lead.ts` (defence in depth — whichever runs
 * first wins).
 */

import { eventService, type EventMap } from '@/lib/events-unified'
import { createServiceClient } from '@/lib/supabase-server'
import { getAutomationEngine } from '@/lib/automations/automation-engine'

// =====================================================
// EVENT → TRIGGER MAP
// =====================================================
// Mapped strings must match rows in `automation_trigger_metadata`.

const EVENT_TO_TRIGGER_MAP: Partial<Record<keyof EventMap, string>> = {
  // Deal events
  'DEAL.CREATED': 'deal_created',
  'DEAL.MOVED': 'deal_stage_change',
  'DEAL.WON': 'deal_won',
  'DEAL.LOST': 'deal_lost',
  'DEAL.AGING': 'deal_aging',
  'DEAL.VALUE_THRESHOLD_CROSSED': 'deal_value_threshold',
  'DEAL.ASSIGNED': 'deal_assigned',

  // Task events
  'TASK.CREATED': 'task_created',
  'TASK.COMPLETED': 'task_completed',
  'TASK.ASSIGNED': 'task_assigned',
  'TASK.OVERDUE': 'task_overdue',
  'TASK.DUE_SOON': 'task_due_soon',

  // Contact events
  'CONTACT.CREATED': 'contact_created',
  'CONTACT.UPDATED': 'contact_updated',
  'CONTACT.ASSIGNED': 'contact_assigned',
  'CONTACT.INACTIVE': 'contact_inactive',
  'CONTACT.HIGH_VALUE': 'contact_high_value',
  'CONTACT.MILESTONE': 'contact_milestone',

  // Pipeline events
  'PIPELINE.CAPACITY_REACHED': 'pipeline_capacity_reached',
  'PIPELINE.VELOCITY_SLOW': 'pipeline_velocity_slow',
  'PIPELINE.BOTTLENECK_DETECTED': 'pipeline_bottleneck',
  'PIPELINE.STAGE_SLA_BREACHED': 'stage_sla_breached',

  // Marketing events
  'MARKETING.EMAIL_OPENED': 'email_opened',
  'MARKETING.LINK_CLICKED': 'link_clicked',
  // 2b.14 fix: canonicalise on `form_submitted` (matches metadata + DB
  // seed). Previously this said `form_submit`, which never matched.
  'MARKETING.FORM_SUBMITTED': 'form_submitted',
  'MARKETING.GOOGLE_LEAD_FORM_SUBMITTED': 'google_lead_form_submitted',
  'MARKETING.UNSUBSCRIBED': 'unsubscribed',

  // Inbound messaging (Phase 2b.14)
  'INBOUND.SMS_RECEIVED': 'inbound_sms',
  'INBOUND.WHATSAPP_RECEIVED': 'inbound_whatsapp',

  // Call events
  'CALL.MISSED': 'call_missed',
  'CALL.VOICEMAIL_RECEIVED': 'voicemail_received',

  // Integration events
  'INTEGRATION.TOKEN_EXPIRING': 'integration_token_expiring',
  'INTEGRATION.TOKEN_EXPIRED': 'integration_token_expired',
  'INTEGRATION.SYNC_FAILED': 'integration_sync_failed',

  // Analytics events
  'ANALYTICS.KPI_BREACH': 'kpi_breach',
  'ANALYTICS.GOAL_ACHIEVED': 'goal_achieved',
  'ANALYTICS.ANOMALY_DETECTED': 'anomaly_detected',

  // AI events
  'AI.SUGGESTION_GENERATED': 'ai_suggestion',
}

// =====================================================
// Listener
// =====================================================

export class AutomationEventListener {
  private supabase = createServiceClient()
  private unsubscribers: Array<() => void> = []
  private isListening = false

  startListening(): void {
    if (this.isListening) return

    console.log('[automation-listener] starting...')

    Object.keys(EVENT_TO_TRIGGER_MAP).forEach((eventType) => {
      const off = eventService.on(eventType as keyof EventMap, async (data) => {
        try {
          await this.handleEvent(eventType as keyof EventMap, data)
        } catch (err) {
          console.error('[automation-listener] handler crashed', { eventType, err })
        }
      })
      this.unsubscribers.push(off)
    })

    this.isListening = true
    console.log(`[automation-listener] subscribed to ${this.unsubscribers.length} event types`)
  }

  stopListening(): void {
    this.unsubscribers.forEach((u) => u())
    this.unsubscribers = []
    this.isListening = false
  }

  private async handleEvent<K extends keyof EventMap>(
    eventType: K,
    eventData: EventMap[K]
  ): Promise<void> {
    const triggerType = EVENT_TO_TRIGGER_MAP[eventType]
    if (!triggerType) return

    const data = eventData as Record<string, unknown>
    const tenantId = data.tenantId as string | undefined
    if (!tenantId) {
      console.warn(`[automation-listener] ${eventType} missing tenantId`)
      return
    }

    const contactId = (data.contactId as string | undefined) ?? null
    const dealId = (data.dealId as string | undefined) ?? null

    const { data: matches, error } = await this.supabase
      .from('automations')
      .select('id, trigger_config, category')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .eq('trigger_type', triggerType)
      .is('deleted_at', null)

    if (error) {
      console.error('[automation-listener] match query failed', { eventType, error })
      return
    }
    if (!matches || matches.length === 0) return

    const filtered = matches.filter((m) =>
      matchesTriggerConditions(m.trigger_config as Record<string, unknown> | null, eventData)
    )

    if (filtered.length === 0) return

    const engine = getAutomationEngine()
    const runIds: string[] = []
    const fired: string[] = []

    for (const auto of filtered) {
      const effectiveContact = contactId ?? (await this.resolveContactId(eventData))
      if (!effectiveContact) {
        console.warn(`[automation-listener] no contact for ${auto.id}, skipping`)
        continue
      }
      try {
        const result = await engine.startRun({
          tenantId,
          automationId: auto.id as string,
          contactId: effectiveContact,
          dealId,
          triggerEventType: eventType,
          triggerPayload: eventData as unknown as Record<string, unknown>,
        })
        runIds.push(result.runId)
        fired.push(auto.id as string)
      } catch (err) {
        console.error('[automation-listener] startRun failed', {
          automationId: auto.id,
          err,
        })
      }
    }

    if (fired.length > 0) {
      try {
        await this.supabase.from('automation_event_log').insert({
          tenant_id: tenantId,
          event_type: eventType,
          event_data: eventData as unknown as Record<string, unknown>,
          triggered_automation_ids: fired,
          automation_run_ids: runIds,
        })
      } catch (err) {
        console.error('[automation-listener] event log insert failed', err)
      }
    }
  }

  private async resolveContactId(eventData: unknown): Promise<string | null> {
    const data = eventData as Record<string, unknown>
    if (data.dealId) {
      const { data: deal } = await this.supabase
        .from('deals')
        .select('contact_id')
        .eq('id', data.dealId as string)
        .single()
      return (deal?.contact_id as string | null) ?? null
    }
    if (data.taskId) {
      const { data: task } = await this.supabase
        .from('tasks')
        .select('contact_id')
        .eq('id', data.taskId as string)
        .single()
      return (task?.contact_id as string | null) ?? null
    }
    return null
  }
}

// =====================================================
// Singleton + bootstrap
// =====================================================

let listenerInstance: AutomationEventListener | null = null

export function getAutomationEventListener(): AutomationEventListener {
  if (!listenerInstance) listenerInstance = new AutomationEventListener()
  return listenerInstance
}

let bootstrapped = false
/** Idempotent. Safe to call multiple times across cold-start paths. */
export function initializeAutomationEventListener(): void {
  if (bootstrapped) return
  bootstrapped = true
  const listener = getAutomationEventListener()
  listener.startListening()
}

export function cleanupAutomationEventListener(): void {
  if (listenerInstance) {
    listenerInstance.stopListening()
    listenerInstance = null
    bootstrapped = false
  }
}

// ---------------------------------------------------------------------------
// Trigger condition matching
// ---------------------------------------------------------------------------

function matchesTriggerConditions(
  triggerConfig: Record<string, unknown> | null,
  eventData: unknown
): boolean {
  if (!triggerConfig) return true

  // Keyword filter for inbound messaging triggers — array of substrings
  // (case-insensitive). If `keywords` is set, the message body must
  // contain at least one of them.
  const keywords = triggerConfig.keywords
  if (Array.isArray(keywords) && keywords.length > 0) {
    const body = ((eventData as Record<string, unknown>).body as string | undefined)?.toLowerCase()
    if (!body) return false
    const hit = (keywords as unknown[]).some(
      (k) => typeof k === 'string' && k.length > 0 && body.includes(k.toLowerCase())
    )
    if (!hit) return false
  }

  // Form id filter for form-submitted triggers.
  if (typeof triggerConfig.form_id === 'string') {
    const formId = (eventData as Record<string, unknown>).formId as string | null | undefined
    if (formId !== triggerConfig.form_id) return false
  }

  return true
}

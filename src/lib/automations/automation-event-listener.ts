/**
 * AUTOMATION EVENT LISTENER
 * 
 * This module connects the unified event system to the automation engine.
 * Whenany CRM event is emitted, this listener checks for matching automations
 * and triggers them automatically.
 * 
 * Architecture:
 * - Subscribes to all relevant events from events-unified.ts
 * - Maps event types to automation triggers
 * - Finds and executes matching automations
 * - Logs triggered automations for audit trail
 */

import { eventService, EventMap } from '@/lib/events-unified'
import { createClient } from '@/lib/supabase-client'
import { AutomationEngine } from '@/lib/marketing/automation-engine'

// =====================================================
// EVENT TO TRIGGER MAPPING
// =====================================================

/**
 * Maps unified event types to automation trigger types
 * This allows automations to subscribe to specific event patterns
 */
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
  'MARKETING.FORM_SUBMITTED': 'form_submit',
  'MARKETING.UNSUBSCRIBED': 'unsubscribed',

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
// AUTOMATION EVENT LISTENER CLASS
// =====================================================

export class AutomationEventListener {
  private supabase = createClient()
  private automationEngine: AutomationEngine
  private unsubscribers: Array<() => void> = []
  private isListening = false

  constructor() {
    this.automationEngine = new AutomationEngine()
  }

  /**
   * Start listening to all relevant events
   */
  startListening(): void {
    if (this.isListening) {
      console.warn('[Automation Listener] Already listening')
      return
    }

    console.log('[Automation Listener] Starting event listeners...')

    // Subscribe to all mapped events
    Object.keys(EVENT_TO_TRIGGER_MAP).forEach(eventType => {
      const unsubscribe = eventService.on(
        eventType as keyof EventMap,
        async (data) => {
          await this.handleEvent(eventType as keyof EventMap, data)
        }
      )
      this.unsubscribers.push(unsubscribe)
    })

    this.isListening = true
    console.log(`[Automation Listener] Listening to ${this.unsubscribers.length} event types`)
  }

  /**
   * Stop listening to events
   */
  stopListening(): void {
    if (!this.isListening) {
      return
    }

    console.log('[Automation Listener] Stopping event listeners...')
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
    this.isListening = false
  }

  /**
   * Handle a specific event
   */
  private async handleEvent<K extends keyof EventMap>(
    eventType: K,
    eventData: EventMap[K]
  ): Promise<void> {
    try {
      const triggerType = EVENT_TO_TRIGGER_MAP[eventType]
      if (!triggerType) {
        console.warn(`[Automation Listener] No trigger mapping for event: ${eventType}`)
        return
      }

      // Extract common fields
      const data = eventData as Record<string, unknown>
      const tenantId = data.tenantId as string
      const contactId = data.contactId as string | undefined

      if (!tenantId) {
        console.warn(`[Automation Listener] Event missing tenantId: ${eventType}`)
        return
      }

      console.log(`[Automation Listener] Event received: ${eventType} → ${triggerType}`)

      // Find matching automations
      const matchingAutomations = await this.findMatchingAutomations(
        tenantId,
        triggerType,
        eventData
      )

      if (matchingAutomations.length === 0) {
        console.log(`[Automation Listener] No matching automations for ${triggerType}`)
        return
      }

      console.log(`[Automation Listener] Found ${matchingAutomations.length} matching automations`)

      // Trigger each matching automation
      const triggeredAutomationIds: string[] = []
      const automationRunIds: string[] = []

      for (const automation of matchingAutomations) {
        try {
          // Determine contactId for automation (some events don't have contactId)
          const effectiveContactId = contactId || await this.resolveContactId(automation, eventData)

          if (!effectiveContactId) {
            console.warn(`[Automation Listener] Cannot resolve contactId for automation ${automation.id}`)
            continue
          }

          // Start automation journey
          const runId = await this.automationEngine.startJourney(
            automation.id,
            effectiveContactId,
            { eventType, eventData }
          )

          triggeredAutomationIds.push(automation.id)
          automationRunIds.push(runId)

          console.log(`[Automation Listener] Triggered automation ${automation.id} for contact ${effectiveContactId}`)
        } catch (error) {
          console.error(`[Automation Listener] Error triggering automation ${automation.id}:`, error)
        }
      }

      // Update event log with triggered automations
      await this.updateEventLog(eventType, eventData, triggeredAutomationIds, automationRunIds)

    } catch (error) {
      console.error(`[Automation Listener] Error handling event ${eventType}:`, error)
    }
  }

  /**
   * Find automations that match the trigger and conditions
   */
  private async findMatchingAutomations(
    tenantId: string,
    triggerType: string,
    eventData: unknown
  ): Promise<Array<{ id: string; entry_trigger_type: string; entry_trigger_config: unknown }>> {
    try {
      // Query active journeys/automations
      const { data: automations, error } = await this.supabase
        .from('marketing_journeys')
        .select('id, entry_trigger_type, entry_trigger_config')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .eq('entry_trigger_type', triggerType)

      if (error) {
        console.error('[Automation Listener] Error querying automations:', error)
        return []
      }

      if (!automations || automations.length === 0) {
        return []
      }

      // Filter by conditions if specified
      const matchingAutomations = automations.filter(automation => {
        return this.matchesConditions(automation.entry_trigger_config, eventData)
      })

      return matchingAutomations
    } catch (error) {
      console.error('[Automation Listener] Error finding matching automations:', error)
      return []
    }
  }

  /**
   * Check if event data matches automation conditions
   */
  private matchesConditions(triggerConfig: unknown, eventData: unknown): boolean {
    // If no conditions, always match
    if (!triggerConfig || typeof triggerConfig !== 'object') {
      return true
    }

    const config = triggerConfig as Record<string, unknown>
    const data = eventData as Record<string, unknown>

    // Check conditions (if specified)
    const conditions = config.conditions as Record<string, unknown> | undefined
    if (!conditions) {
      return true
    }

    // Simple condition matching (can be enhanced)
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = data[key]
      
      // Handle different condition types
      if (typeof expectedValue === 'object' && expectedValue !== null) {
        const condObj = expectedValue as Record<string, unknown>
        
        // Range conditions (e.g., { min: 100, max: 1000 })
        if ('min' in condObj && actualValue < (condObj.min as number)) {
          return false
        }
        if ('max' in condObj && actualValue > (condObj.max as number)) {
          return false
        }
      } else {
        // Exact match
        if (actualValue !== expectedValue) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Resolve contactId for events that don't have one directly
   */
  private async resolveContactId(
    automation: { id: string },
    eventData: unknown
  ): Promise<string | null> {
    const data = eventData as Record<string, unknown>

    // If dealId present, get contact from deal
    if (data.dealId) {
      const { data: deal } = await this.supabase
        .from('deals')
        .select('contact_id')
        .eq('id', data.dealId)
        .single()
      
      return deal?.contact_id || null
    }

    // If taskId present, get contact from task
    if (data.taskId) {
      const { data: task } = await this.supabase
        .from('tasks')
        .select('contact_id')
        .eq('id', data.taskId)
        .single()
      
      return task?.contact_id || null
    }

    return null
  }

  /**
   * Update event log with triggered automation info
   */
  private async updateEventLog(
    eventType: string,
    eventData: unknown,
    triggeredAutomationIds: string[],
    automationRunIds: string[]
  ): Promise<void> {
    try {
      const data = eventData as Record<string, unknown>
      const tenantId = data.tenantId as string

      await this.supabase.from('automation_event_log').upsert({
        tenant_id: tenantId,
        event_type: eventType,
        event_data: eventData,
        triggered_automation_ids: triggeredAutomationIds,
        automation_run_ids: automationRunIds,
      })
    } catch (error) {
      // Silent fail - event logging shouldn't block automation execution
      console.error('[Automation Listener] Error updating event log:', error)
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let listenerInstance: AutomationEventListener | null = null

/**
 * Get or create the singleton automation event listener
 */
export function getAutomationEventListener(): AutomationEventListener {
  if (!listenerInstance) {
    listenerInstance = new AutomationEventListener()
  }
  return listenerInstance
}

/**
 * Initialize automation event listener (call on app startup)
 */
export function initializeAutomationEventListener(): void {
  const listener = getAutomationEventListener()
  listener.startListening()
  console.log('[Automation System] Event listener initialized')
}

/**
 * Cleanup automation event listener (call on app shutdown)
 */
export function cleanupAutomationEventListener(): void {
  if (listenerInstance) {
    listenerInstance.stopListening()
    listenerInstance = null
  }
}


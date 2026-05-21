/**
 * UNIFIED EVENT SYSTEM - Enterprise CRM Events
 * 
 * This is the single source of truth for ALL events in the CRM.
 * Consolidates previous events.ts and crm-event-dispatcher.ts
 * 
 * Architecture:
 * - Type-safe event definitions
 * - Async event handling with error isolation
 * - Automation engine integration
 * - Event logging and replay support
 */

import { createClient } from '@/lib/supabase-client'

// =====================================================
// EVENT MAP - All possible events in the CRM
// =====================================================

export interface EventMap {
  // ========================================
  // DEAL EVENTS
  // ========================================
  'DEAL.CREATED': { 
    dealId: string
    contactId: string
    tenantId: string
    pipelineId: string
    stageId: string
    value?: number
    source?: string
    userId?: string
  }
  'DEAL.UPDATED': { 
    dealId: string
    tenantId: string
    changes: Record<string, unknown>
    userId?: string
  }
  'DEAL.MOVED': { 
    dealId: string
    tenantId: string
    fromStageId: string
    toStageId: string
    fromStageName?: string
    toStageName?: string
    userId?: string
  }
  'DEAL.WON': {
    dealId: string
    contactId: string
    tenantId: string
    value: number
    wonAt: string
    userId?: string
  }
  'DEAL.LOST': {
    dealId: string
    contactId: string
    tenantId: string
    lostReason?: string
    lostAt: string
    userId?: string
  }
  'DEAL.AGING': {
    dealId: string
    contactId: string
    tenantId: string
    daysSinceLastActivity: number
    lastActivityAt: string
  }
  'DEAL.VALUE_THRESHOLD_CROSSED': {
    dealId: string
    contactId: string
    tenantId: string
    oldValue: number
    newValue: number
    threshold: number
  }
  'DEAL.ASSIGNED': {
    dealId: string
    tenantId: string
    fromUserId?: string
    toUserId: string
    userId?: string
  }

  // ========================================
  // TASK EVENTS
  // ========================================
  'TASK.CREATED': { 
    taskId: string
    title: string
    tenantId: string
    assigneeUserId?: string
    contactId?: string
    dealId?: string
    autoCreated: boolean
    priority: string
    dueAt?: string
  }
  'TASK.UPDATED': {
    taskId: string
    tenantId: string
    changes: Record<string, unknown>
    userId?: string
  }
  'TASK.COMPLETED': { 
    taskId: string
    tenantId: string
    completedAt: string
    userId?: string
  }
  'TASK.ASSIGNED': { 
    taskId: string
    tenantId: string
    fromUserId?: string
    toUserId: string
  }
  'TASK.OVERDUE': {
    taskId: string
    tenantId: string
    assigneeUserId?: string
    dueAt: string
    hoursOverdue: number
  }
  'TASK.DUE_SOON': {
    taskId: string
    tenantId: string
    assigneeUserId?: string
    dueAt: string
    hoursUntilDue: number
  }

  // ========================================
  // CONTACT EVENTS
  // ========================================
  'CONTACT.CREATED': { 
    contactId: string
    tenantId: string
    source?: string
    userId?: string
  }
  'CONTACT.UPDATED': { 
    contactId: string
    tenantId: string
    changes: Record<string, unknown>
    userId?: string
  }
  'CONTACT.ASSIGNED': {
    contactId: string
    tenantId: string
    fromUserId?: string
    toUserId: string
  }
  'CONTACT.INACTIVE': {
    contactId: string
    tenantId: string
    daysSinceLastActivity: number
    lastActivityAt: string
  }
  'CONTACT.HIGH_VALUE': {
    contactId: string
    tenantId: string
    totalDealValue: number
    dealCount: number
  }
  'CONTACT.MILESTONE': {
    contactId: string
    tenantId: string
    milestoneType: 'birthday' | 'anniversary' | 'custom'
    date: string
  }

  // ========================================
  // PIPELINE EVENTS
  // ========================================
  'PIPELINE.CAPACITY_REACHED': {
    pipelineId: string
    tenantId: string
    currentCapacity: number
    maxCapacity: number
    percentage: number
  }
  'PIPELINE.VELOCITY_SLOW': {
    pipelineId: string
    tenantId: string
    dealsPerWeek: number
    targetDealsPerWeek: number
  }
  'PIPELINE.BOTTLENECK_DETECTED': {
    pipelineId: string
    stageId: string
    tenantId: string
    stuckDealsCount: number
    avgDaysInStage: number
  }
  'PIPELINE.STAGE_SLA_BREACHED': {
    pipelineId: string
    stageId: string
    dealId: string
    tenantId: string
    maxDays: number
    actualDays: number
  }

  // ========================================
  // ACTIVITY EVENTS
  // ========================================
  'ACTIVITY.CREATED': { 
    activityId: string
    type: string
    tenantId: string
    contactId?: string
    dealId?: string
  }

  // ========================================
  // FILE EVENTS
  // ========================================
  'FILE.UPLOADED': { 
    fileId: string
    kind: string
    tenantId: string
    activityId?: string
  }

  // ========================================
  // INTEGRATION EVENTS
  // ========================================
  'INTEGRATION.TOKEN_EXPIRING': {
    integrationId: string
    integrationType: string
    tenantId: string
    expiresAt: string
    hoursUntilExpiry: number
  }
  'INTEGRATION.TOKEN_EXPIRED': {
    integrationId: string
    integrationType: string
    tenantId: string
    expiredAt: string
  }
  'INTEGRATION.SYNC_FAILED': {
    integrationId: string
    integrationType: string
    tenantId: string
    error: string
    failedAt: string
  }
  'INTEGRATION.RATE_LIMIT_HIT': {
    integrationId: string
    integrationType: string
    tenantId: string
    limit: number
    resetAt: string
  }

  // ========================================
  // ANALYTICS EVENTS
  // ========================================
  'ANALYTICS.KPI_BREACH': {
    kpiName: string
    tenantId: string
    currentValue: number
    thresholdValue: number
    breachType: 'above' | 'below'
  }
  'ANALYTICS.GOAL_ACHIEVED': {
    goalId: string
    goalName: string
    tenantId: string
    achievedValue: number
    targetValue: number
  }
  'ANALYTICS.ANOMALY_DETECTED': {
    metricName: string
    tenantId: string
    expectedValue: number
    actualValue: number
    deviationPercent: number
  }

  // ========================================
  // MARKETING EVENTS
  // ========================================
  'MARKETING.CAMPAIGN_SENT': {
    campaignId: string
    tenantId: string
    recipientCount: number
    sentAt: string
  }
  'MARKETING.EMAIL_OPENED': {
    campaignId: string
    contactId: string
    tenantId: string
    openedAt: string
  }
  'MARKETING.LINK_CLICKED': {
    campaignId: string
    contactId: string
    tenantId: string
    url: string
    clickedAt: string
  }
  'MARKETING.FORM_SUBMITTED': {
    formId: string | null
    contactId: string
    tenantId: string
    /** Phase 2b.14: dealId + activityId carry the ingestion result. */
    dealId?: string | null
    activityId?: string | null
    sourceChannel?: string
    rawPayload?: Record<string, unknown>
    submittedAt: string
  }
  'MARKETING.GOOGLE_LEAD_FORM_SUBMITTED': {
    formId: string | null
    contactId: string
    tenantId: string
    dealId?: string | null
    activityId?: string | null
    rawPayload?: Record<string, unknown>
    submittedAt: string
  }
  'MARKETING.UNSUBSCRIBED': {
    campaignId: string
    contactId: string
    tenantId: string
    unsubscribedAt: string
  }

  // ========================================
  // INBOUND MESSAGING EVENTS (Phase 2b.14)
  // ========================================
  'INBOUND.SMS_RECEIVED': {
    tenantId: string
    contactId: string
    dealId?: string | null
    activityId: string
    /** Inbound message body (already normalised by the webhook). */
    body: string
    fromNumber: string
    /** Provider message id (Twilio SID etc) for idempotency. */
    externalMessageId?: string
    rawPayload?: Record<string, unknown>
    receivedAt: string
  }
  'INBOUND.WHATSAPP_RECEIVED': {
    tenantId: string
    contactId: string
    dealId?: string | null
    activityId: string
    body: string
    fromNumber: string
    externalMessageId?: string
    rawPayload?: Record<string, unknown>
    receivedAt: string
  }

  // ========================================
  // CALL/VOICESTACK EVENTS
  // ========================================
  'CALL.MISSED': {
    callId: string
    contactId?: string
    tenantId: string
    phoneNumber: string
    missedAt: string
  }
  'CALL.VOICEMAIL_RECEIVED': {
    callId: string
    contactId?: string
    tenantId: string
    phoneNumber: string
    duration: number
    transcription?: string
  }
  'CALL.COMPLETED': {
    callId: string
    contactId?: string
    tenantId: string
    duration: number
    completedAt: string
  }

  // ========================================
  // AI EVENTS
  // ========================================
  'AI.PROCESSING_STARTED': { 
    activityId: string
    kind: string
    tenantId: string
  }
  'AI.PROCESSING_COMPLETED': { 
    activityId: string
    kind: string
    tenantId: string
    artifactIds: string[]
  }
  'AI.PROCESSING_FAILED': { 
    activityId: string
    kind: string
    tenantId: string
    error: string
  }
  'AI.SUGGESTION_GENERATED': {
    suggestionId: string
    suggestionType: string
    tenantId: string
    dealId?: string
    contactId?: string
    priority: string
  }
}

// =====================================================
// EVENT SERVICE CLASS
// =====================================================

type EventCallback = (data: unknown) => void | Promise<void>

class UnifiedEventService {
  private listeners: Map<string, Set<EventCallback>> = new Map()
  private eventLog: Array<{ event: string; data: unknown; timestamp: string }> = []
  private maxLogSize = 1000 // Keep last 1000 events in memory

  /**
   * Subscribe to an event
   */
  on<K extends keyof EventMap>(
    event: K,
    callback: (data: EventMap[K]) => void | Promise<void>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const eventListeners = this.listeners.get(event)!
    eventListeners.add(callback as EventCallback)

    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback as EventCallback)
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   */
  once<K extends keyof EventMap>(
    event: K,
    callback: (data: EventMap[K]) => void | Promise<void>
  ): () => void {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe()
      callback(data)
    })
    return unsubscribe
  }

  /**
   * Subscribe to multiple events with same callback
   */
  onMultiple<K extends keyof EventMap>(
    events: K[],
    callback: (event: K, data: EventMap[K]) => void | Promise<void>
  ): () => void {
    const unsubscribers = events.map(event => 
      this.on(event, (data) => callback(event, data))
    )
    return () => unsubscribers.forEach(unsub => unsub())
  }

  /**
   * Emit an event
   */
  async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
    const timestamp = new Date().toISOString()
    
    // Log event
    this.logEvent(event, data, timestamp)

    // Get listeners
    const listeners = this.listeners.get(event)
    if (!listeners || listeners.size === 0) {
      console.log(`[Event] ${event}: No listeners`)
      return
    }

    console.log(`[Event] ${event} (${listeners.size} listeners)`)

    // Execute all listeners in parallel, isolating errors
    const promises = Array.from(listeners).map(async (listener) => {
      try {
        await listener(data)
      } catch (error) {
        console.error(`[Event] Error in ${event} listener:`, error)
        // Don't throw - isolate errors to prevent cascade failures
      }
    })

    await Promise.allSettled(promises)
  }

  /**
   * Log event to memory (and optionally database)
   */
  private logEvent<K extends keyof EventMap>(
    event: K,
    data: EventMap[K],
    timestamp: string
  ): void {
    // Add to in-memory log
    this.eventLog.push({ event, data, timestamp })

    // Trim if exceeds max size
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift()
    }

    // Optionally persist to database (async, non-blocking)
    this.persistEventLog(event, data, timestamp).catch(err => {
      console.error('[Event] Failed to persist event log:', err)
    })
  }

  /**
   * Persist event to database for audit/replay
   */
  private async persistEventLog<K extends keyof EventMap>(
    event: K,
    data: EventMap[K],
    timestamp: string
  ): Promise<void> {
    try {
      const supabase = createClient()
      const eventData = data as Record<string, unknown>
      
      await supabase.from('automation_event_log').insert({
        event_type: event,
        event_data: data,
        tenant_id: eventData.tenantId || null,
        created_at: timestamp,
      })
    } catch (error) {
      // Silent fail - event logging shouldn't block main flow
      console.error('[Event] Error persisting event log:', error)
    }
  }

  /**
   * Get recent events from memory
   */
  getRecentEvents(count: number = 100): Array<{ event: string; data: unknown; timestamp: string }> {
    return this.eventLog.slice(-count)
  }

  /**
   * Remove all listeners for an event
   */
  off<K extends keyof EventMap>(event: K): void {
    this.listeners.delete(event)
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear()
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event)?.size || 0
  }

  /**
   * Get all registered events
   */
  getEvents(): string[] {
    return Array.from(this.listeners.keys())
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const eventService = new UnifiedEventService()

// =====================================================
// CONVENIENCE FUNCTIONS (Typed & Easy to Use)
// =====================================================

export const events = {
  // Deal events
  dealCreated: (data: EventMap['DEAL.CREATED']) => eventService.emit('DEAL.CREATED', data),
  dealUpdated: (data: EventMap['DEAL.UPDATED']) => eventService.emit('DEAL.UPDATED', data),
  dealMoved: (data: EventMap['DEAL.MOVED']) => eventService.emit('DEAL.MOVED', data),
  dealWon: (data: EventMap['DEAL.WON']) => eventService.emit('DEAL.WON', data),
  dealLost: (data: EventMap['DEAL.LOST']) => eventService.emit('DEAL.LOST', data),
  dealAging: (data: EventMap['DEAL.AGING']) => eventService.emit('DEAL.AGING', data),
  dealValueThresholdCrossed: (data: EventMap['DEAL.VALUE_THRESHOLD_CROSSED']) => 
    eventService.emit('DEAL.VALUE_THRESHOLD_CROSSED', data),
  dealAssigned: (data: EventMap['DEAL.ASSIGNED']) => eventService.emit('DEAL.ASSIGNED', data),

  // Task events
  taskCreated: (data: EventMap['TASK.CREATED']) => eventService.emit('TASK.CREATED', data),
  taskUpdated: (data: EventMap['TASK.UPDATED']) => eventService.emit('TASK.UPDATED', data),
  taskCompleted: (data: EventMap['TASK.COMPLETED']) => eventService.emit('TASK.COMPLETED', data),
  taskAssigned: (data: EventMap['TASK.ASSIGNED']) => eventService.emit('TASK.ASSIGNED', data),
  taskOverdue: (data: EventMap['TASK.OVERDUE']) => eventService.emit('TASK.OVERDUE', data),
  taskDueSoon: (data: EventMap['TASK.DUE_SOON']) => eventService.emit('TASK.DUE_SOON', data),

  // Contact events
  contactCreated: (data: EventMap['CONTACT.CREATED']) => eventService.emit('CONTACT.CREATED', data),
  contactUpdated: (data: EventMap['CONTACT.UPDATED']) => eventService.emit('CONTACT.UPDATED', data),
  contactAssigned: (data: EventMap['CONTACT.ASSIGNED']) => eventService.emit('CONTACT.ASSIGNED', data),
  contactInactive: (data: EventMap['CONTACT.INACTIVE']) => eventService.emit('CONTACT.INACTIVE', data),
  contactHighValue: (data: EventMap['CONTACT.HIGH_VALUE']) => eventService.emit('CONTACT.HIGH_VALUE', data),
  contactMilestone: (data: EventMap['CONTACT.MILESTONE']) => eventService.emit('CONTACT.MILESTONE', data),

  // Pipeline events
  pipelineCapacityReached: (data: EventMap['PIPELINE.CAPACITY_REACHED']) => 
    eventService.emit('PIPELINE.CAPACITY_REACHED', data),
  pipelineVelocitySlow: (data: EventMap['PIPELINE.VELOCITY_SLOW']) => 
    eventService.emit('PIPELINE.VELOCITY_SLOW', data),
  pipelineBottleneckDetected: (data: EventMap['PIPELINE.BOTTLENECK_DETECTED']) => 
    eventService.emit('PIPELINE.BOTTLENECK_DETECTED', data),
  pipelineStageSLABreached: (data: EventMap['PIPELINE.STAGE_SLA_BREACHED']) => 
    eventService.emit('PIPELINE.STAGE_SLA_BREACHED', data),

  // Activity events
  activityCreated: (data: EventMap['ACTIVITY.CREATED']) => eventService.emit('ACTIVITY.CREATED', data),

  // File events
  fileUploaded: (data: EventMap['FILE.UPLOADED']) => eventService.emit('FILE.UPLOADED', data),

  // Integration events
  integrationTokenExpiring: (data: EventMap['INTEGRATION.TOKEN_EXPIRING']) => 
    eventService.emit('INTEGRATION.TOKEN_EXPIRING', data),
  integrationTokenExpired: (data: EventMap['INTEGRATION.TOKEN_EXPIRED']) => 
    eventService.emit('INTEGRATION.TOKEN_EXPIRED', data),
  integrationSyncFailed: (data: EventMap['INTEGRATION.SYNC_FAILED']) => 
    eventService.emit('INTEGRATION.SYNC_FAILED', data),
  integrationRateLimitHit: (data: EventMap['INTEGRATION.RATE_LIMIT_HIT']) => 
    eventService.emit('INTEGRATION.RATE_LIMIT_HIT', data),

  // Analytics events
  analyticsKPIBreach: (data: EventMap['ANALYTICS.KPI_BREACH']) => 
    eventService.emit('ANALYTICS.KPI_BREACH', data),
  analyticsGoalAchieved: (data: EventMap['ANALYTICS.GOAL_ACHIEVED']) => 
    eventService.emit('ANALYTICS.GOAL_ACHIEVED', data),
  analyticsAnomalyDetected: (data: EventMap['ANALYTICS.ANOMALY_DETECTED']) => 
    eventService.emit('ANALYTICS.ANOMALY_DETECTED', data),

  // Marketing events
  marketingCampaignSent: (data: EventMap['MARKETING.CAMPAIGN_SENT']) => 
    eventService.emit('MARKETING.CAMPAIGN_SENT', data),
  marketingEmailOpened: (data: EventMap['MARKETING.EMAIL_OPENED']) => 
    eventService.emit('MARKETING.EMAIL_OPENED', data),
  marketingLinkClicked: (data: EventMap['MARKETING.LINK_CLICKED']) => 
    eventService.emit('MARKETING.LINK_CLICKED', data),
  marketingFormSubmitted: (data: EventMap['MARKETING.FORM_SUBMITTED']) =>
    eventService.emit('MARKETING.FORM_SUBMITTED', data),
  marketingGoogleLeadFormSubmitted: (data: EventMap['MARKETING.GOOGLE_LEAD_FORM_SUBMITTED']) =>
    eventService.emit('MARKETING.GOOGLE_LEAD_FORM_SUBMITTED', data),
  marketingUnsubscribed: (data: EventMap['MARKETING.UNSUBSCRIBED']) =>
    eventService.emit('MARKETING.UNSUBSCRIBED', data),

  // Inbound messaging events (Phase 2b.14)
  inboundSmsReceived: (data: EventMap['INBOUND.SMS_RECEIVED']) =>
    eventService.emit('INBOUND.SMS_RECEIVED', data),
  inboundWhatsappReceived: (data: EventMap['INBOUND.WHATSAPP_RECEIVED']) =>
    eventService.emit('INBOUND.WHATSAPP_RECEIVED', data),

  // Call events
  callMissed: (data: EventMap['CALL.MISSED']) => eventService.emit('CALL.MISSED', data),
  callVoicemailReceived: (data: EventMap['CALL.VOICEMAIL_RECEIVED']) => 
    eventService.emit('CALL.VOICEMAIL_RECEIVED', data),
  callCompleted: (data: EventMap['CALL.COMPLETED']) => eventService.emit('CALL.COMPLETED', data),

  // AI events
  aiProcessingStarted: (data: EventMap['AI.PROCESSING_STARTED']) => 
    eventService.emit('AI.PROCESSING_STARTED', data),
  aiProcessingCompleted: (data: EventMap['AI.PROCESSING_COMPLETED']) => 
    eventService.emit('AI.PROCESSING_COMPLETED', data),
  aiProcessingFailed: (data: EventMap['AI.PROCESSING_FAILED']) => 
    eventService.emit('AI.PROCESSING_FAILED', data),
  aiSuggestionGenerated: (data: EventMap['AI.SUGGESTION_GENERATED']) => 
    eventService.emit('AI.SUGGESTION_GENERATED', data),
}

// =====================================================
// SETUP FUNCTION (Call on app initialization)
// =====================================================

export function setupUnifiedEventListeners() {
  // Log all events in development
  if (process.env.NODE_ENV === 'development') {
    const allEvents = Object.keys({} as EventMap) as (keyof EventMap)[]
    
    allEvents.forEach(event => {
      eventService.on(event, (data) => {
        console.log(`[CRM Event] ${event}:`, data)
      })
    })
  }

  console.log('[Events] Unified event system initialized')
}


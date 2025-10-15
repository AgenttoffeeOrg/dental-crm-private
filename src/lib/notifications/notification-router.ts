/**
 * Notification Router/Orchestrator
 * 
 * Central engine that:
 * - Receives notification events from producers
 * - Resolves audience (who should receive)
 * - Applies user preferences (opt-outs, DND)
 * - Applies org policies (rate limits, throttling)
 * - Routes to appropriate channels (in-app, email, SMS)
 * - Handles deduplication & idempotency
 * - Manages grouping & threading
 * 
 * This is the brain of the notifications system.
 */

import { createClient } from '@/lib/supabase-client'
import { getEventDefinition, type NotificationEventDefinition } from './event-catalog'

export interface NotificationEventPayload {
  // Identity
  event_key: string
  event_id?: string  // Optional idempotency key
  
  // Source
  tenant_id: string
  location_id?: string
  triggered_by_user_id?: string
  
  // Content (can use template variables)
  title?: string  // If not provided, uses event catalog template
  body?: string
  
  // Context
  entity_type?: string
  entity_id?: string
  entity_url?: string
  
  // Override defaults
  severity?: 'info' | 'success' | 'warning' | 'error' | 'critical'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  
  // Audience override
  recipient_user_ids?: string[]
  
  // Metadata for template rendering
  metadata?: Record<string, any>
  
  // Lifecycle
  expires_at?: Date
  group_key?: string
}

interface ResolvedNotification {
  user_id: string
  notification: {
    tenant_id: string
    location_id?: string
    event_key: string
    event_id?: string
    title: string
    body?: string
    severity: string
    priority: string
    module?: string
    entity_type?: string
    entity_id?: string
    entity_url?: string
    quick_actions?: any[]
    expires_at?: Date
    group_key?: string
    metadata?: Record<string, any>
    triggered_by_user_id?: string
  }
  channels: string[]  // Which channels to deliver to
}

/**
 * Main entry point: Emit a notification event
 */
export async function emitNotification(payload: NotificationEventPayload): Promise<void> {
  try {
    // 1. Get event definition from catalog
    const eventDef = getEventDefinition(payload.event_key)
    if (!eventDef) {
      console.error(`[Notifications] Unknown event key: ${payload.event_key}`)
      return
    }
    
    // 2. Check idempotency (prevent duplicates)
    if (payload.event_id) {
      const isDuplicate = await checkIdempotency(payload.event_id)
      if (isDuplicate) {
        console.log(`[Notifications] Skipping duplicate event: ${payload.event_id}`)
        return
      }
    }
    
    // 3. Resolve audience (who should receive this notification)
    const audience = await resolveAudience(payload, eventDef)
    if (audience.length === 0) {
      console.log(`[Notifications] No audience for event: ${payload.event_key}`)
      return
    }
    
    // 4. Apply throttling (prevent notification spam)
    const throttledAudience = await applyThrottling(payload, eventDef, audience)
    if (throttledAudience.length === 0) {
      console.log(`[Notifications] All recipients throttled for: ${payload.event_key}`)
      return
    }
    
    // 5. Render notification for each recipient
    const resolvedNotifications = await Promise.all(
      throttledAudience.map(userId => resolveNotification(payload, eventDef, userId))
    )
    
    // 6. Filter by user preferences & DND
    const finalNotifications = await Promise.all(
      resolvedNotifications.map(async (resolved) => {
        const channels = await filterByPreferences(
          resolved.user_id,
          payload.event_key,
          eventDef.default_channels
        )
        
        return {
          ...resolved,
          channels
        }
      })
    )
    
    // 7. Insert notifications to database
    await bulkInsertNotifications(finalNotifications)
    
    // 8. Trigger multi-channel delivery (email, SMS if configured)
    await triggerMultiChannelDelivery(finalNotifications)
    
    console.log(`[Notifications] Emitted ${finalNotifications.length} notifications for: ${payload.event_key}`)
  } catch (error) {
    console.error('[Notifications] Error emitting notification:', error)
    // Don't throw - notifications are non-critical, shouldn't break app
  }
}

/**
 * Check if event_id already processed (idempotency)
 */
async function checkIdempotency(event_id: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('event_id', event_id)
    .single()
  
  return !!data
}

/**
 * Resolve who should receive this notification
 */
async function resolveAudience(
  payload: NotificationEventPayload,
  eventDef: NotificationEventDefinition
): Promise<string[]> {
  const supabase = createClient()
  
  // Explicit recipients override
  if (payload.recipient_user_ids && payload.recipient_user_ids.length > 0) {
    return payload.recipient_user_ids
  }
  
  const audience: string[] = []
  
  // Resolve based on event definition
  const defaultAudience = eventDef.default_audience
  
  if (Array.isArray(defaultAudience)) {
    // Role-based audience (e.g., ['admin', 'manager'])
    const { data: users } = await supabase
      .from('app_users')
      .select('id')
      .eq('tenant_id', payload.tenant_id)
      .in('role', defaultAudience)
    
    if (users) {
      audience.push(...users.map(u => u.id))
    }
  } else if (defaultAudience === 'assignee') {
    // Specific user from metadata
    if (payload.metadata?.assignee_user_id) {
      audience.push(payload.metadata.assignee_user_id)
    }
  } else if (defaultAudience === 'owner') {
    if (payload.metadata?.owner_user_id) {
      audience.push(payload.metadata.owner_user_id)
    }
  } else if (defaultAudience === 'creator') {
    if (payload.triggered_by_user_id) {
      audience.push(payload.triggered_by_user_id)
    }
  } else if (defaultAudience === 'manager') {
    // All managers in tenant/location
    const { data: managers } = await supabase
      .from('app_users')
      .select('id')
      .eq('tenant_id', payload.tenant_id)
      .in('role', ['manager', 'admin', 'owner'])
    
    if (managers) {
      audience.push(...managers.map(m => m.id))
    }
  } else if (defaultAudience === 'team') {
    // All users in tenant/location
    const { data: team } = await supabase
      .from('app_users')
      .select('id')
      .eq('tenant_id', payload.tenant_id)
    
    if (team) {
      audience.push(...team.map(t => t.id))
    }
  }
  
  // Deduplicate
  return [...new Set(audience)]
}

/**
 * Apply throttling rules (prevent spam)
 */
async function applyThrottling(
  payload: NotificationEventPayload,
  eventDef: NotificationEventDefinition,
  audience: string[]
): Promise<string[]> {
  if (!eventDef.throttle_minutes) {
    return audience  // No throttling
  }
  
  const supabase = createClient()
  const throttleCutoff = new Date()
  throttleCutoff.setMinutes(throttleCutoff.getMinutes() - eventDef.throttle_minutes)
  
  // Check each user for recent similar notifications
  const nonThrottled: string[] = []
  
  for (const userId of audience) {
    const { data: recent } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('event_key', payload.event_key)
      .gte('created_at', throttleCutoff.toISOString())
      .limit(1)
    
    if (!recent || recent.length === 0) {
      nonThrottled.push(userId)
    }
  }
  
  return nonThrottled
}

/**
 * Render notification content for a specific user
 */
async function resolveNotification(
  payload: NotificationEventPayload,
  eventDef: NotificationEventDefinition,
  userId: string
): Promise<ResolvedNotification> {
  // Render title (replace template variables)
  const title = payload.title || renderTemplate(eventDef.title_template, payload.metadata || {})
  const body = payload.body || (eventDef.body_template ? renderTemplate(eventDef.body_template, payload.metadata || {}) : undefined)
  
  return {
    user_id: userId,
    notification: {
      tenant_id: payload.tenant_id,
      location_id: payload.location_id,
      event_key: payload.event_key,
      event_id: payload.event_id,
      title,
      body,
      severity: payload.severity || eventDef.severity,
      priority: payload.priority || eventDef.priority,
      module: eventDef.module,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      entity_url: payload.entity_url,
      quick_actions: eventDef.quick_actions,
      expires_at: payload.expires_at,
      group_key: payload.group_key,
      metadata: payload.metadata,
      triggered_by_user_id: payload.triggered_by_user_id,
    },
    channels: eventDef.default_channels
  }
}

/**
 * Simple template renderer
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, String(value))
  }
  
  return result
}

/**
 * Filter channels by user preferences & DND
 */
async function filterByPreferences(
  userId: string,
  eventKey: string,
  defaultChannels: string[]
): Promise<string[]> {
  const supabase = createClient()
  
  // Get user preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (!prefs) {
    // No preferences set, use defaults (but exclude SMS by default)
    return defaultChannels.filter(c => c !== 'sms')
  }
  
  const allowedChannels: string[] = []
  
  // Check each channel
  for (const channel of defaultChannels) {
    // Global channel toggle
    if (channel === 'in_app' && !prefs.in_app_enabled) continue
    if (channel === 'email' && !prefs.email_enabled) continue
    if (channel === 'sms' && !prefs.sms_enabled) continue
    if (channel === 'push' && !prefs.push_enabled) continue
    
    // Event-specific preference
    const eventPrefs = prefs.event_preferences as any
    if (eventPrefs && eventPrefs[eventKey]) {
      const eventChannelPref = eventPrefs[eventKey][channel]
      if (eventChannelPref === false) continue
    }
    
    // Check DND (quiet hours)
    if (channel !== 'in_app') {  // in-app always allowed
      const dnd = prefs.quiet_hours as any
      if (dnd && dnd.enabled) {
        const isQuietHours = checkQuietHours(dnd)
        if (isQuietHours) continue
      }
    }
    
    // Check global snooze
    if (prefs.snoozed_until && new Date(prefs.snoozed_until) > new Date()) {
      if (channel !== 'in_app') continue  // Only in-app during snooze
    }
    
    allowedChannels.push(channel)
  }
  
  return allowedChannels
}

/**
 * Check if current time is within quiet hours
 */
function checkQuietHours(dnd: any): boolean {
  // TODO: Implement proper timezone-aware quiet hours check
  // For now, always return false
  return false
}

/**
 * Bulk insert notifications to database
 */
async function bulkInsertNotifications(notifications: ResolvedNotification[]): Promise<void> {
  if (notifications.length === 0) return
  
  const supabase = createClient()
  
  const records = notifications.map(n => ({
    user_id: n.user_id,
    ...n.notification
  }))
  
  const { error } = await supabase
    .from('notifications')
    .insert(records)
  
  if (error) {
    console.error('[Notifications] Error inserting:', error)
    throw error
  }
}

/**
 * Trigger multi-channel delivery (email, SMS)
 */
async function triggerMultiChannelDelivery(notifications: ResolvedNotification[]): Promise<void> {
  // TODO: Implement email/SMS delivery
  // For now, only in-app is supported (inserted to DB above)
  
  const emailNotifications = notifications.filter(n => n.channels.includes('email'))
  const smsNotifications = notifications.filter(n => n.channels.includes('sms'))
  
  if (emailNotifications.length > 0) {
    console.log(`[Notifications] Would send ${emailNotifications.length} emails`)
    // await sendEmailNotifications(emailNotifications)
  }
  
  if (smsNotifications.length > 0) {
    console.log(`[Notifications] Would send ${smsNotifications.length} SMS`)
    // await sendSMSNotifications(smsNotifications)
  }
}

/**
 * Convenience function: Emit deal assigned notification
 */
export async function notifyDealAssigned(
  tenantId: string,
  dealId: string,
  dealTitle: string,
  assigneeUserId: string,
  assignedByUserId: string,
  assignedByName: string
): Promise<void> {
  await emitNotification({
    event_key: 'deal.assigned',
    tenant_id: tenantId,
    triggered_by_user_id: assignedByUserId,
    entity_type: 'deal',
    entity_id: dealId,
    entity_url: `/deals/${dealId}`,
    recipient_user_ids: [assigneeUserId],
    metadata: {
      deal_title: dealTitle,
      triggered_by_name: assignedByName,
      assignee_user_id: assigneeUserId,
    },
    group_key: `deal-${dealId}`,
  })
}

/**
 * Convenience function: Emit task overdue notification
 */
export async function notifyTaskOverdue(
  tenantId: string,
  taskId: string,
  taskTitle: string,
  assigneeUserId: string,
  daysOverdue: number
): Promise<void> {
  await emitNotification({
    event_key: 'task.overdue',
    tenant_id: tenantId,
    entity_type: 'task',
    entity_id: taskId,
    entity_url: `/tasks?task=${taskId}`,
    recipient_user_ids: [assigneeUserId],
    metadata: {
      task_title: taskTitle,
      days: daysOverdue,
    },
    group_key: `task-${taskId}`,
  })
}

// Export more convenience functions as needed...


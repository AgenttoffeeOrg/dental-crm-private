/**
 * AUTOMATION EVENT EMITTERS
 * 
 * Helper functions to emit events from CRM mutations.
 * These wrap common database operations and automatically emit events
 * that trigger matching automations.
 * 
 * Usage:
 * Instead of: await supabase.from('deals').insert(data)
 * Use: await emitDealCreated(supabase, dealData)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { events } from '@/lib/events-unified'

// =====================================================
// DEAL EVENT EMITTERS
// =====================================================

/**
 * Emit DEAL.CREATED event after creating a deal
 */
export async function emitDealCreated(
  supabase: SupabaseClient,
  dealData: {
    id?: string
    tenant_id: string
    contact_id: string
    pipeline_id: string
    stage_id: string
    value_estimate_cents?: number
    source?: string
    [key: string]: any
  }
): Promise<{ data: any; error: any }> {
  // Insert deal
  const { data, error } = await supabase
    .from('deals')
    .insert(dealData)
    .select()
    .single()

  // Emit event if successful
  if (!error && data) {
    await events.dealCreated({
      dealId: data.id,
      contactId: dealData.contact_id,
      tenantId: dealData.tenant_id,
      pipelineId: dealData.pipeline_id,
      stageId: dealData.stage_id,
      value: dealData.value_estimate_cents,
      source: dealData.source,
      userId: undefined, // TODO: Get from auth context
    })
  }

  return { data, error }
}

/**
 * Emit DEAL.UPDATED event after updating a deal
 */
export async function emitDealUpdated(
  supabase: SupabaseClient,
  dealId: string,
  tenantId: string,
  updates: Record<string, any>
): Promise<{ data: any; error: any }> {
  // Update deal
  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', dealId)
    .select()
    .single()

  // Emit event if successful
  if (!error && data) {
    await events.dealUpdated({
      dealId,
      tenantId,
      changes: updates,
      userId: undefined, // TODO: Get from auth context
    })

    // Check if stage changed
    if (updates.stage_id && data.stage_id !== updates.stage_id) {
      // We need the old stage ID - fetch it first
      // For now, just emit with current data
    }
  }

  return { data, error }
}

/**
 * Emit DEAL.MOVED event when stage changes
 */
export async function emitDealMoved(
  supabase: SupabaseClient,
  dealId: string,
  tenantId: string,
  fromStageId: string,
  toStageId: string
): Promise<void> {
  await events.dealMoved({
    dealId,
    tenantId,
    fromStageId,
    toStageId,
    userId: undefined, // TODO: Get from auth context
  })
}

/**
 * Emit DEAL.WON event when deal is won
 */
export async function emitDealWon(
  dealId: string,
  contactId: string,
  tenantId: string,
  value: number
): Promise<void> {
  await events.dealWon({
    dealId,
    contactId,
    tenantId,
    value,
    wonAt: new Date().toISOString(),
    userId: undefined,
  })
}

/**
 * Emit DEAL.LOST event when deal is lost
 */
export async function emitDealLost(
  dealId: string,
  contactId: string,
  tenantId: string,
  lostReason?: string
): Promise<void> {
  await events.dealLost({
    dealId,
    contactId,
    tenantId,
    lostReason,
    lostAt: new Date().toISOString(),
    userId: undefined,
  })
}

/**
 * Emit DEAL.ASSIGNED event when owner changes
 */
export async function emitDealAssigned(
  dealId: string,
  tenantId: string,
  fromUserId: string | undefined,
  toUserId: string
): Promise<void> {
  await events.dealAssigned({
    dealId,
    tenantId,
    fromUserId,
    toUserId,
    userId: undefined,
  })
}

// =====================================================
// TASK EVENT EMITTERS
// =====================================================

/**
 * Emit TASK.CREATED event after creating a task
 */
export async function emitTaskCreated(
  supabase: SupabaseClient,
  taskData: {
    id?: string
    tenant_id: string
    title: string
    assignee_user_id?: string
    contact_id?: string
    deal_id?: string
    auto_created?: boolean
    priority: string
    due_at?: string
    [key: string]: any
  }
): Promise<{ data: any; error: any }> {
  // Insert task
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single()

  // Emit event if successful
  if (!error && data) {
    await events.taskCreated({
      taskId: data.id,
      title: taskData.title,
      tenantId: taskData.tenant_id,
      assigneeUserId: taskData.assignee_user_id,
      contactId: taskData.contact_id,
      dealId: taskData.deal_id,
      autoCreated: taskData.auto_created || false,
      priority: taskData.priority,
      dueAt: taskData.due_at,
    })
  }

  return { data, error }
}

/**
 * Emit TASK.UPDATED event after updating a task
 */
export async function emitTaskUpdated(
  supabase: SupabaseClient,
  taskId: string,
  tenantId: string,
  updates: Record<string, any>
): Promise<{ data: any; error: any }> {
  // Update task
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()

  // Emit event if successful
  if (!error && data) {
    await events.taskUpdated({
      taskId,
      tenantId,
      changes: updates,
      userId: undefined,
    })
  }

  return { data, error }
}

/**
 * Emit TASK.COMPLETED event when task is completed
 */
export async function emitTaskCompleted(
  taskId: string,
  tenantId: string
): Promise<void> {
  await events.taskCompleted({
    taskId,
    tenantId,
    completedAt: new Date().toISOString(),
    userId: undefined,
  })
}

/**
 * Emit TASK.ASSIGNED event when task assignee changes
 */
export async function emitTaskAssigned(
  taskId: string,
  tenantId: string,
  fromUserId: string | undefined,
  toUserId: string
): Promise<void> {
  await events.taskAssigned({
    taskId,
    tenantId,
    fromUserId,
    toUserId,
  })
}

// =====================================================
// CONTACT EVENT EMITTERS
// =====================================================

/**
 * Emit CONTACT.CREATED event after creating a contact
 */
export async function emitContactCreated(
  supabase: SupabaseClient,
  contactData: {
    id?: string
    tenant_id: string
    source?: string
    [key: string]: any
  }
): Promise<{ data: any; error: any }> {
  // Insert contact
  const { data, error } = await supabase
    .from('contacts')
    .insert(contactData)
    .select()
    .single()

  // Emit event if successful
  if (!error && data) {
    await events.contactCreated({
      contactId: data.id,
      tenantId: contactData.tenant_id,
      source: contactData.source,
      userId: undefined,
    })
  }

  return { data, error }
}

/**
 * Emit CONTACT.UPDATED event after updating a contact
 */
export async function emitContactUpdated(
  supabase: SupabaseClient,
  contactId: string,
  tenantId: string,
  updates: Record<string, any>
): Promise<{ data: any; error: any }> {
  // Update contact
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single()

  // Emit event if successful
  if (!error && data) {
    await events.contactUpdated({
      contactId,
      tenantId,
      changes: updates,
      userId: undefined,
    })
  }

  return { data, error }
}

/**
 * Emit CONTACT.ASSIGNED event when owner changes
 */
export async function emitContactAssigned(
  contactId: string,
  tenantId: string,
  fromUserId: string | undefined,
  toUserId: string
): Promise<void> {
  await events.contactAssigned({
    contactId,
    tenantId,
    fromUserId,
    toUserId,
  })
}

// =====================================================
// ACTIVITY EVENT EMITTERS
// =====================================================

/**
 * Emit ACTIVITY.CREATED event after creating an activity
 */
export async function emitActivityCreated(
  supabase: SupabaseClient,
  activityData: {
    id?: string
    tenant_id: string
    type: string
    contact_id?: string
    deal_id?: string
    [key: string]: any
  }
): Promise<{ data: any; error: any }> {
  // Insert activity
  const { data, error } = await supabase
    .from('activities')
    .insert(activityData)
    .select()
    .single()

  // Emit event if successful
  if (!error && data) {
    await events.activityCreated({
      activityId: data.id,
      type: activityData.type,
      tenantId: activityData.tenant_id,
      contactId: activityData.contact_id,
      dealId: activityData.deal_id,
    })
  }

  return { data, error }
}

// =====================================================
// CONVENIENCE WRAPPERS (Non-blocking event emission)
// =====================================================

/**
 * Safely emit event without blocking main operation
 */
async function safeEmit(emitFn: () => Promise<void>): Promise<void> {
  try {
    await emitFn()
  } catch (error) {
    console.error('[Event Emitter] Error emitting event:', error)
    // Don't throw - event emission shouldn't break main flow
  }
}


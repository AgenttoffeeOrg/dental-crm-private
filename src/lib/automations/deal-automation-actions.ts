/**
 * DEAL AUTOMATION ACTIONS
 * 
 * Specialized actions for deal automations.
 * These extend the base automation engine with deal-specific capabilities.
 */

import { createClient } from '@/lib/supabase-client'
import { events } from '@/lib/events-unified'

// =====================================================
// DEAL ACTIONS
// =====================================================

/**
 * Move deal to a specific stage
 */
export async function moveDealToStage(
  dealId: string,
  tenantId: string,
  toStageId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Get current stage first
    const { data: deal } = await supabase
      .from('deals')
      .select('stage_id')
      .eq('id', dealId)
      .single()

    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    const fromStageId = deal.stage_id

    // Update stage
    const { error } = await supabase
      .from('deals')
      .update({
        stage_id: toStageId,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Emit event
    await events.dealMoved({
      dealId,
      tenantId,
      fromStageId,
      toStageId,
    })

    // Log to activities
    await supabase.from('activities').insert({
      tenant_id: tenantId,
      deal_id: dealId,
      type: 'stage_change',
      occurred_at: new Date().toISOString(),
      description: reason || `Automatically moved to new stage`,
      metadata: { source: 'automation' },
    })

    return { success: true }
  } catch (error) {
    console.error('[Deal Actions] Error moving deal:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Assign deal to a user (with round-robin support)
 */
export async function assignDealToUser(
  dealId: string,
  tenantId: string,
  userId?: string,
  mode: 'specific' | 'round_robin' = 'specific'
): Promise<{ success: boolean; assignedUserId?: string; error?: string }> {
  try {
    const supabase = createClient()

    let targetUserId = userId

    // Round-robin logic
    if (mode === 'round_robin' && !userId) {
      // Get all users in tenant
      const { data: users } = await supabase
        .from('app_users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'owner') // or 'staff'
        .order('id')

      if (!users || users.length === 0) {
        return { success: false, error: 'No available users for assignment' }
      }

      // Get last assigned user
      const { data: lastDeal } = await supabase
        .from('deals')
        .select('owner_user_id')
        .eq('tenant_id', tenantId)
        .not('owner_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastDeal && lastDeal.owner_user_id) {
        const lastIndex = users.findIndex(u => u.id === lastDeal.owner_user_id)
        const nextIndex = (lastIndex + 1) % users.length
        targetUserId = users[nextIndex].id
      } else {
        targetUserId = users[0].id
      }
    }

    if (!targetUserId) {
      return { success: false, error: 'No user ID provided' }
    }

    // Get current owner
    const { data: deal } = await supabase
      .from('deals')
      .select('owner_user_id')
      .eq('id', dealId)
      .single()

    const fromUserId = deal?.owner_user_id

    // Update owner
    const { error } = await supabase
      .from('deals')
      .update({
        owner_user_id: targetUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Emit event
    await events.dealAssigned({
      dealId,
      tenantId,
      fromUserId,
      toUserId: targetUserId,
    })

    // Log to activities
    await supabase.from('activities').insert({
      tenant_id: tenantId,
      deal_id: dealId,
      type: 'assignment',
      occurred_at: new Date().toISOString(),
      description: `Deal automatically assigned`,
      metadata: { source: 'automation' },
    })

    return { success: true, assignedUserId: targetUserId }
  } catch (error) {
    console.error('[Deal Actions] Error assigning deal:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Update deal fields
 */
export async function updateDealFields(
  dealId: string,
  tenantId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('deals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Emit event
    await events.dealUpdated({
      dealId,
      tenantId,
      changes: updates,
    })

    return { success: true }
  } catch (error) {
    console.error('[Deal Actions] Error updating deal:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Mark deal as won
 */
export async function markDealAsWon(
  dealId: string,
  contactId: string,
  tenantId: string,
  value: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('deals')
      .update({
        status: 'won',
        won_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Emit event
    await events.dealWon({
      dealId,
      contactId,
      tenantId,
      value,
      wonAt: new Date().toISOString(),
    })

    return { success: true }
  } catch (error) {
    console.error('[Deal Actions] Error marking deal as won:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Mark deal as lost
 */
export async function markDealAsLost(
  dealId: string,
  contactId: string,
  tenantId: string,
  lostReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('deals')
      .update({
        status: 'lost',
        lost_reason: lostReason,
        lost_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Emit event
    await events.dealLost({
      dealId,
      contactId,
      tenantId,
      lostReason,
      lostAt: new Date().toISOString(),
    })

    return { success: true }
  } catch (error) {
    console.error('[Deal Actions] Error marking deal as lost:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Create a task related to a deal
 */
export async function createDealTask(
  dealId: string,
  tenantId: string,
  taskData: {
    title: string
    description?: string
    assigneeUserId?: string
    dueAt?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const supabase = createClient()

    // Get deal details with location_id
    const { data: deal } = await supabase
      .from('deals')
      .select('contact_id, owner_user_id, location_id')
      .eq('id', dealId)
      .single()

    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        tenant_id: tenantId,
        title: taskData.title,
        description: taskData.description,
        deal_id: dealId,
        contact_id: deal.contact_id,
        assignee_user_id: taskData.assigneeUserId || deal.owner_user_id,
        location_id: deal.location_id, // Inherit location from deal
        due_at: taskData.dueAt,
        priority: taskData.priority || 'normal',
        status: 'open',
        auto_created: true,
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Emit event
    await events.taskCreated({
      taskId: task.id,
      title: taskData.title,
      tenantId,
      assigneeUserId: taskData.assigneeUserId || deal.owner_user_id,
      contactId: deal.contact_id,
      dealId,
      autoCreated: true,
      priority: taskData.priority || 'normal',
      dueAt: taskData.dueAt,
    })

    return { success: true, taskId: task.id }
  } catch (error) {
    console.error('[Deal Actions] Error creating task:', error)
    return { success: false, error: String(error) }
  }
}

// Phase 2a.5: removed sendDealNotification() — automation was dead code.
// notifications_audit.md §3 row 5 confirmed zero callers in the codebase.
// The insert shape was also broken (event_type/event_data/channel columns
// don't exist on the live notifications table). If a generic deal-alert
// notifier is needed in the future, add a 'deal.alert' event_key to the
// catalog and call emitNotification() directly.


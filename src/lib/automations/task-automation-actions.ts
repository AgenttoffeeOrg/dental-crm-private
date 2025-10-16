/**
 * TASK AUTOMATION ACTIONS
 * 
 * Specialized actions for task automations:
 * - Escalation chains
 * - Dependency management
 * - Auto-reassignment
 * - Smart completion
 * - Reminders
 */

import { createClient } from '@/lib/supabase-client'
import { events } from '@/lib/events-unified'

// =====================================================
// TASK ESCALATION
// =====================================================

export interface TaskEscalationRule {
  id: string
  tenant_id: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  overdue_hours: number
  escalate_to_role: 'manager' | 'owner' | 'director'
  notify_assignee: boolean
  notify_escalation_target: boolean
  auto_increase_priority: boolean
  is_active: boolean
}

/**
 * Check tasks for escalation (run via cron)
 */
export async function checkTaskEscalations(tenantId: string): Promise<{
  checked: number
  escalated: number
}> {
  try {
    const supabase = createClient()

    // Get escalation rules
    const { data: rules } = await supabase
      .from('task_escalation_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (!rules || rules.length === 0) {
      return { checked: 0, escalated: 0 }
    }

    // Get overdue tasks
    const now = new Date().toISOString()
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .lt('due_at', now)

    if (!tasks || tasks.length === 0) {
      return { checked: 0, escalated: 0 }
    }

    let checked = tasks.length
    let escalated = 0

    for (const task of tasks) {
      const dueAt = new Date(task.due_at).getTime()
      const hoursOverdue = Math.floor((Date.now() - dueAt) / (1000 * 60 * 60))

      // Find applicable rule
      const rule = rules.find(r => 
        r.priority === task.priority &&
        hoursOverdue >= r.overdue_hours
      )

      if (!rule) continue

      // Get manager/escalation target
      const { data: manager } = await supabase
        .from('app_users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', rule.escalate_to_role)
        .limit(1)
        .single()

      if (!manager) continue

      // Emit TASK.OVERDUE event
      await events.taskOverdue({
        taskId: task.id,
        tenantId,
        assigneeUserId: task.assignee_user_id,
        dueAt: task.due_at,
        hoursOverdue,
      })

      // Notify assignee
      if (rule.notify_assignee && task.assignee_user_id) {
        await supabase.from('notifications').insert({
          tenant_id: tenantId,
          user_id: task.assignee_user_id,
          event_type: 'task_overdue',
          event_data: {
            taskId: task.id,
            title: task.title,
            hoursOverdue,
          },
          priority: 'urgent',
          channel: 'in_app',
        })
      }

      // Notify escalation target
      if (rule.notify_escalation_target) {
        await supabase.from('notifications').insert({
          tenant_id: tenantId,
          user_id: manager.id,
          event_type: 'task_escalated',
          event_data: {
            taskId: task.id,
            title: task.title,
            hoursOverdue,
            assignee: task.assignee_user_id,
          },
          priority: 'urgent',
          channel: 'in_app',
        })
      }

      // Auto-increase priority
      if (rule.auto_increase_priority && task.priority !== 'urgent') {
        const newPriority = task.priority === 'high' ? 'urgent' : 
                           task.priority === 'normal' ? 'high' : 'normal'

        await supabase
          .from('tasks')
          .update({ priority: newPriority })
          .eq('id', task.id)
      }

      escalated++
      console.log(`[Task Escalation] Escalated task ${task.id} after ${hoursOverdue}h overdue`)
    }

    return { checked, escalated }
  } catch (error) {
    console.error('[Task Escalation] Error checking escalations:', error)
    return { checked: 0, escalated: 0 }
  }
}

// =====================================================
// TASK DEPENDENCIES
// =====================================================

export interface TaskDependency {
  id: string
  tenant_id: string
  parent_task_id: string
  child_task_template: {
    title: string
    description?: string
    task_type: string
    priority: string
    due_offset_hours?: number
  }
  is_active: boolean
}

/**
 * Create dependent tasks when parent is completed
 */
export async function handleTaskCompletion(
  taskId: string,
  tenantId: string
): Promise<{ createdTasks: string[] }> {
  try {
    const supabase = createClient()

    // Emit TASK.COMPLETED event
    await events.taskCompleted({
      taskId,
      tenantId,
      completedAt: new Date().toISOString(),
    })

    // Find dependent task templates
    const { data: dependencies } = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('parent_task_id', taskId)
      .eq('is_active', true)

    if (!dependencies || dependencies.length === 0) {
      return { createdTasks: [] }
    }

    // Get parent task details
    const { data: parentTask } = await supabase
      .from('tasks')
      .select('assignee_user_id, contact_id, deal_id')
      .eq('id', taskId)
      .single()

    if (!parentTask) {
      return { createdTasks: [] }
    }

    const createdTasks: string[] = []

    // Create child tasks
    for (const dep of dependencies) {
      const template = dep.child_task_template as any
      
      const dueAt = template.due_offset_hours
        ? new Date(Date.now() + template.due_offset_hours * 60 * 60 * 1000).toISOString()
        : null

      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          tenant_id: tenantId,
          title: template.title,
          description: template.description,
          task_type: template.task_type,
          priority: template.priority,
          assignee_user_id: parentTask.assignee_user_id,
          contact_id: parentTask.contact_id,
          deal_id: parentTask.deal_id,
          status: 'open',
          auto_created: true,
          due_at: dueAt,
        })
        .select('id')
        .single()

      if (newTask) {
        createdTasks.push(newTask.id)
        
        // Emit TASK.CREATED event
        await events.taskCreated({
          taskId: newTask.id,
          title: template.title,
          tenantId,
          assigneeUserId: parentTask.assignee_user_id,
          contactId: parentTask.contact_id,
          dealId: parentTask.deal_id,
          autoCreated: true,
          priority: template.priority,
          dueAt,
        })

        console.log(`[Task Dependencies] Created child task ${newTask.id} from parent ${taskId}`)
      }
    }

    return { createdTasks }
  } catch (error) {
    console.error('[Task Dependencies] Error handling completion:', error)
    return { createdTasks: [] }
  }
}

// =====================================================
// TASK REMINDERS
// =====================================================

/**
 * Send reminders for tasks due soon (run via cron)
 */
export async function sendTaskReminders(tenantId: string): Promise<{
  checked: number
  reminded: number
}> {
  try {
    const supabase = createClient()

    // Get tasks due in next 24 hours
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .gte('due_at', now.toISOString())
      .lte('due_at', in24Hours)

    if (!tasks || tasks.length === 0) {
      return { checked: 0, reminded: 0 }
    }

    let reminded = 0

    for (const task of tasks) {
      const dueAt = new Date(task.due_at).getTime()
      const hoursUntilDue = Math.floor((dueAt - Date.now()) / (1000 * 60 * 60))

      // Emit TASK.DUE_SOON event
      await events.taskDueSoon({
        taskId: task.id,
        tenantId,
        assigneeUserId: task.assignee_user_id,
        dueAt: task.due_at,
        hoursUntilDue,
      })

      // Send notification
      if (task.assignee_user_id) {
        await supabase.from('notifications').insert({
          tenant_id: tenantId,
          user_id: task.assignee_user_id,
          event_type: 'task_due_soon',
          event_data: {
            taskId: task.id,
            title: task.title,
            dueAt: task.due_at,
            hoursUntilDue,
          },
          priority: hoursUntilDue <= 1 ? 'urgent' : 'high',
          channel: 'in_app',
        })
      }

      reminded++
    }

    console.log(`[Task Reminders] Checked ${tasks.length} tasks, sent ${reminded} reminders`)

    return { checked: tasks.length, reminded }
  } catch (error) {
    console.error('[Task Reminders] Error sending reminders:', error)
    return { checked: 0, reminded: 0 }
  }
}

// =====================================================
// TASK AUTO-REASSIGNMENT
// =====================================================

/**
 * Reassign tasks that haven't been started
 */
export async function checkTaskReassignments(tenantId: string): Promise<{
  checked: number
  reassigned: number
}> {
  try {
    const supabase = createClient()

    // Get tasks created >4 hours ago that are still open and unstarted
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .lt('created_at', fourHoursAgo)
      .is('started_at', null)

    if (!tasks || tasks.length === 0) {
      return { checked: 0, reassigned: 0 }
    }

    let reassigned = 0

    for (const task of tasks) {
      // Get available users (excluding current assignee)
      const { data: users } = await supabase
        .from('app_users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'staff')
        .neq('id', task.assignee_user_id || '')
        .limit(5)

      if (!users || users.length === 0) continue

      // Pick random user (or use round-robin logic)
      const newAssignee = users[Math.floor(Math.random() * users.length)]

      // Reassign
      await supabase
        .from('tasks')
        .update({
          assignee_user_id: newAssignee.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)

      // Emit event
      await events.taskAssigned({
        taskId: task.id,
        tenantId,
        fromUserId: task.assignee_user_id,
        toUserId: newAssignee.id,
      })

      // Notify new assignee
      await supabase.from('notifications').insert({
        tenant_id: tenantId,
        user_id: newAssignee.id,
        event_type: 'task_reassigned',
        event_data: {
          taskId: task.id,
          title: task.title,
          reason: 'Auto-reassigned (not started in 4h)',
        },
        priority: 'high',
        channel: 'in_app',
      })

      reassigned++
    }

    console.log(`[Task Reassignment] Checked ${tasks.length} tasks, reassigned ${reassigned}`)

    return { checked: tasks.length, reassigned }
  } catch (error) {
    console.error('[Task Reassignment] Error:', error)
    return { checked: 0, reassigned: 0 }
  }
}

// =====================================================
// TASK AUTO-PRIORITIZATION
// =====================================================

/**
 * Auto-increase priority for urgent tasks
 */
export async function autoUpdateTaskPriorities(tenantId: string): Promise<{
  checked: number
  updated: number
}> {
  try {
    const supabase = createClient()

    let updated = 0

    // Rule 1: Tasks due in <2 hours → urgent
    const in2Hours = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    
    const { data: dueSoon } = await supabase
      .from('tasks')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .neq('priority', 'urgent')
      .lte('due_at', in2Hours)

    if (dueSoon && dueSoon.length > 0) {
      await supabase
        .from('tasks')
        .update({ priority: 'urgent' })
        .in('id', dueSoon.map(t => t.id))
      
      updated += dueSoon.length
    }

    // Rule 2: Tasks related to high-value deals → high priority
    const { data: highValueTasks } = await supabase
      .from('tasks')
      .select('id, deal_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .eq('priority', 'normal')
      .not('deal_id', 'is', null)

    if (highValueTasks && highValueTasks.length > 0) {
      for (const task of highValueTasks) {
        const { data: deal } = await supabase
          .from('deals')
          .select('value_estimate_cents')
          .eq('id', task.deal_id)
          .single()

        if (deal && deal.value_estimate_cents >= 10000000) { // £100k+
          await supabase
            .from('tasks')
            .update({ priority: 'high' })
            .eq('id', task.id)
          
          updated++
        }
      }
    }

    console.log(`[Task Auto-Priority] Updated ${updated} task priorities`)

    return { checked: highValueTasks?.length || 0, updated }
  } catch (error) {
    console.error('[Task Auto-Priority] Error:', error)
    return { checked: 0, updated: 0 }
  }
}

// =====================================================
// TASK AUTO-COMPLETION
// =====================================================

/**
 * Auto-complete tasks based on smart rules
 */
export async function checkTaskAutoCompletion(
  taskId: string,
  tenantId: string,
  contactId?: string
): Promise<{ completed: boolean; reason?: string }> {
  try {
    const supabase = createClient()

    // Get task details
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (!task || task.status !== 'open') {
      return { completed: false }
    }

    // Rule 1: "Follow up" tasks - auto-complete if contact replied
    if (task.title.toLowerCase().includes('follow up') && contactId) {
      // Check if contact has replied (recent activity)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { count } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contactId)
        .in('type', ['call', 'email', 'meeting'])
        .gte('occurred_at', oneDayAgo)

      if (count && count > 0) {
        // Auto-complete!
        await supabase
          .from('tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', taskId)

        // Emit event
        await events.taskCompleted({
          taskId,
          tenantId,
          completedAt: new Date().toISOString(),
        })

        console.log(`[Task Auto-Complete] Auto-completed task ${taskId}: contact replied`)

        return { completed: true, reason: 'Contact replied within 24h' }
      }
    }

    // Rule 2: "Send email" tasks - auto-complete if email sent
    if (task.title.toLowerCase().includes('send email') && task.deal_id) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { count } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('deal_id', task.deal_id)
        .eq('type', 'email')
        .gte('occurred_at', oneDayAgo)

      if (count && count > 0) {
        await supabase
          .from('tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', taskId)

        await events.taskCompleted({
          taskId,
          tenantId,
          completedAt: new Date().toISOString(),
        })

        console.log(`[Task Auto-Complete] Auto-completed task ${taskId}: email sent`)

        return { completed: true, reason: 'Email sent to contact' }
      }
    }

    return { completed: false }
  } catch (error) {
    console.error('[Task Auto-Complete] Error:', error)
    return { completed: false }
  }
}


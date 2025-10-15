/**
 * Dashboard Priority System
 * 
 * Intelligent algorithm to identify and rank items that need attention.
 * Considers: overdue status, deal value, contact age, last activity.
 */

import { createClient } from './supabase-client'
import { differenceInDays, isPast } from 'date-fns'

export interface PriorityItem {
  id: string
  type: 'task' | 'deal' | 'contact'
  title: string
  subtitle: string
  score: number
  reason: string
  actionLabel: string
  actionUrl: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  dueDate?: Date
  value?: number
  metadata?: Record<string, any>
}

/**
 * Score a task based on urgency factors
 */
function scoreTask(task: any): { score: number; reason: string; urgency: string } {
  let score = 0
  let reason = ''
  
  // Overdue tasks - CRITICAL
  if (task.due_at && isPast(new Date(task.due_at))) {
    const daysOverdue = Math.abs(differenceInDays(new Date(), new Date(task.due_at)))
    score += 100 + (daysOverdue * 10)
    reason = `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`
    return { score, reason, urgency: 'critical' }
  }
  
  // Tasks due today or tomorrow
  if (task.due_at) {
    const daysUntilDue = differenceInDays(new Date(task.due_at), new Date())
    if (daysUntilDue === 0) {
      score += 80
      reason = 'Due today'
      return { score, reason, urgency: 'high' }
    } else if (daysUntilDue === 1) {
      score += 60
      reason = 'Due tomorrow'
      return { score, reason, urgency: 'high' }
    } else if (daysUntilDue <= 3) {
      score += 40
      reason = 'Due this week'
      return { score, reason, urgency: 'medium' }
    }
  }
  
  // High priority tasks
  if (task.priority === 'high') {
    score += 30
    reason = 'High priority'
    return { score, reason, urgency: 'medium' }
  }
  
  return { score, reason: 'Pending task', urgency: 'low' }
}

/**
 * Score a deal based on value and activity
 */
function scoreDeal(deal: any, stageName?: string): { score: number; reason: string; urgency: string } {
  let score = 0
  let reason = ''
  
  const value = deal.value_estimate_cents || 0
  
  // High value deals need attention
  if (value > 500000) { // $5k+
    score += 70
    reason = 'High-value opportunity'
  } else if (value > 200000) { // $2k+
    score += 50
    reason = 'Significant opportunity'
  } else if (value > 100000) { // $1k+
    score += 30
    reason = 'Moderate opportunity'
  }
  
  // Deals without recent activity
  if (deal.last_activity_at) {
    const daysSinceActivity = differenceInDays(new Date(), new Date(deal.last_activity_at))
    if (daysSinceActivity > 7) {
      score += 60
      reason = `No activity for ${daysSinceActivity} days`
    } else if (daysSinceActivity > 3) {
      score += 40
      reason = 'Needs follow-up'
    }
  } else {
    score += 50
    reason = 'Never contacted'
  }
  
  // Critical stages
  if (stageName) {
    const lowerStage = stageName.toLowerCase()
    if (lowerStage.includes('negotiation')) {
      score += 40
      reason = 'In negotiation - needs attention'
    } else if (lowerStage.includes('proposal')) {
      score += 30
      reason = 'Proposal sent - awaiting response'
    }
  }
  
  const urgency = score >= 100 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
  return { score, reason, urgency }
}

/**
 * Score a contact/lead
 */
function scoreContact(contact: any): { score: number; reason: string; urgency: string } {
  let score = 0
  let reason = ''
  
  // New leads without follow-up
  if (contact.status === 'lead') {
    const daysSinceCreated = differenceInDays(new Date(), new Date(contact.created_at))
    if (daysSinceCreated > 7) {
      score += 70
      reason = 'Lead aging without contact'
    } else if (daysSinceCreated > 3) {
      score += 50
      reason = 'New lead needs follow-up'
    } else if (daysSinceCreated <= 1) {
      score += 80
      reason = 'Hot lead - contact immediately'
    }
  }
  
  // Contacts without recent interaction
  if (contact.last_contact_at) {
    const daysSinceContact = differenceInDays(new Date(), new Date(contact.last_contact_at))
    if (daysSinceContact > 30) {
      score += 60
      reason = 'Long-time since contact'
    } else if (daysSinceContact > 14) {
      score += 40
      reason = 'Re-engagement needed'
    }
  }
  
  const urgency = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
  return { score, reason, urgency }
}

/**
 * Get today's top priorities across all categories
 */
export async function getTodaysPriorities(
  tenantId: string,
  limit: number = 7
): Promise<PriorityItem[]> {
  const supabase = createClient()
  
  try {
    // Fetch potential priority items
    const [tasksRes, dealsRes, contactsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'completed')
        .order('due_at', { ascending: true })
        .limit(20),
      
      supabase
        .from('deals')
        .select(`
          *,
          pipeline_stages (
            name,
            position
          )
        `)
        .eq('tenant_id', tenantId)
        .order('last_activity_at', { ascending: true })
        .limit(20),
      
      supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'lead')
        .order('created_at', { ascending: false })
        .limit(20)
    ])

    const priorities: PriorityItem[] = []

    // Process tasks
    if (tasksRes.data) {
      tasksRes.data.forEach(task => {
        const { score, reason, urgency } = scoreTask(task)
        if (score >= 30) {
          priorities.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.due_at 
              ? new Date(task.due_at).toLocaleDateString()
              : 'No due date',
            score,
            reason,
            actionLabel: 'Complete Task',
            actionUrl: `/tasks`,
            urgency: urgency as any,
            dueDate: task.due_at ? new Date(task.due_at) : undefined,
            metadata: { status: task.status, priority: task.priority }
          })
        }
      })
    }

    // Process deals
    if (dealsRes.data) {
      dealsRes.data.forEach(deal => {
        const stageName = (deal.pipeline_stages as any)?.name
        const { score, reason, urgency } = scoreDeal(deal, stageName)
        if (score >= 30) {
          priorities.push({
            id: deal.id,
            type: 'deal',
            title: deal.title || 'Untitled Deal',
            subtitle: `${deal.value_estimate_cents ? `$${(deal.value_estimate_cents / 100).toFixed(0)}` : 'No value'} • ${stageName || 'No stage'}`,
            score,
            reason,
            actionLabel: 'View Deal',
            actionUrl: `/pipeline`,
            urgency: urgency as any,
            value: deal.value_estimate_cents,
            metadata: { stage: stageName, lastActivity: deal.last_activity_at }
          })
        }
      })
    }

    // Process contacts
    if (contactsRes.data) {
      contactsRes.data.forEach(contact => {
        const { score, reason, urgency } = scoreContact(contact)
        if (score >= 30) {
          priorities.push({
            id: contact.id,
            type: 'contact',
            title: `${contact.first_name} ${contact.last_name}`,
            subtitle: contact.email || contact.phone || 'No contact info',
            score,
            reason,
            actionLabel: 'Contact',
            actionUrl: `/contacts`,
            urgency: urgency as any,
            metadata: { status: contact.status, source: contact.source }
          })
        }
      })
    }

    // Sort by score (highest priority first)
    return priorities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

  } catch (error) {
    console.error('[Dashboard] Error fetching priorities:', error)
    return []
  }
}


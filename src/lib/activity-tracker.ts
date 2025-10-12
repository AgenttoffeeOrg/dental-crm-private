/**
 * Activity Tracking System
 * 
 * Logs all user actions for:
 * - Activity feed ("who did what")
 * - Audit trail
 * - Analytics
 */

import { createClient } from '@/lib/supabase-client'

export type ActivityAction =
  | 'deal_created'
  | 'deal_updated'
  | 'deal_assigned'
  | 'deal_stage_changed'
  | 'deal_deleted'
  | 'contact_created'
  | 'contact_updated'
  | 'task_created'
  | 'task_completed'
  | 'pipeline_created'
  | 'pipeline_updated'
  | 'stage_added'
  | 'stage_removed'
  | 'user_invited'
  | 'note_added'

export type EntityType = 'deal' | 'contact' | 'task' | 'pipeline' | 'stage' | 'user' | 'note'

export interface ActivityLogEntry {
  action_type: ActivityAction
  entity_type: EntityType
  entity_id: string
  details?: Record<string, any>
}

/**
 * Log a user activity
 */
export async function logActivity(
  userId: string,
  tenantId: string,
  entry: ActivityLogEntry
): Promise<void> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('user_activity_log')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        action_type: entry.action_type,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        details: entry.details || {},
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error logging activity:', error)
      // Don't throw - activity logging should never break the main flow
    }
  } catch (error) {
    console.error('Error in logActivity:', error)
  }
}

/**
 * Get user-friendly activity message
 */
export function getActivityMessage(
  action: ActivityAction,
  userName: string,
  details?: Record<string, any>
): string {
  switch (action) {
    case 'deal_created':
      return `${userName} created deal "${details?.dealTitle || 'Untitled'}"`
    
    case 'deal_updated':
      return `${userName} updated deal "${details?.dealTitle || 'Untitled'}"`
    
    case 'deal_assigned':
      if (details?.assignedTo) {
        return `${userName} assigned deal to ${details.assignedTo}`
      }
      return `${userName} unassigned the deal`
    
    case 'deal_stage_changed':
      return `${userName} moved deal from "${details?.fromStage || 'Unknown'}" to "${details?.toStage || 'Unknown'}"`
    
    case 'deal_deleted':
      return `${userName} deleted deal "${details?.dealTitle || 'Untitled'}"`
    
    case 'contact_created':
      return `${userName} added contact "${details?.contactName || 'Unknown'}"`
    
    case 'contact_updated':
      return `${userName} updated contact "${details?.contactName || 'Unknown'}"`
    
    case 'task_created':
      return `${userName} created task "${details?.taskTitle || 'Untitled'}"`
    
    case 'task_completed':
      return `${userName} completed task "${details?.taskTitle || 'Untitled'}"`
    
    case 'pipeline_created':
      return `${userName} created pipeline "${details?.pipelineName || 'Untitled'}"`
    
    case 'pipeline_updated':
      return `${userName} updated pipeline "${details?.pipelineName || 'Untitled'}"`
    
    case 'stage_added':
      return `${userName} added stage "${details?.stageName || 'Untitled'}" to pipeline`
    
    case 'stage_removed':
      return `${userName} removed stage "${details?.stageName || 'Untitled'}"`
    
    case 'user_invited':
      return `${userName} invited ${details?.inviteeEmail || 'a user'} as ${details?.role || 'team member'}`
    
    case 'note_added':
      return `${userName} added a note`
    
    default:
      return `${userName} performed an action`
  }
}

/**
 * Get activity icon
 */
export function getActivityIcon(action: ActivityAction): string {
  switch (action) {
    case 'deal_created': return '➕'
    case 'deal_updated': return '✏️'
    case 'deal_assigned': return '👤'
    case 'deal_stage_changed': return '➡️'
    case 'deal_deleted': return '🗑️'
    case 'contact_created': return '👋'
    case 'contact_updated': return '✏️'
    case 'task_created': return '✅'
    case 'task_completed': return '🎉'
    case 'pipeline_created': return '🎯'
    case 'pipeline_updated': return '⚙️'
    case 'stage_added': return '➕'
    case 'stage_removed': return '➖'
    case 'user_invited': return '📧'
    case 'note_added': return '📝'
    default: return '•'
  }
}

/**
 * Get color for activity type
 */
export function getActivityColor(action: ActivityAction): string {
  switch (action) {
    case 'deal_created':
    case 'contact_created':
    case 'task_created':
    case 'pipeline_created':
    case 'stage_added':
    case 'user_invited':
      return 'green'
    
    case 'deal_updated':
    case 'contact_updated':
    case 'pipeline_updated':
    case 'note_added':
      return 'blue'
    
    case 'deal_stage_changed':
    case 'deal_assigned':
    case 'task_completed':
      return 'purple'
    
    case 'deal_deleted':
    case 'stage_removed':
      return 'red'
    
    default:
      return 'gray'
  }
}


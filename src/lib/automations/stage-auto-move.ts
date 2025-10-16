/**
 * STAGE AUTO-MOVE RULES
 * 
 * Automatically move deals between stages based on conditions:
 * - Task completion (e.g., "Send Proposal" task done → move to "Proposal Sent")
 * - Time-based (e.g., 3 days in "Proposal Sent" with no activity → "Follow-up")
 * - Field changes (e.g., contact replied → move to "Engaged")
 * - External signals (e.g., email opened → move to "Interested")
 */

import { createClient } from '@/lib/supabase-client'
import { moveDealToStage } from './deal-automation-actions'

export interface StageAutoMoveRule {
  id: string
  tenant_id: string
  pipeline_id: string
  from_stage_id: string
  to_stage_id: string
  trigger_type: 'task_completed' | 'time_based' | 'field_change' | 'email_opened' | 'manual'
  trigger_config: Record<string, any>
  is_active: boolean
}

/**
 * Check if a deal should auto-move based on task completion
 */
export async function checkTaskCompletionRules(
  taskId: string,
  dealId: string,
  tenantId: string
): Promise<{ moved: boolean; toStageId?: string }> {
  try {
    const supabase = createClient()

    // Get task details
    const { data: task } = await supabase
      .from('tasks')
      .select('title, task_type')
      .eq('id', taskId)
      .single()

    if (!task) {
      return { moved: false }
    }

    // Get deal details
    const { data: deal } = await supabase
      .from('deals')
      .select('pipeline_id, stage_id')
      .eq('id', dealId)
      .single()

    if (!deal) {
      return { moved: false }
    }

    // Find applicable rules
    const { data: rules } = await supabase
      .from('stage_auto_move_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pipeline_id', deal.pipeline_id)
      .eq('from_stage_id', deal.stage_id)
      .eq('trigger_type', 'task_completed')
      .eq('is_active', true)

    if (!rules || rules.length === 0) {
      return { moved: false }
    }

    // Check each rule
    for (const rule of rules) {
      const config = rule.trigger_config as {
        task_title_contains?: string
        task_type?: string
      }

      // Check if task matches rule criteria
      const titleMatch = !config.task_title_contains || 
        task.title.toLowerCase().includes(config.task_title_contains.toLowerCase())
      
      const typeMatch = !config.task_type || task.task_type === config.task_type

      if (titleMatch && typeMatch) {
        // Move deal!
        const result = await moveDealToStage(
          dealId,
          tenantId,
          rule.to_stage_id,
          `Auto-moved due to task completion: ${task.title}`
        )

        if (result.success) {
          console.log(`[Stage Auto-Move] Moved deal ${dealId} from ${deal.stage_id} to ${rule.to_stage_id}`)
          return { moved: true, toStageId: rule.to_stage_id }
        }
      }
    }

    return { moved: false }
  } catch (error) {
    console.error('[Stage Auto-Move] Error checking task completion rules:', error)
    return { moved: false }
  }
}

/**
 * Check time-based auto-move rules (run periodically via cron)
 */
export async function checkTimeBasedRules(tenantId: string): Promise<{
  checked: number
  moved: number
}> {
  try {
    const supabase = createClient()

    // Get all active time-based rules
    const { data: rules } = await supabase
      .from('stage_auto_move_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('trigger_type', 'time_based')
      .eq('is_active', true)

    if (!rules || rules.length === 0) {
      return { checked: 0, moved: 0 }
    }

    let checked = 0
    let moved = 0

    for (const rule of rules) {
      const config = rule.trigger_config as {
        days_in_stage?: number
        requires_inactivity?: boolean
      }

      // Get deals in the from_stage
      const { data: deals } = await supabase
        .from('deals')
        .select('id, pipeline_stage_updated_at, last_activity_at, created_at')
        .eq('tenant_id', tenantId)
        .eq('pipeline_id', rule.pipeline_id)
        .eq('stage_id', rule.from_stage_id)
        .eq('status', 'open')

      if (!deals) continue

      checked += deals.length

      for (const deal of deals) {
        const stageUpdated = deal.pipeline_stage_updated_at
          ? new Date(deal.pipeline_stage_updated_at).getTime()
          : new Date(deal.created_at).getTime()

        const daysInStage = Math.floor((Date.now() - stageUpdated) / (1000 * 60 * 60 * 24))

        // Check if meets time threshold
        if (daysInStage < (config.days_in_stage || 0)) {
          continue
        }

        // If requires inactivity, check last activity
        if (config.requires_inactivity) {
          const lastActivity = deal.last_activity_at
            ? new Date(deal.last_activity_at).getTime()
            : stageUpdated

          const daysSinceActivity = Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24))

          if (daysSinceActivity < (config.days_in_stage || 0)) {
            continue
          }
        }

        // Move deal!
        const result = await moveDealToStage(
          deal.id,
          tenantId,
          rule.to_stage_id,
          `Auto-moved after ${daysInStage} days in stage`
        )

        if (result.success) {
          moved++
        }
      }
    }

    console.log(`[Stage Auto-Move] Checked ${checked} deals, moved ${moved}`)

    return { checked, moved }
  } catch (error) {
    console.error('[Stage Auto-Move] Error checking time-based rules:', error)
    return { checked: 0, moved: 0 }
  }
}

/**
 * Create or update stage auto-move rule
 */
export async function upsertStageAutoMoveRule(
  tenantId: string,
  rule: Partial<StageAutoMoveRule>
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  try {
    const supabase = createClient()

    const ruleData = {
      tenant_id: tenantId,
      pipeline_id: rule.pipeline_id!,
      from_stage_id: rule.from_stage_id!,
      to_stage_id: rule.to_stage_id!,
      trigger_type: rule.trigger_type || 'task_completed',
      trigger_config: rule.trigger_config || {},
      is_active: rule.is_active ?? true,
    }

    let result
    if (rule.id) {
      // Update existing
      result = await supabase
        .from('stage_auto_move_rules')
        .update(ruleData)
        .eq('id', rule.id)
        .select('id')
        .single()
    } else {
      // Create new
      result = await supabase
        .from('stage_auto_move_rules')
        .insert(ruleData)
        .select('id')
        .single()
    }

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, ruleId: result.data.id }
  } catch (error) {
    console.error('[Stage Auto-Move] Error upserting rule:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get stage auto-move rules for a pipeline
 */
export async function getStageAutoMoveRules(
  tenantId: string,
  pipelineId: string
): Promise<StageAutoMoveRule[]> {
  try {
    const supabase = createClient()

    const { data } = await supabase
      .from('stage_auto_move_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pipeline_id', pipelineId)

    return data || []
  } catch (error) {
    console.error('[Stage Auto-Move] Error getting rules:', error)
    return []
  }
}


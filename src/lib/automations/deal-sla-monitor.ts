/**
 * DEAL SLA MONITOR
 * 
 * Monitors deals for SLA breaches (inactive too long, stuck in stage, etc.)
 * and automatically triggers escalation workflows.
 * 
 * Run this as a cron job (e.g., every hour)
 */

import { createClient } from '@/lib/supabase-client'
import { events } from '@/lib/events-unified'

export interface DealSLARule {
  id: string
  tenant_id: string
  pipeline_id?: string
  stage_id?: string
  max_days_inactive: number
  max_days_in_stage: number
  escalation_enabled: boolean
  notify_owner: boolean
  notify_manager: boolean
  auto_create_task: boolean
  is_active: boolean
}

/**
 * Check all deals for SLA breaches
 */
export async function checkDealSLAs(tenantId: string): Promise<{
  checked: number
  breaches: number
  eventsEmitted: any[]
}> {
  try {
    const supabase = createClient()
    
    // Get SLA rules for this tenant
    const { data: rules } = await supabase
      .from('deal_sla_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (!rules || rules.length === 0) {
      console.log(`[SLA Monitor] No active SLA rules for tenant ${tenantId}`)
      return { checked: 0, breaches: 0, eventsEmitted: [] }
    }

    // Get all open deals
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')

    if (!deals || deals.length === 0) {
      return { checked: 0, breaches: 0, eventsEmitted: [] }
    }

    const now = Date.now()
    const eventsEmitted: any[] = []
    let breachesFound = 0

    for (const deal of deals) {
      // Check inactivity SLA
      const lastActivity = deal.last_activity_at
        ? new Date(deal.last_activity_at).getTime()
        : new Date(deal.created_at).getTime()
      
      const daysSinceActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24))

      // Check stage age SLA
      const stageUpdated = deal.pipeline_stage_updated_at
        ? new Date(deal.pipeline_stage_updated_at).getTime()
        : new Date(deal.created_at).getTime()
      
      const daysInStage = Math.floor((now - stageUpdated) / (1000 * 60 * 60 * 24))

      // Find applicable rules
      const applicableRules = rules.filter(rule => {
        // Check if rule applies to this pipeline/stage
        if (rule.pipeline_id && rule.pipeline_id !== deal.pipeline_id) {
          return false
        }
        if (rule.stage_id && rule.stage_id !== deal.stage_id) {
          return false
        }
        return true
      })

      // Check each rule
      for (const rule of applicableRules) {
        // Check inactivity breach
        if (daysSinceActivity >= rule.max_days_inactive) {
          breachesFound++
          
          // Emit DEAL.AGING event
          await events.dealAging({
            dealId: deal.id,
            contactId: deal.contact_id,
            tenantId,
            daysSinceLastActivity: daysSinceActivity,
            lastActivityAt: new Date(lastActivity).toISOString(),
          })

          eventsEmitted.push({
            type: 'DEAL.AGING',
            dealId: deal.id,
            days: daysSinceActivity,
            rule: rule.id,
          })

          console.log(`[SLA Monitor] Deal ${deal.id} inactive for ${daysSinceActivity} days (rule: ${rule.id})`)
        }

        // Check stage age breach
        if (daysInStage >= rule.max_days_in_stage) {
          breachesFound++
          
          // Emit PIPELINE.STAGE_SLA_BREACHED event
          await events.pipelineStageSLABreached({
            pipelineId: deal.pipeline_id,
            stageId: deal.stage_id,
            dealId: deal.id,
            tenantId,
            maxDays: rule.max_days_in_stage,
            actualDays: daysInStage,
          })

          eventsEmitted.push({
            type: 'PIPELINE.STAGE_SLA_BREACHED',
            dealId: deal.id,
            days: daysInStage,
            rule: rule.id,
          })

          console.log(`[SLA Monitor] Deal ${deal.id} in stage for ${daysInStage} days (rule: ${rule.id})`)
        }
      }
    }

    console.log(`[SLA Monitor] Checked ${deals.length} deals, found ${breachesFound} breaches, emitted ${eventsEmitted.length} events`)

    return {
      checked: deals.length,
      breaches: breachesFound,
      eventsEmitted,
    }
  } catch (error) {
    console.error('[SLA Monitor] Error checking SLAs:', error)
    return { checked: 0, breaches: 0, eventsEmitted: [] }
  }
}

/**
 * Create or update SLA rule
 */
export async function upsertDealSLARule(
  tenantId: string,
  rule: Partial<DealSLARule>
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  try {
    const supabase = createClient()

    const ruleData = {
      tenant_id: tenantId,
      pipeline_id: rule.pipeline_id || null,
      stage_id: rule.stage_id || null,
      max_days_inactive: rule.max_days_inactive || 7,
      max_days_in_stage: rule.max_days_in_stage || 14,
      escalation_enabled: rule.escalation_enabled ?? true,
      notify_owner: rule.notify_owner ?? true,
      notify_manager: rule.notify_manager ?? true,
      auto_create_task: rule.auto_create_task ?? true,
      is_active: rule.is_active ?? true,
    }

    let result
    if (rule.id) {
      // Update existing
      result = await supabase
        .from('deal_sla_rules')
        .update(ruleData)
        .eq('id', rule.id)
        .select('id')
        .single()
    } else {
      // Create new
      result = await supabase
        .from('deal_sla_rules')
        .insert(ruleData)
        .select('id')
        .single()
    }

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, ruleId: result.data.id }
  } catch (error) {
    console.error('[SLA Monitor] Error upserting rule:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get SLA rules for a tenant
 */
export async function getDealSLARules(
  tenantId: string,
  pipelineId?: string
): Promise<DealSLARule[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('deal_sla_rules')
      .select('*')
      .eq('tenant_id', tenantId)

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId)
    }

    const { data } = await query

    return data || []
  } catch (error) {
    console.error('[SLA Monitor] Error getting rules:', error)
    return []
  }
}


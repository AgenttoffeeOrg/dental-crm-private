/**
 * PIPELINE AUTOMATION ACTIONS
 * 
 * Specialized actions for pipeline-level automations.
 * These handle pipeline capacity, velocity, bottlenecks, and health monitoring.
 */

import { createClient } from '@/lib/supabase-client'
import { events } from '@/lib/events-unified'

// =====================================================
// PIPELINE MONITORING
// =====================================================

/**
 * Check pipeline capacity and emit events if threshold reached
 */
export async function checkPipelineCapacity(
  tenantId: string,
  pipelineId: string,
  maxCapacity: number = 100,
  thresholdPercent: number = 80
): Promise<{ capacity: number; isAtCapacity: boolean }> {
  try {
    const supabase = createClient()

    // Count active deals in pipeline
    const { count } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('pipeline_id', pipelineId)
      .eq('status', 'open')

    const currentCapacity = count || 0
    const percentage = (currentCapacity / maxCapacity) * 100

    // Check if at capacity
    if (percentage >= thresholdPercent) {
      // Emit capacity reached event
      await events.pipelineCapacityReached({
        pipelineId,
        tenantId,
        currentCapacity,
        maxCapacity,
        percentage,
      })

      console.log(`[Pipeline Monitor] Pipeline ${pipelineId} at ${percentage.toFixed(1)}% capacity`)
      
      return { capacity: currentCapacity, isAtCapacity: true }
    }

    return { capacity: currentCapacity, isAtCapacity: false }
  } catch (error) {
    console.error('[Pipeline Monitor] Error checking capacity:', error)
    return { capacity: 0, isAtCapacity: false }
  }
}

/**
 * Check pipeline velocity (deals per week)
 */
export async function checkPipelineVelocity(
  tenantId: string,
  pipelineId: string,
  targetDealsPerWeek: number = 10
): Promise<{ dealsPerWeek: number; isSlow: boolean }> {
  try {
    const supabase = createClient()

    // Get deals won in last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { count } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('pipeline_id', pipelineId)
      .eq('status', 'won')
      .gte('won_at', oneWeekAgo)

    const dealsPerWeek = count || 0

    // Check if below target
    if (dealsPerWeek < targetDealsPerWeek) {
      // Emit velocity slow event
      await events.pipelineVelocitySlow({
        pipelineId,
        tenantId,
        dealsPerWeek,
        targetDealsPerWeek,
      })

      console.log(`[Pipeline Monitor] Pipeline ${pipelineId} velocity: ${dealsPerWeek}/${targetDealsPerWeek} deals/week`)
      
      return { dealsPerWeek, isSlow: true }
    }

    return { dealsPerWeek, isSlow: false }
  } catch (error) {
    console.error('[Pipeline Monitor] Error checking velocity:', error)
    return { dealsPerWeek: 0, isSlow: false }
  }
}

/**
 * Detect bottlenecks (stages with too many stuck deals)
 */
export async function detectPipelineBottlenecks(
  tenantId: string,
  pipelineId: string,
  maxDealsPerStage: number = 10,
  maxDaysInStage: number = 7
): Promise<Array<{
  stageId: string
  stageName: string
  stuckCount: number
  avgDays: number
}>> {
  try {
    const supabase = createClient()

    // Get all stages in pipeline
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name, stage_order')
      .eq('pipeline_id', pipelineId)
      .order('stage_order')

    if (!stages) return []

    const bottlenecks: Array<{
      stageId: string
      stageName: string
      stuckCount: number
      avgDays: number
    }> = []

    for (const stage of stages) {
      // Get deals in this stage
      const { data: deals } = await supabase
        .from('deals')
        .select('id, pipeline_stage_updated_at, created_at')
        .eq('tenant_id', tenantId)
        .eq('pipeline_id', pipelineId)
        .eq('stage_id', stage.id)
        .eq('status', 'open')

      if (!deals || deals.length === 0) continue

      // Calculate how long each deal has been in this stage
      const now = Date.now()
      const daysInStage = deals.map(deal => {
        const stageUpdated = deal.pipeline_stage_updated_at
          ? new Date(deal.pipeline_stage_updated_at).getTime()
          : new Date(deal.created_at).getTime()
        return Math.floor((now - stageUpdated) / (1000 * 60 * 60 * 24))
      })

      const avgDays = daysInStage.reduce((a, b) => a + b, 0) / daysInStage.length
      const stuckCount = daysInStage.filter(days => days >= maxDaysInStage).length

      // Check if bottleneck
      if (deals.length >= maxDealsPerStage || stuckCount >= 5) {
        bottlenecks.push({
          stageId: stage.id,
          stageName: stage.name,
          stuckCount,
          avgDays: Math.round(avgDays),
        })

        // Emit bottleneck detected event
        await events.pipelineBottleneckDetected({
          pipelineId,
          stageId: stage.id,
          tenantId,
          stuckDealsCount: stuckCount,
          avgDaysInStage: Math.round(avgDays),
        })

        console.log(`[Pipeline Monitor] Bottleneck detected: ${stage.name} (${stuckCount} stuck deals, avg ${avgDays.toFixed(1)} days)`)
      }
    }

    return bottlenecks
  } catch (error) {
    console.error('[Pipeline Monitor] Error detecting bottlenecks:', error)
    return []
  }
}

/**
 * Pause pipeline intake (stop new deal assignments)
 */
export async function pausePipelineIntake(
  pipelineId: string,
  tenantId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Update pipeline metadata
    const { error } = await supabase
      .from('pipelines')
      .update({
        is_accepting_new_deals: false,
        intake_paused_reason: reason,
        intake_paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pipelineId)

    if (error) {
      return { success: false, error: error.message }
    }

    console.log(`[Pipeline Actions] Paused intake for pipeline ${pipelineId}: ${reason}`)

    return { success: true }
  } catch (error) {
    console.error('[Pipeline Actions] Error pausing intake:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Resume pipeline intake
 */
export async function resumePipelineIntake(
  pipelineId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('pipelines')
      .update({
        is_accepting_new_deals: true,
        intake_paused_reason: null,
        intake_paused_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pipelineId)

    if (error) {
      return { success: false, error: error.message }
    }

    console.log(`[Pipeline Actions] Resumed intake for pipeline ${pipelineId}`)

    return { success: true }
  } catch (error) {
    console.error('[Pipeline Actions] Error resuming intake:', error)
    return { success: false, error: String(error) }
  }
}

// Phase 2a.5: removed notifyPipelineOwner() — automation was dead code.
// notifications_audit.md §3 row 6 confirmed zero callers in the codebase.
// The insert shape was also broken (event_type/event_data/channel columns
// don't exist on the live notifications table). If a generic pipeline-alert
// notifier is needed in the future, add a 'pipeline.alert' event_key to the
// catalog and call emitNotification() directly.

/**
 * Run comprehensive pipeline health check
 */
export async function runPipelineHealthCheck(
  tenantId: string,
  pipelineId: string
): Promise<{
  capacity: { current: number; max: number; percentage: number }
  velocity: { dealsPerWeek: number; target: number; isSlow: boolean }
  bottlenecks: Array<{ stageName: string; stuckCount: number; avgDays: number }>
  health: 'healthy' | 'warning' | 'critical'
}> {
  try {
    // Run all checks in parallel
    const [capacityResult, velocityResult, bottlenecks] = await Promise.all([
      checkPipelineCapacity(tenantId, pipelineId),
      checkPipelineVelocity(tenantId, pipelineId),
      detectPipelineBottlenecks(tenantId, pipelineId),
    ])

    // Determine overall health
    let health: 'healthy' | 'warning' | 'critical' = 'healthy'

    if (capacityResult.isAtCapacity || velocityResult.isSlow || bottlenecks.length >= 2) {
      health = 'warning'
    }

    if (capacityResult.isAtCapacity && velocityResult.isSlow && bottlenecks.length >= 3) {
      health = 'critical'
    }

    return {
      capacity: {
        current: capacityResult.capacity,
        max: 100, // TODO: Get from pipeline settings
        percentage: (capacityResult.capacity / 100) * 100,
      },
      velocity: {
        dealsPerWeek: velocityResult.dealsPerWeek,
        target: 10, // TODO: Get from pipeline settings
        isSlow: velocityResult.isSlow,
      },
      bottlenecks,
      health,
    }
  } catch (error) {
    console.error('[Pipeline Health] Error running health check:', error)
    throw error
  }
}


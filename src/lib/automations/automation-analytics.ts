/**
 * AUTOMATION ANALYTICS
 * 
 * Tracks and analyzes automation performance:
 * - Success/failure rates
 * - Execution times
 * - Drop-off analysis
 * - ROI metrics
 */

import { createClient } from '@/lib/supabase-client'

export interface AutomationMetrics {
  automationId: string
  automationName: string
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  avgExecutionTimeMs: number
  successRate: number
  lastRun: string | null
}

/**
 * Get automation performance metrics
 */
export async function getAutomationMetrics(
  tenantId: string,
  automationId?: string
): Promise<AutomationMetrics[]> {
  try {
    const supabase = createClient()

    // Get all journeys or specific one
    let query = supabase
      .from('marketing_journeys')
      .select('*')
      .eq('tenant_id', tenantId)

    if (automationId) {
      query = query.eq('id', automationId)
    }

    const { data: journeys } = await query

    if (!journeys) return []

    const metrics: AutomationMetrics[] = []

    for (const journey of journeys) {
      // Get runs for this journey
      const { data: runs } = await supabase
        .from('marketing_journey_runs')
        .select('state, entered_at, completed_at, exited_at')
        .eq('journey_id', journey.id)

      const totalRuns = runs?.length || 0
      const successfulRuns = runs?.filter(r => r.state === 'completed').length || 0
      const failedRuns = runs?.filter(r => r.state === 'failed').length || 0

      // Calculate avg execution time
      const completedRuns = runs?.filter(r => r.completed_at) || []
      let avgExecutionTimeMs = 0

      if (completedRuns.length > 0) {
        const totalTime = completedRuns.reduce((sum, run) => {
          const start = new Date(run.entered_at).getTime()
          const end = new Date(run.completed_at!).getTime()
          return sum + (end - start)
        }, 0)
        avgExecutionTimeMs = totalTime / completedRuns.length
      }

      // Get last run
      const lastRun = runs && runs.length > 0
        ? runs.sort((a, b) => 
            new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime()
          )[0].entered_at
        : null

      metrics.push({
        automationId: journey.id,
        automationName: journey.name,
        totalRuns,
        successfulRuns,
        failedRuns,
        avgExecutionTimeMs,
        successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
        lastRun,
      })
    }

    return metrics
  } catch (error) {
    console.error('[Automation Analytics] Error getting metrics:', error)
    return []
  }
}

/**
 * Get automation drop-off analysis
 */
export async function getAutomationDropOff(
  automationId: string,
  tenantId: string
): Promise<Array<{
  nodeId: string
  nodeName: string
  totalProcessed: number
  totalSuccess: number
  totalFailed: number
  dropOffRate: number
}>> {
  try {
    const supabase = createClient()

    // Get journey nodes
    const { data: nodes } = await supabase
      .from('marketing_journey_nodes')
      .select('*')
      .eq('journey_id', automationId)

    if (!nodes) return []

    // Get execution logs
    const { data: logs } = await supabase
      .from('marketing_journey_logs')
      .select('*')
      .eq('journey_id', automationId)

    if (!logs) return []

    // Analyze each node
    const analysis = nodes.map(node => {
      const nodeLogs = logs.filter(l => l.node_id === node.id)
      const totalProcessed = nodeLogs.length
      const totalSuccess = nodeLogs.filter(l => l.status === 'success').length
      const totalFailed = nodeLogs.filter(l => l.status === 'failed').length
      const dropOffRate = totalProcessed > 0 ? (totalFailed / totalProcessed) * 100 : 0

      return {
        nodeId: node.id,
        nodeName: node.node_key || `Node ${node.id}`,
        totalProcessed,
        totalSuccess,
        totalFailed,
        dropOffRate,
      }
    })

    return analysis.sort((a, b) => b.dropOffRate - a.dropOffRate)
  } catch (error) {
    console.error('[Automation Analytics] Error analyzing drop-off:', error)
    return []
  }
}

/**
 * Get global automation health dashboard data
 */
export async function getAutomationHealthDashboard(
  tenantId: string
): Promise<{
  totalAutomations: number
  activeAutomations: number
  totalRuns24h: number
  successRate: number
  topPerformers: Array<{ name: string; successRate: number }>
  recentFailures: Array<{ automationName: string; error: string; timestamp: string }>
}> {
  try {
    const supabase = createClient()

    // Count automations
    const { count: totalAutomations } = await supabase
      .from('marketing_journeys')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    const { count: activeAutomations } = await supabase
      .from('marketing_journeys')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    // Get runs in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { count: totalRuns24h } = await supabase
      .from('marketing_journey_runs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('entered_at', oneDayAgo)

    const { count: successfulRuns24h } = await supabase
      .from('marketing_journey_runs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('state', 'completed')
      .gte('entered_at', oneDayAgo)

    const successRate = totalRuns24h && totalRuns24h > 0
      ? ((successfulRuns24h || 0) / totalRuns24h) * 100
      : 0

    // Get metrics for top performers
    const metrics = await getAutomationMetrics(tenantId)
    const topPerformers = metrics
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5)
      .map(m => ({
        name: m.automationName,
        successRate: m.successRate,
      }))

    // Get recent failures
    const { data: recentFailureLogs } = await supabase
      .from('marketing_journey_logs')
      .select('*, marketing_journeys(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(10)

    const recentFailures = recentFailureLogs?.map(log => ({
      automationName: (log.marketing_journeys as any)?.name || 'Unknown',
      error: log.error_message || 'Unknown error',
      timestamp: log.created_at,
    })) || []

    return {
      totalAutomations: totalAutomations || 0,
      activeAutomations: activeAutomations || 0,
      totalRuns24h: totalRuns24h || 0,
      successRate,
      topPerformers,
      recentFailures,
    }
  } catch (error) {
    console.error('[Automation Analytics] Error getting dashboard data:', error)
    throw error
  }
}


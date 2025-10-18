/**
 * ANALYTICS AUTOMATION MONITORS
 * 
 * Monitors analytics KPIs and emits events for automation triggers:
 * - KPI threshold breaches
 * - Goal achievements
 * - Anomaly detection
 */

import { createClient } from '@/lib/supabase-client'
import { events } from '@/lib/events-unified'

// =====================================================
// ANALYTICS MONITORING
// =====================================================

/**
 * Check for KPI threshold breaches
 */
export async function checkKPIBreaches(tenantId: string): Promise<{
  checked: number
  breaches: number
}> {
  try {
    const supabase = createClient()

    // Get KPI thresholds
    const { data: thresholds } = await supabase
      .from('analytics_threshold_alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (!thresholds || thresholds.length === 0) {
      return { checked: 0, breaches: 0 }
    }

    let breaches = 0

    for (const threshold of thresholds) {
      // Get current KPI value (this is simplified - real implementation would query actual metrics)
      const currentValue = await getCurrentKPIValue(tenantId, threshold.metric_name)

      if (currentValue === null) continue

      // Check for breach
      let breached = false
      let breachType: 'above' | 'below' = 'below'

      if (threshold.threshold_type === 'min' && currentValue < threshold.threshold_value) {
        breached = true
        breachType = 'below'
      } else if (threshold.threshold_type === 'max' && currentValue > threshold.threshold_value) {
        breached = true
        breachType = 'above'
      }

      if (breached) {
        // Emit KPI breach event
        await events.analyticsKPIBreach({
          kpiName: threshold.metric_name,
          tenantId,
          currentValue,
          thresholdValue: threshold.threshold_value,
          breachType,
        })

        breaches++

        console.log(`[Analytics Monitor] KPI breach: ${threshold.metric_name} (${currentValue} vs threshold ${threshold.threshold_value})`)
      }
    }

    return { checked: thresholds.length, breaches }
  } catch (error) {
    console.error('[Analytics Monitor] Error checking KPI breaches:', error)
    return { checked: 0, breaches: 0 }
  }
}

/**
 * Get current KPI value (simplified - real implementation more complex)
 */
async function getCurrentKPIValue(tenantId: string, kpiName: string): Promise<number | null> {
  const supabase = createClient()

  try {
    // Example KPI calculations
    switch (kpiName) {
      case 'conversion_rate': {
        const { count: totalDeals } = await supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)

        const { count: wonDeals } = await supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'won')

        if (!totalDeals || totalDeals === 0) return 0
        return ((wonDeals || 0) / totalDeals) * 100
      }

      case 'avg_deal_value': {
        const { data: deals } = await supabase
          .from('deals')
          .select('value_estimate_cents')
          .eq('tenant_id', tenantId)
          .eq('status', 'won')

        if (!deals || deals.length === 0) return 0
        
        const total = deals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
        return total / deals.length / 100 // In pounds
      }

      default:
        return null
    }
  } catch (error) {
      console.error('[Analytics Monitor] Error calculating', kpiName, ':', error)
    return null
  }
}

/**
 * Check for goal achievements
 */
export async function checkGoalAchievements(tenantId: string): Promise<{
  checked: number
  achieved: number
}> {
  try {
    const supabase = createClient()

    // Get active goals (if you have a goals table)
    // For now, using hardcoded goals as example
    const monthlyGoals = [
      { id: 'monthly_revenue', name: 'Monthly Revenue Goal', target: 50000 },
      { id: 'monthly_deals', name: 'Monthly Deals Goal', target: 20 },
    ]

    let achieved = 0

    for (const goal of monthlyGoals) {
      let currentValue = 0

      // Calculate current value
      if (goal.id === 'monthly_revenue') {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        
        const { data: deals } = await supabase
          .from('deals')
          .select('value_estimate_cents')
          .eq('tenant_id', tenantId)
          .eq('status', 'won')
          .gte('won_at', monthStart)

        currentValue = deals
          ? deals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) / 100
          : 0
      }

      // Check if achieved
      if (currentValue >= goal.target) {
        await events.analyticsGoalAchieved({
          goalId: goal.id,
          goalName: goal.name,
          tenantId,
          achievedValue: currentValue,
          targetValue: goal.target,
        })

        achieved++
      }
    }

    return { checked: monthlyGoals.length, achieved }
  } catch (error) {
    console.error('[Analytics Monitor] Error checking goals:', error)
    return { checked: 0, achieved: 0 }
  }
}


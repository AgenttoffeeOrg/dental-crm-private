/**
 * Dashboard Analytics Utilities
 * 
 * Provides real data calculations for dashboard metrics.
 * All functions are tested and handle edge cases properly.
 */

import { createClient } from './supabase-client'
import { startOfMonth, subMonths, format, differenceInDays } from 'date-fns'

/**
 * Calculate real revenue data for the last N months
 */
export async function getRevenueChartData(tenantId: string, months: number = 6) {
  const supabase = createClient()
  
  try {
    // Get all deals with their created dates
    const { data: deals, error } = await supabase
      .from('deals')
      .select('value_estimate_cents, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    if (!deals || deals.length === 0) {
      // Return empty data structure for empty state
      return Array.from({ length: months }, (_, i) => {
        const date = subMonths(new Date(), months - 1 - i)
        return {
          month: format(date, 'MMM'),
          revenue: 0,
          deals: 0,
          fullDate: format(date, 'yyyy-MM')
        }
      })
    }

    // Group deals by month
    const monthlyData = new Map<string, { revenue: number; deals: number }>()
    
    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const key = format(date, 'yyyy-MM')
      monthlyData.set(key, { revenue: 0, deals: 0 })
    }

    // Aggregate deals by month
    deals.forEach((deal) => {
      const monthKey = format(new Date(deal.created_at), 'yyyy-MM')
      if (monthlyData.has(monthKey)) {
        const current = monthlyData.get(monthKey)!
        current.revenue += deal.value_estimate_cents || 0
        current.deals += 1
      }
    })

    // Convert to array format for chart
    return Array.from(monthlyData.entries()).map(([key, data]) => ({
      month: format(new Date(key + '-01'), 'MMM'),
      revenue: data.revenue,
      deals: data.deals,
      fullDate: key
    }))
  } catch (error) {
    console.error('[Dashboard Analytics] Error fetching revenue data:', error)
    throw error
  }
}

/**
 * Calculate real deals funnel by pipeline stage
 */
export async function getDealsFunnelData(tenantId: string) {
  const supabase = createClient()
  
  try {
    // Get all deals with their stages
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select(`
        id,
        stage_id,
        value_estimate_cents
      `)
      .eq('tenant_id', tenantId)
    
    if (dealsError) throw dealsError

    // Get all pipeline stages
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true })
    
    if (stagesError) throw stagesError

    // If no stages exist, return empty funnel
    if (!stages || stages.length === 0) {
      return []
    }

    // Count deals per stage
    const stageCounts = new Map<string, number>()
    stages.forEach(stage => stageCounts.set(stage.id, 0))
    
    if (deals) {
      deals.forEach(deal => {
        const count = stageCounts.get(deal.stage_id) || 0
        stageCounts.set(deal.stage_id, count + 1)
      })
    }

    // Define stage colors (matching original design)
    const colorMap: Record<string, string> = {
      0: '#3b82f6', // Blue
      1: '#8b5cf6', // Purple
      2: '#06b6d4', // Cyan
      3: '#10b981', // Green
      4: '#f59e0b', // Orange
      5: '#ef4444'  // Red
    }

    // Map to chart data format
    return stages.map((stage, index) => ({
      stage: stage.name,
      value: stageCounts.get(stage.id) || 0,
      color: colorMap[index % 6] || '#6b7280',
      position: stage.position
    }))
  } catch (error) {
    console.error('[Dashboard Analytics] Error fetching funnel data:', error)
    throw error
  }
}

/**
 * Calculate real conversion rate
 */
export async function getConversionRate(tenantId: string): Promise<number> {
  const supabase = createClient()
  
  try {
    // Get total deals
    const { count: totalDeals, error: totalError } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    
    if (totalError) throw totalError
    if (!totalDeals || totalDeals === 0) return 0

    // Get won stages (stages with "won" or "closed" in name)
    const { data: wonStages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('tenant_id', tenantId)
      .or('name.ilike.%won%,name.ilike.%closed%')
    
    if (stagesError) throw stagesError
    if (!wonStages || wonStages.length === 0) return 0

    const wonStageIds = wonStages.map(s => s.id)

    // Get won deals count
    const { count: wonDeals, error: wonError } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('stage_id', wonStageIds)
    
    if (wonError) throw wonError
    if (!wonDeals) return 0

    // Calculate percentage
    const rate = (wonDeals / totalDeals) * 100
    return Math.round(rate * 10) / 10 // Round to 1 decimal
  } catch (error) {
    console.error('[Dashboard Analytics] Error calculating conversion rate:', error)
    throw error
  }
}

/**
 * Calculate month-over-month growth rate
 */
export async function getMonthlyGrowth(tenantId: string): Promise<number> {
  const supabase = createClient()
  
  try {
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const twoMonthsAgoStart = startOfMonth(subMonths(now, 2))

    // Get this month's revenue
    const { data: thisMonth, error: thisError } = await supabase
      .from('deals')
      .select('value_estimate_cents')
      .eq('tenant_id', tenantId)
      .gte('created_at', thisMonthStart.toISOString())
    
    if (thisError) throw thisError

    // Get last month's revenue
    const { data: lastMonth, error: lastError } = await supabase
      .from('deals')
      .select('value_estimate_cents')
      .eq('tenant_id', tenantId)
      .gte('created_at', lastMonthStart.toISOString())
      .lt('created_at', thisMonthStart.toISOString())
    
    if (lastError) throw lastError

    // Calculate totals
    const thisMonthRevenue = (thisMonth || []).reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
    const lastMonthRevenue = (lastMonth || []).reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)

    // Handle edge cases
    if (lastMonthRevenue === 0) {
      return thisMonthRevenue > 0 ? 100 : 0
    }

    // Calculate growth rate
    const growth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    return Math.round(growth * 10) / 10 // Round to 1 decimal
  } catch (error) {
    console.error('[Dashboard Analytics] Error calculating monthly growth:', error)
    throw error
  }
}

/**
 * Get average deal value (properly calculated)
 */
export async function getAverageDealValue(tenantId: string): Promise<number> {
  const supabase = createClient()
  
  try {
    const { data: deals, error } = await supabase
      .from('deals')
      .select('value_estimate_cents')
      .eq('tenant_id', tenantId)
    
    if (error) throw error
    if (!deals || deals.length === 0) return 0

    const total = deals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
    return Math.round(total / deals.length)
  } catch (error) {
    console.error('[Dashboard Analytics] Error calculating average deal value:', error)
    throw error
  }
}

/**
 * Get dashboard metrics with proper error handling
 */
export interface DashboardMetrics {
  conversionRate: number
  monthlyGrowth: number
  averageDealValue: number
}

export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
  try {
    const [conversionRate, monthlyGrowth, averageDealValue] = await Promise.all([
      getConversionRate(tenantId),
      getMonthlyGrowth(tenantId),
      getAverageDealValue(tenantId)
    ])

    return {
      conversionRate,
      monthlyGrowth,
      averageDealValue
    }
  } catch (error) {
    console.error('[Dashboard Analytics] Error fetching dashboard metrics:', error)
    // Return safe defaults on error
    return {
      conversionRate: 0,
      monthlyGrowth: 0,
      averageDealValue: 0
    }
  }
}


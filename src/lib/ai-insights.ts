/**
 * AI Insights Generation System
 * 
 * Analyzes dashboard data to generate intelligent insights and recommendations.
 * Uses pattern recognition and statistical analysis (no external AI API needed for basic insights).
 */

import { createClient } from './supabase-client'
import { differenceInDays, startOfMonth, subMonths, isPast } from 'date-fns'

export interface Insight {
  id: string
  type: 'success' | 'warning' | 'info' | 'opportunity'
  title: string
  description: string
  action?: {
    label: string
    url: string
  }
  impact: 'high' | 'medium' | 'low'
  category: 'revenue' | 'conversion' | 'activity' | 'leads'
  confidence: number // 0-100
  data?: Record<string, any>
}

/**
 * Analyze revenue patterns
 */
async function analyzeRevenue(tenantId: string): Promise<Insight[]> {
  const supabase = createClient()
  const insights: Insight[] = []
  
  try {
    const thisMonthStart = startOfMonth(new Date())
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
    const twoMonthsAgoStart = startOfMonth(subMonths(new Date(), 2))

    const [thisMonth, lastMonth, twoMonthsAgo] = await Promise.all([
      supabase.from('deals').select('value_estimate_cents').eq('tenant_id', tenantId)
        .gte('created_at', thisMonthStart.toISOString()),
      supabase.from('deals').select('value_estimate_cents').eq('tenant_id', tenantId)
        .gte('created_at', lastMonthStart.toISOString())
        .lt('created_at', thisMonthStart.toISOString()),
      supabase.from('deals').select('value_estimate_cents').eq('tenant_id', tenantId)
        .gte('created_at', twoMonthsAgoStart.toISOString())
        .lt('created_at', lastMonthStart.toISOString())
    ])

    const thisMonthRevenue = (thisMonth.data || []).reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
    const lastMonthRevenue = (lastMonth.data || []).reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
    const twoMonthsAgoRevenue = (twoMonthsAgo.data || []).reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)

    // Detect revenue trends
    if (lastMonthRevenue > 0) {
      const growth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      
      if (growth > 20) {
        insights.push({
          id: 'revenue-surge',
          type: 'success',
          title: '🚀 Revenue Surge Detected',
          description: `Revenue is up ${growth.toFixed(1)}% this month! You're on track for a record month.`,
          impact: 'high',
          category: 'revenue',
          confidence: 95,
          data: { growth, thisMonth: thisMonthRevenue, lastMonth: lastMonthRevenue }
        })
      } else if (growth < -20) {
        insights.push({
          id: 'revenue-decline',
          type: 'warning',
          title: '⚠️ Revenue Decline Alert',
          description: `Revenue is down ${Math.abs(growth).toFixed(1)}% this month. Review pipeline and follow up with stalled deals.`,
          action: {
            label: 'View Pipeline',
            url: '/pipeline'
          },
          impact: 'high',
          category: 'revenue',
          confidence: 95,
          data: { growth, thisMonth: thisMonthRevenue, lastMonth: lastMonthRevenue }
        })
      }
    }

    // Detect consistent growth
    if (lastMonthRevenue > twoMonthsAgoRevenue && thisMonthRevenue > lastMonthRevenue) {
      insights.push({
        id: 'consistent-growth',
        type: 'success',
        title: '📈 Consistent Growth Trend',
        description: 'Revenue has grown for 3 consecutive months. Great momentum!',
        impact: 'medium',
        category: 'revenue',
        confidence: 90
      })
    }

  } catch (error) {
    console.error('[Insights] Error analyzing revenue:', error)
  }

  return insights
}

/**
 * Analyze conversion patterns
 */
async function analyzeConversion(tenantId: string): Promise<Insight[]> {
  const supabase = createClient()
  const insights: Insight[] = []
  
  try {
    // Get won and lost stages
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('tenant_id', tenantId)

    if (!stages) return insights

    const wonStageIds = stages.filter(s => s.name.toLowerCase().includes('won')).map(s => s.id)
    const lostStageIds = stages.filter(s => s.name.toLowerCase().includes('lost')).map(s => s.id)

    const [totalDeals, wonDeals, lostDeals] = await Promise.all([
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('stage_id', wonStageIds),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('stage_id', lostStageIds)
    ])

    const total = totalDeals.count || 0
    const won = wonDeals.count || 0
    const lost = lostDeals.count || 0

    if (total > 10) {
      const conversionRate = (won / total) * 100
      
      if (conversionRate > 30) {
        insights.push({
          id: 'high-conversion',
          type: 'success',
          title: '🎯 Excellent Conversion Rate',
          description: `Your ${conversionRate.toFixed(1)}% conversion rate is above industry average (20-25%). Keep it up!`,
          impact: 'medium',
          category: 'conversion',
          confidence: 85
        })
      } else if (conversionRate < 15) {
        insights.push({
          id: 'low-conversion',
          type: 'warning',
          title: '📉 Conversion Needs Attention',
          description: `${conversionRate.toFixed(1)}% conversion rate is below target. Consider reviewing qualification process.`,
          action: {
            label: 'Review Pipeline',
            url: '/pipeline'
          },
          impact: 'high',
          category: 'conversion',
          confidence: 85
        })
      }
    }

  } catch (error) {
    console.error('[Insights] Error analyzing conversion:', error)
  }

  return insights
}

/**
 * Analyze lead activity
 */
async function analyzeLeads(tenantId: string): Promise<Insight[]> {
  const supabase = createClient()
  const insights: Insight[] = []
  
  try {
    // Get aging leads
    const { data: leads } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'lead')
      .order('created_at', { ascending: true })
      .limit(100)

    if (!leads || leads.length === 0) return insights

    // Find leads older than 7 days
    const agingLeads = leads.filter(lead => {
      const age = differenceInDays(new Date(), new Date(lead.created_at))
      return age > 7
    })

    if (agingLeads.length > 0) {
      insights.push({
        id: 'aging-leads',
        type: 'warning',
        title: '⏰ Aging Leads Alert',
        description: `${agingLeads.length} leads haven't been contacted in over 7 days. Quick follow-up improves conversion by 40%.`,
        action: {
          label: 'View Leads',
          url: '/contacts?status=lead'
        },
        impact: 'high',
        category: 'leads',
        confidence: 90,
        data: { count: agingLeads.length }
      })
    }

    // Hot leads (less than 24 hours old)
    const hotLeads = leads.filter(lead => {
      const age = differenceInDays(new Date(), new Date(lead.created_at))
      return age === 0
    })

    if (hotLeads.length > 0) {
      insights.push({
        id: 'hot-leads',
        type: 'opportunity',
        title: '🔥 Hot Leads Alert',
        description: `${hotLeads.length} new leads today! Contact within 5 minutes for 9x higher conversion rate.`,
        action: {
          label: 'Contact Now',
          url: '/contacts?status=lead&sort=newest'
        },
        impact: 'high',
        category: 'leads',
        confidence: 95,
        data: { count: hotLeads.length }
      })
    }

  } catch (error) {
    console.error('[Insights] Error analyzing leads:', error)
  }

  return insights
}

/**
 * Analyze task completion patterns
 */
async function analyzeTasks(tenantId: string): Promise<Insight[]> {
  const supabase = createClient()
  const insights: Insight[] = []
  
  try {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, due_at, status')
      .eq('tenant_id', tenantId)
      .limit(100)

    if (!tasks) return insights

    const overdueTasks = tasks.filter(t => 
      t.due_at && 
      isPast(new Date(t.due_at)) && 
      t.status !== 'completed'
    )

    if (overdueTasks.length > 5) {
      insights.push({
        id: 'overdue-tasks',
        type: 'warning',
        title: '📅 Overdue Tasks Building Up',
        description: `${overdueTasks.length} tasks are overdue. Prioritize or delegate to prevent backlog.`,
        action: {
          label: 'View Tasks',
          url: '/tasks?filter=overdue'
        },
        impact: 'medium',
        category: 'activity',
        confidence: 100,
        data: { count: overdueTasks.length }
      })
    }

  } catch (error) {
    console.error('[Insights] Error analyzing tasks:', error)
  }

  return insights
}

/**
 * Generate all dashboard insights
 */
export async function generateDashboardInsights(tenantId: string): Promise<Insight[]> {
  try {
    const [revenueInsights, conversionInsights, leadInsights, taskInsights] = await Promise.all([
      analyzeRevenue(tenantId),
      analyzeConversion(tenantId),
      analyzeLeads(tenantId),
      analyzeTasks(tenantId)
    ])

    const allInsights = [
      ...revenueInsights,
      ...conversionInsights,
      ...leadInsights,
      ...taskInsights
    ]

    // Sort by impact and confidence
    return allInsights
      .sort((a, b) => {
        const impactScore = { high: 3, medium: 2, low: 1 }
        const aScore = impactScore[a.impact] * a.confidence
        const bScore = impactScore[b.impact] * b.confidence
        return bScore - aScore
      })
      .slice(0, 5) // Return top 5 insights

  } catch (error) {
    console.error('[Insights] Error generating insights:', error)
    return []
  }
}


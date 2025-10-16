/**
 * AUTOMATION SEARCH & FILTERING
 * 
 * Advanced search and filtering for automations:
 * - Search by name, trigger, action
 * - Filter by category (Deal, Task, Contact, Pipeline)
 * - Filter by status (active, draft, paused)
 * - Sort by performance, last run, etc.
 */

import { createClient } from '@/lib/supabase-client'

export interface AutomationSearchFilters {
  query?: string
  category?: 'deal' | 'task' | 'contact' | 'pipeline' | 'marketing'
  status?: 'active' | 'draft' | 'paused' | 'archived'
  trigger_type?: string
  has_failures?: boolean
  last_run_within_days?: number
}

export interface AutomationSearchResult {
  id: string
  name: string
  description: string
  status: string
  trigger_type: string
  category: string
  total_runs: number
  success_rate: number
  last_run: string | null
  created_at: string
}

/**
 * Search and filter automations
 */
export async function searchAutomations(
  tenantId: string,
  filters: AutomationSearchFilters
): Promise<AutomationSearchResult[]> {
  try {
    const supabase = createClient()

    // Start with base query
    let query = supabase
      .from('marketing_journeys')
      .select('*')
      .eq('tenant_id', tenantId)

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.trigger_type) {
      query = query.eq('entry_trigger_type', filters.trigger_type)
    }

    // Execute query
    const { data: journeys } = await query

    if (!journeys) return []

    // Post-process results
    let results: AutomationSearchResult[] = journeys.map(j => {
      // Determine category from trigger type
      const category = getCategoryFromTriggerType(j.entry_trigger_type)

      // Calculate success rate
      const totalRuns = j.total_entered || 0
      const successfulRuns = j.total_completed || 0
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0

      // Get last run (simplified - would need to query runs table)
      const lastRun = j.activated_at

      return {
        id: j.id,
        name: j.name,
        description: j.description || '',
        status: j.status,
        trigger_type: j.entry_trigger_type,
        category,
        total_runs: totalRuns,
        success_rate: successRate,
        last_run: lastRun,
        created_at: j.created_at,
      }
    })

    // Apply text search
    if (filters.query) {
      const queryLower = filters.query.toLowerCase()
      results = results.filter(r =>
        r.name.toLowerCase().includes(queryLower) ||
        r.description.toLowerCase().includes(queryLower) ||
        r.trigger_type.includes(queryLower)
      )
    }

    // Apply category filter
    if (filters.category) {
      results = results.filter(r => r.category === filters.category)
    }

    // Apply performance filters
    if (filters.has_failures) {
      results = results.filter(r => r.success_rate < 100)
    }

    // Apply recency filter
    if (filters.last_run_within_days) {
      const cutoff = new Date(Date.now() - filters.last_run_within_days * 24 * 60 * 60 * 1000)
      results = results.filter(r => {
        if (!r.last_run) return false
        return new Date(r.last_run) >= cutoff
      })
    }

    return results
  } catch (error) {
    console.error('[Automation Search] Error searching:', error)
    return []
  }
}

/**
 * Determine automation category from trigger type
 */
function getCategoryFromTriggerType(triggerType: string): string {
  if (triggerType.startsWith('deal_')) return 'deal'
  if (triggerType.startsWith('task_')) return 'task'
  if (triggerType.startsWith('contact_')) return 'contact'
  if (triggerType.startsWith('pipeline_') || triggerType.startsWith('stage_')) return 'pipeline'
  return 'marketing'
}

/**
 * Get automation suggestions based on tenant activity
 */
export async function getAutomationSuggestions(
  tenantId: string
): Promise<Array<{
  templateId: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}>> {
  try {
    const supabase = createClient()

    const suggestions: Array<{
      templateId: string
      reason: string
      priority: 'high' | 'medium' | 'low'
    }> = []

    // Check if they have high-value deals but no automation
    const { count: highValueDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('value_estimate_cents', 10000000)

    if (highValueDeals && highValueDeals > 0) {
      // Check if they have high-value automation
      const { count: highValueAutomations } = await supabase
        .from('marketing_journeys')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('entry_trigger_type', 'deal_value_threshold')
        .eq('status', 'active')

      if (!highValueAutomations || highValueAutomations === 0) {
        suggestions.push({
          templateId: 'high_value_deal_alert',
          reason: 'You have high-value deals but no automation to handle them',
          priority: 'high',
        })
      }
    }

    // Check for deals won but no thank-you automation
    const { count: wonDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'won')

    if (wonDeals && wonDeals > 5) {
      const { count: wonAutomations } = await supabase
        .from('marketing_journeys')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('entry_trigger_type', 'deal_won')
        .eq('status', 'active')

      if (!wonAutomations || wonAutomations === 0) {
        suggestions.push({
          templateId: 'deal_won_thank_you',
          reason: 'Automate thank-you emails and review requests for won deals',
          priority: 'high',
        })
      }
    }

    // Check for overdue tasks but no escalation
    const { count: overdueTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .lt('due_at', new Date().toISOString())

    if (overdueTasks && overdueTasks > 10) {
      const { count: escalationRules } = await supabase
        .from('task_escalation_rules')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      if (!escalationRules || escalationRules === 0) {
        suggestions.push({
          templateId: 'task_overdue_escalation',
          reason: 'Many overdue tasks - set up automatic escalations',
          priority: 'high',
        })
      }
    }

    return suggestions
  } catch (error) {
    console.error('[Automation Suggestions] Error:', error)
    return []
  }
}


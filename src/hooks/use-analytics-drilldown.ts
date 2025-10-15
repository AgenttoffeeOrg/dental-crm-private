/**
 * Analytics Drill-Down Hook
 * 
 * Enables click-through from charts to filtered detail views
 * 
 * Features:
 * - Click revenue bar → Filtered deals view
 * - Click campaign → Campaign details
 * - Click sales rep → Rep's deals
 * - Click lead source → Contacts from that source
 * - Click pipeline stage → Deals in that stage
 * 
 * Usage:
 * ```typescript
 * const { handleDrillDown } = useAnalyticsDrilldown()
 * 
 * <Bar 
 *   dataKey="revenue" 
 *   onClick={(data) => handleDrillDown('deals', { month: data.month })}
 * />
 * ```
 */

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

type DrillDownTarget = 
  | 'deals' 
  | 'contacts' 
  | 'campaigns' 
  | 'pipeline' 
  | 'tasks'
  | 'forms'
  | 'rep-performance'

interface DrillDownFilters {
  // Date filters
  month?: string
  startDate?: string
  endDate?: string
  dateRange?: '7d' | '30d' | '90d' | '12m'
  
  // Entity filters
  userId?: string
  userName?: string
  source?: string
  stage?: string
  pipelineId?: string
  campaignId?: string
  formId?: string
  
  // Status filters
  status?: 'won' | 'lost' | 'active' | 'stalled'
  
  // Value filters
  minValue?: number
  maxValue?: number
  
  // Tags
  tags?: string[]
}

export function useAnalyticsDrilldown() {
  const router = useRouter()
  
  /**
   * Navigate to detail view with filters
   */
  const handleDrillDown = useCallback((
    target: DrillDownTarget,
    filters: DrillDownFilters
  ) => {
    // Build query string
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','))
        } else {
          params.set(key, String(value))
        }
      }
    })
    
    // Add drill-down indicator (for analytics tracking)
    params.set('drilldown', 'true')
    params.set('from', 'analytics')
    
    // Route based on target
    const routes: Record<DrillDownTarget, string> = {
      deals: '/deals',
      contacts: '/contacts',
      campaigns: '/marketing/campaigns',
      pipeline: '/pipeline',
      tasks: '/tasks',
      forms: '/forms',
      'rep-performance': '/analytics/crm',
    }
    
    const route = routes[target]
    const fullRoute = params.toString() ? `${route}?${params.toString()}` : route
    
    // Log drill-down event (for analytics tracking)
    console.log('[Analytics Drill-Down]', { target, filters, route: fullRoute })
    
    // Navigate
    router.push(fullRoute)
  }, [router])
  
  /**
   * Quick drill-down helpers for common scenarios
   */
  const drillDownToDeals = useCallback((filters: Omit<DrillDownFilters, 'target'>) => {
    handleDrillDown('deals', filters)
  }, [handleDrillDown])
  
  const drillDownToContacts = useCallback((filters: Omit<DrillDownFilters, 'target'>) => {
    handleDrillDown('contacts', filters)
  }, [handleDrillDown])
  
  const drillDownToCampaigns = useCallback((filters: Omit<DrillDownFilters, 'target'>) => {
    handleDrillDown('campaigns', filters)
  }, [handleDrillDown])
  
  const drillDownToRepPerformance = useCallback((userId: string, userName: string) => {
    handleDrillDown('rep-performance', { userId, userName })
  }, [handleDrillDown])
  
  return {
    handleDrillDown,
    drillDownToDeals,
    drillDownToContacts,
    drillDownToCampaigns,
    drillDownToRepPerformance,
  }
}

/**
 * Parse drill-down filters from URL query params
 * 
 * Use this in target pages to apply filters from drill-down
 */
export function useDrillDownFilters(): DrillDownFilters & { isDrillDown: boolean } {
  if (typeof window === 'undefined') {
    return { isDrillDown: false }
  }
  
  const params = new URLSearchParams(window.location.search)
  const isDrillDown = params.get('drilldown') === 'true'
  
  if (!isDrillDown) {
    return { isDrillDown: false }
  }
  
  // Parse all filters
  const filters: DrillDownFilters = {}
  
  // Date filters
  if (params.get('month')) filters.month = params.get('month')!
  if (params.get('startDate')) filters.startDate = params.get('startDate')!
  if (params.get('endDate')) filters.endDate = params.get('endDate')!
  if (params.get('dateRange')) filters.dateRange = params.get('dateRange') as any
  
  // Entity filters
  if (params.get('userId')) filters.userId = params.get('userId')!
  if (params.get('userName')) filters.userName = params.get('userName')!
  if (params.get('source')) filters.source = params.get('source')!
  if (params.get('stage')) filters.stage = params.get('stage')!
  if (params.get('pipelineId')) filters.pipelineId = params.get('pipelineId')!
  if (params.get('campaignId')) filters.campaignId = params.get('campaignId')!
  if (params.get('formId')) filters.formId = params.get('formId')!
  
  // Status filters
  if (params.get('status')) filters.status = params.get('status') as any
  
  // Value filters
  if (params.get('minValue')) filters.minValue = parseInt(params.get('minValue')!)
  if (params.get('maxValue')) filters.maxValue = parseInt(params.get('maxValue')!)
  
  // Tags
  if (params.get('tags')) filters.tags = params.get('tags')!.split(',')
  
  return {
    ...filters,
    isDrillDown: true,
  }
}

/**
 * Format drill-down breadcrumb text
 * 
 * Shows user where they drilled down from
 */
export function getDrillDownBreadcrumb(filters: DrillDownFilters): string {
  const parts: string[] = []
  
  if (filters.month) parts.push(`Month: ${filters.month}`)
  if (filters.userName) parts.push(`Rep: ${filters.userName}`)
  if (filters.source) parts.push(`Source: ${filters.source}`)
  if (filters.stage) parts.push(`Stage: ${filters.stage}`)
  if (filters.status) parts.push(`Status: ${filters.status}`)
  
  if (parts.length === 0) return 'All'
  
  return parts.join(' • ')
}


/**
 * Dashboard Layout Configurations
 * 
 * Defines role-based default layouts for different user types.
 * Each role gets a customized dashboard optimized for their workflow.
 */

export interface WidgetConfig {
  id: string
  name: string
  visible: boolean
  order: number
  size?: '1x' | '2x' | 'full'
}

export interface DashboardLayout {
  name: string
  description: string
  widgets: WidgetConfig[]
  timePeriodDefault: 'today' | 'week' | 'month' | 'quarter' | 'year'
  autoRefreshInterval: number // minutes
}

/**
 * Owner/Admin Layout
 * Focus: Revenue, growth, team performance, strategic overview
 */
export const OWNER_LAYOUT: DashboardLayout = {
  name: 'Owner Dashboard',
  description: 'Strategic overview with revenue and team performance',
  timePeriodDefault: 'month',
  autoRefreshInterval: 5,
  widgets: [
    { id: 'priorities', name: "Today's Priorities", visible: true, order: 1, size: 'full' },
    { id: 'revenue', name: 'Total Revenue', visible: true, order: 2, size: '1x' },
    { id: 'deals', name: 'Total Deals', visible: true, order: 3, size: '1x' },
    { id: 'conversion', name: 'Conversion Rate', visible: true, order: 4, size: '1x' },
    { id: 'growth', name: 'Monthly Growth', visible: true, order: 5, size: '1x' },
    { id: 'revenueChart', name: 'Revenue Trend', visible: true, order: 6, size: '2x' },
    { id: 'dealsFunnel', name: 'Pipeline Funnel', visible: true, order: 7, size: '2x' },
    { id: 'aiInsights', name: 'AI Insights', visible: true, order: 8, size: 'full' },
    { id: 'quickInsights', name: 'Quick Insights', visible: true, order: 9, size: '1x' },
    { id: 'recentActivity', name: 'Recent Activity', visible: false, order: 10, size: '2x' },
    { id: 'contacts', name: 'Total Contacts', visible: false, order: 11, size: '1x' },
    { id: 'tasks', name: 'Active Tasks', visible: false, order: 12, size: '1x' }
  ]
}

/**
 * Manager Layout
 * Focus: Team tasks, appointments, daily operations
 */
export const MANAGER_LAYOUT: DashboardLayout = {
  name: 'Manager Dashboard',
  description: 'Team management and daily operations',
  timePeriodDefault: 'week',
  autoRefreshInterval: 3,
  widgets: [
    { id: 'priorities', name: "Today's Priorities", visible: true, order: 1, size: 'full' },
    { id: 'tasks', name: 'Active Tasks', visible: true, order: 2, size: '1x' },
    { id: 'deals', name: 'Active Deals', visible: true, order: 3, size: '1x' },
    { id: 'contacts', name: 'New Contacts', visible: true, order: 4, size: '1x' },
    { id: 'revenue', name: 'Week Revenue', visible: true, order: 5, size: '1x' },
    { id: 'recentActivity', name: 'Team Activity', visible: true, order: 6, size: '2x' },
    { id: 'upcomingTasks', name: 'Upcoming Tasks', visible: true, order: 7, size: '1x' },
    { id: 'aiInsights', name: 'Recommendations', visible: true, order: 8, size: 'full' },
    { id: 'revenueChart', name: 'Revenue Trend', visible: false, order: 9, size: '2x' },
    { id: 'dealsFunnel', name: 'Pipeline Funnel', visible: false, order: 10, size: '2x' }
  ]
}

/**
 * Staff Layout  
 * Focus: Their own tasks, leads, and daily responsibilities
 */
export const STAFF_LAYOUT: DashboardLayout = {
  name: 'Staff Dashboard',
  description: 'Personal tasks and assigned leads',
  timePeriodDefault: 'today',
  autoRefreshInterval: 2,
  widgets: [
    { id: 'priorities', name: 'My Priorities', visible: true, order: 1, size: 'full' },
    { id: 'tasks', name: 'My Tasks', visible: true, order: 2, size: '2x' },
    { id: 'deals', name: 'My Deals', visible: true, order: 3, size: '1x' },
    { id: 'contacts', name: 'My Leads', visible: true, order: 4, size: '1x' },
    { id: 'upcomingTasks', name: 'Coming Up', visible: true, order: 5, size: '1x' },
    { id: 'recentActivity', name: 'My Activity', visible: true, order: 6, size: '2x' },
    { id: 'aiInsights', name: 'Tips', visible: false, order: 7, size: 'full' },
    { id: 'revenue', name: 'Revenue', visible: false, order: 8, size: '1x' },
    { id: 'revenueChart', name: 'Revenue Chart', visible: false, order: 9, size: '2x' },
    { id: 'dealsFunnel', name: 'Pipeline', visible: false, order: 10, size: '2x' }
  ]
}

/**
 * Marketing Layout
 * Focus: Campaign performance, lead sources, conversion rates
 */
export const MARKETING_LAYOUT: DashboardLayout = {
  name: 'Marketing Dashboard',
  description: 'Campaign performance and lead analytics',
  timePeriodDefault: 'month',
  autoRefreshInterval: 10,
  widgets: [
    { id: 'priorities', name: 'Marketing Priorities', visible: true, order: 1, size: 'full' },
    { id: 'contacts', name: 'New Leads', visible: true, order: 2, size: '1x' },
    { id: 'conversion', name: 'Conversion Rate', visible: true, order: 3, size: '1x' },
    { id: 'deals', name: 'Converted Deals', visible: true, order: 4, size: '1x' },
    { id: 'revenue', name: 'Generated Revenue', visible: true, order: 5, size: '1x' },
    { id: 'dealsFunnel', name: 'Conversion Funnel', visible: true, order: 6, size: '2x' },
    { id: 'leadSources', name: 'Lead Sources', visible: true, order: 7, size: '2x' },
    { id: 'aiInsights', name: 'Campaign Insights', visible: true, order: 8, size: 'full' },
    { id: 'tasks', name: 'Tasks', visible: false, order: 9, size: '1x' },
    { id: 'revenueChart', name: 'Revenue Trend', visible: false, order: 10, size: '2x' }
  ]
}

/**
 * Get layout by role
 */
export function getLayoutByRole(role: string): DashboardLayout {
  switch (role.toLowerCase()) {
    case 'owner':
    case 'admin':
      return OWNER_LAYOUT
    case 'manager':
      return MANAGER_LAYOUT
    case 'staff':
    case 'receptionist':
      return STAFF_LAYOUT
    case 'marketing':
      return MARKETING_LAYOUT
    default:
      return STAFF_LAYOUT // Default to simplest layout
  }
}

/**
 * All available layouts
 */
export const AVAILABLE_LAYOUTS = {
  owner: OWNER_LAYOUT,
  manager: MANAGER_LAYOUT,
  staff: STAFF_LAYOUT,
  marketing: MARKETING_LAYOUT
}


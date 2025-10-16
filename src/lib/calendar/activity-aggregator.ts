/**
 * Activity Aggregator
 * Combines tasks, activities, deals, and external calendar events into unified calendar view
 */

import { createClient } from '@/lib/supabase-client'
import { startOfDay, endOfDay } from 'date-fns'

export interface CalendarActivity {
  id: string
  type: 'task' | 'call' | 'email' | 'meeting' | 'deal' | 'external_event'
  title: string
  description?: string
  start_time: Date
  end_time?: Date
  duration_minutes?: number
  
  // Relations
  contact_id?: string
  contact_name?: string
  deal_id?: string
  deal_title?: string
  
  // Metadata
  status?: string
  priority?: string
  color?: string
  icon?: string
  
  // Source
  source: 'crm' | 'google_calendar' | 'outlook_calendar'
  external_id?: string
}

export class ActivityAggregator {
  private supabase = createClient()

  /**
   * Get all activities for a date range
   */
  async getActivities(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    filters?: {
      types?: string[]
      contactId?: string
      dealId?: string
      userId?: string
    }
  ): Promise<CalendarActivity[]> {
    try {
      const activities: CalendarActivity[] = []

      // 1. Get Tasks
      const tasks = await this.getTasks(tenantId, startDate, endDate, filters)
      activities.push(...tasks)

      // 2. Get Activities (calls, emails, meetings)
      const crmActivities = await this.getCRMActivities(tenantId, startDate, endDate, filters)
      activities.push(...crmActivities)

      // 3. Get Deals (with expected close dates)
      const deals = await this.getDeals(tenantId, startDate, endDate, filters)
      activities.push(...deals)

      // 4. Get External Calendar Events (Google/Outlook)
      // TODO: Implement when external sync is enabled
      // const externalEvents = await this.getExternalEvents(tenantId, startDate, endDate)
      // activities.push(...externalEvents)

      // Sort by start time
      activities.sort((a, b) => a.start_time.getTime() - b.start_time.getTime())

      return activities
    } catch (error) {
      console.error('[Activity Aggregator] Error:', error)
      throw error
    }
  }

  private async getTasks(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    filters?: any
  ): Promise<CalendarActivity[]> {
    let query = this.supabase
      .from('tasks')
      .select(`
        *,
        contact:contacts(id, full_name),
        deal:deals(id, title)
      `)
      .eq('tenant_id', tenantId)
      .not('due_at', 'is', null)
      .gte('due_at', startDate.toISOString())
      .lte('due_at', endDate.toISOString())

    if (filters?.contactId) {
      query = query.eq('contact_id', filters.contactId)
    }

    if (filters?.dealId) {
      query = query.eq('deal_id', filters.dealId)
    }

    if (filters?.userId) {
      query = query.eq('assignee_user_id', filters.userId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(task => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      description: task.description,
      start_time: new Date(task.due_at),
      contact_id: task.contact_id,
      contact_name: task.contact?.full_name,
      deal_id: task.deal_id,
      deal_title: task.deal?.title,
      status: task.status,
      priority: task.priority,
      color: this.getTaskColor(task.priority),
      source: 'crm' as const
    }))
  }

  private async getCRMActivities(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    filters?: any
  ): Promise<CalendarActivity[]> {
    let query = this.supabase
      .from('activities')
      .select(`
        *,
        contact:contacts(id, full_name),
        deal:deals(id, title)
      `)
      .eq('tenant_id', tenantId)
      .in('type', ['call', 'email', 'meeting'])
      .gte('occurred_at', startDate.toISOString())
      .lte('occurred_at', endDate.toISOString())

    if (filters?.contactId) {
      query = query.eq('contact_id', filters.contactId)
    }

    if (filters?.dealId) {
      query = query.eq('deal_id', filters.dealId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(activity => ({
      id: activity.id,
      type: activity.type as 'call' | 'email' | 'meeting',
      title: activity.subject || `${activity.type} activity`,
      description: activity.snippet,
      start_time: new Date(activity.occurred_at),
      duration_minutes: activity.duration_seconds ? Math.round(activity.duration_seconds / 60) : undefined,
      contact_id: activity.contact_id,
      contact_name: activity.contact?.full_name,
      deal_id: activity.deal_id,
      deal_title: activity.deal?.title,
      status: activity.outcome,
      color: this.getActivityColor(activity.type),
      source: 'crm' as const
    }))
  }

  private async getDeals(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    filters?: any
  ): Promise<CalendarActivity[]> {
    let query = this.supabase
      .from('deals')
      .select(`
        *,
        contact:contacts(id, full_name),
        stage:pipeline_stages(name)
      `)
      .eq('tenant_id', tenantId)
      .not('expected_close_date', 'is', null)
      .gte('expected_close_date', format(startDate, 'yyyy-MM-dd'))
      .lte('expected_close_date', format(endDate, 'yyyy-MM-dd'))

    if (filters?.contactId) {
      query = query.eq('contact_id', filters.contactId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(deal => ({
      id: deal.id,
      type: 'deal' as const,
      title: deal.title,
      description: `Expected close: ${deal.stage?.name || 'Unknown stage'}`,
      start_time: new Date(deal.expected_close_date),
      contact_id: deal.contact_id,
      contact_name: deal.contact?.full_name,
      deal_id: deal.id,
      deal_title: deal.title,
      status: deal.status,
      color: '#8B5CF6',
      source: 'crm' as const
    }))
  }

  private getTaskColor(priority: string): string {
    switch (priority) {
      case 'urgent': return '#EF4444'
      case 'high': return '#F59E0B'
      case 'normal': return '#3B82F6'
      case 'low': return '#6B7280'
      default: return '#6B7280'
    }
  }

  private getActivityColor(type: string): string {
    switch (type) {
      case 'call': return '#10B981'
      case 'email': return '#3B82F6'
      case 'meeting': return '#F97316'
      default: return '#6B7280'
    }
  }
}

// Helper function for formatting dates
function format(date: Date, formatStr: string): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (formatStr === 'yyyy-MM-dd') {
    return `${year}-${month}-${day}`
  }
  
  return date.toISOString()
}

export const activityAggregator = new ActivityAggregator()


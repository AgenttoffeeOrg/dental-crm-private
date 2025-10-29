/**
 * Deal Intelligence Utilities
 * 
 * Client-side computation of intelligence fields (Probability, Health, Next Action)
 * These are derived from existing deal data with zero backend changes
 */

import type { DealWithRelations, PipelineStage, Task, Activity } from '@/types/database'
import type {
  DealWithIntelligence,
  DealIntelligence,
  DealProbability,
  DealHealthInfo,
  DealNextAction,
  DealHealth,
  ActionUrgency,
  ProbabilityParams,
  HealthParams,
  NextActionParams,
} from '@/types/deal-intelligence'
import {
  HEALTH_THRESHOLDS,
  URGENCY_THRESHOLDS,
  getUrgencyLevel,
} from '@/types/deal-intelligence'

// ============================================================================
// PROBABILITY CALCULATION
// ============================================================================

/**
 * Calculate deal probability based on stage position
 * Linear mapping: first stage = 10%, last stage = 90%
 */
export function calculateProbability(params: ProbabilityParams): DealProbability {
  const { stages, currentStageId } = params
  
  // Find current stage
  const currentStage = stages.find(s => s.id === currentStageId)
  if (!currentStage || stages.length === 0) {
    return {
      percentage: 10,
      isManual: false,
      source: 'stage'
    }
  }
  
  // Sort stages by position
  const sortedStages = [...stages].sort((a, b) => a.position - b.position)
  const stageIndex = sortedStages.findIndex(s => s.id === currentStageId)
  
  if (stageIndex === -1) {
    return {
      percentage: 10,
      isManual: false,
      source: 'stage'
    }
  }
  
  // Linear interpolation: 10% at start, 90% at end
  const percentage = Math.round(10 + (stageIndex / (sortedStages.length - 1 || 1)) * 80)
  
  return {
    percentage: Math.max(10, Math.min(90, percentage)),
    isManual: false,
    source: 'stage'
  }
}

// ============================================================================
// HEALTH CALCULATION
// ============================================================================

/**
 * Calculate deal health based on time since last activity
 */
export function calculateHealth(params: HealthParams): DealHealthInfo {
  const { updatedAt, lastActivityDate } = params
  
  // Use last activity if available, otherwise use updated_at
  const referenceDate = lastActivityDate || new Date(updatedAt)
  const now = new Date()
  const daysSinceUpdate = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24))
  
  let status: DealHealth
  let color: 'green' | 'amber' | 'red'
  
  if (daysSinceUpdate <= HEALTH_THRESHOLDS.EXCELLENT) {
    status = 'Excellent'
    color = 'green'
  } else if (daysSinceUpdate <= HEALTH_THRESHOLDS.GOOD) {
    status = 'Good'
    color = 'green'
  } else if (daysSinceUpdate <= HEALTH_THRESHOLDS.AT_RISK) {
    status = 'At Risk'
    color = 'amber'
  } else {
    status = 'Stalled'
    color = 'red'
  }
  
  return {
    status,
    daysSinceUpdate,
    lastActivityDate,
    color
  }
}

/**
 * Get most recent activity date from activities array
 */
export function getMostRecentActivityDate(activities: Activity[] = []): Date | null {
  if (activities.length === 0) return null
  
  const sorted = [...activities].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  
  return sorted[0] ? new Date(sorted[0].created_at) : null
}

// ============================================================================
// NEXT ACTION CALCULATION
// ============================================================================

/**
 * Derive next action from nearest upcoming task
 */
export function calculateNextAction(params: NextActionParams): DealNextAction | null {
  const { tasks, currentDate = new Date() } = params
  
  if (!tasks || tasks.length === 0) return null
  
  // Filter to incomplete tasks with due dates
  const openTasks = tasks.filter(t => 
    t.status !== 'completed' && 
    t.status !== 'cancelled' &&
    t.due_date
  )
  
  if (openTasks.length === 0) return null
  
  // Sort by due date (earliest first)
  const sortedTasks = [...openTasks].sort((a, b) => 
    new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
  )
  
  const nextTask = sortedTasks[0]
  const dueDate = new Date(nextTask.due_date!)
  const daysUntil = Math.floor((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysUntil < 0
  const urgency = getUrgencyLevel(daysUntil)
  
  return {
    label: nextTask.title,
    dueDate,
    isOverdue,
    daysUntil,
    urgency,
    taskId: nextTask.id
  }
}

// ============================================================================
// METADATA CALCULATION
// ============================================================================

/**
 * Calculate deal age (days since created)
 */
export function calculateAge(createdAt: string | Date): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Calculate days in current stage
 * Note: Requires stage_changed_at field or activity log - fallback to updated_at
 */
export function calculateDaysInStage(updatedAt: string | Date): number {
  // TODO: If we add stage_changed_at field to deals table, use that
  // For now, use updated_at as approximation
  const updated = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt
  const now = new Date()
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Count activities by type
 */
export function countActivitiesByType(activities: Activity[] = [], type: string): number {
  return activities.filter(a => a.type === type).length
}

// ============================================================================
// MAIN ENHANCER FUNCTION
// ============================================================================

/**
 * Enhance a deal with intelligence and metadata
 * This is the main function to convert DealWithRelations → DealWithIntelligence
 */
export function enhanceDealWithIntelligence(
  deal: DealWithRelations,
  stages: PipelineStage[],
  locationName: string | null = null
): DealWithIntelligence {
  // Calculate probability
  const probability = calculateProbability({
    stages,
    currentStageId: deal.stage_id
  })
  
  // Calculate health
  const lastActivityDate = getMostRecentActivityDate(deal.activities)
  const health = calculateHealth({
    updatedAt: new Date(deal.updated_at),
    lastActivityDate
  })
  
  // Calculate next action
  const nextAction = calculateNextAction({
    tasks: deal.tasks || [],
    currentDate: new Date()
  })
  
  // Build intelligence object
  const intelligence: DealIntelligence = {
    probability,
    health,
    nextAction
  }
  
  // Calculate metadata
  const metadata = {
    age: calculateAge(deal.created_at),
    daysInStage: calculateDaysInStage(deal.updated_at),
    callsCount: countActivitiesByType(deal.activities, 'call'),
    notesCount: countActivitiesByType(deal.activities, 'note'),
    lastFollowUp: lastActivityDate,
    practiceName: locationName
  }
  
  return {
    ...deal,
    intelligence,
    metadata
  }
}

/**
 * Batch enhance multiple deals
 */
export function enhanceDealsWithIntelligence(
  deals: DealWithRelations[],
  stages: PipelineStage[],
  locationMap: Map<string, string> = new Map()
): DealWithIntelligence[] {
  return deals.map(deal => {
    const locationName = deal.location_id ? locationMap.get(deal.location_id) || null : null
    return enhanceDealWithIntelligence(deal, stages, locationName)
  })
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format currency (cents to £)
 */
export function formatCurrency(cents: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/**
 * Format days ago as human-readable string
 */
export function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks}w ago`
  }
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Format days until (for next action)
 */
export function formatDaysUntil(days: number): string {
  if (days < 0) {
    const absDays = Math.abs(days)
    return `Overdue ${absDays}d`
  }
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due in 1d'
  if (days < 7) return `Due in ${days}d`
  const weeks = Math.floor(days / 7)
  return `Due in ${weeks}w`
}

/**
 * Get initials from full name
 */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format treatment tags as comma-separated string
 */
export function formatTreatmentTags(tags: string[]): string {
  if (tags.length === 0) return 'General'
  if (tags.length === 1) return tags[0]
  if (tags.length === 2) return tags.join(', ')
  return `${tags[0]}, ${tags[1]} +${tags.length - 2}`
}



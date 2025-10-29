/**
 * Deal Intelligence Types
 * 
 * Extended types for Deal Intelligence features (Probability, Health, Next Action)
 * These are computed client-side from existing deal data
 */

import type { DealWithRelations, PipelineStage, Task } from './database'

// ============================================================================
// INTELLIGENCE ENUMS
// ============================================================================

/**
 * Deal health status based on activity recency
 */
export type DealHealth = 'Excellent' | 'Good' | 'At Risk' | 'Stalled'

/**
 * Next action urgency level
 */
export type ActionUrgency = 'info' | 'warning' | 'critical'

// ============================================================================
// INTELLIGENCE INTERFACES
// ============================================================================

/**
 * Deal probability (0-100%)
 * Derived from stage position or can be set manually
 */
export interface DealProbability {
  percentage: number      // 0-100
  isManual: boolean      // true if set manually, false if derived
  source: 'stage' | 'manual' | 'ml'  // How it was calculated
}

/**
 * Deal health indicator
 * Based on time since last activity
 */
export interface DealHealthInfo {
  status: DealHealth
  daysSinceUpdate: number
  lastActivityDate: Date | null
  color: 'green' | 'amber' | 'red'
}

/**
 * Next action for the deal
 * Derived from nearest upcoming task
 */
export interface DealNextAction {
  label: string                // e.g., "Follow-up call"
  dueDate: Date               // When it's due
  isOverdue: boolean          // true if past due
  daysUntil: number           // Negative if overdue
  urgency: ActionUrgency      // Visual urgency indicator
  taskId?: string             // Reference to source task
}

/**
 * Complete Deal Intelligence bundle
 */
export interface DealIntelligence {
  probability: DealProbability | null
  health: DealHealthInfo
  nextAction: DealNextAction | null
}

// ============================================================================
// ENHANCED DEAL WITH INTELLIGENCE
// ============================================================================

/**
 * Deal with computed intelligence fields
 * Non-breaking extension of DealWithRelations
 */
export interface DealWithIntelligence extends DealWithRelations {
  // Computed intelligence (always present, calculated client-side)
  intelligence: DealIntelligence
  
  // Additional computed metadata for card display
  metadata: {
    age: number                    // Days since created
    daysInStage: number           // Days in current stage
    callsCount: number            // Number of call activities
    notesCount: number            // Number of note activities
    lastFollowUp: Date | null     // Most recent activity
    practiceName: string | null   // Location name (if location_id exists)
  }
}

// ============================================================================
// CALCULATION PARAMETERS
// ============================================================================

/**
 * Parameters for probability calculation
 */
export interface ProbabilityParams {
  stages: PipelineStage[]
  currentStageId: string
}

/**
 * Parameters for health calculation
 */
export interface HealthParams {
  updatedAt: Date
  lastActivityDate: Date | null
}

/**
 * Parameters for next action derivation
 */
export interface NextActionParams {
  tasks: Task[]
  currentDate?: Date
}

// ============================================================================
// HEALTH THRESHOLDS (CONFIGURABLE)
// ============================================================================

/**
 * Health status thresholds (in days since last update)
 */
export const HEALTH_THRESHOLDS = {
  EXCELLENT: 2,   // 0-2 days: Excellent
  GOOD: 4,        // 3-4 days: Good
  AT_RISK: 7,     // 5-7 days: At Risk
  // 8+ days: Stalled
} as const

/**
 * Next action urgency thresholds (in days until due)
 */
export const URGENCY_THRESHOLDS = {
  CRITICAL: 0,    // Overdue or due today
  WARNING: 2,     // Due within 2 days
  // 3+ days: Info
} as const

// ============================================================================
// COLOR MAPPINGS
// ============================================================================

/**
 * Health status color mapping
 */
export const HEALTH_COLORS: Record<DealHealth, { bg: string; text: string; border: string; icon: string }> = {
  'Excellent': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: '🟢'
  },
  'Good': {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    icon: '✓'
  },
  'At Risk': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: '⚠️'
  },
  'Stalled': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '🔴'
  }
} as const

/**
 * Probability range color mapping
 */
export const PROBABILITY_COLORS = {
  HIGH: { color: '#22C55E', label: 'High' },        // ≥70%
  MEDIUM: { color: '#3B82F6', label: 'Medium' },    // 40-69%
  LOW: { color: '#EF4444', label: 'Low' }           // <40%
} as const

/**
 * Action urgency color mapping
 */
export const URGENCY_COLORS: Record<ActionUrgency, { bg: string; text: string; border: string }> = {
  'info': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  'warning': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  'critical': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200'
  }
} as const

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

/**
 * Check if deal has intelligence data
 */
export function hasIntelligence(deal: DealWithRelations | DealWithIntelligence): deal is DealWithIntelligence {
  return 'intelligence' in deal && deal.intelligence !== undefined
}

/**
 * Check if deal has next action
 */
export function hasNextAction(intelligence: DealIntelligence): intelligence is DealIntelligence & { nextAction: DealNextAction } {
  return intelligence.nextAction !== null
}

/**
 * Get probability color based on percentage
 */
export function getProbabilityColor(percentage: number): { color: string; label: string } {
  if (percentage >= 70) return PROBABILITY_COLORS.HIGH
  if (percentage >= 40) return PROBABILITY_COLORS.MEDIUM
  return PROBABILITY_COLORS.LOW
}

/**
 * Get urgency level from days until due
 */
export function getUrgencyLevel(daysUntil: number): ActionUrgency {
  if (daysUntil <= URGENCY_THRESHOLDS.CRITICAL) return 'critical'
  if (daysUntil <= URGENCY_THRESHOLDS.WARNING) return 'warning'
  return 'info'
}



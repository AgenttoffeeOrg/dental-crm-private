'use client'

/**
 * Next Action Pill Component
 * 
 * Displays upcoming task/action with due date
 * Color-coded urgency: Info (blue), Warning (amber), Critical/Overdue (red)
 */

import { URGENCY_COLORS } from '@/types/deal-intelligence'
import { formatDaysUntil } from '@/lib/intelligence/deal-intelligence'
import type { DealNextAction } from '@/types/deal-intelligence'

interface NextActionPillProps {
  nextAction: DealNextAction
  compact?: boolean  // Compact mode shows less text
  className?: string
}

export function NextActionPill({ nextAction, compact = false, className = '' }: NextActionPillProps) {
  const { label, daysUntil, isOverdue, urgency } = nextAction
  const colors = URGENCY_COLORS[urgency]
  const dueText = formatDaysUntil(daysUntil)
  
  // Truncate label if too long
  const displayLabel = compact && label.length > 20 
    ? `${label.slice(0, 20)}...` 
    : label
  
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
      title={`${label} · ${dueText}`}
    >
      <span className="text-xs leading-none">{isOverdue ? '🔴' : '📌'}</span>
      <span className="text-xs font-medium leading-none truncate">
        {displayLabel}
      </span>
      <span className="text-[10px] leading-none opacity-75">
        {dueText}
      </span>
    </div>
  )
}

/**
 * Compact version - just due date with icon
 */
export function NextActionPillCompact({ nextAction }: { nextAction: DealNextAction }) {
  const { daysUntil, isOverdue, urgency } = nextAction
  const colors = URGENCY_COLORS[urgency]
  const dueText = formatDaysUntil(daysUntil)
  
  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
      title={nextAction.label}
    >
      <span className="text-xs leading-none">{isOverdue ? '🔴' : '📌'}</span>
      <span className="text-[10px] font-medium leading-none">
        {dueText}
      </span>
    </div>
  )
}



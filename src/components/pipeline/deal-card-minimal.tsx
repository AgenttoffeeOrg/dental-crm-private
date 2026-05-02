'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'
import type { DealWithRelations } from '@/types/database'

interface DealCardMinimalProps {
  deal: DealWithRelations
  isDragging?: boolean
  onDealClick: (dealId: string) => void
}

/**
 * Minimal Deal Card - World-Class UI
 * 
 * Shows ONLY essential information:
 * - Contact name with avatar
 * - Deal title (truncated)
 * - Value (prominent)
 * - Age badge (color-coded)
 * - Next action date (if exists)
 * - Drag handle
 * 
 * Everything else is in the detail view.
 * Target: ~80 lines, clean, scannable, fast.
 */
export function DealCardMinimal({ deal, isDragging = false, onDealClick }: DealCardMinimalProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: deal.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  }

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  // Get contact initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Calculate days in stage
  const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at))
  
  // Aging status - Muted, professional colors
  let agingColor = 'bg-gray-100 text-gray-600 border border-gray-200'
  if (daysInStage > 30) agingColor = 'bg-red-50 text-red-600 border border-red-100'
  else if (daysInStage > 14) agingColor = 'bg-orange-50 text-orange-600 border border-orange-100'
  else if (daysInStage > 7) agingColor = 'bg-amber-50 text-amber-600 border border-amber-100'

  const handleClick = () => onDealClick(deal.id)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onDealClick(deal.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View deal ${deal.name || deal.id}`}
      className={cn(
        'group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200',
        'hover:border-blue-300 hover:shadow-md',
        (isDragging || isSortableDragging) && 'ring-2 ring-blue-300 shadow-lg'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-3 flex h-5 w-5 -translate-y-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 opacity-70 shadow-sm transition-all duration-200 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Contact */}
      <div className="mb-2 flex items-center gap-2 pl-5">
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
            {deal.contact?.full_name ? getInitials(deal.contact.full_name) : '?'}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-gray-900 truncate">
          {deal.contact?.full_name || 'Unknown'}
        </span>
      </div>

      {/* Deal Title */}
      <div className="mb-2 pl-5">
        <p className="line-clamp-1 text-xs text-gray-700">
          {deal.title}
        </p>
      </div>

      {/* Value & Age */}
      <div className="flex items-center justify-between pl-5">
        <span className="text-lg font-semibold text-gray-900">
          {formatCurrency(deal.value_estimate_cents)}
        </span>
        <Badge className={cn('text-xs font-medium', agingColor)}>
          {daysInStage}d
        </Badge>
      </div>

      {/* Next Action Date (if exists) - Only show recent or upcoming */}
      {deal.last_activity_at && differenceInDays(new Date(), new Date(deal.last_activity_at)) < 7 && (
        <div className="mt-2 flex items-center gap-1 pl-5 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(deal.last_activity_at), { addSuffix: true })}</span>
        </div>
      )}
    </div>
  )
}


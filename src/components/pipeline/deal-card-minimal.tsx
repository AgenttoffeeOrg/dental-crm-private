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
  
  // Aging status
  let agingColor = 'bg-green-100 text-green-800'
  if (daysInStage > 30) agingColor = 'bg-red-100 text-red-800'
  else if (daysInStage > 14) agingColor = 'bg-orange-100 text-orange-800'
  else if (daysInStage > 7) agingColor = 'bg-yellow-100 text-yellow-800'

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onDealClick(deal.id)}
      className={cn(
        'group relative bg-white rounded-lg border border-gray-200 p-3',
        'hover:border-blue-400 hover:shadow-md transition-all duration-200',
        'cursor-pointer',
        (isDragging || isSortableDragging) && 'shadow-lg ring-2 ring-blue-400'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Contact */}
      <div className="flex items-center gap-2 mb-2 pl-4">
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
      <div className="mb-2 pl-4">
        <p className="text-xs text-gray-700 line-clamp-1">
          {deal.title}
        </p>
      </div>

      {/* Value & Age */}
      <div className="flex items-center justify-between pl-4">
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(deal.value_estimate_cents)}
        </span>
        <Badge className={cn('text-xs font-medium', agingColor)}>
          {daysInStage}d
        </Badge>
      </div>

      {/* Next Action Date (if exists) - Only show recent or upcoming */}
      {deal.last_activity_at && differenceInDays(new Date(), new Date(deal.last_activity_at)) < 7 && (
        <div className="mt-2 pl-4 flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(deal.last_activity_at), { addSuffix: true })}</span>
        </div>
      )}
    </div>
  )
}


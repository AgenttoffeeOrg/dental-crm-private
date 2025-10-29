'use client'

/**
 * Premium Deal Card Component
 * 
 * Enterprise-grade redesign for pipeline board
 * Features: Intelligence row, clean hierarchy, premium aesthetics, full DnD support
 */

import { useState, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ProbabilityRing } from './deal-intelligence/ProbabilityRing'
import { HealthPill } from './deal-intelligence/HealthPill'
import { NextActionPill } from './deal-intelligence/NextActionPill'
import { enhanceDealWithIntelligence } from '@/lib/intelligence/deal-intelligence'
import { formatCurrency, formatDaysAgo, formatTreatmentTags, getInitials } from '@/lib/intelligence/deal-intelligence'
import { MoreVertical, Phone, FileText, MapPin, Clock } from 'lucide-react'
import type { DealWithRelations, PipelineStage } from '@/types/database'
import type { DealWithIntelligence } from '@/types/deal-intelligence'

interface DealCardPremiumProps {
  deal: DealWithRelations
  stages: PipelineStage[]
  locationName?: string | null
  isDragging?: boolean
  compact?: boolean  // Compact mode toggle
  onDealUpdate?: () => void
}

export function DealCardPremium({
  deal,
  stages,
  locationName = null,
  isDragging = false,
  compact = false,
  onDealUpdate
}: DealCardPremiumProps) {
  const router = useRouter()
  const [showActions, setShowActions] = useState(false)
  
  // Enhance deal with intelligence
  const enhancedDeal: DealWithIntelligence = useMemo(
    () => enhanceDealWithIntelligence(deal, stages, locationName),
    [deal, stages, locationName]
  )
  
  const { intelligence, metadata } = enhancedDeal
  
  // DnD setup - entire card is draggable
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
  
  // Premium drag styles
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.6 : 1,
  }
  
  const isBeingDragged = isDragging || isSortableDragging
  
  // Navigate on double-click instead of single click to avoid drag conflicts
  const handleDoubleClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, a')) {
      return
    }
    router.push(`/deals/${deal.id}`)
  }
  
  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      router.push(`/deals/${deal.id}`)
    }
  }
  
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Deal: ${deal.title}, Contact: ${deal.contact.full_name}, Value: ${formatCurrency(deal.value_estimate_cents)}`}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`
        group relative cursor-move
        transition-all duration-200 ease-out
        bg-white border border-gray-200
        hover:border-gray-300
        ${isBeingDragged 
          ? 'shadow-[0_12px_32px_0_rgb(0_0_0_/_0.15),_0_2px_8px_0_rgb(59_130_246_/_0.1)] scale-[1.02] rotate-1' 
          : 'shadow-[0_2px_12px_0_rgb(0_0_0_/_0.06)] hover:shadow-[0_6px_20px_0_rgb(0_0_0_/_0.10)]'
        }
        ${compact ? 'rounded-lg' : 'rounded-xl'}
      `}
    >
      {/* Thin top accent bar (8-10% opacity of stage color) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600/10 rounded-t-xl" />
      
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="space-y-3">
          {/* HEADER BLOCK */}
          <div className="space-y-1.5">
            {/* Treatment/Service line (muted, small) */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">
                {formatTreatmentTags(deal.treatment_tags)}
              </span>
              
              {/* Hover-only menu (⋯) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => router.push(`/deals/${deal.id}`)}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/deals/${deal.id}?edit=true`)}>
                    Edit Deal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/contacts/${deal.contact_id}`)}>
                    View Contact
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Main title (patient/case) */}
            <Link 
              href={`/deals/${deal.id}`}
              className="block font-semibold text-sm text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
              onClick={(e) => e.stopPropagation()}
            >
              {deal.title}
            </Link>
            
            {/* Contact name + email (subtle) */}
            <Link
              href={`/contacts/${deal.contact_id}`}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar className="h-4 w-4 flex-shrink-0">
                <AvatarFallback className="text-[8px] bg-gray-100 text-gray-600">
                  {getInitials(deal.contact.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{deal.contact.full_name}</span>
            </Link>
          </div>
          
          {/* MONEY + AGE ROW */}
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-gray-900 tracking-tight">
              {formatCurrency(deal.value_estimate_cents)}
            </span>
            <span className="text-[10px] font-medium text-gray-500">
              {formatDaysAgo(metadata.age)}
            </span>
          </div>
          
          {/* META ROW (compact, iconified) */}
          <div className="flex items-center gap-3 text-[10px] text-gray-600">
            {/* Owner avatar */}
            {deal.owner && (
              <div className="flex items-center gap-1" title={`Owner: ${deal.owner.full_name}`}>
                <Avatar className="h-4 w-4 flex-shrink-0">
                  <AvatarFallback className="text-[8px] bg-blue-100 text-blue-700">
                    {getInitials(deal.owner.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            
            {/* Practice/Location */}
            {metadata.practiceName && (
              <div className="flex items-center gap-0.5" title={`Practice: ${metadata.practiceName}`}>
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="truncate max-w-[80px]">{metadata.practiceName}</span>
              </div>
            )}
            
            {/* Calls count */}
            {metadata.callsCount > 0 && (
              <div className="flex items-center gap-0.5" title={`${metadata.callsCount} calls`}>
                <Phone className="h-3 w-3 text-gray-400" />
                <span>{metadata.callsCount}</span>
              </div>
            )}
            
            {/* Notes count */}
            {metadata.notesCount > 0 && (
              <div className="flex items-center gap-0.5" title={`${metadata.notesCount} notes`}>
                <FileText className="h-3 w-3 text-gray-400" />
                <span>{metadata.notesCount}</span>
              </div>
            )}
            
            {/* Last follow-up */}
            {metadata.lastFollowUp && (
              <div className="flex items-center gap-0.5 ml-auto" title={`Last activity: ${formatDaysAgo(metadata.age)}`}>
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">{formatDaysAgo(Math.floor((new Date().getTime() - metadata.lastFollowUp.getTime()) / (1000 * 60 * 60 * 24)))}</span>
              </div>
            )}
          </div>
          
          {/* DEAL INTELLIGENCE ROW - Always visible for consistency */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 min-h-[40px]">
            {/* Probability */}
            {intelligence.probability && (
              <div className="flex items-center gap-1.5" title={`${intelligence.probability.percentage}% probability`}>
                <ProbabilityRing probability={intelligence.probability} size={32} strokeWidth={3} />
              </div>
            )}
            
            {/* Health - Always show */}
            <HealthPill health={intelligence.health} compact={false} className="text-[10px]" />
            
            {/* Next Action - Show if available, otherwise placeholder for spacing */}
            {intelligence.nextAction ? (
              <NextActionPill nextAction={intelligence.nextAction} compact className="text-[10px] flex-1 min-w-0" />
            ) : (
              <div className="flex-1" /> 
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


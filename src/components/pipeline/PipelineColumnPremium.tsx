'use client'

/**
 * Premium Pipeline Column Component
 * 
 * Features: Sticky header (StageName · £Total · Count), premium styling, smooth DnD
 */

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge } from '@/components/ui/badge'
import { DealCardPremium } from './DealCardPremium'
import { formatCurrency } from '@/lib/intelligence/deal-intelligence'
import type { PipelineStage, DealWithRelations } from '@/types/database'

interface PipelineColumnPremiumProps {
  stage: PipelineStage
  deals: DealWithRelations[]
  stages: PipelineStage[]  // All stages for probability calculation
  locationMap?: Map<string, string>  // For location names
  compact?: boolean
  onDealUpdate?: () => void
}

export function PipelineColumnPremium({
  stage,
  deals,
  stages,
  locationMap = new Map(),
  compact = false,
  onDealUpdate
}: PipelineColumnPremiumProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })
  
  // Calculate total value
  const totalValue = deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0)
  
  // Calculate deal count
  const dealCount = deals.length
  
  return (
    <div 
      ref={setNodeRef}
      className={`
        flex-shrink-0 w-[340px] h-full flex flex-col
        ${isOver ? 'ring-2 ring-blue-500/30' : ''}
      `}
    >
      {/* STICKY HEADER - StageName · £Total · Count */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Stage Name */}
          <h3 className="font-semibold text-sm text-gray-900 truncate">
            {stage.name}
          </h3>
          
          {/* Divider */}
          <span className="text-gray-300">·</span>
          
          {/* Total Value */}
          <span className="text-sm font-bold text-brand-navy-700 truncate">
            {formatCurrency(totalValue)}
          </span>
          
          {/* Divider */}
          <span className="text-gray-300">·</span>
          
          {/* Deal Count Badge */}
          <Badge 
            variant="secondary" 
            className="bg-white border border-gray-200 text-brand-navy-700 font-semibold px-2 py-0.5 text-xs"
          >
            {dealCount}
          </Badge>
        </div>
      </div>
      
      {/* COLUMN BODY - Scrollable deals list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        <SortableContext 
          items={deals.map(d => d.id)} 
          strategy={verticalListSortingStrategy}
        >
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-sm text-gray-400 font-medium">No deals</p>
              <p className="text-xs text-gray-400 mt-1">Drag deals here</p>
            </div>
          ) : (
            deals.map(deal => {
              const locationName = deal.location_id ? locationMap.get(deal.location_id) : null
              return (
                <DealCardPremium
                  key={deal.id}
                  deal={deal}
                  stages={stages}
                  locationName={locationName}
                  compact={compact}
                  onDealUpdate={onDealUpdate}
                />
              )
            })
          )}
        </SortableContext>
      </div>
    </div>
  )
}



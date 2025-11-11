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
import { cn } from '@/lib/utils'
import type { PipelineStage, DealWithRelations } from '@/types/database'

interface PipelineColumnPremiumProps {
  stage: PipelineStage
  deals: DealWithRelations[]
  stages: PipelineStage[]  // All stages for probability calculation
  locationMap?: Map<string, string>  // For location names
  compact?: boolean
  onDealUpdate?: () => void
  tagPalette?: Map<string, { color: string; icon: string }>
}

export function PipelineColumnPremium({
  stage,
  deals,
  stages,
  locationMap = new Map(),
  compact = false,
  onDealUpdate,
  tagPalette
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
      className={cn(
        'flex h-full w-[340px] flex-shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 shadow-[0_1px_6px_rgba(15,23,42,0.04)] transition-colors duration-200',
        isOver && 'border-blue-300 bg-blue-50/70 shadow-[0_8px_20px_rgba(56,189,248,0.15)]'
      )}
    >
      {/* STICKY HEADER - StageName · £Total · Count */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          {/* Stage Name */}
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {stage.name}
          </h3>

          {/* Divider */}
          <span className="text-slate-300">·</span>

          {/* Total Value */}
          <span className="truncate text-sm font-semibold text-brand-navy-700">
            {formatCurrency(totalValue)}
          </span>

          {/* Divider */}
          <span className="text-slate-300">·</span>

          {/* Deal Count Badge */}
          <Badge
            variant="secondary"
            className="border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-brand-navy-700"
          >
            {dealCount}
          </Badge>
        </div>
      </div>

      {/* COLUMN BODY - Scrollable deals list */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto px-4 py-4 transition-colors duration-150',
          'rounded-2xl rounded-t-none bg-transparent',
          isOver
            ? 'border border-dashed border-blue-300 bg-blue-50/40 shadow-inner'
            : 'border border-transparent bg-transparent'
        )}
      >
        <SortableContext 
          items={deals.map(d => d.id)} 
          strategy={verticalListSortingStrategy}
        >
          {deals.length === 0 ? (
            <div className="flex h-36 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white/40 text-center text-slate-400">
              <p className="text-sm font-medium">No deals</p>
              <p className="mt-1 text-xs">Drag deals here or create a new one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map(deal => {
                const locationName = deal.location_id ? locationMap.get(deal.location_id) : null
                return (
                  <DealCardPremium
                    key={deal.id}
                    deal={deal}
                    stages={stages}
                    locationName={locationName}
                    compact={compact}
                    onDealUpdate={onDealUpdate}
                    tagPalette={tagPalette}
                  />
                )
              })}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}



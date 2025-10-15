'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DealCardMinimal as DealCard } from './deal-card-minimal'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import type { PipelineStage, DealWithRelations } from '@/types/database'

interface PipelineColumnProps {
  stage: PipelineStage
  deals: DealWithRelations[]
  onDealUpdate?: () => void
  onDealClick?: (dealId: string) => void
  allDeals?: DealWithRelations[] // For calculating conversion rate
}

export function PipelineColumn({ stage, deals, onDealUpdate, onDealClick, allDeals = [] }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const totalValue = deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0)

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  // Calculate average days in stage
  const avgDaysInStage = deals.length > 0
    ? Math.round(
        deals.reduce((sum, deal) => {
          return sum + differenceInDays(new Date(), new Date(deal.updated_at))
        }, 0) / deals.length
      )
    : 0

  // Calculate trend (comparing to last 7 days vs previous 7 days)
  const now = new Date()
  const last7Days = deals.filter(d => 
    differenceInDays(now, new Date(d.created_at)) <= 7
  ).length
  const previous7Days = deals.filter(d => {
    const days = differenceInDays(now, new Date(d.created_at))
    return days > 7 && days <= 14
  }).length
  
  const trend = previous7Days > 0 
    ? ((last7Days - previous7Days) / previous7Days) * 100 
    : last7Days > 0 ? 100 : 0

  return (
    <div className="flex-shrink-0 w-80">
      <Card className={`h-full ${isOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} border-gray-200`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-sm font-semibold text-gray-900">{stage.name}</CardTitle>
            <Badge variant="secondary" className="text-xs font-medium">
              {deals.length}
            </Badge>
          </div>
          
          {/* Enhanced Metrics Row */}
          <div className="space-y-1">
            {/* Total Value */}
            {totalValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Value</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            )}
            
            {/* Average Days in Stage */}
            {deals.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Avg Age
                </span>
                <span className={cn(
                  "text-xs font-medium",
                  avgDaysInStage > 14 ? "text-orange-600" : "text-gray-600"
                )}>
                  {avgDaysInStage}d
                </span>
              </div>
            )}
            
            {/* Trend Indicator */}
            {deals.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">7d Trend</span>
                <span className={cn(
                  "text-xs font-medium flex items-center gap-0.5",
                  trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500"
                )}>
                  {trend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trend < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {Math.abs(Math.round(trend))}%
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div
            ref={setNodeRef}
            className="space-y-3 min-h-[400px]"
            style={{
              backgroundColor: isOver ? '#f0f9ff' : 'transparent',
            }}
          >
            <SortableContext 
              items={deals.map(deal => deal.id)}
              strategy={verticalListSortingStrategy}
            >
              {deals.map(deal => (
                <DealCard 
                  key={deal.id} 
                  deal={deal} 
                  onDealUpdate={onDealUpdate}
                  onDealClick={onDealClick}
                />
              ))}
            </SortableContext>
            
            {deals.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="space-y-2">
                  <div className="text-gray-300">No deals in this stage</div>
                  <div className="text-xs text-gray-400">Drag deals here or create a new one</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

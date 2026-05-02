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
    <div className="w-80 flex-shrink-0">
      <Card
        className={cn(
          'h-full rounded-2xl border border-slate-200 bg-slate-50/80 shadow-[0_1px_6px_rgba(15,23,42,0.04)] transition-colors duration-200',
          isOver && 'border-blue-300 bg-blue-50/70 shadow-[0_8px_20px_rgba(56,189,248,0.15)]'
        )}
      >
        <CardHeader className="border-b border-slate-200 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900">{stage.name}</CardTitle>
            <Badge variant="secondary" className="border border-slate-200 bg-white text-xs font-semibold text-brand-navy-700">
              {deals.length}
            </Badge>
          </div>

          {/* Enhanced Metrics Row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Total Value</span>
              <span className="text-sm font-semibold text-brand-navy-700">
                {formatCurrency(totalValue)}
              </span>
            </div>

            {deals.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  Avg Age
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    avgDaysInStage > 14 ? 'text-orange-600' : 'text-slate-600'
                  )}
                >
                  {avgDaysInStage}d
                </span>
              </div>
            )}

            {deals.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">7d Trend</span>
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium',
                    (() => {
                      if (trend > 0) return 'text-emerald-600'
                      if (trend < 0) return 'text-rose-600'
                      return 'text-slate-500'
                    })()
                  )}
                >
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
        <CardContent className="px-4 pb-4 pt-0">
          <div
            ref={setNodeRef}
            className={cn(
              'min-h-[320px] space-y-3 rounded-2xl rounded-t-none px-1 py-4 transition-colors duration-150',
              isOver
                ? 'border border-dashed border-blue-300 bg-blue-50/40 shadow-inner'
                : 'border border-transparent bg-transparent'
            )}
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
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white/60 text-center">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-400">No deals in this stage</div>
                  <div className="text-xs text-slate-400">Drag deals here or create a new one</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

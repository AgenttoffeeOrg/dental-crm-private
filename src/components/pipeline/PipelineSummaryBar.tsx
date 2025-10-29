'use client'

/**
 * Pipeline Summary Bar Component
 * 
 * Sticky summary bar showing key metrics:
 * Total Deals | Total Projected Value | Conversion Rate
 */

import { formatCurrency } from '@/lib/intelligence/deal-intelligence'
import { TrendingUp, DollarSign, Target } from 'lucide-react'
import type { DealWithRelations, PipelineStage } from '@/types/database'

interface PipelineSummaryBarProps {
  deals: DealWithRelations[]
  stages: PipelineStage[]
  className?: string
}

export function PipelineSummaryBar({ deals, stages, className = '' }: PipelineSummaryBarProps) {
  // Calculate total deals
  const totalDeals = deals.length
  
  // Calculate total projected value
  const totalValue = deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0)
  
  // Calculate conversion rate
  // Simplified: deals in final stage / total deals
  // More accurate would be: deals moved to final stage in timeframe / deals created in timeframe
  const sortedStages = [...stages].sort((a, b) => a.position - b.position)
  const finalStageId = sortedStages[sortedStages.length - 1]?.id
  const dealsInFinalStage = deals.filter(d => d.stage_id === finalStageId).length
  const conversionRate = totalDeals > 0 ? Math.round((dealsInFinalStage / totalDeals) * 100) : 0
  
  return (
    <div className={`sticky top-0 z-20 bg-white border-b border-gray-200 ${className}`}>
      <div className="px-8 py-4">
        <div className="flex items-center justify-center gap-12">
          {/* Total Deals */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Deals</p>
              <p className="text-2xl font-bold text-gray-900">{totalDeals}</p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-12 w-px bg-gray-200" />
          
          {/* Total Projected Value */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projected Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-12 w-px bg-gray-200" />
          
          {/* Conversion Rate */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



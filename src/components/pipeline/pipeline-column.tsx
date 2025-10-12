'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DealCard } from './deal-card-fixed'
import type { PipelineStage, DealWithRelations } from '@/types/database'

interface PipelineColumnProps {
  stage: PipelineStage
  deals: DealWithRelations[]
  onDealUpdate?: () => void
  onDealClick?: (dealId: string) => void
}

export function PipelineColumn({ stage, deals, onDealUpdate, onDealClick }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const totalValue = deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0)

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  return (
    <div className="flex-shrink-0 w-80">
      <Card className={`h-full ${isOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} border-gray-200`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">{stage.name}</CardTitle>
            <Badge variant="secondary" className="text-xs font-medium">
              {deals.length}
            </Badge>
          </div>
          {totalValue > 0 && (
            <div className="text-sm font-medium text-gray-700 mt-1">
              {formatCurrency(totalValue)}
            </div>
          )}
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

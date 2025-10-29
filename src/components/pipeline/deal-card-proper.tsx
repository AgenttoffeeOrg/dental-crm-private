'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DealDetailView } from '../deals/deal-detail-view-modal'
import { getActivityAge } from '@/lib/dates'
import { Edit, Eye } from 'lucide-react'
import type { DealWithRelations } from '@/types/database'

interface DealCardProps {
  deal: DealWithRelations
  isDragging?: boolean
  onDealUpdate?: () => void
}

export function DealCard({ deal, isDragging = false, onDealUpdate }: DealCardProps) {
  const [showDealDetail, setShowDealDetail] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  const getContactInitials = (name: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getDealTypeColor = (dealType: string) => {
    switch (dealType) {
      case 'new_lead': return 'bg-blue-100 text-blue-800'
      case 'existing_patient': return 'bg-green-100 text-green-800'
      case 'pms_import': return 'bg-brand-navy-100 text-brand-navy-800'
      case 'referral': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDealTypeLabel = (dealType: string) => {
    switch (dealType) {
      case 'new_lead': return 'New Lead'
      case 'existing_patient': return 'Existing Patient'
      case 'pms_import': return 'PMS Import'
      case 'referral': return 'Referral'
      default: return 'Deal'
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open if clicking on buttons or dragging
    if ((e.target as HTMLElement).closest('button') || isSortableDragging) {
      return
    }
    setShowDealDetail(true)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  // Safety checks
  if (!deal || !deal.contact) {
    return (
      <Card className="mb-3 bg-red-50 border-red-200">
        <CardContent className="p-4">
          <p className="text-red-600 text-sm">Invalid deal data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Deal header with action buttons */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 truncate cursor-pointer hover:text-blue-600">
                  {deal.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getContactInitials(deal.contact.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-600 cursor-pointer hover:text-blue-600">
                    {deal.contact.full_name}
                  </span>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={handleEditClick}
                  title="Edit Deal"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDealDetail(true)
                  }}
                  title="View Deal Details"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Deal type badge */}
            {deal.deal_type && (
              <div>
                <Badge className={`text-xs ${getDealTypeColor(deal.deal_type)}`}>
                  {getDealTypeLabel(deal.deal_type)}
                </Badge>
              </div>
            )}

            {/* Treatment tags */}
            {deal.treatment_tags && Array.isArray(deal.treatment_tags) && deal.treatment_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {deal.treatment_tags.slice(0, 3).map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-2 py-0"
                  >
                    {tag}
                  </Badge>
                ))}
                {deal.treatment_tags.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2 py-0">
                    +{deal.treatment_tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Value and last activity */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">
                {deal.value_estimate_cents > 0 
                  ? formatCurrency(deal.value_estimate_cents)
                  : 'No value'
                }
              </span>
              <span>
                {getActivityAge(deal.last_activity_at)}
              </span>
            </div>

            {/* Owner */}
            {deal.owner && (
              <div className="text-xs text-gray-500">
                Owner: {deal.owner.full_name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deal Detail Modal */}
      {showDealDetail && (
        <DealDetailView
          dealId={deal.id}
          onClose={() => setShowDealDetail(false)}
        />
      )}
    </>
  )
}

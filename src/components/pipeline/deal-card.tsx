'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SimpleDealDialog } from '@/components/deals/simple-deal-dialog'
import { DealTreatmentTags } from '@/components/deals/deal-treatment-tags'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { getActivityAge } from '@/lib/dates'
import { Edit, Eye } from 'lucide-react'
import type { DealWithRelations } from '@/types/database'

interface DealCardProps {
  deal: DealWithRelations
  isDragging?: boolean
  onDealUpdate?: () => void
}

export function DealCard({ deal, isDragging = false, onDealUpdate }: DealCardProps) {
  const [dealProfileOpen, setDealProfileOpen] = useState(false)
  const { orgId } = useTenantContext()

  console.log('DealCard rendering with deal:', deal?.id, deal?.title)

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('Edit button clicked for deal:', deal?.id, deal?.title)
    try {
      setDealProfileOpen(true)
      console.log('Dialog should be opening, dealProfileOpen set to true')
    } catch (error) {
      console.error('Error opening deal edit dialog:', error)
    }
  }

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
      case 'pms_import': return 'bg-purple-100 text-purple-800'
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

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Deal header with action buttons */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/deals/${deal.id}`}
                  className="font-medium text-sm hover:text-blue-600 transition-colors block truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {deal.title}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getContactInitials(deal.contact.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/contacts/${deal.contact.id}`}
                    className="text-xs text-gray-600 hover:text-blue-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {deal.contact.full_name}
                  </Link>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-1 ml-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-100 hover:bg-gray-100"
                  onClick={handleEditClick}
                  title="Edit Deal"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Link href={`/deals/${deal.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View Deal Details"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </Link>
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

            {/* Treatment tags - Enhanced with colors and icons */}
            {deal.treatment_tags.length > 0 && orgId && (
              <div>
                <DealTreatmentTags
                  dealId={deal.id}
                  dealTags={deal.treatment_tags || []}
                  orgId={orgId}
                  compact={true}
                  editable={false}
                  showHistory={false}
                />
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
            
            {/* Test Edit Button */}
            <div className="pt-2 border-t border-gray-100">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={handleEditClick}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit Deal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deal Profile Dialog */}
      {console.log('About to render SimpleDealDialog with:', { dealProfileOpen, deal: deal?.id })}
      <SimpleDealDialog
        deal={deal}
        open={dealProfileOpen}
        onOpenChange={(open) => {
          console.log('Dialog onOpenChange called with:', open)
          setDealProfileOpen(open)
        }}
        onDealUpdated={() => {
          console.log('Deal updated callback called')
          onDealUpdate?.()
        }}
        mode="edit"
      />
    </>
  )
}

'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getActivityAge } from '@/lib/dates'
import { Edit, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { DealWithRelations } from '@/types/database'

interface DealCardProps {
  deal: DealWithRelations
  isDragging?: boolean
  onDealUpdate?: () => void
}

export function DealCard({ deal, isDragging = false, onDealUpdate }: DealCardProps) {
  const [showEditAlert, setShowEditAlert] = useState(false)

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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('Edit clicked for deal:', deal?.id)
    
    try {
      // For now, just show a toast instead of opening a dialog
      toast.info(`Edit functionality for deal: ${deal?.title || 'Unknown'}`)
      setShowEditAlert(true)
      setTimeout(() => setShowEditAlert(false), 3000)
    } catch (error) {
      console.error('Error in handleEditClick:', error)
      toast.error('Error occurred')
    }
  }

  // Safety checks
  if (!deal) {
    console.error('DealCard received null/undefined deal')
    return null
  }

  if (!deal.contact) {
    console.error('DealCard received deal without contact:', deal)
    return null
  }

  return (
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
                {deal.title || 'Untitled Deal'}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getContactInitials(deal.contact?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <Link
                  href={`/contacts/${deal.contact.id}`}
                  className="text-xs text-gray-600 hover:text-blue-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {deal.contact?.full_name || 'Unknown Contact'}
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
                  className="h-6 w-6 p-0 opacity-100 hover:bg-gray-100"
                  title="View Deal Details"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Deal type badge - only show if exists */}
          {deal.deal_type && (
            <div>
              <Badge className="text-xs bg-blue-100 text-blue-800">
                {deal.deal_type.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          )}

          {/* Treatment tags - with safety check */}
          {deal.treatment_tags && Array.isArray(deal.treatment_tags) && deal.treatment_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {deal.treatment_tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={`${tag}-${index}`}
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
              {deal.value_estimate_cents && deal.value_estimate_cents > 0 
                ? formatCurrency(deal.value_estimate_cents)
                : 'No value'
              }
            </span>
            <span>
              {deal.last_activity_at ? getActivityAge(deal.last_activity_at) : 'No activity'}
            </span>
          </div>

          {/* Owner - with safety check */}
          {deal.owner && deal.owner.full_name && (
            <div className="text-xs text-gray-500">
              Owner: {deal.owner.full_name}
            </div>
          )}
          
          {/* Edit Alert */}
          {showEditAlert && (
            <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
              🚧 Edit dialog temporarily disabled. Click working! Deal ID: {deal.id}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

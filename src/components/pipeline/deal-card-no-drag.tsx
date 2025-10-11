'use client'

import { useState } from 'react'
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
    e.preventDefault()
    e.stopPropagation()
    console.log('Edit clicked for deal:', deal?.id)
    
    try {
      toast.success(`Edit clicked! Deal: ${deal?.title || 'Unknown'}`)
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
    return <div className="p-4 bg-red-100 text-red-600 text-sm">Invalid deal data</div>
  }

  if (!deal.contact) {
    console.error('DealCard received deal without contact:', deal)
    return <div className="p-4 bg-yellow-100 text-yellow-600 text-sm">Deal missing contact data</div>
  }

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Deal header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {deal.title || 'Untitled Deal'}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getContactInitials(deal.contact?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-600">
                  {deal.contact?.full_name || 'Unknown Contact'}
                </span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                onClick={handleEditClick}
                title="Edit Deal"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toast.info(`View deal: ${deal.title}`)
                }}
                title="View Deal Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Deal type badge */}
          {deal.deal_type && (
            <div>
              <Badge className="text-xs bg-blue-100 text-blue-800">
                {deal.deal_type.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          )}

          {/* Treatment tags */}
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

          {/* Owner */}
          {deal.owner && deal.owner.full_name && (
            <div className="text-xs text-gray-500">
              Owner: {deal.owner.full_name}
            </div>
          )}
          
          {/* Edit Alert */}
          {showEditAlert && (
            <div className="p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800">
              ✅ Edit button working! Deal ID: {deal.id}
            </div>
          )}

          {/* Test Button */}
          <div className="pt-2 border-t border-gray-100">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={handleEditClick}
            >
              <Edit className="h-3 w-3 mr-1" />
              TEST EDIT BUTTON
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

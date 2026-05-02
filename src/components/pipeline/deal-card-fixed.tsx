'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { DealDetailView } from '../deals/deal-detail-view-modal'
import { DealIntelligenceCard } from '../deals/deal-intelligence-card'
import { getActivityAge } from '@/lib/dates'
import { Edit, Eye, GripVertical, Check, X, Pencil, Mail, MousePointerClick } from 'lucide-react'
import { toast } from 'sonner'
import type { DealWithRelations } from '@/types/database'

interface DealCardProps {
  deal: DealWithRelations
  isDragging?: boolean
  onDealUpdate?: () => void
  onDealClick?: (dealId: string) => void
}

export function DealCard({ deal, isDragging = false, onDealUpdate, onDealClick }: DealCardProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(deal.title)
  const supabase = require('@/lib/supabase-client').createClient()

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

  const getMarketingSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'campaign': return <Mail className="h-3 w-3" />
      case 'form': return <MousePointerClick className="h-3 w-3" />
      case 'landing_page': return <MousePointerClick className="h-3 w-3" />
      case 'journey': return <Mail className="h-3 w-3" />
      default: return null
    }
  }

  const getMarketingSourceLabel = (sourceType: string, sourceName?: string) => {
    if (sourceName) return sourceName
    
    switch (sourceType) {
      case 'campaign': return 'Email Campaign'
      case 'form': return 'Marketing Form'
      case 'landing_page': return 'Landing Page'
      case 'journey': return 'Marketing Journey'
      default: return 'Marketing'
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editingTitle && onDealClick) {
      onDealClick(deal.id)
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDealClick) {
      onDealClick(deal.id)
    }
  }

  const handleEditTitle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTempTitle(deal.title)
    setEditingTitle(true)
  }

  const handleSaveTitle = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (!tempTitle.trim()) {
      toast.error('Deal title cannot be empty')
      return
    }

    try {
      const { error } = await supabase
        .from('deals')
        .update({ title: tempTitle.trim(), updated_at: new Date().toISOString() })
        .eq('id', deal.id)

      if (error) throw error

      toast.success('Deal title updated')
      setEditingTitle(false)
      if (onDealUpdate) onDealUpdate()
    } catch (error) {
      console.error('Error updating deal title:', error)
      toast.error('Failed to update deal title')
    }
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingTitle(false)
    setTempTitle(deal.title)
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
        className="mb-2.5 hover:shadow-md transition-shadow group bg-white border border-gray-200 cursor-pointer"
        onClick={handleCardClick}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
        role="button"
        tabIndex={0}
        aria-label={`View deal ${deal.title || deal.id}`}
      >
        <CardContent className="p-3.5">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="float-right cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity ml-2"
            onClick={(e) => e.stopPropagation()}
            title="Drag to move"
          >
            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
          </div>

          {/* Deal Title with Marketing Badge */}
          <div className="mb-2">
            {editingTitle ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    else if (e.key === 'Escape') handleCancelEdit(e as any)
                  }}
                />
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSaveTitle}>
                  <Check className="h-3 w-3 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancelEdit}>
                  <X className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            ) : (
              <>
                <h4 className="font-semibold text-sm text-gray-900 pr-8 leading-tight hover:text-blue-600 transition-colors">
                  {deal.title}
                </h4>
                {/* Marketing Source Badge - Only if deal came from Marketing */}
                {(deal as any).marketing_source_type && (
                  <div className="mt-1.5">
                    <Badge 
                      variant="outline" 
                      className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 h-4 gap-1"
                      title={`Source: ${getMarketingSourceLabel((deal as any).marketing_source_type, (deal as any).marketing_source_name)}`}
                    >
                      {getMarketingSourceIcon((deal as any).marketing_source_type)}
                      <span>{getMarketingSourceLabel((deal as any).marketing_source_type, (deal as any).marketing_source_name)}</span>
                    </Badge>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Contact */}
          <Link 
            href={`/contacts/${deal.contact_id}`}
            className="flex items-center gap-2 mb-3 group/contact"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] font-medium bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {getContactInitials(deal.contact.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600 group-hover/contact:text-blue-600 truncate">
              {deal.contact.full_name}
            </span>
          </Link>

          {/* AI Intelligence - Compact */}
          <div className="mb-2.5">
            <DealIntelligenceCard
              dealId={deal.id}
              contactId={deal.contact_id}
              compact={true}
            />
          </div>

          {/* Deal Info - Compact Grid */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Value</span>
              <span className="font-semibold text-gray-900">
                {deal.value_estimate_cents > 0 ? formatCurrency(deal.value_estimate_cents) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Activity</span>
              <span className="text-gray-700">{getActivityAge(deal.last_activity_at)}</span>
            </div>
            {deal.owner && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Owner</span>
                <span className="text-gray-700">{deal.owner.full_name.split(' ')[0]}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

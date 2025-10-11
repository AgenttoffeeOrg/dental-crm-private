'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActivityTimeline } from '@/components/deals/activity-timeline'
import { DealTasks } from '@/components/deals/deal-tasks'
import { 
  ArrowLeft,
  Edit,
  DollarSign,
  Calendar,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Target,
  Clock,
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import { formatDateTime } from '@/lib/dates'
import { toast } from 'sonner'
import type { Deal, Contact, PipelineStage } from '@/types/database'

interface DealDetailViewProps {
  dealId: string
  onClose: () => void
  onContactClick?: (contactId: string) => void
}

export function DealDetailView({ dealId, onClose, onContactClick }: DealDetailViewProps) {
  const [deal, setDeal] = useState<Deal | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [stage, setStage] = useState<PipelineStage | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editField, setEditField] = useState<'value' | 'stage' | 'tags' | 'source' | 'description' | 'title' | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [allStages, setAllStages] = useState<PipelineStage[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchDealData()
    fetchStages()
  }, [dealId])

  const fetchDealData = async () => {
    try {
      setLoading(true)
      
      // Fetch deal with related data
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(*),
          stage:pipeline_stages(*)
        `)
        .eq('id', dealId)
        .single()

      if (dealError) {
        console.error('Deal error:', dealError)
        throw dealError
      }

      setDeal(dealData)
      setContact(dealData.contact)
      setStage(dealData.stage)
    } catch (error) {
      console.error('Error fetching deal data:', error)
      toast.error('Failed to load deal details')
    } finally {
      setLoading(false)
    }
  }

  const fetchStages = async () => {
    try {
      const { data: stagesData, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('position')

      if (!error && stagesData) {
        setAllStages(stagesData)
      }
    } catch (error) {
      console.error('Error fetching stages:', error)
    }
  }

  const openEditDialog = (field: typeof editField, currentValue: any) => {
    setEditField(field)
    setEditValue(currentValue)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!deal || !editField) return

    try {
      setLoading(true)
      
      const updateData: any = {}
      
      switch (editField) {
        case 'value':
          updateData.value_estimate_cents = Math.round(parseFloat(editValue) * 100)
          break
        case 'stage':
          updateData.pipeline_stage_id = editValue
          break
        case 'tags':
          updateData.treatment_tags = editValue.split(',').map((t: string) => t.trim()).filter(Boolean)
          break
        case 'source':
          updateData.source = editValue
          break
        case 'description':
          updateData.description = editValue
          break
        case 'title':
          updateData.title = editValue
          break
      }

      updateData.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId)

      if (error) throw error

      toast.success('Deal updated successfully')
      setEditDialogOpen(false)
      setEditField(null)
      fetchDealData()
    } catch (error) {
      console.error('Error updating deal:', error)
      toast.error('Failed to update deal')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'call':
        if (contact?.primary_phone) {
          window.location.href = `tel:${contact.primary_phone}`
        } else {
          toast.error('No phone number available')
        }
        break
      case 'email':
        if (contact?.primary_email) {
          window.location.href = `mailto:${contact.primary_email}`
        } else {
          toast.error('No email address available')
        }
        break
      case 'appointment':
        toast.info('Appointment booking will be available in a future update')
        break
    }
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deal details...</p>
        </div>
      </div>
    )
  }

  if (!deal || !contact) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Deal not found</h3>
          <p className="text-gray-600 mb-4">The deal you're looking for doesn't exist.</p>
          <Button onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipeline
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pipeline
            </Button>
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-xl font-semibold text-gray-900">{deal.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                {deal.deal_type && (
                  <Badge className={`text-xs ${getDealTypeColor(deal.deal_type)}`}>
                    {getDealTypeLabel(deal.deal_type)}
                  </Badge>
                )}
                {stage && (
                  <Badge variant="outline" className="text-xs">
                    {stage.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="hover:bg-gray-50"
              onClick={() => openEditDialog('title', deal.title)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Deal Details */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Deal Value - Editable */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Deal Value</h3>
                <div 
                  className="p-4 bg-white rounded-lg border hover:border-blue-300 cursor-pointer group transition-colors"
                  onClick={() => openEditDialog('value', deal.value_estimate_cents / 100)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {deal.value_estimate_cents > 0 
                            ? formatCurrency(deal.value_estimate_cents)
                            : 'No value set'
                          }
                        </div>
                        <div className="text-xs text-gray-600">{deal.currency || 'GBP'}</div>
                      </div>
                    </div>
                    <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Contact Info - Clickable */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Contact</h3>
                <div 
                  className="p-4 bg-white rounded-lg border hover:border-blue-300 cursor-pointer group transition-colors"
                  onClick={() => onContactClick && onContactClick(contact.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm font-medium">
                        {getContactInitials(contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {contact.full_name}
                      </div>
                      <div className="space-y-1 mt-2">
                        {contact.primary_email && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{contact.primary_email}</span>
                          </div>
                        )}
                        {contact.primary_phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="h-3 w-3" />
                            <span>{contact.primary_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Deal Stage - Editable */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Pipeline Stage</h3>
                <div 
                  className="p-4 bg-white rounded-lg border hover:border-blue-300 cursor-pointer group transition-colors"
                  onClick={() => openEditDialog('stage', deal.pipeline_stage_id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {stage && (
                        <Badge variant="outline" className="text-sm px-3 py-1">
                          {stage.name}
                        </Badge>
                      )}
                    </div>
                    <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Treatment Tags - Editable */}
              {deal.treatment_tags && Array.isArray(deal.treatment_tags) && deal.treatment_tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Treatment Tags</h3>
                  <div 
                    className="p-4 bg-white rounded-lg border hover:border-blue-300 cursor-pointer group transition-colors"
                    onClick={() => openEditDialog('tags', deal.treatment_tags.join(', '))}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-wrap gap-2">
                        {deal.treatment_tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 ml-3 flex-shrink-0 transition-opacity" />
                    </div>
                  </div>
                </div>
              )}

              {/* Deal Source - Editable */}
              {deal.source && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Source</h3>
                  <div 
                    className="p-4 bg-white rounded-lg border hover:border-blue-300 cursor-pointer group transition-colors"
                    onClick={() => openEditDialog('source', deal.source)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{deal.source}</span>
                      </div>
                      <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              )}

              {/* Deal Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Deal Information</h3>
                <div className="p-4 bg-white rounded-lg border">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Created</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {formatDateTime(deal.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Last Activity</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {formatDateTime(deal.last_activity_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description - Editable */}
              {deal.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Description</h3>
                  <div 
                    className="p-4 bg-white rounded-lg border hover:border-blue-300 cursor-pointer group transition-colors"
                    onClick={() => openEditDialog('description', deal.description)}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700 flex-1 leading-relaxed">{deal.description}</p>
                      <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 ml-3 flex-shrink-0 transition-opacity" />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start hover:bg-gray-50"
                    onClick={() => handleQuickAction('call')}
                  >
                    <Phone className="h-4 w-4 mr-3" />
                    Schedule Call
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start hover:bg-gray-50"
                    onClick={() => handleQuickAction('email')}
                  >
                    <Mail className="h-4 w-4 mr-3" />
                    Send Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start hover:bg-gray-50"
                    onClick={() => handleQuickAction('appointment')}
                  >
                    <Calendar className="h-4 w-4 mr-3" />
                    Book Appointment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Activity Timeline & Tasks */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-6 border-b border-gray-200 bg-white flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Deal Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Activities, tasks, and interactions for this deal
            </p>
          </div>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="activities" className="h-full flex flex-col">
              <div className="px-6 pt-4 border-b border-gray-200 bg-white">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="activities">Activities</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="activities" className="flex-1 overflow-y-auto mt-0">
                <div className="p-6">
                  <ActivityTimeline
                    dealId={dealId}
                    contactId={contact.id}
                    onActivityAdded={fetchDealData}
                    showAllContactActivities={false}
                  />
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="flex-1 overflow-y-auto mt-0">
                <div className="p-6">
                  <DealTasks
                    dealId={dealId}
                    contactId={contact.id}
                    onTaskUpdate={fetchDealData}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Edit {editField === 'value' ? 'Deal Value' : 
                    editField === 'stage' ? 'Pipeline Stage' :
                    editField === 'tags' ? 'Treatment Tags' :
                    editField === 'source' ? 'Source' :
                    editField === 'description' ? 'Description' :
                    editField === 'title' ? 'Deal Title' : 'Deal'}
            </DialogTitle>
            <DialogDescription>
              Make changes to your deal information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editField === 'value' && (
              <div>
                <Label htmlFor="value">Deal Value (GBP)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter deal value"
                />
              </div>
            )}

            {editField === 'stage' && (
              <div>
                <Label htmlFor="stage">Pipeline Stage</Label>
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStages.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editField === 'tags' && (
              <div>
                <Label htmlFor="tags">Treatment Tags</Label>
                <Input
                  id="tags"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter tags separated by commas"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate tags with commas (e.g., implants, whitening, veneers)
                </p>
              </div>
            )}

            {editField === 'source' && (
              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter deal source"
                />
              </div>
            )}

            {editField === 'description' && (
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter deal description"
                  rows={5}
                />
              </div>
            )}

            {editField === 'title' && (
              <div>
                <Label htmlFor="title">Deal Title</Label>
                <Input
                  id="title"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter deal title"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

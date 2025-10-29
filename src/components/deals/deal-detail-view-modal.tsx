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
import { ActivityFeedEnterprise } from '@/components/activities/activity-feed-enterprise'
import { DealTasks } from '@/components/deals/deal-tasks'
import { AssignDealDropdown } from '@/components/deals/assign-deal-dropdown'
import { DealIntelligenceCard } from '@/components/deals/deal-intelligence-card'
import { AIAssistantChat } from '@/components/ai/ai-assistant-chat'
import { EmailComposerPanel } from '@/components/communications/email-composer-panel'
import { SMSComposerPanel } from '@/components/communications/sms-composer-panel'
import { ClickToCallDialer } from '@/components/communications/click-to-call-dialer'
import { UniversalSearchBar } from '@/components/search/universal-search-bar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
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
  ArrowRight,
  Bot,
  Users,
  CheckSquare,
  Settings,
  BarChart3,
  Zap,
  FileText,
  X
} from 'lucide-react'
import { formatDateTime } from '@/lib/dates'
import { toast } from 'sonner'
import type { Deal, Contact, PipelineStage } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface DealDetailViewProps {
  dealId: string
  onClose: () => void
  onContactClick?: (contactId: string) => void
}

const navigation = [
  { name: 'Pipeline', href: '/pipeline', icon: TrendingUp },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Forms', href: '/forms', icon: FileText },
  { name: 'Integrations', href: '/integrations', icon: Zap },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function DealDetailView({ dealId, onClose, onContactClick }: DealDetailViewProps) {
  const pathname = usePathname()
  const { orgId, isLoading: tenantLoading } = useTenantContext()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [stage, setStage] = useState<PipelineStage | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editField, setEditField] = useState<'value' | 'stage' | 'tags' | 'source' | 'description' | 'title' | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [allStages, setAllStages] = useState<PipelineStage[]>([])
  const [activeTab, setActiveTab] = useState<string>('activities')
  
  // Communication panels state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false)
  const [smsComposerOpen, setSmsComposerOpen] = useState(false)
  const [callDialerOpen, setCallDialerOpen] = useState(false)
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (orgId && !tenantLoading) {
      fetchDealData()
      fetchStages()
    }
  }, [dealId, orgId, tenantLoading])

  const fetchDealData = async () => {
    if (!orgId) return
    
    try {
      setLoading(true)
      
      // Fetch deal with related data - WITH TENANT FILTER! 🔒
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(*),
          stage:pipeline_stages(*)
        `)
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
        .eq('id', dealId)
        .single()

      if (dealError) {
        console.error('Deal error:', dealError)
        throw dealError
      }

      setDeal(dealData)
      setContact(dealData.contact)
      setStage(dealData.stage)

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities_with_associations')
        .select('*')
        .eq('deal_id', dealId)
        .order('occurred_at', { ascending: false })

      if (!activitiesError && activitiesData) {
        setActivities(activitiesData)
      }
    } catch (error) {
      console.error('Error fetching deal data:', error)
      toast.error('Failed to load deal details')
    } finally {
      setLoading(false)
    }
  }

  const fetchStages = async () => {
    if (!orgId) return
    
    try {
      const { data: stagesData, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
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
          setCallDialerOpen(true)
        } else {
          toast.error('No phone number available')
        }
        break
      case 'email':
        if (contact?.primary_email) {
          setEmailComposerOpen(true)
        } else {
          toast.error('No email address available')
        }
        break
      case 'text':
        if (contact?.primary_phone) {
          setSmsComposerOpen(true)
        } else {
          toast.error('No phone number available')
        }
        break
      case 'appointment':
        toast.info('Appointment scheduling coming soon!')
        break
      default:
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
    <div className="fixed inset-0 bg-white z-50 flex">
      {/* LEFT SIDEBAR - SAME AS MAIN LAYOUT */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo & Back */}
        <div className="p-6 border-b border-gray-200">
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100 -ml-2 mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            DentalCRM
          </h1>
          <p className="text-xs text-gray-500 mt-1">Enterprise Edition</p>
        </div>

        {/* Navigation Menu - Vertical (same as main) */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm font-semibold rounded-lg transition-all group
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Info Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
              DU
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Demo User</p>
              <p className="text-xs text-gray-500">Owner</p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR - Search & Deal Title */}
        <div className="border-b border-gray-200 bg-white flex-shrink-0">
          <div className="px-6">
            <div className="flex h-14 items-center justify-between">
              {/* Deal Title & Badges */}
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{deal.title}</h2>
                {deal.deal_type && (
                  <Badge className={`text-xs font-semibold ${getDealTypeColor(deal.deal_type)}`}>
                    {getDealTypeLabel(deal.deal_type)}
                  </Badge>
                )}
                {stage && (
                  <Badge variant="outline" className="text-xs font-medium border-2">
                    {stage.name}
                  </Badge>
                )}
              </div>

              {/* Universal Search Bar - RIGHT SIDE */}
              <div className="flex-1 max-w-xl ml-auto">
                <UniversalSearchBar tenantId={deal.tenant_id} />
              </div>

              {/* Edit Button - FAR RIGHT */}
              <Button 
                variant="outline" 
                size="sm" 
                className="hover:bg-gray-50 hover:shadow-sm font-medium ml-4"
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

              {/* Assigned To - NEW! */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Assigned To</h3>
                <AssignDealDropdown
                  dealId={deal.id}
                  currentOwnerId={deal.owner_user_id}
                  tenantId={deal.tenant_id}
                  onAssigned={fetchDealData}
                />
              </div>

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
                    className="w-full justify-start hover:bg-green-50 hover:border-green-300"
                    onClick={() => handleQuickAction('call')}
                  >
                    <Phone className="h-4 w-4 mr-3 text-green-600" />
                    Call Contact
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => handleQuickAction('email')}
                  >
                    <Mail className="h-4 w-4 mr-3 text-blue-600" />
                    Send Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start hover:bg-purple-50 hover:border-purple-300"
                    onClick={() => handleQuickAction('text')}
                  >
                    <MessageSquare className="h-4 w-4 mr-3 text-purple-600" />
                    Send SMS
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-6 pt-4 border-b border-gray-200 bg-white">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="activities">Activities</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="activities" className="flex-1 overflow-y-auto mt-0">
                <div className="p-4 space-y-3">
                  {/* AI-Powered Deal Intelligence - COMPACT & HIGHER */}
                  <DealIntelligenceCard
                    dealId={dealId}
                    contactId={contact.id}
                    compact={true}
                  />
                  
                  {/* Enterprise Activity Feed (includes Quick Actions toolbar) */}
                  <ActivityFeedEnterprise
                    contactId={contact.id}
                    dealId={dealId}
                    onActivityCreated={fetchDealData}
                    tenantId={deal.tenant_id}
                    contactEmail={contact.primary_email}
                    contactPhone={contact.primary_phone}
                    contactName={contact.full_name}
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

      {/* AI Assistant - Toggleable Slider from Right */}
      {aiAssistantOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-[60]" 
            onClick={() => setAiAssistantOpen(false)}
          />
          
          {/* AI Sidebar Panel */}
          <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-[70] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setAiAssistantOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* AI Chat Content */}
            <div className="flex-1 overflow-hidden">
              <AIAssistantChat
                context="deal"
                contextId={dealId}
              />
            </div>
          </div>
        </>
      )}

      {/* Floating AI Assistant Button - Premium Design */}
      {!aiAssistantOpen && (
        <Button
          onClick={() => setAiAssistantOpen(true)}
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-brand-navy-600 via-brand-navy-700 to-blue-700 hover:from-brand-navy-700 hover:via-brand-navy-800 hover:to-blue-800 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] z-50 group border-2 border-white transition-all duration-300"
          size="icon"
        >
          <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
          <Bot className="h-7 w-7 text-white group-hover:scale-110 transition-transform relative z-10" />
        </Button>
      )}

      {/* Communication Panels */}
      <EmailComposerPanel
        isOpen={emailComposerOpen}
        onClose={() => {
          setEmailComposerOpen(false)
          // No refresh on close - activities refresh themselves
        }}
        to={contact?.primary_email}
        contactId={contact?.id}
        dealId={dealId}
        tenantId={deal?.tenant_id}
      />

      <SMSComposerPanel
        isOpen={smsComposerOpen}
        onClose={() => {
          setSmsComposerOpen(false)
          fetchDealData()
        }}
        to={contact?.primary_phone}
        contactId={contact?.id}
        dealId={dealId}
        tenantId={deal?.tenant_id}
      />

      <ClickToCallDialer
        isOpen={callDialerOpen}
        onClose={() => {
          setCallDialerOpen(false)
          fetchDealData()
        }}
        phoneNumber={contact?.primary_phone || ''}
        contactName={contact?.full_name}
        contactId={contact?.id}
        dealId={dealId}
        tenantId={deal?.tenant_id}
      />
    </div>
  )
}

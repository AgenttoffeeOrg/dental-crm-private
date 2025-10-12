'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActivityFeedEnterprise } from '@/components/activities/activity-feed-enterprise'
import { ContactProfileDialog } from './contact-profile-dialog'
import { CreateDealDialog } from '@/components/pipeline/create-deal-dialog'
import { CreateActivityDialog } from '@/components/deals/create-activity-dialog'
import { DealDetailView } from '@/components/deals/deal-detail-view-modal'
import { AIAssistantChat } from '@/components/ai/ai-assistant-chat'
import { DealTasks } from '@/components/deals/deal-tasks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  User,
  Building2,
  Star,
  Plus,
  Edit,
  MessageSquare,
  PhoneCall,
  MessageCircle,
  ArrowRight,
  DollarSign,
  Activity as ActivityIcon,
  Brain,
  Sparkles,
  Target,
  TrendingUp,
  Bot
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { Contact, Deal, DealWithRelations, PipelineStage } from '@/types/database'
import { toast } from 'sonner'

interface ContactDetailViewProps {
  contactId: string
  tenantId?: string
}

export function ContactDetailView({ 
  contactId, 
  tenantId = '550e8400-e29b-41d4-a716-446655440000' 
}: ContactDetailViewProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDealDialogOpen, setCreateDealDialogOpen] = useState(false)
  const [createActivityDialogOpen, setCreateActivityDialogOpen] = useState(false)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [showActivityTimeline, setShowActivityTimeline] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const fetchContactData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch contact details - simplified query
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single()

      if (contactError) {
        console.error('Contact error:', contactError)
        throw contactError
      }
      setContact(contactData)

      // Fetch contact's deals with stage information
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          stage:pipeline_stages(*)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })

      if (dealsError) {
        console.error('Deals error:', dealsError)
      } else {
        setDeals(dealsData || [])
      }

    } catch (error) {
      console.error('Error fetching contact data:', error)
      toast.error('Failed to load contact details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContactData()
  }, [contactId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contact details...</p>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Contact not found</h3>
        <p className="text-gray-600">The contact you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
      </div>
    )
  }

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800'
    if (score >= 60) return 'bg-orange-100 text-orange-800'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getLeadScoreLabel = (score: number) => {
    if (score >= 80) return 'Hot Lead'
    if (score >= 60) return 'Warm Lead'
    if (score >= 40) return 'Cool Lead'
    return 'Cold Lead'
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Left Sidebar - Contact Info */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Contact Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                {contact?.full_name || 'Loading...'}
              </h1>
              {contact?.lead_score && contact.lead_score > 0 && (
                <Badge className={`mt-1 ${getLeadScoreColor(contact.lead_score)}`}>
                  <Star className="h-3 w-3 mr-1" />
                  {getLeadScoreLabel(contact.lead_score)} ({contact.lead_score})
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setEditDialogOpen(true)} disabled={!contact}>
              <Edit className="h-4 w-4 mr-1" />
              Edit Profile
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreateDealDialogOpen(true)} disabled={!contact}>
              <Plus className="h-4 w-4 mr-1" />
              Deal
            </Button>
          </div>
        </div>

        {/* Contact Details */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading contact details...</p>
            </div>
          ) : contact ? (
            <>
              {/* Basic Info - With Quick Add */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-3">
                  {/* Phone */}
                  <div className="flex items-center justify-between gap-3 group/field">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {contact.primary_phone ? (
                        <span className="text-sm text-gray-900 truncate">{contact.primary_phone}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No phone number</span>
                      )}
                    </div>
                    {!contact.primary_phone && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-green-600 hover:bg-green-50 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between gap-3 group/field">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {contact.primary_email ? (
                        <span className="text-sm text-gray-900 truncate">{contact.primary_email}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No email address</span>
                      )}
                    </div>
                    {!contact.primary_email && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-blue-600 hover:bg-blue-50 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="flex items-center justify-between gap-3 group/field">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {contact.date_of_birth ? (
                        <span className="text-sm text-gray-900">
                          {new Date(contact.date_of_birth).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No date of birth</span>
                      )}
                    </div>
                    {!contact.date_of_birth && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-gray-600 hover:bg-gray-100 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex items-center justify-between gap-3 group/field">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {contact.address ? (
                        <span className="text-sm text-gray-900 truncate">{contact.address}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No address</span>
                      )}
                    </div>
                    {!contact.address && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-gray-600 hover:bg-gray-100 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Value Summary */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Customer Value
                </h3>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Total Value</div>
                      <div className="text-lg font-bold text-green-700">
                        {deals.length > 0 
                          ? formatCurrency(deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0))
                          : '£0.00'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Active Deals</div>
                      <div className="text-lg font-bold text-blue-700">
                        {deals.filter(deal => !['closed_won', 'closed_lost'].includes(deal.stage?.name?.toLowerCase() || '')).length}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200/50">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Won: {deals.filter(deal => deal.stage?.name?.toLowerCase() === 'closed_won').length}</span>
                      <span className="text-gray-600">Lost: {deals.filter(deal => deal.stage?.name?.toLowerCase() === 'closed_lost').length}</span>
                      <span className="text-gray-600">Total: {deals.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Deals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">All Deals</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCreateDealDialogOpen(true)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New Deal
                  </Button>
                </div>
                {deals.length > 0 ? (
                  <div className="space-y-2">
                    {deals.map(deal => {
                      const isWon = deal.stage?.name?.toLowerCase() === 'closed_won'
                      const isLost = deal.stage?.name?.toLowerCase() === 'closed_lost'
                      const isActive = !isWon && !isLost
                      
                      return (
                        <div
                          key={deal.id}
                          onClick={() => setSelectedDealId(deal.id)}
                          className={`p-3 rounded-lg border cursor-pointer group transition-all hover:shadow-sm ${
                            isActive ? 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:bg-blue-100' :
                            isWon ? 'bg-green-50 border-green-200 hover:border-green-300' :
                            isLost ? 'bg-red-50 border-red-200 hover:border-red-300' :
                            'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium text-sm truncate ${
                                isActive ? 'text-blue-900' :
                                isWon ? 'text-green-900' :
                                isLost ? 'text-red-900' :
                                'text-gray-900'
                              }`}>
                                {deal.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {deal.stage && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      isActive ? 'border-blue-300 text-blue-700' :
                                      isWon ? 'border-green-300 text-green-700' :
                                      isLost ? 'border-red-300 text-red-700' :
                                      'border-gray-300 text-gray-700'
                                    }`}
                                  >
                                    {deal.stage.name}
                                  </Badge>
                                )}
                                {deal.value_estimate_cents > 0 && (
                                  <span className={`text-xs font-medium ${
                                    isActive ? 'text-blue-700' :
                                    isWon ? 'text-green-700' :
                                    isLost ? 'text-red-700' :
                                    'text-gray-700'
                                  }`}>
                                    {formatCurrency(deal.value_estimate_cents)}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Created {new Date(deal.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <ArrowRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isActive ? 'text-blue-400' :
                              isWon ? 'text-green-400' :
                              isLost ? 'text-red-400' :
                              'text-gray-400'
                            }`} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                    <div className="text-sm text-gray-500 mb-2">No deals yet</div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCreateDealDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Deal
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setCreateActivityDialogOpen(true)}
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Log Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setCreateActivityDialogOpen(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setCreateActivityDialogOpen(true)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setCreateActivityDialogOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Contact not found</h3>
              <p className="text-gray-600">The contact you&apos;re looking for doesn&apos;t exist.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
            <TabsList className="grid w-full grid-cols-3 max-w-xl">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              <TabsTrigger value="activities">Activities & Tasks</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto mt-0">
            <div className="p-6 bg-gray-50">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : (
            /* Executive Summary View */
            <div className="space-y-6">
              {/* Customer Intelligence */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Customer Intelligence
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Total Value */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Total Value</span>
                    </div>
                    <div className="text-xl font-bold text-green-700">
                      {deals.length > 0 
                        ? formatCurrency(deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0))
                        : '£0.00'
                      }
                    </div>
                  </div>

                  {/* Deal Count */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Total Deals</span>
                    </div>
                    <div className="text-xl font-bold text-blue-700">{deals.length}</div>
                  </div>

                  {/* Win Rate */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Win Rate</span>
                    </div>
                    <div className="text-xl font-bold text-purple-700">
                      {deals.length > 0 
                        ? Math.round((deals.filter(deal => deal.stage?.name?.toLowerCase() === 'closed_won').length / deals.length) * 100)
                        : 0
                      }%
                    </div>
                  </div>

                  {/* Engagement Score */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">Engagement</span>
                    </div>
                    <div className="text-xl font-bold text-orange-700">High</div>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI Customer Summary
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {contact?.full_name} is a {deals.length > 0 ? 'valuable' : 'new'} customer with {deals.length} total deal{deals.length !== 1 ? 's' : ''}.
                    {deals.length > 0 && (
                      <> They have shown consistent engagement and have generated {formatCurrency(deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0))} in total value.
                      Recent interactions indicate they are {deals.filter(deal => !['closed_won', 'closed_lost'].includes(deal.stage?.name?.toLowerCase() || '')).length > 0 ? 'actively engaged with ongoing treatments' : 'a completed customer with potential for future services'}.
                      </>
                    )}
                    {contact?.lead_score && contact.lead_score > 70 && ' High lead score indicates strong potential for additional services.'}
                  </p>
                </div>
              </div>

              {/* Deal Overview Cards */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Deal Overview</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCreateDealDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Deal
                  </Button>
                </div>

                {deals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deals.map(deal => {
                      const isWon = deal.stage?.name?.toLowerCase() === 'closed_won'
                      const isLost = deal.stage?.name?.toLowerCase() === 'closed_lost'
                      const isActive = !isWon && !isLost
                      
                      return (
                        <div
                          key={deal.id}
                          onClick={() => setSelectedDealId(deal.id)}
                          className={`p-4 rounded-lg border cursor-pointer group transition-all hover:shadow-md ${
                            isActive ? 'bg-blue-50 border-blue-200 hover:border-blue-300' :
                            isWon ? 'bg-green-50 border-green-200 hover:border-green-300' :
                            isLost ? 'bg-red-50 border-red-200 hover:border-red-300' :
                            'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className={`font-semibold text-sm mb-1 ${
                                isActive ? 'text-blue-900' :
                                isWon ? 'text-green-900' :
                                isLost ? 'text-red-900' :
                                'text-gray-900'
                              }`}>
                                {deal.title}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  isActive ? 'border-blue-300 text-blue-700' :
                                  isWon ? 'border-green-300 text-green-700' :
                                  isLost ? 'border-red-300 text-red-700' :
                                  'border-gray-300 text-gray-700'
                                }`}
                              >
                                {deal.stage?.name}
                              </Badge>
                            </div>
                            <ArrowRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isActive ? 'text-blue-400' :
                              isWon ? 'text-green-400' :
                              isLost ? 'text-red-400' :
                              'text-gray-400'
                            }`} />
                          </div>
                          
                          <div className="space-y-2">
                            {deal.value_estimate_cents > 0 && (
                              <div className={`text-lg font-bold ${
                                isActive ? 'text-blue-700' :
                                isWon ? 'text-green-700' :
                                isLost ? 'text-red-700' :
                                'text-gray-700'
                              }`}>
                                {formatCurrency(deal.value_estimate_cents)}
                              </div>
                            )}
                            
                            {deal.treatment_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {deal.treatment_tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {deal.treatment_tags.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{deal.treatment_tags.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500">
                              Created {new Date(deal.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No deals yet</h4>
                    <p className="text-gray-600 mb-4">Create the first deal for this customer</p>
                    <Button onClick={() => setCreateDealDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Deal
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
            </div>
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals" className="flex-1 overflow-y-auto mt-0">
            <div className="p-6 bg-gray-50">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Deals</h3>
                <Button size="sm" onClick={() => setCreateDealDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Deal
                </Button>
              </div>
              
              {deals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deals.map(deal => {
                    const isWon = deal.stage?.name?.toLowerCase() === 'closed_won'
                    const isLost = deal.stage?.name?.toLowerCase() === 'closed_lost'
                    const isActive = !isWon && !isLost
                    
                    return (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDealId(deal.id)}
                        className={`p-4 rounded-lg border cursor-pointer group transition-all hover:shadow-md ${
                          isActive ? 'bg-white border-blue-200 hover:border-blue-300' :
                          isWon ? 'bg-green-50 border-green-200 hover:border-green-300' :
                          isLost ? 'bg-red-50 border-red-200 hover:border-red-300' :
                          'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className={`font-semibold text-sm mb-1 ${
                              isActive ? 'text-blue-900' :
                              isWon ? 'text-green-900' :
                              isLost ? 'text-red-900' :
                              'text-gray-900'
                            }`}>
                              {deal.title}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                isActive ? 'border-blue-300 text-blue-700' :
                                isWon ? 'border-green-300 text-green-700' :
                                isLost ? 'border-red-300 text-red-700' :
                                'border-gray-300 text-gray-700'
                              }`}
                            >
                              {deal.stage?.name}
                            </Badge>
                          </div>
                          <ArrowRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isActive ? 'text-blue-400' :
                            isWon ? 'text-green-400' :
                            isLost ? 'text-red-400' :
                            'text-gray-400'
                          }`} />
                        </div>
                        
                        {deal.value_estimate_cents > 0 && (
                          <div className={`text-lg font-bold mb-2 ${
                            isActive ? 'text-blue-700' :
                            isWon ? 'text-green-700' :
                            isLost ? 'text-red-700' :
                            'text-gray-700'
                          }`}>
                            {formatCurrency(deal.value_estimate_cents)}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Created {new Date(deal.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No deals yet</h4>
                    <p className="text-gray-600 mb-4">Create the first deal for this customer</p>
                    <Button onClick={() => setCreateDealDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Deal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Activities & Tasks Tab */}
          <TabsContent value="activities" className="flex-1 overflow-y-auto mt-0">
            <div className="p-6 bg-gray-50">
              <ActivityFeedEnterprise
                contactId={contactId}
                dealId={deals.length > 0 ? deals[0].id : undefined}
                onActivityCreated={fetchContactData}
                showAllContactActivities={true}
                tenantId={tenantId}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs - Only render when contact is loaded */}
      {contact && !loading && (
        <>
          <ContactProfileDialog
            contact={contact}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onContactUpdated={fetchContactData}
            mode="edit"
          />

          <CreateDealDialog
            open={createDealDialogOpen}
            onOpenChange={setCreateDealDialogOpen}
            onDealCreated={fetchContactData}
            preselectedContactId={contactId}
          />

          <CreateActivityDialog
            open={createActivityDialogOpen}
            onOpenChange={setCreateActivityDialogOpen}
            onActivityCreated={fetchContactData}
            preselectedContactId={contactId}
          />
        </>
      )}

      {/* Deal Detail Modal */}
      {selectedDealId && (
        <DealDetailView
          dealId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
          onContactClick={(contactId) => {
            // If clicking on the same contact, just close the deal modal
            if (contactId === contactId) {
              setSelectedDealId(null)
            } else {
              // Navigate to different contact (this would need router navigation in real app)
              setSelectedDealId(null)
              toast.info('Contact navigation would happen here')
            }
          }}
        />
      )}

      {/* AI Assistant Sidebar - Always Visible */}
      <div className="w-96 border-l border-gray-200 bg-white flex-shrink-0 overflow-hidden">
        <AIAssistantChat
          context="contact"
          contextId={contactId}
        />
      </div>
    </div>
  )
}
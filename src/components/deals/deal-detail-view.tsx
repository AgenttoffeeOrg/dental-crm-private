'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  Tag,
  Activity,
  CheckSquare,
  Plus,
  Edit,
  Building,
  Clock,
  Target,
  TrendingUp,
  Settings,
  MoreHorizontal,
  Pencil,
  Save,
  X,
  Brain,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { ActivityTimeline } from './activity-timeline'
import { formatDate, getActivityAge } from '@/lib/dates'
import type { DealWithRelations, PipelineStage } from '@/types/database'

interface DealDetailViewProps {
  dealId: string
  tenantId?: string
}

export function DealDetailView({ 
  dealId, 
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: DealDetailViewProps) {
  const [deal, setDeal] = useState<DealWithRelations | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const supabase = createClient()

  useEffect(() => {
    fetchDealData()
  }, [dealId])

  const fetchDealData = async () => {
    try {
      setLoading(true)

      // Fetch deal with all related data
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(*),
          stage:pipeline_stages(*),
          owner:app_users(*)
        `)
        .eq('id', dealId)
        .single()

      if (dealError) throw dealError

      // Fetch pipeline stages for stage selector
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('position')

      if (stagesError) throw stagesError

      setDeal(dealData as DealWithRelations)
      setStages(stagesData || [])
    } catch (error) {
      console.error('Error fetching deal data:', error)
      toast.error('Failed to load deal details')
    } finally {
      setLoading(false)
    }
  }

  const handleStageChange = async (newStageId: string) => {
    if (!deal) return

    try {
      const { error } = await supabase
        .from('deals')
        .update({ 
          stage_id: newStageId,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dealId)

      if (error) throw error

      // Update local state
      const newStage = stages.find(s => s.id === newStageId)
      if (newStage) {
        setDeal(prev => prev ? { ...prev, stage: newStage, stage_id: newStageId } : null)
        toast.success('Deal stage updated')
      }
    } catch (error) {
      console.error('Error updating deal stage:', error)
      toast.error('Failed to update deal stage')
    }
  }

  const handleFieldEdit = (field: string, value: any) => {
    setEditingField(field)
    setEditValues({ [field]: value })
  }

  const handleFieldSave = async (field: string) => {
    if (!deal) return

    try {
      const { error } = await supabase
        .from('deals')
        .update({ 
          [field]: editValues[field],
          updated_at: new Date().toISOString()
        })
        .eq('id', dealId)

      if (error) throw error

      setDeal(prev => prev ? { ...prev, [field]: editValues[field] } : null)
      setEditingField(null)
      setEditValues({})
      toast.success('Deal updated')
    } catch (error) {
      console.error('Error updating deal:', error)
      toast.error('Failed to update deal')
    }
  }

  const handleFieldCancel = () => {
    setEditingField(null)
    setEditValues({})
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

  const getStageColor = (stageName: string) => {
    const colors: Record<string, string> = {
      'lead': 'bg-gray-100 text-gray-800',
      'qualified': 'bg-blue-100 text-blue-800',
      'proposal': 'bg-yellow-100 text-yellow-800',
      'negotiation': 'bg-orange-100 text-orange-800',
      'closed won': 'bg-green-100 text-green-800',
      'closed lost': 'bg-red-100 text-red-800',
    }
    return colors[stageName.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium">Loading deal details...</span>
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Deal not found</h2>
          <p className="text-gray-600 mb-4">The deal you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/pipeline">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pipeline
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header Bar - HubSpot Style */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/pipeline">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Pipeline
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{deal.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge className={`text-xs font-medium ${getStageColor(deal.stage?.name || '')}`}>
                  {deal.stage?.name}
                </Badge>
                <span className="text-sm text-gray-500">
                  Last activity {getActivityAge(deal.last_activity_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Actions
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - HubSpot Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Deal Properties */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Deal Information Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Deal Information
              </h3>
              <div className="space-y-4">
                {/* Deal Stage */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Deal Stage</label>
                  <Select value={deal.stage_id} onValueChange={handleStageChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(stage => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStageColor(stage.name).includes('green') ? 'bg-green-500' : 
                              getStageColor(stage.name).includes('blue') ? 'bg-blue-500' :
                              getStageColor(stage.name).includes('yellow') ? 'bg-yellow-500' :
                              getStageColor(stage.name).includes('orange') ? 'bg-orange-500' :
                              getStageColor(stage.name).includes('red') ? 'bg-red-500' : 'bg-gray-500'}`} />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Deal Amount */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Amount</label>
                  {editingField === 'value_estimate_cents' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editValues.value_estimate_cents / 100}
                        onChange={(e) => setEditValues({ value_estimate_cents: parseFloat(e.target.value) * 100 })}
                        className="h-9 flex-1"
                        placeholder="0.00"
                      />
                      <Button size="sm" onClick={() => handleFieldSave('value_estimate_cents')}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleFieldCancel}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer group"
                      onClick={() => handleFieldEdit('value_estimate_cents', deal.value_estimate_cents)}
                    >
                      <span className="text-sm font-medium">
                        {deal.value_estimate_cents > 0 
                          ? formatCurrency(deal.value_estimate_cents)
                          : 'Not set'
                        }
                      </span>
                      <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                </div>

                {/* Deal Owner */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Deal Owner</label>
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {deal.owner?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{deal.owner?.full_name || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Deal Source */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Lead Source</label>
                  <div className="p-2">
                    {deal.source ? (
                      <Badge variant="outline" className="text-xs">
                        {deal.source.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-500">Not set</span>
                    )}
                  </div>
                </div>

                {/* Create Date */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Create Date</label>
                  <div className="p-2">
                    <span className="text-sm">{formatDate(deal.created_at)}</span>
                  </div>
                </div>

                {/* Close Date */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Close Date</label>
                  <div className="p-2">
                    <span className="text-sm text-gray-500">Not set</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                        {getContactInitials(deal.contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{deal.contact.full_name}</h4>
                      <div className="space-y-1 mt-1">
                        {deal.contact.primary_email && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="h-3 w-3" />
                            {deal.contact.primary_email}
                          </div>
                        )}
                        {deal.contact.primary_phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="h-3 w-3" />
                            {deal.contact.primary_phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link href={`/contacts/${deal.contact.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      View Contact Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Treatment Tags */}
            {deal.treatment_tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Treatments
                </h3>
                <div className="flex flex-wrap gap-2">
                  {deal.treatment_tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Deal Summary + Activity Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Deal AI Summary Section */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Deal Intelligence
              </h2>
              <p className="text-sm text-gray-600">AI-powered insights based on all activities and interactions</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Closing Probability */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Closing Probability</span>
                </div>
                <div className="text-2xl font-bold text-green-700">75%</div>
                <div className="text-xs text-green-600 mt-1">High likelihood to close</div>
              </div>

              {/* Deal Health */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Deal Health</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">Good</div>
                <div className="text-xs text-blue-600 mt-1">Regular engagement</div>
              </div>

              {/* Next Action */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Next Action</span>
                </div>
                <div className="text-sm font-semibold text-orange-700">Follow-up call</div>
                <div className="text-xs text-orange-600 mt-1">Due in 2 days</div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI Summary
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                This deal shows strong potential with consistent patient engagement and positive sentiment. 
                The patient has expressed high interest in {deal.treatment_tags.length > 0 ? deal.treatment_tags[0] : 'treatment'} 
                and has been responsive to communications. Recent activities indicate they are in the decision-making phase. 
                Recommended next steps include addressing any cost concerns and scheduling a follow-up consultation.
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                <span>🎯 Stage: {deal.stage?.name}</span>
                <span>💰 Value: {deal.value_estimate_cents > 0 ? formatCurrency(deal.value_estimate_cents) : 'Not set'}</span>
                <span>📅 Created: {formatDate(deal.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </h2>
          </div>
          
          {/* Activity Timeline Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <ActivityTimeline 
              dealId={dealId} 
              contactId={deal.contact.id}
              onActivityAdded={fetchDealData}
              showAllContactActivities={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
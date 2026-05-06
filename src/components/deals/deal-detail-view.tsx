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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { DealTreatmentTags } from './deal-treatment-tags'
import { formatDate, getActivityAge } from '@/lib/dates'
import type { DealWithRelations, PipelineStage } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface DealDetailViewProps {
  dealId: string
}

export function DealDetailView({ dealId }: DealDetailViewProps) {
  const { orgId, isLoading: tenantLoading } = useTenantContext()
  const [deal, setDeal] = useState<DealWithRelations | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const supabase = createClient()

  useEffect(() => {
    if (orgId && !tenantLoading) {
      fetchDealData()
    }
  }, [dealId, orgId, tenantLoading])

  const fetchDealData = async () => {
    if (!orgId) {
      console.warn('[DealDetail] No orgId available, skipping fetch')
      return
    }
    
    try {
      setLoading(true)

      console.log('[DealDetail] Fetching deal:', { dealId, orgId })

      // Fetch deal with all related data using explicit foreign key references
      // Fixed: Specify exact foreign key columns to avoid ambiguity
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts!contact_id(*),
          stage:pipeline_stages!stage_id(*),
          owner:app_users!owner_user_id(*)
        `)
        .eq('tenant_id', orgId)
        .eq('id', dealId)
        .single()

      if (dealError) {
        console.error('[DealDetail] Error fetching deal:', dealError)
        throw dealError
      }

      if (!dealData) {
        console.error('[DealDetail] No deal found for ID:', dealId)
        toast.error('Deal not found')
        return
      }

      console.log('[DealDetail] Deal loaded successfully:', dealData.title)

      // Fetch pipeline stages for stage selector
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('tenant_id', orgId)
        .order('position')

      if (stagesError) {
        console.error('[DealDetail] Error fetching stages:', stagesError)
        // Don't throw - stages are not critical
      }

      setDeal(dealData as DealWithRelations)
      setStages(stagesData || [])
    } catch (error: any) {
      // Better error handling for empty error objects
      if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        console.error('[DealDetail] Error fetching deal data:', error)
        toast.error(`Failed to load deal: ${error.message || 'Unknown error'}`)
      } else {
        console.error('[DealDetail] Empty error or RLS blocked query')
        toast.error('Deal not found or access denied')
      }
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

  // Show loading while tenant context or deal data is loading
  if (tenantLoading || loading || !orgId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium">
            {tenantLoading ? 'Loading...' : !orgId ? 'Authenticating...' : 'Loading deal details...'}
          </span>
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
    <>
      {/* Breadcrumb / Back Navigation - Compact */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/pipeline">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 h-7">
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Back to Pipeline
            </Button>
          </Link>
          <div className="h-3 w-px bg-gray-300" />
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{deal.title}</h1>
          </div>
          <Badge className={`text-[10px] h-5 font-medium ml-auto ${getStageColor(deal.stage?.name || '')}`}>
            {deal.stage?.name}
          </Badge>
        </div>
      </div>

      {/* Main Content - Two-Column Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0 bg-gray-50">
        {/* Left Sidebar - Deal Properties */}
        <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Deal Information Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="h-3.5 w-3.5" />
                Deal Information
              </h3>
              <div className="space-y-3">
                {/* Deal Stage */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Deal Stage</label>
                  <Select value={deal.stage_id} onValueChange={handleStageChange}>
                    <SelectTrigger className="h-8 text-sm">
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Amount</label>
                  {editingField === 'value_estimate_cents' ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={editValues.value_estimate_cents / 100}
                        onChange={(e) => setEditValues({ value_estimate_cents: parseFloat(e.target.value) * 100 })}
                        className="h-8 flex-1 text-sm"
                        placeholder="0.00"
                      />
                      <Button size="sm" onClick={() => handleFieldSave('value_estimate_cents')} className="h-8 px-2">
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleFieldCancel} className="h-8 px-2">
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Deal Owner</label>
                  <div className="flex items-center gap-2 p-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {deal.owner?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{deal.owner?.full_name || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Deal Source */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Lead Source</label>
                  <div className="p-1.5">
                    {deal.source ? (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {deal.source.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-500">Not set</span>
                    )}
                  </div>
                </div>

                {/* Create Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Create Date</label>
                  <div className="p-1.5">
                    <span className="text-sm">{formatDate(deal.created_at)}</span>
                  </div>
                </div>

                {/* Close Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Close Date</label>
                  <div className="p-1.5">
                    <span className="text-sm text-gray-500">Not set</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Contact
              </h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-medium text-xs">
                      {getContactInitials(deal.contact.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">{deal.contact.full_name}</h4>
                    <div className="space-y-0.5 mt-0.5">
                      {deal.contact.primary_email && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            window.location.href = `mailto:${deal.contact.primary_email}`
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 hover:underline truncate w-full"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{deal.contact.primary_email}</span>
                        </button>
                      )}
                      {deal.contact.primary_phone && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            window.location.href = `tel:${deal.contact.primary_phone}`
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {deal.contact.primary_phone}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <Link href={`/contacts/${deal.contact.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs">
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Treatment Tags - Using shared component */}
            {deal && orgId && (
              <DealTreatmentTags
                dealId={dealId}
                dealTags={deal.treatment_tags || []}
                orgId={orgId}
                onTagsChange={(newTags) => {
                  setDeal(prev => prev ? { ...prev, treatment_tags: newTags } : null)
                }}
                showHistory={true}
                editable={true}
              />
            )}
          </div>
        </div>

        {/* Right Side - Deal Summary + Activity Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Deal AI Summary Section - Compact */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-purple-600" />
                Deal Intelligence
              </h2>
              <p className="text-xs text-gray-600">AI-powered insights</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {/* Closing Probability */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-medium text-green-900">Probability</span>
                </div>
                <div className="text-xl font-bold text-green-700">75%</div>
                <div className="text-[10px] text-green-600 mt-0.5">High likelihood</div>
              </div>

              {/* Deal Health */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-900">Health</span>
                </div>
                <div className="text-xl font-bold text-blue-700">Good</div>
                <div className="text-[10px] text-blue-600 mt-0.5">Regular engagement</div>
              </div>

              {/* Next Action */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-orange-600" />
                  <span className="text-xs font-medium text-orange-900">Next Action</span>
                </div>
                <div className="text-sm font-semibold text-orange-700">Follow-up call</div>
                <div className="text-[10px] text-orange-600 mt-0.5">Due in 2 days</div>
              </div>
            </div>

            {/* AI Summary - Compact */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h3 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                AI Summary
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed">
                Strong potential with consistent engagement. Patient is in decision-making phase for {deal.treatment_tags && deal.treatment_tags.length > 0 ? deal.treatment_tags[0] : 'treatment'}.
                Recommended: Address cost concerns and schedule follow-up.
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                <span>🎯 {deal.stage?.name}</span>
                <span>💰 {deal.value_estimate_cents > 0 ? formatCurrency(deal.value_estimate_cents) : 'Not set'}</span>
                <span>📅 {formatDate(deal.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline Header - Compact */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Timeline
            </h2>
          </div>
          
          {/* Activity Timeline Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <ActivityTimeline 
              dealId={dealId} 
              contactId={deal.contact.id}
              onActivityAdded={fetchDealData}
              showAllContactActivities={false}
            />
          </div>
        </div>
      </div>
    </>
  )
}
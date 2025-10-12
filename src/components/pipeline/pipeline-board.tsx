'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select'
import { 
  Plus, 
  Settings, 
  LayoutGrid, 
  List,
  TrendingUp,
  ChevronDown,
  Sparkles,
  Wand2,
  Edit,
  Pencil,
  Check,
  X
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { PipelineColumn } from './pipeline-column'
import { DealCard } from './deal-card-fixed'
import { DealDetailView } from '../deals/deal-detail-view-modal'
import { CreateDealDialog } from './create-deal-dialog'
import { PipelineSettingsDialog } from './pipeline-settings-dialog'
import { CreatePipelineDialog } from './create-pipeline-dialog'
import type { Deal, Pipeline, PipelineStage, Contact, DealWithRelations } from '@/types/database'

// Pipeline Templates
const PIPELINE_TEMPLATES = [
  {
    name: 'High-Value Treatment',
    description: 'For premium treatments like implants and full mouth reconstructions',
    icon: '💎',
    suggested_stages: ['Initial Consultation', 'Treatment Planning', 'Insurance Verification', 'Financial Approval', 'Pre-Treatment', 'In Progress', 'Follow-up', 'Completed', 'Lost']
  },
  {
    name: 'Emergency Treatment',
    description: 'Fast-track for urgent dental emergencies',
    icon: '🚨',
    suggested_stages: ['Emergency Received', 'Triage', 'Scheduled (24hrs)', 'In Treatment', 'Post-Care', 'Follow-up', 'Resolved', 'Referred']
  },
  {
    name: 'General Practice',
    description: 'Standard routine care pipeline',
    icon: '👥',
    suggested_stages: ['New Inquiry', 'Contacted', 'Appointment Scheduled', 'Consultation', 'Treatment Proposed', 'Accepted', 'In Progress', 'Completed', 'Lost']
  },
  {
    name: 'Orthodontics',
    description: 'For braces, Invisalign, and long-term treatments',
    icon: '🦷',
    suggested_stages: ['Initial Consult', 'Records & Diagnosis', 'Plan Presented', 'Financial Agreement', 'Appliance Placed', 'Active Treatment', 'Retention', 'Complete', 'Lost']
  },
  {
    name: 'Cosmetic Dentistry',
    description: 'For veneers, whitening, and smile makeovers',
    icon: '✨',
    suggested_stages: ['Consultation Request', 'Smile Analysis', 'Design Presentation', 'Quote Sent', 'Approved', 'Scheduled', 'Completed', 'Follow-up', 'Lost']
  },
  {
    name: 'Referral Network',
    description: 'Manage referrals from other dentists',
    icon: '🤝',
    suggested_stages: ['Referral Received', 'Records Reviewed', 'Patient Contacted', 'Scheduled', 'Complete', 'Report Sent', 'Closed']
  },
]

interface PipelineBoardProps {
  tenantId?: string
}

type ViewMode = 'board' | 'list'

// List Row Component with clickable elements  
function DealListRow({ deal, onUpdate, showPipeline = false }: { deal: DealWithRelations; onUpdate: () => void; showPipeline?: boolean }) {
  const [showDealDetail, setShowDealDetail] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(deal.title)
  const supabase = createClient()

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `/contacts/${deal.contact_id}`
  }

  const handleDealClick = () => {
    if (!editingTitle) {
      setShowDealDetail(true)
    }
  }

  const handleSaveTitle = async (e: React.MouseEvent) => {
    e.stopPropagation()

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
      onUpdate()
    } catch (error) {
      console.error('Error updating deal title:', error)
      toast.error('Failed to update deal title')
    }
  }

  return (
    <>
      <div 
        className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-blue-50 transition-colors items-center cursor-pointer group"
        onClick={handleDealClick}
      >
        {/* Deal Name - Editable */}
        <div className={showPipeline ? "col-span-2" : "col-span-3"}>
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveTitle(e as any)
                  } else if (e.key === 'Escape') {
                    setEditingTitle(false)
                    setTempTitle(deal.title)
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleSaveTitle}
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingTitle(false)
                  setTempTitle(deal.title)
                }}
              >
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title">
              <div className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                {deal.title}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 opacity-0 group-hover/title:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  setTempTitle(deal.title)
                  setEditingTitle(true)
                }}
                title="Edit title"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
          {!editingTitle && deal.treatment_tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {deal.treatment_tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {deal.treatment_tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{deal.treatment_tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Pipeline - Only shown in All Deals view - CLICKABLE */}
        {showPipeline && (
          <div className="col-span-2">
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                const pipelineId = (deal as any).pipeline_id
                if (pipelineId) {
                  setSelectedPipelineId(pipelineId)
                }
              }}
            >
              {(deal as any).pipeline?.name || 'Unknown'}
            </Badge>
          </div>
        )}

        {/* Contact - Clickable */}
        <div 
          className="col-span-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          onClick={handleContactClick}
        >
          {deal.contact?.full_name || 'No contact'}
        </div>

        {/* Stage */}
        <div className="col-span-2">
          <Badge variant="secondary">{deal.stage?.name || 'No stage'}</Badge>
        </div>

        {/* Value */}
        <div className="col-span-2 font-semibold text-green-700">
          {formatCurrency(deal.value_estimate_cents)}
        </div>

        {/* Last Activity */}
        <div className="col-span-2 text-sm text-gray-600">
          {new Date(deal.last_activity_at).toLocaleDateString()}
        </div>

        {/* Actions */}
        <div className="col-span-1">
          <Button 
            variant="ghost" 
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              handleDealClick()
            }}
          >
            View
          </Button>
        </div>
      </div>

      {/* Deal Detail Modal */}
      {showDealDetail && (
        <DealDetailView
          dealId={deal.id}
          onClose={() => {
            setShowDealDetail(false)
            onUpdate()
          }}
          onContactClick={(contactId) => {
            setShowDealDetail(false)
            window.location.href = `/contacts/${contactId}`
          }}
        />
      )}
    </>
  )
}

export function PipelineBoard({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: PipelineBoardProps) {
  // Pipeline state
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('_all_deals') // Default to All Deals
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list') // Default to list for All Deals
  const [draggedDeal, setDraggedDeal] = useState<DealWithRelations | null>(null)
  
  // Dialog state
  const [createDealDialogOpen, setCreateDealDialogOpen] = useState(false)
  const [createPipelineDialogOpen, setCreatePipelineDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof PIPELINE_TEMPLATES[0] | null>(null)
  const [editingPipelineName, setEditingPipelineName] = useState(false)
  const [tempPipelineName, setTempPipelineName] = useState('')
  
  const supabase = createClient()

  // Check URL parameters for pipeline selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const pipelineParam = params.get('pipeline')
      if (pipelineParam) {
        setSelectedPipelineId(pipelineParam)
      }
    }
  }, [])

  // Load pipelines on mount
  useEffect(() => {
    loadPipelines()
  }, [])

  // Load pipeline data when selection changes
  useEffect(() => {
    if (selectedPipelineId) {
      // Update URL without page reload
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('pipeline', selectedPipelineId)
        window.history.replaceState({}, '', url.toString())
      }
      
      // Load data based on selection
      if (selectedPipelineId === '_all_deals') {
        fetchAllDeals()
      } else {
        fetchPipelineData()
      }
    }
  }, [selectedPipelineId])

  const loadPipelines = async () => {
    try {
      const { data: pipelinesData, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPipelines(pipelinesData || [])

      // Select default pipeline or first one (only if not already selected from URL)
      if (pipelinesData && pipelinesData.length > 0 && !selectedPipelineId) {
        const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0]
        setSelectedPipelineId(defaultPipeline.id)
      }
    } catch (error) {
      console.error('Error loading pipelines:', error)
      toast.error('Failed to load pipelines')
    }
  }

  const fetchAllDeals = async () => {
    try {
      setLoading(true)

      // Fetch ALL deals across ALL pipelines
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(*),
          stage:pipeline_stages(*),
          pipeline:pipelines(name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (dealsError) throw dealsError

      setStages([]) // No stages for "All Deals" view
      setDeals(dealsData as DealWithRelations[] || [])
    } catch (error) {
      console.error('Error fetching all deals:', error)
      toast.error('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  const fetchPipelineData = async () => {
    try {
      setLoading(true)

      // Fetch stages for selected pipeline
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', selectedPipelineId)
        .eq('tenant_id', tenantId)
        .order('position')

      if (stagesError) throw stagesError

      // Fetch deals for selected pipeline
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(*),
          stage:pipeline_stages(*),
          pipeline:pipelines(name)
        `)
        .eq('pipeline_id', selectedPipelineId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (dealsError) throw dealsError

      setStages(stagesData || [])
      setDeals(dealsData as DealWithRelations[] || [])
    } catch (error) {
      console.error('Error fetching pipeline data:', error)
      toast.error('Failed to load pipeline data')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const dealId = event.active.id as string
    const deal = deals.find(d => d.id === dealId)
    setDraggedDeal(deal || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedDeal(null)

    if (!over) return

    const dealId = active.id as string
    const newStageId = over.id as string
    const deal = deals.find(d => d.id === dealId)

    if (!deal || deal.stage_id === newStageId) return

    // Optimistic update
    const updatedDeals = deals.map(d => 
      d.id === dealId 
        ? { ...d, stage_id: newStageId, stage: stages.find(s => s.id === newStageId)! }
        : d
    )
    setDeals(updatedDeals)

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

      toast.success('Deal moved successfully')
    } catch (error) {
      console.error('Error moving deal:', error)
      toast.error('Failed to move deal')
      fetchPipelineData()
    }
  }

  const handleCreateFromTemplate = (template: typeof PIPELINE_TEMPLATES[0]) => {
    setSelectedTemplate(template)
    setCreatePipelineDialogOpen(true)
  }

  const handleAutoCategorize = async () => {
    try {
      setLoading(true)
      toast.info('🔄 Auto-categorizing deals...')

      const response = await fetch('/api/categorize-deals', {
        method: 'POST'
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`✅ Categorized ${result.results.moved} deals!`, {
          description: `Moved to appropriate pipelines based on treatment type`
        })
        
        // Reload data
        if (selectedPipelineId === '_all_deals') {
          fetchAllDeals()
        } else {
          fetchPipelineData()
        }
      } else {
        toast.error('Failed to categorize deals')
      }
    } catch (error) {
      console.error('Error auto-categorizing:', error)
      toast.error('Failed to auto-categorize deals')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePipelineName = async () => {
    if (!tempPipelineName.trim() || selectedPipelineId === '_all_deals') return

    try {
      const { error } = await supabase
        .from('pipelines')
        .update({ name: tempPipelineName.trim() })
        .eq('id', selectedPipelineId)

      if (error) throw error

      toast.success('Pipeline renamed successfully')
      setEditingPipelineName(false)
      loadPipelines()
    } catch (error) {
      console.error('Error renaming pipeline:', error)
      toast.error('Failed to rename pipeline')
    }
  }

  const startEditingPipelineName = () => {
    const currentPipeline = pipelines.find(p => p.id === selectedPipelineId)
    if (currentPipeline) {
      setTempPipelineName(currentPipeline.name)
      setEditingPipelineName(true)
    }
  }

  const getDealsForStage = (stageId: string) => {
    return deals.filter(deal => deal.stage_id === stageId)
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)

  if (loading && pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading pipelines...</div>
      </div>
    )
  }

  // No pipelines exist
  if (pipelines.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <TrendingUp className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Pipeline</h2>
        <p className="text-gray-600 mb-8 text-center max-w-md">
          Get started by creating your first pipeline. Choose from our pre-configured templates or create a custom one.
        </p>
        
        <div className="grid gap-4 md:grid-cols-3 mb-6 max-w-4xl">
          {PIPELINE_TEMPLATES.slice(0, 3).map((template) => (
            <Card 
              key={template.name} 
              className="cursor-pointer hover:shadow-lg transition-all border-2"
              onClick={() => handleCreateFromTemplate(template)}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">{template.icon}</div>
                <h3 className="font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600">{template.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => {
            setSelectedTemplate(null)
            setCreatePipelineDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Pipeline
          </Button>
        </div>

        <CreatePipelineDialog
          open={createPipelineDialogOpen}
          onOpenChange={setCreatePipelineDialogOpen}
          onPipelineCreated={() => {
            loadPipelines()
            setCreatePipelineDialogOpen(false)
          }}
          template={selectedTemplate}
          tenantId={tenantId}
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* HubSpot-style Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          {/* Left side - Pipeline Selector */}
          <div className="flex items-center gap-4">
            {editingPipelineName && selectedPipelineId !== '_all_deals' ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempPipelineName}
                  onChange={(e) => setTempPipelineName(e.target.value)}
                  className="w-[280px] h-11 text-lg font-semibold"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSavePipelineName()
                    } else if (e.key === 'Escape') {
                      setEditingPipelineName(false)
                    }
                  }}
                />
                <Button size="sm" onClick={handleSavePipelineName}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingPipelineName(false)}>Cancel</Button>
              </div>
            ) : (
              <>
                <Select 
                  value={selectedPipelineId} 
                  onValueChange={(value) => {
                    // Handle special actions
                    if (value === '_create_custom') {
                      setSelectedTemplate(null)
                      setCreatePipelineDialogOpen(true)
                      return
                    }
                    
                    if (value.startsWith('_template_')) {
                      const templateName = value.replace('_template_', '')
                      const template = PIPELINE_TEMPLATES.find(t => t.name === templateName)
                      if (template) {
                        handleCreateFromTemplate(template)
                      }
                      return
                    }
                    
                    // Regular pipeline selection
                    setSelectedPipelineId(value)
                  }}
                >
                  <SelectTrigger className="w-[320px] h-11 text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-gray-500 uppercase">Views</SelectLabel>
                  <SelectItem value="_all_deals">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">📊 All Deals</span>
                      <Badge variant="outline" className="text-xs">All Pipelines</Badge>
                    </div>
                  </SelectItem>
                </SelectGroup>
                
                <SelectSeparator />
                
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-gray-500 uppercase">Your Pipelines</SelectLabel>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      <div className="flex items-center gap-2">
                        <span>{pipeline.name}</span>
                        {pipeline.is_default && (
                          <Badge variant="secondary" className="text-xs ml-2">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
                
                <SelectSeparator />
                
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-gray-500 uppercase">Create New</SelectLabel>
                  <SelectItem value="_create_custom">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Plus className="h-4 w-4" />
                      <span className="font-medium">Create Custom Pipeline</span>
                    </div>
                  </SelectItem>
                </SelectGroup>

                <SelectSeparator />
                
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Templates
                  </SelectLabel>
                  {PIPELINE_TEMPLATES.map((template) => (
                    <SelectItem 
                      key={template.name} 
                      value={`_template_${template.name}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{template.icon}</span>
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Edit Pipeline Name Button - Only for actual pipelines, not All Deals */}
            {selectedPipelineId !== '_all_deals' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startEditingPipelineName}
                className="h-8 w-8 p-0"
                title="Rename pipeline"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </>
            )}

            {/* Stats */}
            <div className="flex gap-3">
              <Badge variant="outline" className="font-medium px-3 py-1.5">
                {deals.length} deals
              </Badge>
              <Badge variant="secondary" className="font-medium px-3 py-1.5 bg-green-100 text-green-800">
                {formatCurrency(deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0))}
              </Badge>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex gap-2">
            {/* View Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button 
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
                className="rounded-none"
                title="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Auto-Categorize Button - Only for All Deals view */}
            {selectedPipelineId === '_all_deals' && deals.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleAutoCategorize}
                className="hover:bg-purple-50 border-purple-300 text-purple-700"
                disabled={loading}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Categorize Deals
              </Button>
            )}

            {/* Pipeline Settings - Hidden for All Deals */}
            {selectedPipelineId !== '_all_deals' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSettingsDialogOpen(true)}
                className="hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Pipeline
              </Button>
            )}

            {/* New Deal */}
            <Button 
              onClick={() => setCreateDealDialogOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading pipeline data...</div>
          </div>
        ) : viewMode === 'board' ? (
          selectedPipelineId === '_all_deals' ? (
            /* Board View for All Deals - Grouped by Pipeline */
            <div className="h-full overflow-x-auto">
              <div className="flex gap-6 p-6 min-w-max h-full">
                {pipelines.map(pipeline => {
                  const pipelineDeals = deals.filter(d => d.pipeline_id === pipeline.id)
                  if (pipelineDeals.length === 0) return null
                  
                  return (
                    <div key={pipeline.id} className="flex-shrink-0 w-80">
                      <div className="bg-gray-100 rounded-lg p-4 mb-4">
                        <div className="font-semibold text-gray-900 flex items-center justify-between">
                          <button
                            onClick={() => setSelectedPipelineId(pipeline.id)}
                            className="hover:text-blue-600 transition-colors flex items-center gap-2 group"
                          >
                            <span>{pipeline.name}</span>
                            <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                          </button>
                          <Badge variant="secondary">{pipelineDeals.length}</Badge>
                        </div>
                      </div>
                      <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                        {pipelineDeals.map(deal => (
                          <DealCard 
                            key={deal.id} 
                            deal={deal} 
                            onDealUpdate={fetchAllDeals}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Board View for Single Pipeline */
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="h-full overflow-x-auto">
                <div className="flex gap-6 p-6 min-w-max h-full">
                  {stages.length === 0 ? (
                    <div className="flex items-center justify-center w-full">
                      <div className="text-center">
                        <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No stages in this pipeline</h3>
                        <p className="text-gray-600 mb-4">Add stages to get started</p>
                        <Button onClick={() => setSettingsDialogOpen(true)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Configure Pipeline
                        </Button>
                      </div>
                    </div>
                  ) : (
                    stages.map(stage => (
                      <PipelineColumn
                        key={stage.id}
                        stage={stage}
                        deals={getDealsForStage(stage.id)}
                        onDealUpdate={fetchPipelineData}
                      />
                    ))
                  )}
                </div>
              </div>

              <DragOverlay>
                {draggedDeal && (
                  <DealCard deal={draggedDeal} isDragging />
                )}
              </DragOverlay>
            </DndContext>
          )
        ) : (
          /* List View */
          <div className="h-full overflow-y-auto p-6">
            <Card>
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b font-semibold text-sm text-gray-700">
                  <div className={selectedPipelineId === '_all_deals' ? "col-span-2" : "col-span-3"}>Deal Name</div>
                  {selectedPipelineId === '_all_deals' && <div className="col-span-2">Pipeline</div>}
                  <div className="col-span-2">Contact</div>
                  <div className="col-span-2">Stage</div>
                  <div className="col-span-2">Value</div>
                  <div className="col-span-2">Last Activity</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {/* Table Body */}
                {deals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No deals {selectedPipelineId === '_all_deals' ? 'found' : 'in this pipeline'}</p>
                    <Button 
                      variant="link" 
                      onClick={() => setCreateDealDialogOpen(true)}
                      className="mt-2"
                    >
                      Create your first deal
                    </Button>
                  </div>
                ) : (
                  deals.map(deal => (
                    <DealListRow 
                      key={deal.id} 
                      deal={deal}
                      onUpdate={selectedPipelineId === '_all_deals' ? fetchAllDeals : fetchPipelineData}
                      showPipeline={selectedPipelineId === '_all_deals'}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateDealDialog
        open={createDealDialogOpen}
        onOpenChange={setCreateDealDialogOpen}
        onDealCreated={fetchPipelineData}
        tenantId={tenantId}
      />

      <CreatePipelineDialog
        open={createPipelineDialogOpen}
        onOpenChange={setCreatePipelineDialogOpen}
        onPipelineCreated={() => {
          loadPipelines()
          setCreatePipelineDialogOpen(false)
        }}
        template={selectedTemplate}
        tenantId={tenantId}
      />

      <PipelineSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onSettingsUpdated={fetchPipelineData}
        pipelineId={selectedPipelineId}
        tenantId={tenantId}
      />
    </div>
  )
}

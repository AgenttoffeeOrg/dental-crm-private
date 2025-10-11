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
  Sparkles
} from 'lucide-react'
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
function DealListRow({ deal, onUpdate }: { deal: DealWithRelations; onUpdate: () => void }) {
  const [showDealDetail, setShowDealDetail] = useState(false)

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
    setShowDealDetail(true)
  }

  return (
    <>
      <div 
        className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-blue-50 transition-colors items-center cursor-pointer group"
        onClick={handleDealClick}
      >
        {/* Deal Name - Clickable */}
        <div className="col-span-3">
          <div className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
            {deal.title}
          </div>
          {deal.treatment_tags.length > 0 && (
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
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('')
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [draggedDeal, setDraggedDeal] = useState<DealWithRelations | null>(null)
  
  // Dialog state
  const [createDealDialogOpen, setCreateDealDialogOpen] = useState(false)
  const [createPipelineDialogOpen, setCreatePipelineDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof PIPELINE_TEMPLATES[0] | null>(null)
  
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
      
      fetchPipelineData()
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
          stage:pipeline_stages(*)
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

            {/* Pipeline Settings */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSettingsDialogOpen(true)}
              className="hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Pipeline
            </Button>

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
          /* Board View */
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
        ) : (
          /* List View */
          <div className="h-full overflow-y-auto p-6">
            <Card>
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b font-semibold text-sm text-gray-700">
                  <div className="col-span-3">Deal Name</div>
                  <div className="col-span-2">Contact</div>
                  <div className="col-span-2">Stage</div>
                  <div className="col-span-2">Value</div>
                  <div className="col-span-2">Last Activity</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {/* Table Body */}
                {deals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No deals in this pipeline</p>
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
                      onUpdate={fetchPipelineData}
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

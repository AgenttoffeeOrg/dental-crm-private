'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SettingsGearButton } from '@/components/ui/settings-gear-button'
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
  X,
  Search,
  Filter,
  User,
  ArrowUpDown
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from '@/lib/formatting'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { PipelineColumn } from './pipeline-column'
import { DealCardMinimal as DealCard } from './deal-card-minimal'
// Removed: DealDetailView modal - now using /deals/[id] for consistency
import { CreateDealSlideOver } from '../deals/create-deal-slide-over'
import { PipelineSettingsDialog } from './pipeline-settings-dialog'
import { CreatePipelineDialog } from './create-pipeline-dialog'
import type { Deal, Pipeline, PipelineStage, Contact, DealWithRelations } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

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

interface PipelineBoardProps {}

type ViewMode = 'board' | 'list'

// List Row Component with clickable elements  
function DealListRow({ 
  deal, 
  onUpdate, 
  onDealClick,
  showPipeline = false 
}: { 
  deal: DealWithRelations; 
  onUpdate: () => void;
  onDealClick: (dealId: string) => void;
  showPipeline?: boolean;
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(deal.title)
  const supabase = createClient()

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  // Removed - using Link component instead for proper navigation

  const handleDealClick = () => {
    if (!editingTitle) {
      onDealClick(deal.id)
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
          {/* Treatment tags removed - cleaner UI, use filters instead */}
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
        {deal.contact_id ? (
          <Link 
            href={`/contacts/${deal.contact_id}`}
            onClick={(e) => e.stopPropagation()}
            className="col-span-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {deal.contact?.full_name || 'Unknown Contact'}
          </Link>
        ) : (
          <div className="col-span-2 text-sm text-gray-400">
            No contact
          </div>
        )}

        {/* Stage */}
        <div className="col-span-2">
          <Badge variant="secondary">{deal.stage?.name || 'No stage'}</Badge>
        </div>

        {/* Owner */}
        <div className="col-span-1">
          {deal.owner ? (
            <div className="flex items-center gap-1" title={deal.owner.full_name}>
              <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-semibold">
                {deal.owner.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}
        </div>

        {/* Value */}
        <div className="col-span-1 font-semibold text-green-700 text-sm">
          {formatCurrency(deal.value_estimate_cents)}
        </div>

        {/* Last Activity */}
        <div className="col-span-1 text-xs text-gray-600">
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
    </>
  )
}

export function PipelineBoard({}: PipelineBoardProps) {
  // Pipeline state - Initialize from URL to persist on reload!
  const router = useRouter()
  const { orgId, userId: currentUserId, isLoading: tenantLoading } = useTenantContext()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(() => {
    // Read from URL on initial render
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('pipeline') || '_all_deals'
    }
    return '_all_deals'
  })
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [locations, setLocations] = useState<any[]>([]) // NEW: Locations for filtering
  const [availableTags, setAvailableTags] = useState<string[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list') // Default to list for All Deals
  const [draggedDeal, setDraggedDeal] = useState<DealWithRelations | null>(null)
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'my' | 'unassigned' | 'team'>('all')
  
  // NEW: Advanced Filters & Search
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [treatmentFilter, setTreatmentFilter] = useState<string>('all')
  const [marketingSourceFilter, setMarketingSourceFilter] = useState<string>('all') // NEW: Marketing filter
  const [locationFilter, setLocationFilter] = useState<string>('all') // NEW: Location filter
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'name' | 'stage'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Dialog state
  const [createDealDialogOpen, setCreateDealDialogOpen] = useState(false)
  const [createPipelineDialogOpen, setCreatePipelineDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof PIPELINE_TEMPLATES[0] | null>(null)
  const [editingPipelineName, setEditingPipelineName] = useState(false)
  const [tempPipelineName, setTempPipelineName] = useState('')
  
  const supabase = createClient()

  // Navigate to deal detail page (consistent with deals table)
  const openDealModal = (dealId: string) => {
    router.push(`/deals/${dealId}`)
  }

  // No longer needed - keeping for compatibility but not used
  const closeDealModal = () => {
    // Not used anymore - deals open in dedicated page
  }

  // Load pipelines on mount
  useEffect(() => {
    if (orgId && !tenantLoading) {
      loadPipelines()
      loadLocations() // NEW: Load locations for filtering
      loadAvailableTags()
    }
  }, [orgId, tenantLoading])

  // Load pipeline data when selection changes
  useEffect(() => {
    if (selectedPipelineId && orgId && !tenantLoading) {
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
  }, [selectedPipelineId, orgId, tenantLoading])

  const loadPipelines = async () => {
    if (!orgId) return
    
    try {
      const { data: pipelinesData, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
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

  const loadAvailableTags = async () => {
    if (!orgId) return
    
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('treatment_tags')
        .eq('tenant_id', orgId)
        .not('treatment_tags', 'is', null)

      if (error) throw error
      
      // Extract unique tags from all deals
      const allTags = new Set<string>()
      data?.forEach(deal => {
        if (deal.treatment_tags && Array.isArray(deal.treatment_tags)) {
          deal.treatment_tags.forEach(tag => allTags.add(tag))
        }
      })
      
      setAvailableTags(Array.from(allTags).sort())
    } catch (error) {
      console.error('Error loading available tags:', error)
    }
  }

  // NEW: Load accessible locations for filtering
  const loadLocations = async () => {
    if (!orgId || !currentUserId) return
    
    try {
      const { data, error } = await supabase.rpc('get_user_accessible_locations', {
        p_user_id: currentUserId,
        p_tenant_id: orgId,
      })

      if (error) {
        console.error('Error loading locations:', error)
        return
      }
      setLocations(data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  const fetchAllDeals = async () => {
    if (!orgId) return
    
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
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
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
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
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
        .eq('tenant_id', orgId) // ✅ SECURITY: Filter by org
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

  // Comprehensive filtering, searching, and sorting
  const filteredDeals = React.useMemo(() => {
    let filtered = [...deals]
    
    // Use currentUserId from top-level hook (already extracted above)
    
    // 1. Owner filter
    if (ownerFilter === 'my') {
      filtered = filtered.filter(deal => deal.owner_user_id === currentUserId)
    } else if (ownerFilter === 'unassigned') {
      filtered = filtered.filter(deal => !deal.owner_user_id)
    } else if (ownerFilter === 'team') {
      filtered = filtered.filter(deal => deal.owner_user_id && deal.owner_user_id !== currentUserId)
    }
    
    // 2. Local search query (search within deals)
    if (localSearchQuery) {
      const query = localSearchQuery.toLowerCase()
      filtered = filtered.filter(deal => 
        deal.title?.toLowerCase().includes(query) ||
        deal.contact?.full_name?.toLowerCase().includes(query) ||
        deal.treatment_tags?.some(tag => tag.toLowerCase().includes(query)) ||
        deal.source?.toLowerCase().includes(query)
      )
    }
    
    // 3. Source filter (Forms, Instagram, Website, etc.)
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(deal => deal.source === sourceFilter)
    }
    
    // 4. Treatment tags filter
    if (treatmentFilter !== 'all') {
      filtered = filtered.filter(deal => 
        deal.treatment_tags?.includes(treatmentFilter)
      )
    }
    
    // 5. Marketing Source filter (NEW)
    if (marketingSourceFilter !== 'all') {
      filtered = filtered.filter(deal => 
        (deal as any).marketing_source_type === marketingSourceFilter
      )
    }
    
    // 6. Location filter (NEW)
    if (locationFilter !== 'all') {
      filtered = filtered.filter(deal => deal.location_id === locationFilter)
    }
    
    // 7. Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'value':
          aValue = a.value_estimate_cents || 0
          bValue = b.value_estimate_cents || 0
          break
        case 'name':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        case 'stage':
          aValue = a.stage?.position || 0
          bValue = b.stage?.position || 0
          break
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
      }
      
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1)
    })
    
    return filtered
  }, [deals, ownerFilter, localSearchQuery, sourceFilter, treatmentFilter, marketingSourceFilter, locationFilter, sortBy, sortOrder, currentUserId])

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
          tenantId={orgId}
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Clean 2-Row Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        {/* Row 1: Pipeline Selector + Key Stats + Primary Actions */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex justify-between items-center">
            {/* Left: Pipeline Selector + Stats */}
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
              <div className="flex gap-2">
                <Badge variant="outline" className="font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border-blue-200">
                  {format.pluralize(filteredDeals.length, 'Deal')}
                </Badge>
                <Badge variant="outline" className="font-semibold px-3 py-1.5 bg-green-50 text-green-700 border-green-200">
                  {formatCurrency(filteredDeals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0))}
                </Badge>
              </div>
            </div>

            {/* Right: View Toggle + Primary Actions */}
            <div className="flex items-center gap-2">
              {/* View Toggle - Prominent */}
              <div className="flex border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <Button 
                  variant={viewMode === 'board' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('board')}
                  className={cn(
                    "rounded-none h-9 px-4",
                    viewMode === 'board' && "bg-blue-600 hover:bg-blue-700"
                  )}
                  title="Board view"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Board
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "rounded-none h-9 px-4",
                    viewMode === 'list' && "bg-blue-600 hover:bg-blue-700"
                  )}
                  title="List view"
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>

              {/* Pipeline Settings - Only for specific pipelines */}
              {selectedPipelineId !== '_all_deals' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSettingsDialogOpen(true)}
                  className="h-9"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              )}

              {/* Pipeline Preferences - Global Settings */}
              <SettingsGearButton tab="preferences" />

              {/* New Deal - Primary Action */}
              <Button 
                onClick={() => setCreateDealDialogOpen(true)} 
                className="bg-blue-600 hover:bg-blue-700 h-9"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Deal
              </Button>
            </div>
          </div>
        </div>

        {/* Row 2: Search + Filters + Sort */}
        <div className="px-6 py-3 bg-gray-50/50">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search deals by name, contact, or tag..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-9 w-full border-gray-200 bg-white"
              />
              {localSearchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Right: Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filters:</span>
              
              {/* Source Filter */}
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className={cn(
                  "w-[110px] h-8 text-xs",
                  sourceFilter !== 'all' && "border-blue-500 bg-blue-50"
                )}>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="Forms">📋 Forms</SelectItem>
                  <SelectItem value="Instagram">📸 Instagram</SelectItem>
                  <SelectItem value="Website">🌐 Website</SelectItem>
                  <SelectItem value="Referral">🤝 Referral</SelectItem>
                  <SelectItem value="Walk-in">🚶 Walk-in</SelectItem>
                  <SelectItem value="Phone">📞 Phone</SelectItem>
                </SelectContent>
              </Select>

              {/* Treatment Tags Filter - Dynamic */}
              <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
                <SelectTrigger className={cn(
                  "w-[140px] h-8 text-xs",
                  treatmentFilter !== 'all' && "border-purple-500 bg-purple-50"
                )}>
                  <SelectValue placeholder="Treatment Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Treatments</SelectItem>
                  {availableTags.length === 0 ? (
                    <SelectItem value="_no_tags" disabled>No tags available</SelectItem>
                  ) : (
                    availableTags.map(tag => (
                      <SelectItem key={tag} value={tag}>
                        🏷️ {tag}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Owner Filter - Only for All Deals */}
              {selectedPipelineId === '_all_deals' && (
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className={cn(
                    "w-[110px] h-8 text-xs",
                    ownerFilter !== 'all' && "border-green-500 bg-green-50"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    <SelectItem value="my">My Deals</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {/* Marketing Source Filter (NEW - conditional) */}
              <Select value={marketingSourceFilter} onValueChange={setMarketingSourceFilter}>
                <SelectTrigger className={cn(
                  "w-[130px] h-8 text-xs",
                  marketingSourceFilter !== 'all' && "border-purple-500 bg-purple-50"
                )}>
                  <SelectValue placeholder="Marketing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="campaign">📧 Email Campaign</SelectItem>
                  <SelectItem value="form">📝 Marketing Form</SelectItem>
                  <SelectItem value="landing_page">🌐 Landing Page</SelectItem>
                  <SelectItem value="journey">🔄 Journey</SelectItem>
                </SelectContent>
              </Select>

              {/* NEW: Location Filter */}
              {locations.length > 1 && (
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className={cn(
                    "w-[150px] h-8 text-xs",
                    locationFilter !== 'all' && "border-indigo-500 bg-indigo-50"
                  )}>
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectSeparator />
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Sort - Only in List View */}
              {viewMode === 'list' && (
                <Select 
                  value={`${sortBy}-${sortOrder}`} 
                  onValueChange={(val) => {
                    const [sort, order] = val.split('-') as [typeof sortBy, typeof sortOrder]
                    setSortBy(sort)
                    setSortOrder(order)
                  }}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <ArrowUpDown className="h-3 w-3 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="value-desc">Highest Value</SelectItem>
                    <SelectItem value="value-asc">Lowest Value</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="stage-asc">Stage (Early)</SelectItem>
                    <SelectItem value="stage-desc">Stage (Late)</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Auto-Categorize - Only for All Deals */}
              {selectedPipelineId === '_all_deals' && filteredDeals.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAutoCategorize}
                  className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                  disabled={loading}
                >
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  Auto-Categorize
                </Button>
              )}

              {/* Clear Filters - Only show if any filter is active */}
              {(sourceFilter !== 'all' || treatmentFilter !== 'all' || ownerFilter !== 'all' || marketingSourceFilter !== 'all' || localSearchQuery) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSourceFilter('all')
                    setTreatmentFilter('all')
                    setOwnerFilter('all')
                    setMarketingSourceFilter('all')
                    setLocalSearchQuery('')
                  }}
                  className="h-8 text-xs text-gray-600"
                >
                  <X className="h-3 w-3 mr-1.5" />
                  Clear
                </Button>
              )}
            </div>
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
                  const pipelineDeals = filteredDeals.filter(d => d.pipeline_id === pipeline.id)
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
                            onDealClick={openDealModal}
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
                        onDealClick={openDealModal}
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
                {/* Table Header - Sortable Columns */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 border-b border-gray-200">
                  {/* Deal Name - Sortable */}
                  <button
                    onClick={() => {
                      if (sortBy === 'name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('name')
                        setSortOrder('asc')
                      }
                    }}
                    className={cn(
                      "col-span-2 flex items-center gap-2 text-left font-semibold text-sm transition-colors hover:text-blue-600",
                      sortBy === 'name' ? "text-blue-600" : "text-gray-700"
                    )}
                  >
                    Deal Name
                    {sortBy === 'name' && (
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  
                  {selectedPipelineId === '_all_deals' && (
                    <div className="col-span-2 font-semibold text-sm text-gray-700">Pipeline</div>
                  )}
                  
                  <div className="col-span-2 font-semibold text-sm text-gray-700">Contact</div>
                  
                  {/* Stage - Sortable */}
                  <button
                    onClick={() => {
                      if (sortBy === 'stage') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('stage')
                        setSortOrder('asc')
                      }
                    }}
                    className={cn(
                      "col-span-2 flex items-center gap-2 text-left font-semibold text-sm transition-colors hover:text-blue-600",
                      sortBy === 'stage' ? "text-blue-600" : "text-gray-700"
                    )}
                  >
                    Stage
                    {sortBy === 'stage' && (
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  
                  <div className="col-span-1 font-semibold text-sm text-gray-700">Owner</div>
                  
                  {/* Value - Sortable */}
                  <button
                    onClick={() => {
                      if (sortBy === 'value') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('value')
                        setSortOrder('desc')
                      }
                    }}
                    className={cn(
                      "col-span-1 flex items-center gap-2 text-left font-semibold text-sm transition-colors hover:text-blue-600",
                      sortBy === 'value' ? "text-blue-600" : "text-gray-700"
                    )}
                  >
                    Value
                    {sortBy === 'value' && (
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  
                  {/* Date - Sortable */}
                  <button
                    onClick={() => {
                      if (sortBy === 'date') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('date')
                        setSortOrder('desc')
                      }
                    }}
                    className={cn(
                      "col-span-1 flex items-center gap-2 text-left font-semibold text-sm transition-colors hover:text-blue-600",
                      sortBy === 'date' ? "text-blue-600" : "text-gray-700"
                    )}
                  >
                    Created
                    {sortBy === 'date' && (
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  
                  <div className="col-span-1 font-semibold text-sm text-gray-700">Actions</div>
                </div>

                {/* Table Body */}
                {filteredDeals.length === 0 ? (
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
                  filteredDeals.map(deal => (
                    <DealListRow 
                      key={deal.id} 
                      deal={deal}
                      onUpdate={selectedPipelineId === '_all_deals' ? fetchAllDeals : fetchPipelineData}
                      onDealClick={openDealModal}
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
      <CreateDealSlideOver
        open={createDealDialogOpen}
        onClose={() => setCreateDealDialogOpen(false)}
        onDealCreated={fetchPipelineData}
      />

      <CreatePipelineDialog
        open={createPipelineDialogOpen}
        onOpenChange={setCreatePipelineDialogOpen}
        onPipelineCreated={() => {
          loadPipelines()
          setCreatePipelineDialogOpen(false)
        }}
        template={selectedTemplate}
        tenantId={orgId}
      />

      <PipelineSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onSettingsUpdated={fetchPipelineData}
        pipelineId={selectedPipelineId}
        tenantId={orgId}
      />

      {/* Deal Detail Modal REMOVED - Now using /deals/[id] for consistency */}
    </div>
  )
}

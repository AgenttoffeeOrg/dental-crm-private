'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  ArrowUpDown,
  Tag
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from '@/lib/formatting'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { PipelineColumn } from './pipeline-column'
import { PipelineColumnPremium } from './PipelineColumnPremium'
import { DealCardMinimal as DealCard } from './deal-card-minimal'
import { DealCardPremium } from './DealCardPremium'
import { PipelineSummaryBar } from './PipelineSummaryBar'
import { CompactModeToggle } from './CompactModeToggle'
import { getCompactMode } from '@/lib/storage/compact-mode'
// Removed: DealDetailView modal - now using /deals/[id] for consistency
import { CreateDealSlideOver } from '../deals/create-deal-slide-over'
import { PipelineSettingsDialog } from './pipeline-settings-dialog'
import { PipelineUnifiedHeader } from './pipeline-unified-header'
import { EnterpriseDealsTable } from '../deals/enterprise-deals-table'
import { CreatePipelineDialog } from './create-pipeline-dialog'
import type { Deal, Pipeline, PipelineStage, Contact, DealWithRelations } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { LABELS } from '@/lib/constants/labels'

// Pipeline Templates - All use the same standard 5-stage structure
const PIPELINE_TEMPLATES = [
  {
    name: 'High-Value Treatment',
    description: 'For premium treatments like implants and full mouth reconstructions',
    icon: '💎',
    suggested_stages: ['New Lead', 'Consultation', 'Proposal Sent', 'Negotiation', 'Closed Won']
  },
  {
    name: 'Emergency Treatment',
    description: 'Fast-track for urgent dental emergencies',
    icon: '🚨',
    suggested_stages: ['New Lead', 'Consultation', 'Proposal Sent', 'Negotiation', 'Closed Won']
  },
  {
    name: 'General Practice',
    description: 'Standard routine care pipeline',
    icon: '👥',
    suggested_stages: ['New Lead', 'Consultation', 'Proposal Sent', 'Negotiation', 'Closed Won']
  },
  {
    name: 'Orthodontics',
    description: 'For braces, Invisalign, and long-term treatments',
    icon: '🦷',
    suggested_stages: ['New Lead', 'Consultation', 'Proposal Sent', 'Negotiation', 'Closed Won']
  },
  {
    name: 'Cosmetic Dentistry',
    description: 'For veneers, whitening, and smile makeovers',
    icon: '✨',
    suggested_stages: ['New Lead', 'Consultation', 'Proposal Sent', 'Negotiation', 'Closed Won']
  },
  {
    name: 'Referral Network',
    description: 'Manage referrals from other dentists',
    icon: '🤝',
    suggested_stages: ['New Lead', 'Consultation', 'Proposal Sent', 'Negotiation', 'Closed Won']
  },
]

type TreatmentTagOption = {
  id: string
  name: string
  color: string
  icon: string
}

interface PipelineBoardProps {}

type ViewMode = 'board' | 'list'

// List Row Component with clickable elements  
function TagFilterItem({ tag, checked, onToggle }: { tag: any; checked: boolean; onToggle: (checked: boolean) => void }) {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      onCheckedChange={onToggle}
      className="flex items-center gap-2 text-xs"
    >
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <span className="flex-1 truncate">
        {tag.icon || '🏷️'} {tag.name}
      </span>
    </DropdownMenuCheckboxItem>
  )
}

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

  const handleDealKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !editingTitle) {
      e.preventDefault()
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
        onKeyDown={handleDealKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View deal ${deal.title || deal.id}`}
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
              <div className="h-6 w-6 rounded-full bg-brand-navy-100 text-brand-navy-700 flex items-center justify-center text-[10px] font-semibold">
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

export function PipelineBoard() {
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
  const [availableTags, setAvailableTags] = useState<TreatmentTagOption[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('board') // Default to board view
  const [draggedDeal, setDraggedDeal] = useState<DealWithRelations | null>(null)
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'my' | 'unassigned' | 'team'>('all')
  
  // Compact mode state (initialized from localStorage on mount)
  const [compactMode, setCompactMode] = useState(false)
  
  // Location map for quick lookups (location_id -> location_name)
  const [locationMap, setLocationMap] = useState<Map<string, string>>(new Map())
  
  // NEW: Advanced Filters & Search
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [treatmentFilters, setTreatmentFilters] = useState<string[]>([])
  const [marketingSourceFilter, setMarketingSourceFilter] = useState<string>('all') // NEW: Marketing filter
  const [locationFilter, setLocationFilter] = useState<string>('all') // NEW: Location filter
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'name' | 'stage'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const tagPalette = useMemo(() => {
    const map = new Map<string, { color: string; icon: string }>()
    availableTags.forEach((tag) => {
      map.set(tag.name, {
        color: tag.color,
        icon: tag.icon || '🏷️',
      })
    })
    return map
  }, [availableTags])
  
  // Dialog state
  const [createDealDialogOpen, setCreateDealDialogOpen] = useState(false)
  const [createPipelineDialogOpen, setCreatePipelineDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof PIPELINE_TEMPLATES[0] | null>(null)
  
  // DnD Sensors - Configure drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    })
  )
  
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
    } else if (!tenantLoading) {
      // ✅ If auth is done (whether or not there's an org), stop loading
      // If no org, the parent page will show NoOrgEmptyState
      setLoading(false)
    }
  }, [orgId, tenantLoading])
  
  // Initialize compact mode from localStorage
  useEffect(() => {
    setCompactMode(getCompactMode())
  }, [])
  
  // Build location map when locations load
  useEffect(() => {
    const map = new Map<string, string>()
    locations.forEach(loc => {
      map.set(loc.id, loc.name)
    })
    setLocationMap(map)
  }, [locations])

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
    } else if (!tenantLoading && !orgId) {
      // ✅ If auth is done but no org, stop loading (parent will show NoOrgEmptyState)
      setLoading(false)
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
        .from('treatment_tags')
        .select('id, name, color, icon')
        .eq('tenant_id', orgId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })

      if (error) throw error
      
      const tagOptions = (data || []).map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || '#4318FF',
        icon: tag.icon || '🏷️',
      }))
      
      setAvailableTags(tagOptions)
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
    
    // 4. Treatment tags filter (match all selected tags)
    if (treatmentFilters.length > 0) {
      filtered = filtered.filter(deal => {
        const tags = Array.isArray(deal.treatment_tags) ? deal.treatment_tags : []
        if (tags.length === 0) {
          return false
        }
        return treatmentFilters.every(tag => tags.includes(tag))
      })
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
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      }
      return aValue < bValue ? 1 : -1
    })
    
    return filtered
  }, [deals, ownerFilter, localSearchQuery, sourceFilter, treatmentFilters, marketingSourceFilter, locationFilter, sortBy, sortOrder, currentUserId])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)

  // ✅ Don't render loading if there's no org (parent page will show NoOrgEmptyState)
  if (!orgId && !tenantLoading) {
    return null
  }

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
          templates={PIPELINE_TEMPLATES}
          tenantId={orgId}
        />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ============================================================================
          UNIFIED HEADER - Enterprise Grade (Always Visible in Both Views)
          ============================================================================ */}
      <PipelineUnifiedHeader
        selectedPipelineId={selectedPipelineId}
        pipelines={pipelines}
        filteredDealsCount={filteredDeals.length}
        totalValue={filteredDeals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0)}
        viewMode={viewMode}
        loading={loading}
        onPipelineChange={setSelectedPipelineId}
        onViewModeChange={setViewMode}
        onCreatePipeline={() => {
          setSelectedTemplate(null)
          setCreatePipelineDialogOpen(true)
        }}
        onCreateDeal={() => setCreateDealDialogOpen(true)}
        onEditPipelineName={async (name) => {
          if (!selectedPipelineId || selectedPipelineId === '_all_deals') return
          
          try {
            const supabase = createClient()
            const { error } = await supabase
              .from('pipelines')
              .update({ name })
              .eq('id', selectedPipelineId)
            
            if (error) throw error
            toast.success('Pipeline renamed successfully!')
            loadPipelines()
          } catch (error) {
            console.error('Error renaming pipeline:', error)
            toast.error('Failed to rename pipeline')
          }
        }}
        onAutoCategorize={handleAutoCategorize}
        onOpenSettings={() => setSettingsDialogOpen(true)}
        pipelineTemplates={PIPELINE_TEMPLATES}
        onCreateFromTemplate={handleCreateFromTemplate}
      />

      {/* ============================================================================
          SECONDARY FILTERS BAR - Show in BOTH Board and List Views
          ============================================================================ */}
      <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-200 flex-shrink-0">
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
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filters:</span>
              
              {/* Source Filter */}
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className={cn(
                  "w-[135px] h-9 text-xs",
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

              {/* Treatment Tags Filter - Multi-select */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 text-xs px-3 flex items-center gap-2",
                      treatmentFilters.length > 0 && "border-brand-navy-500 bg-brand-navy-50"
                    )}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {treatmentFilters.length > 0 ? `${treatmentFilters.length} Tags` : 'Tags'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Treatment Tags</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableTags.length === 0 ? (
                    <DropdownMenuCheckboxItem checked={false} disabled>
                      No tags available
                    </DropdownMenuCheckboxItem>
                  ) : (
                    availableTags.map((tag) => (
                      <TagFilterItem
                        key={tag.id}
                        tag={tag}
                        checked={treatmentFilters.includes(tag.name)}
                        onToggle={(isChecked) => {
                          setTreatmentFilters((prev) => {
                            if (isChecked) {
                              return prev.includes(tag.name) ? prev : [...prev, tag.name]
                            }
                            return prev.filter((item) => item !== tag.name)
                          })
                        }}
                      />
                    ))
                  )}
                  {treatmentFilters.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setTreatmentFilters([])}>
                        Clear selection
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Owner Filter - Only for All Deals */}
              {selectedPipelineId === '_all_deals' && (
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className={cn(
                    "w-[130px] h-9 text-xs",
                    ownerFilter !== 'all' && "border-brand-navy-500 bg-brand-navy-50"
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
                  "w-[145px] h-9 text-xs",
                  marketingSourceFilter !== 'all' && "border-brand-navy-500 bg-brand-navy-50"
                )}>
                  <SelectValue placeholder="Marketing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Marketing</SelectItem>
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
                    "w-[160px] h-9 text-xs",
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

              {/* Clear Filters - Only show if any filter is active */}
              {(sourceFilter !== 'all' || treatmentFilters.length > 0 || ownerFilter !== 'all' || marketingSourceFilter !== 'all' || localSearchQuery) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSourceFilter('all')
                    setTreatmentFilters([])
                    setOwnerFilter('all')
                    setMarketingSourceFilter('all')
                    setLocalSearchQuery('')
                  }}
                  className="h-9 text-xs text-gray-600 px-3"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
              )}
              
              {/* Compact Mode Toggle - Only show in Board View */}
              {viewMode === 'board' && selectedPipelineId !== '_all_deals' && (
                <CompactModeToggle 
                  onToggle={(isCompact) => setCompactMode(isCompact)}
                  className="h-9 w-9"
                />
              )}
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
            <div className="h-full flex flex-col">
              {/* Summary Bar - Sticky at top */}
              <PipelineSummaryBar 
                deals={filteredDeals} 
                stages={stages}
              />
              
              {/* Board Columns with DnD */}
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart} 
                onDragEnd={handleDragEnd}
              >
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                  <div className="flex gap-4 p-6 min-w-max h-full">
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
                        <PipelineColumnPremium
                          key={stage.id}
                          stage={stage}
                          stages={stages}
                          deals={getDealsForStage(stage.id)}
                          locationMap={locationMap}
                          compact={compactMode}
                          onDealUpdate={fetchPipelineData}
                          tagPalette={tagPalette}
                        />
                      ))
                    )}
                  </div>
                </div>

                <DragOverlay>
                  {draggedDeal && (
                    <DealCardPremium 
                      deal={draggedDeal} 
                      stages={stages}
                      locationName={draggedDeal.location_id ? locationMap.get(draggedDeal.location_id) || null : null}
                      isDragging 
                      compact={compactMode}
                      tagPalette={tagPalette}
                    />
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          )
        ) : (
          /* List View - Using EnterpriseDealsTable */
          <div className="h-full">
            <EnterpriseDealsTable
              mode={selectedPipelineId === '_all_deals' ? 'universal' : 'pipeline'}
              initialPipelineId={selectedPipelineId !== '_all_deals' ? selectedPipelineId : undefined}
              initialViewMode="list"
              showViewToggle={false}
              showSavedViews={false}
              showHeader={false}
              onCreateDeal={() => setCreateDealDialogOpen(true)}
            />
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
        templates={PIPELINE_TEMPLATES}
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

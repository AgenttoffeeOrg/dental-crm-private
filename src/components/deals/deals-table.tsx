'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
  ExternalLink,
  CheckSquare,
  UserPlus,
  FolderOpen,
  Tag,
  Trash2,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, differenceInDays, format as formatDate } from 'date-fns'
import { format } from '@/lib/formatting'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import type { DealWithRelations, Pipeline, PipelineStage, AppUser } from '@/types/database'
import { DealDetailView } from './deal-detail-view-modal'
import { CreateDealSlideOver } from './create-deal-slide-over'
import { SavedViewsDropdown } from './saved-views-dropdown'
import type { DealFilters } from '@/hooks/use-saved-deal-views'

// Enhanced Deal type with computed fields
interface EnhancedDeal extends DealWithRelations {
  days_in_stage?: number
  days_since_created?: number
  aging_status?: 'fresh' | 'aging' | 'stuck' | 'urgent'
}

export function DealsTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { appUser } = useAuth()
  const supabase = createClient()

  // State
  const [deals, setDeals] = useState<EnhancedDeal[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [teamMembers, setTeamMembers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set())
  const [selectedDealForView, setSelectedDealForView] = useState<string | null>(null)
  const [showCreateDeal, setShowCreateDeal] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [agingFilter, setAgingFilter] = useState<string>('all')
  const [valueFilter, setValueFilter] = useState<string>('all')

  // Sort
  const [sortField, setSortField] = useState<'title' | 'value' | 'created_at' | 'updated_at' | 'stage'>('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load initial data
  useEffect(() => {
    if (appUser?.tenant_id) {
      loadPipelines()
      loadTeamMembers()
    }
  }, [appUser?.tenant_id])

  // Load deals when filters change
  useEffect(() => {
    if (appUser?.tenant_id) {
      loadDeals()
    }
  }, [
    appUser?.tenant_id,
    debouncedSearchQuery,
    pipelineFilter,
    stageFilter,
    ownerFilter,
    agingFilter,
    valueFilter,
    sortField,
    sortOrder,
    currentPage,
    pageSize,
  ])

  // Load URL parameters for deep linking
  useEffect(() => {
    const dealId = searchParams.get('deal')
    const highlight = searchParams.get('highlight')
    if (dealId && highlight === 'true') {
      setSelectedDealForView(dealId)
      // Scroll to deal after data loads
      setTimeout(() => {
        const element = document.getElementById(`deal-row-${dealId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('bg-blue-100', 'transition-colors', 'duration-1000')
          setTimeout(() => {
            element.classList.remove('bg-blue-100')
          }, 2000)
        }
      }, 500)
    }
  }, [searchParams, deals])

  const loadPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', appUser?.tenant_id)
        .order('name')

      if (error) throw error
      setPipelines(data || [])

      // Load all stages for all pipelines
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('tenant_id', appUser?.tenant_id)
        .order('position')

      if (stagesError) throw stagesError
      setStages(stagesData || [])
    } catch (error) {
      console.error('Error loading pipelines:', error)
      toast.error('Failed to load pipelines')
    }
  }

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('tenant_id', appUser?.tenant_id)
        .order('full_name')

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const loadDeals = async () => {
    try {
      setLoading(true)

      // Build query
      let query = supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(id, full_name, primary_email, primary_phone),
          pipeline:pipelines(id, name),
          stage:pipeline_stages(id, name, position),
          owner:app_users(id, full_name)
        `, { count: 'exact' })
        .eq('tenant_id', appUser?.tenant_id)

      // Apply filters
      if (debouncedSearchQuery) {
        query = query.or(`title.ilike.%${debouncedSearchQuery}%,contact.full_name.ilike.%${debouncedSearchQuery}%`)
      }

      if (pipelineFilter !== 'all') {
        query = query.eq('pipeline_id', pipelineFilter)
      }

      if (stageFilter !== 'all') {
        query = query.eq('stage_id', stageFilter)
      }

      if (ownerFilter !== 'all') {
        if (ownerFilter === 'my') {
          query = query.eq('owner_user_id', appUser?.id)
        } else if (ownerFilter === 'unassigned') {
          query = query.is('owner_user_id', null)
        } else {
          query = query.eq('owner_user_id', ownerFilter)
        }
      }

      // Value filter
      if (valueFilter !== 'all') {
        if (valueFilter === 'high') {
          query = query.gte('value_estimate_cents', 200000) // £2000+
        } else if (valueFilter === 'medium') {
          query = query.gte('value_estimate_cents', 50000).lt('value_estimate_cents', 200000) // £500-£2000
        } else if (valueFilter === 'low') {
          query = query.lt('value_estimate_cents', 50000) // <£500
        }
      }

      // Sort
      if (sortField === 'value') {
        query = query.order('value_estimate_cents', { ascending: sortOrder === 'asc' })
      } else if (sortField === 'stage') {
        query = query.order('stage_id', { ascending: sortOrder === 'asc' })
      } else {
        query = query.order(sortField, { ascending: sortOrder === 'asc' })
      }

      // Pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Enhance deals with aging data
      const enhancedDeals: EnhancedDeal[] = (data || []).map(deal => {
        const createdDate = new Date(deal.created_at)
        const updatedDate = new Date(deal.updated_at)
        const days_since_created = differenceInDays(new Date(), createdDate)
        const days_in_stage = differenceInDays(new Date(), updatedDate)

        let aging_status: 'fresh' | 'aging' | 'stuck' | 'urgent' = 'fresh'
        if (days_in_stage > 30) aging_status = 'urgent'
        else if (days_in_stage > 14) aging_status = 'stuck'
        else if (days_in_stage > 7) aging_status = 'aging'

        return {
          ...deal,
          days_in_stage,
          days_since_created,
          aging_status,
        }
      })

      // Apply aging filter if set
      let filteredDeals = enhancedDeals
      if (agingFilter !== 'all') {
        if (agingFilter === 'stuck') {
          filteredDeals = enhancedDeals.filter(d => (d.days_in_stage || 0) > 14)
        } else if (agingFilter === 'fresh') {
          filteredDeals = enhancedDeals.filter(d => (d.days_in_stage || 0) <= 7)
        }
      }

      setDeals(filteredDeals)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading deals:', error)
      toast.error('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedDealIds.size === deals.length) {
      setSelectedDealIds(new Set())
    } else {
      setSelectedDealIds(new Set(deals.map(d => d.id)))
    }
  }, [deals, selectedDealIds])

  const handleSelectDeal = useCallback((dealId: string) => {
    setSelectedDealIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dealId)) {
        newSet.delete(dealId)
      } else {
        newSet.add(dealId)
      }
      return newSet
    })
  }, [])

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedDealIds.size === 0) return
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedDealIds.size} deal(s)? This action cannot be undone.`)
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .in('id', Array.from(selectedDealIds))

      if (error) throw error

      toast.success(`${selectedDealIds.size} deal(s) deleted successfully`)
      setSelectedDealIds(new Set())
      loadDeals()
    } catch (error) {
      console.error('Error deleting deals:', error)
      toast.error('Failed to delete deals')
    }
  }

  const handleBulkAssign = async (ownerId: string) => {
    if (selectedDealIds.size === 0) return

    try {
      const { error } = await supabase
        .from('deals')
        .update({ owner_user_id: ownerId, updated_at: new Date().toISOString() })
        .in('id', Array.from(selectedDealIds))

      if (error) throw error

      toast.success(`${selectedDealIds.size} deal(s) assigned successfully`)
      setSelectedDealIds(new Set())
      loadDeals()
    } catch (error) {
      console.error('Error assigning deals:', error)
      toast.error('Failed to assign deals')
    }
  }

  const handleBulkExport = () => {
    const selectedDeals = deals.filter(d => selectedDealIds.has(d.id))
    exportToCSV(selectedDeals)
  }

  const exportToCSV = (dealsToExport: EnhancedDeal[] = deals) => {
    const headers = [
      'Deal Title',
      'Contact Name',
      'Pipeline',
      'Stage',
      'Value',
      'Owner',
      'Days in Stage',
      'Created Date',
      'Last Updated',
      'Status',
    ]

    const rows = dealsToExport.map(deal => [
      deal.title,
      deal.contact?.full_name || '',
      deal.pipeline?.name || '',
      deal.stage?.name || '',
      `£${(deal.value_estimate_cents / 100).toFixed(2)}`,
      deal.owner?.full_name || 'Unassigned',
      deal.days_in_stage?.toString() || '0',
      format(new Date(deal.created_at), 'yyyy-MM-dd'),
      format(new Date(deal.updated_at), 'yyyy-MM-dd HH:mm'),
      deal.aging_status || 'fresh',
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deals-export-${formatDate(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${dealsToExport.length} deal(s)`)
  }

  // Currency formatter - using refined formatting
  const formatCurrencyValue = (cents: number) => {
    return format.currency(cents / 100, 'GBP')
  }

  // Aging badge
  const getAgingBadge = (days: number, status: string) => {
    const colors = {
      fresh: 'bg-green-100 text-green-800',
      aging: 'bg-yellow-100 text-yellow-800',
      stuck: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    }

    return (
      <Badge className={cn('text-xs font-medium', colors[status as keyof typeof colors] || colors.fresh)}>
        {days}d
      </Badge>
    )
  }

  // Active filters count
  const activeFiltersCount = [
    pipelineFilter !== 'all',
    stageFilter !== 'all',
    ownerFilter !== 'all',
    agingFilter !== 'all',
    valueFilter !== 'all',
    debouncedSearchQuery !== '',
  ].filter(Boolean).length

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setPipelineFilter('all')
    setStageFilter('all')
    setOwnerFilter('all')
    setAgingFilter('all')
    setValueFilter('all')
    setCurrentPage(1)
  }

  // Apply saved view
  const handleApplySavedView = (filters: DealFilters, sortField?: string, sortOrder?: 'asc' | 'desc') => {
    setSearchQuery(filters.searchQuery || '')
    setPipelineFilter(filters.pipelineFilter || 'all')
    setStageFilter(filters.stageFilter || 'all')
    setOwnerFilter(filters.ownerFilter || 'all')
    setAgingFilter(filters.agingFilter || 'all')
    setValueFilter(filters.valueFilter || 'all')
    if (sortField) setSortField(sortField as any)
    if (sortOrder) setSortOrder(sortOrder)
    setCurrentPage(1)
  }

  // Current filters for saved views
  const currentFiltersForSavedView: DealFilters = {
    searchQuery: debouncedSearchQuery || undefined,
    pipelineFilter: pipelineFilter !== 'all' ? pipelineFilter : undefined,
    stageFilter: stageFilter !== 'all' ? stageFilter : undefined,
    ownerFilter: ownerFilter !== 'all' ? ownerFilter : undefined,
    agingFilter: agingFilter !== 'all' ? agingFilter : undefined,
    valueFilter: valueFilter !== 'all' ? valueFilter : undefined,
  }

  // Pagination info
  const totalPages = Math.ceil(totalCount / pageSize)
  const showingFrom = Math.min((currentPage - 1) * pageSize + 1, totalCount)
  const showingTo = Math.min(currentPage * pageSize, totalCount)

  if (!appUser) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Deals</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage deals across all pipelines • {format.number(totalCount)} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV()}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => setShowCreateDeal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </div>
        </div>

        {/* Saved Views & Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <SavedViewsDropdown
            currentFilters={currentFiltersForSavedView}
            onViewApplied={handleApplySavedView}
            sortField={sortField}
            sortOrder={sortOrder}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search deals or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Pipeline Filter */}
          <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Pipelines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pipelines</SelectItem>
              {pipelines.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stage Filter */}
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages
                .filter(s => pipelineFilter === 'all' || s.pipeline_id === pipelineFilter)
                .map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Owner Filter */}
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              <SelectItem value="my">My Deals</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              {teamMembers.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Aging Filter */}
          <Select value={agingFilter} onValueChange={setAgingFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Deals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deals</SelectItem>
              <SelectItem value="fresh">Fresh (≤7d)</SelectItem>
              <SelectItem value="stuck">Stuck (&gt;14d)</SelectItem>
            </SelectContent>
          </Select>

          {/* Value Filter */}
          <Select value={valueFilter} onValueChange={setValueFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Values" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Values</SelectItem>
              <SelectItem value="high">High (&gt;£2k)</SelectItem>
              <SelectItem value="medium">Medium (£500-£2k)</SelectItem>
              <SelectItem value="low">Low (&lt;£500)</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-600"
            >
              <X className="h-4 w-4 mr-1" />
              Clear ({activeFiltersCount})
            </Button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedDealIds.size > 0 && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {format.pluralize(selectedDealIds.size, 'deal')} selected
            </span>
            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign To
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {teamMembers.map(member => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => handleBulkAssign(member.id)}
                  >
                    {member.full_name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={handleBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDelete} className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedDealIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={selectedDealIds.size === deals.length && deals.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        if (sortField === 'title') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField('title')
                          setSortOrder('asc')
                        }
                      }}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Deal
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Pipeline
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        if (sortField === 'value') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField('value')
                          setSortOrder('desc')
                        }
                      }}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Value
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        if (sortField === 'updated_at') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                        } else {
                          setSortField('updated_at')
                          setSortOrder('desc')
                        }
                      }}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Updated
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : deals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <FolderOpen className="h-12 w-12 text-gray-300" />
                        <p className="text-sm font-medium">No deals found</p>
                        <p className="text-xs text-gray-400">
                          {activeFiltersCount > 0
                            ? 'Try adjusting your filters'
                            : 'Create your first deal to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  deals.map((deal) => (
                    <tr
                      key={deal.id}
                      id={`deal-row-${deal.id}`}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedDealForView(deal.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedDealIds.has(deal.id)}
                          onCheckedChange={() => handleSelectDeal(deal.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 hover:text-blue-600">
                            {deal.title}
                          </span>
                          {deal.treatment_tags && deal.treatment_tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {deal.treatment_tags.slice(0, 2).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
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
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{deal.contact?.full_name || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {deal.pipeline?.name || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="text-xs bg-blue-100 text-blue-800">
                          {deal.stage?.name || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          {formatCurrencyValue(deal.value_estimate_cents)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {deal.owner?.full_name || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getAgingBadge(deal.days_in_stage || 0, deal.aging_status || 'fresh')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedDealForView(deal.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                router.push(`/pipeline?pipeline=${deal.pipeline_id}&deal=${deal.id}&highlight=true`)
                              }}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View in Pipeline
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={async () => {
                                const confirmed = confirm('Are you sure you want to delete this deal?')
                                if (confirmed) {
                                  try {
                                    const { error } = await supabase
                                      .from('deals')
                                      .delete()
                                      .eq('id', deal.id)
                                    if (error) throw error
                                    toast.success('Deal deleted')
                                    loadDeals()
                                  } catch (error) {
                                    toast.error('Failed to delete deal')
                                  }
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{showingFrom}</span> to{' '}
              <span className="font-medium">{showingTo}</span> of{' '}
              <span className="font-medium">{totalCount}</span> deals
            </p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
                <SelectItem value="200">200 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Deal Detail Modal */}
      {selectedDealForView && (
        <DealDetailView
          dealId={selectedDealForView}
          open={!!selectedDealForView}
          onClose={() => setSelectedDealForView(null)}
          onDealUpdated={loadDeals}
        />
      )}

      {/* Create Deal Slide-Over */}
      <CreateDealSlideOver
        open={showCreateDeal}
        onClose={() => setShowCreateDeal(false)}
        onDealCreated={() => {
          setShowCreateDeal(false)
          loadDeals()
        }}
      />
    </div>
  )
}


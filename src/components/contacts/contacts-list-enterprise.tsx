'use client'

/**
 * Enterprise Contacts List
 * World-class contact management with:
 * - Pagination & performance optimization
 * - Bulk actions (assign, tag, delete, export)
 * - Advanced filtering (search, type, source, tags, activity)
 * - Saved views system
 * - Real-time updates
 * - Mobile responsive
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Plus,
  Download,
  Upload,
  MoreVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  UserPlus,
  Tag as TagIcon,
  Trash2,
  Edit,
  Eye,
  Phone,
  Mail,
  Users,
  ExternalLink,
  CheckSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format as formatDate } from 'date-fns'
import { format } from '@/lib/formatting'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import type { Contact, AppUser } from '@/types/database'
import { CreateContactSlideOver } from './create-contact-slide-over'
import { CsvImportDialog } from './csv-import-dialog'
import { useSavedContactViews, type ContactFilters } from '@/hooks/use-saved-contact-views'
import { BookmarkIcon, ChevronDown } from 'lucide-react'

// Enhanced Contact type with computed fields
interface EnhancedContact extends Contact {
  deal_count?: number
  total_deal_value?: number
  last_activity_at?: string
}

export function ContactsListEnterprise() {
  const router = useRouter()
  const { appUser } = useAuth()
  const supabase = createClient()
  const { views, currentView, applyView } = useSavedContactViews()

  // State
  const [contacts, setContacts] = useState<EnhancedContact[]>([])
  const [teamMembers, setTeamMembers] = useState<AppUser[]>([])
  const [locations, setLocations] = useState<any[]>([]) // NEW: Locations for filtering
  const [loading, setLoading] = useState(true)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
  const [showCreateContact, setShowCreateContact] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  // 2b.25.3: bulk CSV import via ingestLead
  const [showCsvImport, setShowCsvImport] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all') // NEW: Location filter
  const [tagFilter, setTagFilter] = useState<string>('all')

  // Sort
  const [sortField, setSortField] = useState<'full_name' | 'created_at' | 'updated_at'>('updated_at')
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

  // Load team members
  useEffect(() => {
    if (appUser?.active_tenant_id) {
      loadTeamMembers()
      loadLocations() // NEW: Load locations for filtering
    }
  }, [appUser?.active_tenant_id])

  // Load contacts when filters change
  useEffect(() => {
    if (appUser?.active_tenant_id) {
      loadContacts()
    }
  }, [
    appUser?.active_tenant_id,
    debouncedSearchQuery,
    typeFilter,
    sourceFilter,
    locationFilter, // NEW: Re-load when location filter changes
    tagFilter,
    sortField,
    sortOrder,
    currentPage,
    pageSize,
  ])

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('tenant_id', appUser?.active_tenant_id)
        .order('full_name')

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  // NEW: Load accessible locations for filtering
  const loadLocations = async () => {
    try {
      const { data, error} = await supabase.rpc('get_user_accessible_locations', {
        p_user_id: appUser?.id,
        p_tenant_id: appUser?.active_tenant_id,
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

  const loadContacts = async () => {
    try {
      setLoading(true)

      // Build query
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('tenant_id', appUser?.active_tenant_id)
        .is('deleted_at', null) // Only active contacts

      // Apply filters
      if (debouncedSearchQuery) {
        query = query.or(`full_name.ilike.%${debouncedSearchQuery}%,primary_email.ilike.%${debouncedSearchQuery}%,primary_phone.ilike.%${debouncedSearchQuery}%`)
      }

      if (typeFilter !== 'all') {
        query = query.eq('contact_type', typeFilter)
      }

      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter)
      }

      // NEW: Location filter
      if (locationFilter !== 'all') {
        query = query.eq('location_id', locationFilter)
      }

      if (tagFilter !== 'all') {
        query = query.contains('tags', [tagFilter])
      }

      // Sort
      query = query.order(sortField, { ascending: sortOrder === 'asc' })

      // Pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Enhance contacts with deal data (optimized query)
      const contactIds = (data || []).map(c => c.id)
      
      if (contactIds.length > 0) {
        const { data: dealStats } = await supabase
          .from('deals')
          .select('contact_id, value_estimate_cents')
          .in('contact_id', contactIds)
          .eq('tenant_id', appUser?.active_tenant_id)

        const dealMap = new Map<string, { count: number; value: number }>()
        dealStats?.forEach(deal => {
          const existing = dealMap.get(deal.contact_id) || { count: 0, value: 0 }
          dealMap.set(deal.contact_id, {
            count: existing.count + 1,
            value: existing.value + (deal.value_estimate_cents || 0),
          })
        })

        const enhanced: EnhancedContact[] = (data || []).map(contact => ({
          ...contact,
          deal_count: dealMap.get(contact.id)?.count || 0,
          total_deal_value: dealMap.get(contact.id)?.value || 0,
        }))

        setContacts(enhanced)
      } else {
        setContacts([])
      }

      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedContactIds.size === contacts.length) {
      setSelectedContactIds(new Set())
    } else {
      setSelectedContactIds(new Set(contacts.map(c => c.id)))
    }
  }, [contacts, selectedContactIds])

  const handleSelectContact = useCallback((contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(contactId)) {
        newSet.delete(contactId)
      } else {
        newSet.add(contactId)
      }
      return newSet
    })
  }, [])

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedContactIds.size === 0) return

    const confirmed = confirm(
      `Are you sure you want to delete ${format.pluralize(selectedContactIds.size, 'contact')}? This will also delete all associated deals and tasks. This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', Array.from(selectedContactIds))

      if (error) throw error

      toast.success(`${format.pluralize(selectedContactIds.size, 'contact')} deleted successfully`)
      setSelectedContactIds(new Set())
      loadContacts()
    } catch (error) {
      console.error('Error deleting contacts:', error)
      toast.error('Failed to delete contacts')
    }
  }

  const handleBulkAddTags = async (newTags: string[]) => {
    if (selectedContactIds.size === 0) return

    try {
      // Get current tags for all selected contacts
      const { data: currentContacts } = await supabase
        .from('contacts')
        .select('id, tags')
        .in('id', Array.from(selectedContactIds))

      if (!currentContacts) throw new Error('Failed to fetch current tags')

      // Update each contact with merged tags
      const updates = currentContacts.map(contact => {
        const existingTags = contact.tags || []
        const mergedTags = Array.from(new Set([...existingTags, ...newTags]))
        
        return supabase
          .from('contacts')
          .update({ tags: mergedTags, updated_at: new Date().toISOString() })
          .eq('id', contact.id)
      })

      await Promise.all(updates)

      toast.success(`Tags added to ${selectedContactIds.size} contact(s)`)
      setSelectedContactIds(new Set())
      loadContacts()
    } catch (error) {
      console.error('Error adding tags:', error)
      toast.error('Failed to add tags')
    }
  }

  const handleBulkExport = () => {
    const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id))
    exportToCSV(selectedContacts)
  }

  const exportToCSV = (contactsToExport: EnhancedContact[] = contacts) => {
    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Type',
      'Source',
      'Tags',
      '# Deals',
      'Total Value',
      'Created Date',
      'Last Updated',
    ]

    const rows = contactsToExport.map(contact => [
      contact.full_name,
      contact.primary_email || '',
      contact.primary_phone || '',
      (contact as any).contact_type || 'patient',
      contact.source || '',
      (contact.tags || []).join('; '),
      contact.deal_count?.toString() || '0',
      `£${((contact.total_deal_value || 0) / 100).toFixed(2)}`,
      format(new Date(contact.created_at), 'yyyy-MM-dd'),
      format(new Date(contact.updated_at), 'yyyy-MM-dd HH:mm'),
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${contactsToExport.length} contact(s)`)
  }

  // Currency formatter
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Active filters count
  const activeFiltersCount = [
    typeFilter !== 'all',
    sourceFilter !== 'all',
    locationFilter !== 'all', // NEW: Include location filter
    tagFilter !== 'all',
    debouncedSearchQuery !== '',
  ].filter(Boolean).length

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setSourceFilter('all')
    setLocationFilter('all') // NEW: Clear location filter
    setTagFilter('all')
    setCurrentPage(1)
  }

  // Pagination info
  const totalPages = Math.ceil(totalCount / pageSize)
  const showingFrom = Math.min((currentPage - 1) * pageSize + 1, totalCount)
  const showingTo = Math.min(currentPage * pageSize, totalCount)

  if (!appUser) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            All Contacts • {format.number(totalCount)} total
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage patients, leads, and referrers
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
          {/* 2b.25.3: bulk import via ingestLead — proper dedup,
              attribution touchpoints, deals in the default pipeline. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCsvImport(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button
            onClick={() => setShowCreateContact(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Contact
          </Button>
        </div>
      </div>

      {/* Saved Views Row */}
      {views.length > 0 && (
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-between">
                <div className="flex items-center gap-2">
                  <BookmarkIcon className="h-4 w-4" />
                  <span className="truncate">{currentView?.name || 'Select View'}</span>
                </div>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
              {views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => {
                    applyView(view)
                    const filters = view.filters as ContactFilters
                    setSearchQuery(filters.searchQuery || '')
                    setTypeFilter(filters.typeFilter || 'all')
                    setSourceFilter(filters.sourceFilter || 'all')
                    setTagFilter(filters.tagFilter || 'all')
                    if (view.sort_field) setSortField(view.sort_field as any)
                    if (view.sort_order) setSortOrder(view.sort_order)
                    toast.success(`Applied view: ${view.name}`)
                  }}
                  className={cn(
                    'cursor-pointer',
                    currentView?.id === view.id && 'bg-blue-50'
                  )}
                >
                  {view.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search contacts by name, email, or phone..."
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

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="patient">Patients</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="referrer">Referrers</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="google_ads">Google Ads</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
          </SelectContent>
        </Select>

        {/* NEW: Location Filter */}
        {locations.length > 1 && (
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
      {selectedContactIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckSquare className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            {format.pluralize(selectedContactIds.size, 'contact')} selected
          </span>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <TagIcon className="h-4 w-4 mr-2" />
                Add Tags
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkAddTags(['VIP'])}>
                VIP
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAddTags(['High Value'])}>
                High Value
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAddTags(['Follow Up'])}>
                Follow Up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAddTags(['Hot Lead'])}>
                Hot Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={handleBulkExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkDelete}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedContactIds(new Set())}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selectedContactIds.size === contacts.length && contacts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <button
                    onClick={() => {
                      if (sortField === 'full_name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortField('full_name')
                        setSortOrder('asc')
                      }
                    }}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    Contact
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Deals
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tags
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
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-12 w-12 text-gray-300" />
                      <p className="text-sm font-medium">No contacts found</p>
                      <p className="text-xs text-gray-400">
                        {activeFiltersCount > 0
                          ? 'Try adjusting your filters'
                          : 'Create your first contact to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedContactIds.has(contact.id)}
                        onCheckedChange={() => handleSelectContact(contact.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-medium">
                            {getInitials(contact.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900 hover:text-blue-600">
                            {contact.full_name}
                          </div>
                          {contact.source && (
                            <div className="text-xs text-gray-500">
                              Source: {contact.source}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {contact.primary_email && (
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {contact.primary_email}
                          </div>
                        )}
                        {contact.primary_phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {contact.primary_phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {(contact as any).contact_type || 'patient'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {contact.deal_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {contact.total_deal_value ? formatCurrency(contact.total_deal_value) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex gap-1">
                          {contact.tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{contact.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(contact.updated_at), { addSuffix: true })}
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
                          <DropdownMenuItem onClick={() => router.push(`/contacts/${contact.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingContact(contact)
                              setShowCreateContact(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={async () => {
                              const confirmed = confirm('Are you sure you want to delete this contact? All associated deals and tasks will also be deleted.')
                              if (confirmed) {
                                try {
                                  const { error } = await supabase
                                    .from('contacts')
                                    .delete()
                                    .eq('id', contact.id)
                                  if (error) throw error
                                  toast.success('Contact deleted')
                                  loadContacts()
                                } catch (error) {
                                  toast.error('Failed to delete contact')
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{showingFrom}</span> to{' '}
            <span className="font-medium">{showingTo}</span> of{' '}
            <span className="font-medium">{totalCount}</span> contacts
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(parseInt(value))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[130px]">
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

      {/* Create/Edit Contact Slide-Over */}
      <CreateContactSlideOver
        open={showCreateContact}
        onClose={() => {
          setShowCreateContact(false)
          setEditingContact(null)
        }}
        onContactCreated={() => {
          setShowCreateContact(false)
          setEditingContact(null)
          loadContacts()
        }}
        contact={editingContact}
        mode={editingContact ? 'edit' : 'create'}
      />

      {/* 2b.25.3: CSV import via ingestLead */}
      <CsvImportDialog
        open={showCsvImport}
        onOpenChange={setShowCsvImport}
        onComplete={() => loadContacts()}
      />
    </div>
  )
}


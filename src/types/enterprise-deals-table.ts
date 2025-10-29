/**
 * Enterprise Deals Table - Shared Types
 * 
 * Unified type definitions for the EnterpriseDealsTable component
 * Used by both /deals (universal view) and /pipeline (filtered view)
 */

import type { DealWithRelations, Pipeline, PipelineStage, AppUser } from './database'

// ============================================================================
// ENHANCED DEAL TYPE
// ============================================================================

/**
 * Enhanced Deal with computed fields for aging, status, and related data
 */
export interface EnhancedDeal extends DealWithRelations {
  // Computed fields
  days_in_stage?: number
  days_since_created?: number
  aging_status?: 'fresh' | 'aging' | 'stuck' | 'urgent'
  
  // Related data (loaded separately for RLS safety)
  contact?: {
    id: string
    full_name: string
    primary_email?: string
    primary_phone?: string
  } | null
  
  pipeline?: {
    id: string
    name: string
  } | null
  
  stage?: {
    id: string
    name: string
    position: number
  } | null
  
  owner?: {
    id: string
    full_name: string
  } | null
}

// ============================================================================
// VIEW MODE & FILTER TYPES
// ============================================================================

/**
 * View mode: List (table) or Board (Kanban)
 */
export type ViewMode = 'list' | 'board'

/**
 * Table mode: Universal (all pipelines) or Pipeline (specific pipeline)
 */
export type TableMode = 'universal' | 'pipeline'

/**
 * Sort field options
 */
export type SortField = 'title' | 'value' | 'created_at' | 'updated_at' | 'stage'

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Owner filter options
 */
export type OwnerFilter = 'all' | 'my' | 'unassigned' | 'team' | string

/**
 * Aging filter options
 */
export type AgingFilter = 'all' | 'fresh' | 'stuck'

/**
 * Value filter options
 */
export type ValueFilter = 'all' | 'high' | 'medium' | 'low'

// ============================================================================
// FILTER STATE INTERFACE
// ============================================================================

/**
 * Complete filter state for the EnterpriseDealsTable
 * Used for persistence and saved views
 */
export interface DealFilters {
  searchQuery?: string
  pipelineFilter?: string
  stageFilter?: string
  ownerFilter?: string
  locationFilter?: string
  agingFilter?: string
  valueFilter?: string
  tagFilter?: string[]
  marketingSourceFilter?: string
  sourceFilter?: string
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for EnterpriseDealsTable component
 */
export interface EnterpriseDealsTableProps {
  /**
   * Table mode: 'universal' shows all deals, 'pipeline' shows deals for a specific pipeline
   */
  mode: TableMode
  
  /**
   * Pipeline ID (required if mode is 'pipeline', ignored if mode is 'universal')
   */
  pipelineId?: string
  
  /**
   * Initial view mode (defaults to 'list')
   */
  initialViewMode?: ViewMode
  
  /**
   * Whether to show the pipeline selector (defaults to true in universal mode, false in pipeline mode)
   */
  showPipelineSelector?: boolean
  
  /**
   * Whether to show bulk actions (defaults to true)
   */
  showBulkActions?: boolean
  
  /**
   * Whether to show saved views dropdown (defaults to true in universal mode)
   */
  showSavedViews?: boolean
  
  /**
   * Whether to show export button (defaults to true)
   */
  showExport?: boolean
  
  /**
   * Whether to show the view toggle (Board/List) (defaults to false)
   */
  showViewToggle?: boolean
  
  /**
   * Whether to show the header section entirely (defaults to true)
   */
  showHeader?: boolean
  
  /**
   * Custom title for the table
   */
  title?: string
  
  /**
   * Custom subtitle for the table
   */
  subtitle?: string
  
  /**
   * Custom CSS class for the container
   */
  className?: string
  
  /**
   * Callback when a deal is selected (for deep linking)
   */
  onDealSelected?: (dealId: string) => void
  
  /**
   * Callback when "New Deal" button is clicked
   */
  onCreateDeal?: () => void
}

// ============================================================================
// LOCATION & PIPELINE TYPES
// ============================================================================

/**
 * Location data structure
 */
export interface Location {
  id: string
  name: string
  tenant_id: string
}

/**
 * Pipeline template structure
 */
export interface PipelineTemplate {
  name: string
  description: string
  icon: string
  suggested_stages: string[]
}

// ============================================================================
// BULK ACTION TYPES
// ============================================================================

/**
 * Bulk action type
 */
export type BulkAction = 'assign' | 'export' | 'delete'

/**
 * Bulk action handler
 */
export type BulkActionHandler = (dealIds: string[]) => Promise<void>

// ============================================================================
// EXPORT TYPES
// ============================================================================

/**
 * CSV export columns
 */
export const CSV_COLUMNS = [
  'Deal Title',
  'Contact Name',
  'Contact Email',
  'Pipeline',
  'Stage',
  'Value',
  'Owner',
  'Location',
  'Days in Stage',
  'Created Date',
  'Last Updated',
  'Status',
  'Treatment Tags',
] as const

/**
 * CSV export row type
 */
export type CSVRow = Record<typeof CSV_COLUMNS[number], string>

// ============================================================================
// STAT BADGE TYPES
// ============================================================================

/**
 * Stats displayed in header badges
 */
export interface DealStats {
  totalCount: number
  totalValue: number
  averageValue: number
  freshDeals: number
  stuckDeals: number
}

// ============================================================================
// COLUMN VISIBILITY
// ============================================================================

/**
 * Column visibility configuration
 * Different columns shown based on mode and view
 */
export interface ColumnVisibility {
  checkbox: boolean
  deal: boolean
  contact: boolean
  pipeline: boolean // Only in universal mode
  stage: boolean
  tags: boolean
  value: boolean
  owner: boolean
  age: boolean
  updated: boolean
  actions: boolean
}

/**
 * Get default column visibility based on mode
 */
export function getDefaultColumnVisibility(mode: TableMode): ColumnVisibility {
  return {
    checkbox: true,
    deal: true,
    contact: true,
    pipeline: mode === 'universal', // Show pipeline column only in universal mode
    stage: true,
    tags: true,
    value: true,
    owner: true,
    age: true,
    updated: true,
    actions: true,
  }
}

// ============================================================================
// AGING CALCULATION
// ============================================================================

/**
 * Calculate aging status based on days in stage
 */
export function calculateAgingStatus(daysInStage: number): EnhancedDeal['aging_status'] {
  if (daysInStage > 30) return 'urgent'
  if (daysInStage > 14) return 'stuck'
  if (daysInStage > 7) return 'aging'
  return 'fresh'
}

/**
 * Aging badge color configuration
 */
export const AGING_COLORS = {
  fresh: 'bg-green-50 text-green-700 border-green-200',
  aging: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  stuck: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
} as const

// ============================================================================
// FILTER HELPERS
// ============================================================================

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: DealFilters): boolean {
  return !!(
    filters.searchQuery ||
    (filters.pipelineFilter && filters.pipelineFilter !== 'all') ||
    (filters.stageFilter && filters.stageFilter !== 'all') ||
    (filters.ownerFilter && filters.ownerFilter !== 'all') ||
    (filters.locationFilter && filters.locationFilter !== 'all') ||
    (filters.agingFilter && filters.agingFilter !== 'all') ||
    (filters.valueFilter && filters.valueFilter !== 'all') ||
    (filters.tagFilter && filters.tagFilter.length > 0) ||
    (filters.marketingSourceFilter && filters.marketingSourceFilter !== 'all') ||
    (filters.sourceFilter && filters.sourceFilter !== 'all')
  )
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: DealFilters): number {
  let count = 0
  if (filters.searchQuery) count++
  if (filters.pipelineFilter && filters.pipelineFilter !== 'all') count++
  if (filters.stageFilter && filters.stageFilter !== 'all') count++
  if (filters.ownerFilter && filters.ownerFilter !== 'all') count++
  if (filters.locationFilter && filters.locationFilter !== 'all') count++
  if (filters.agingFilter && filters.agingFilter !== 'all') count++
  if (filters.valueFilter && filters.valueFilter !== 'all') count++
  if (filters.tagFilter && filters.tagFilter.length > 0) count++
  if (filters.marketingSourceFilter && filters.marketingSourceFilter !== 'all') count++
  if (filters.sourceFilter && filters.sourceFilter !== 'all') count++
  return count
}

/**
 * Reset filters to default state
 */
export function getDefaultFilters(): DealFilters {
  return {
    searchQuery: '',
    pipelineFilter: 'all',
    stageFilter: 'all',
    ownerFilter: 'all',
    locationFilter: 'all',
    agingFilter: 'all',
    valueFilter: 'all',
    tagFilter: [],
    marketingSourceFilter: 'all',
    sourceFilter: 'all',
  }
}


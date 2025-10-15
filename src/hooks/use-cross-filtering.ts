/**
 * Cross-Filtering Hook
 * 
 * Click one chart → update all other charts on the dashboard
 * 
 * Features:
 * - Shared filter state across all widgets
 * - Click bar chart → pie chart updates
 * - Click legend → filter that category
 * - Clear all filters
 * - Filter breadcrumbs
 * 
 * Usage:
 * ```typescript
 * const { filters, addFilter, removeFilter, clearFilters } = useCrossFiltering()
 * 
 * <BarChart onBarClick={(data) => addFilter('month', data.month)}>
 * 
 * const filteredData = applyFilters(rawData, filters)
 * ```
 */

import { useState, useCallback, useMemo } from 'react'

export interface Filter {
  key: string // e.g., 'month', 'source', 'userId', 'campaign'
  value: any
  label: string // Display label for breadcrumb
}

export function useCrossFiltering() {
  const [filters, setFilters] = useState<Filter[]>([])
  
  /**
   * Add a filter
   */
  const addFilter = useCallback((key: string, value: any, label?: string) => {
    setFilters(prev => {
      // Remove existing filter for this key (replace)
      const without = prev.filter(f => f.key !== key)
      
      return [
        ...without,
        {
          key,
          value,
          label: label || `${key}: ${value}`,
        },
      ]
    })
  }, [])
  
  /**
   * Remove a filter by key
   */
  const removeFilter = useCallback((key: string) => {
    setFilters(prev => prev.filter(f => f.key !== key))
  }, [])
  
  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters([])
  }, [])
  
  /**
   * Toggle filter (add if not present, remove if present)
   */
  const toggleFilter = useCallback((key: string, value: any, label?: string) => {
    setFilters(prev => {
      const existing = prev.find(f => f.key === key && f.value === value)
      
      if (existing) {
        return prev.filter(f => !(f.key === key && f.value === value))
      } else {
        return [
          ...prev,
          {
            key,
            value,
            label: label || `${key}: ${value}`,
          },
        ]
      }
    })
  }, [])
  
  /**
   * Check if a filter is active
   */
  const hasFilter = useCallback((key: string, value?: any) => {
    if (value === undefined) {
      return filters.some(f => f.key === key)
    }
    return filters.some(f => f.key === key && f.value === value)
  }, [filters])
  
  /**
   * Get active filter value for a key
   */
  const getFilterValue = useCallback((key: string) => {
    const filter = filters.find(f => f.key === key)
    return filter?.value
  }, [filters])
  
  return {
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    toggleFilter,
    hasFilter,
    getFilterValue,
  }
}

/**
 * Apply filters to data array
 * 
 * @param data - Raw data array
 * @param filters - Active filters
 * @returns Filtered data
 */
export function applyFilters<T extends Record<string, any>>(
  data: T[],
  filters: Filter[]
): T[] {
  if (filters.length === 0) return data
  
  return data.filter(item => {
    return filters.every(filter => {
      const itemValue = item[filter.key]
      
      // Handle different comparison types
      if (Array.isArray(filter.value)) {
        // If filter value is array, check if item value is in array
        return filter.value.includes(itemValue)
      }
      
      if (typeof filter.value === 'object' && filter.value.min !== undefined) {
        // Range filter
        return itemValue >= filter.value.min && itemValue <= filter.value.max
      }
      
      // Exact match
      return itemValue === filter.value
    })
  })
}

/**
 * Filter Breadcrumb Component (for UI)
 */
export interface FilterBreadcrumbsProps {
  filters: Filter[]
  onRemove: (key: string) => void
  onClearAll: () => void
}


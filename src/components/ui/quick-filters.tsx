'use client'

import { Badge } from './badge'
import { X } from 'lucide-react'
import { Button } from './button'

export interface QuickFilter {
  label: string
  value: string
  count?: number
}

interface QuickFiltersProps {
  filters: QuickFilter[]
  activeFilter: string
  onFilterChange: (value: string) => void
}

export function QuickFilters({ filters, activeFilter, onFilterChange }: QuickFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className="relative"
        >
          {filter.label}
          {filter.count !== undefined && (
            <Badge variant="secondary" className="ml-2">
              {filter.count}
            </Badge>
          )}
        </Button>
      ))}
      {activeFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange('')}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}


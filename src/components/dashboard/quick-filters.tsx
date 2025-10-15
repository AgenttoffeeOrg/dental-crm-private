'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

export type FilterType = 'all' | 'my-items' | 'team' | 'user'

interface QuickFiltersProps {
  currentFilter: FilterType
  onChange: (filter: FilterType) => void
  userOptions?: Array<{ id: string; name: string }>
  className?: string
}

/**
 * Quick Filter Chips
 * 
 * Provides quick filtering options for dashboard data.
 * Supports: My Items, All Team, Specific Users
 */
export function QuickFilters({
  currentFilter,
  onChange,
  userOptions = [],
  className = ''
}: QuickFiltersProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const filters: Array<{ value: FilterType; label: string }> = [
    { value: 'all', label: 'All Items' },
    { value: 'my-items', label: 'My Items' },
    { value: 'team', label: 'Team Items' }
  ]

  const handleFilterClick = (filter: FilterType) => {
    if (filter === 'user') {
      setSelectedUser(null)
    }
    onChange(filter)
  }

  const handleUserSelect = (userId: string, userName: string) => {
    setSelectedUser(userId)
    onChange('user')
  }

  const clearUserFilter = () => {
    setSelectedUser(null)
    onChange('all')
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 mr-1">Filter:</span>
      
      {filters.map(filter => (
        <Badge
          key={filter.value}
          variant={currentFilter === filter.value ? 'default' : 'outline'}
          className={`cursor-pointer transition-all ${
            currentFilter === filter.value 
              ? 'bg-indigo-600 text-white' 
              : 'hover:bg-gray-100'
          }`}
          onClick={() => handleFilterClick(filter.value)}
        >
          {filter.label}
        </Badge>
      ))}

      {userOptions.length > 0 && (
        <div className="relative">
          <select
            className="text-sm border rounded px-2 py-1 bg-white cursor-pointer"
            value={selectedUser || ''}
            onChange={(e) => {
              if (e.target.value) {
                const user = userOptions.find(u => u.id === e.target.value)
                if (user) handleUserSelect(user.id, user.name)
              }
            }}
          >
            <option value="">By User...</option>
            {userOptions.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedUser && (
        <Badge
          variant="default"
          className="bg-purple-600 text-white cursor-pointer gap-1"
          onClick={clearUserFilter}
        >
          {userOptions.find(u => u.id === selectedUser)?.name}
          <X className="h-3 w-3 ml-1" />
        </Badge>
      )}

      {currentFilter !== 'all' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange('all')}
          className="h-7 text-xs"
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}


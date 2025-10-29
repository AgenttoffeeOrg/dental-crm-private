'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings2 } from 'lucide-react'

export type ColumnId = 'deal' | 'contact' | 'pipeline' | 'stage' | 'tags' | 'value' | 'owner' | 'age' | 'updated' | 'location'

export interface ColumnDefinition {
  id: ColumnId
  label: string
  alwaysVisible?: boolean // If true, cannot be hidden
}

interface ColumnVisibilityManagerProps {
  page: string // e.g., 'deals', 'contacts', 'pipeline'
  columns: ColumnDefinition[]
  defaultVisibleColumns: ColumnId[]
  onVisibilityChange: (visibleColumns: ColumnId[]) => void
  className?: string
}

export function ColumnVisibilityManager({
  page,
  columns,
  defaultVisibleColumns,
  onVisibilityChange,
  className
}: ColumnVisibilityManagerProps) {
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(defaultVisibleColumns)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false) // Add explicit open state

  // Load user preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [page])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/user/column-preferences?page=${page}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.visibleColumns && Array.isArray(data.visibleColumns)) {
          setVisibleColumns(data.visibleColumns)
          onVisibilityChange(data.visibleColumns)
        } else {
          // No saved preferences, use defaults
          setVisibleColumns(defaultVisibleColumns)
          onVisibilityChange(defaultVisibleColumns)
        }
      } else {
        console.warn('[ColumnVisibility] Failed to load preferences, using defaults')
        setVisibleColumns(defaultVisibleColumns)
        onVisibilityChange(defaultVisibleColumns)
      }
    } catch (error) {
      console.error('[ColumnVisibility] Error loading preferences:', error)
      setVisibleColumns(defaultVisibleColumns)
      onVisibilityChange(defaultVisibleColumns)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async (newVisibleColumns: ColumnId[]) => {
    try {
      setSaving(true)
      const response = await fetch('/api/user/column-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          visibleColumns: newVisibleColumns
        })
      })

      if (!response.ok) {
        console.error('[ColumnVisibility] Failed to save preferences')
      }
    } catch (error) {
      console.error('[ColumnVisibility] Error saving preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleColumn = (columnId: ColumnId) => {
    const column = columns.find(c => c.id === columnId)
    if (column?.alwaysVisible) return // Cannot toggle always-visible columns

    const newVisibleColumns = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId]

    setVisibleColumns(newVisibleColumns)
    onVisibilityChange(newVisibleColumns)
    savePreferences(newVisibleColumns)
  }

  const visibleCount = visibleColumns.length
  const totalCount = columns.length

  console.log('[ColumnVisibility] Rendering dropdown, open:', open, 'loading:', loading, 'columns:', columns.length)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 border-gray-300 hover:bg-gray-50 ${className}`}
          disabled={loading}
          onClick={() => {
            console.log('[ColumnVisibility] Button clicked, current open:', open)
            setOpen(!open)
          }}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Edit columns
          {saving && <span className="ml-2 text-xs text-gray-500">Saving...</span>}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Edit columns</span>
            <span className="text-xs font-normal text-gray-500">
              {visibleCount}/{totalCount}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="px-2 py-4 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : (
          <>
            {columns.map((column) => {
              const isVisible = visibleColumns.includes(column.id)
              const isDisabled = column.alwaysVisible

              return (
                <DropdownMenuItem
                  key={column.id}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('[ColumnVisibility] Toggling column:', column.id)
                    toggleColumn(column.id)
                  }}
                  className="cursor-pointer"
                  disabled={isDisabled}
                >
                  <Checkbox
                    checked={isVisible}
                    disabled={isDisabled}
                    className="mr-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className={isDisabled ? 'text-gray-500' : ''}>
                    {column.label}
                  </span>
                  {isDisabled && (
                    <span className="ml-auto text-xs text-gray-400">Required</span>
                  )}
                </DropdownMenuItem>
              )
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


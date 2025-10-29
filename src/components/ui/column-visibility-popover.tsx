'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings2, X } from 'lucide-react'

export type ColumnId = 'deal' | 'contact' | 'pipeline' | 'stage' | 'tags' | 'value' | 'owner' | 'age' | 'updated' | 'location'

export interface ColumnDefinition {
  id: ColumnId
  label: string
  alwaysVisible?: boolean
}

interface ColumnVisibilityPopoverProps {
  page: string
  columns: ColumnDefinition[]
  defaultVisibleColumns: ColumnId[]
  onVisibilityChange: (visibleColumns: ColumnId[]) => void
  className?: string
}

export function ColumnVisibilityPopover({
  page,
  columns,
  defaultVisibleColumns,
  onVisibilityChange,
  className
}: ColumnVisibilityPopoverProps) {
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(defaultVisibleColumns)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Load user preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [page])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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
    if (column?.alwaysVisible) return

    const newVisibleColumns = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId]

    setVisibleColumns(newVisibleColumns)
    onVisibilityChange(newVisibleColumns)
    savePreferences(newVisibleColumns)
  }

  const visibleCount = visibleColumns.length
  const totalCount = columns.length

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        className={`h-9 border-gray-300 hover:bg-gray-50 ${className}`}
        disabled={loading}
        onClick={() => {
          console.log('[ColumnVisibility] Button clicked, toggling popup')
          setIsOpen(!isOpen)
        }}
      >
        <Settings2 className="h-4 w-4 mr-2" />
        Edit columns
        {saving && <span className="ml-2 text-xs text-gray-500">Saving...</span>}
      </Button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[200]"
          style={{ top: '100%' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-gray-900">Edit columns</span>
              <span className="text-xs text-gray-500">
                ({visibleCount}/{totalCount})
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="py-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                Loading...
              </div>
            ) : (
              <>
                {columns.map((column) => {
                  const isVisible = visibleColumns.includes(column.id)
                  const isDisabled = column.alwaysVisible

                  return (
                    <button
                      key={column.id}
                      onClick={() => {
                        if (!isDisabled) {
                          console.log('[ColumnVisibility] Toggling column:', column.id)
                          toggleColumn(column.id)
                        }
                      }}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        isDisabled
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={isVisible}
                        disabled={isDisabled}
                        className="pointer-events-none"
                      />
                      <span className={`flex-1 text-left ${isDisabled ? 'text-gray-500' : 'text-gray-700'}`}>
                        {column.label}
                      </span>
                      {isDisabled && (
                        <span className="text-xs text-gray-400">Required</span>
                      )}
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}



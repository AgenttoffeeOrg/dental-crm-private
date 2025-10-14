'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { SortDropdown, SortOption } from './sort-dropdown'
import { ColumnToggle, Column } from './column-toggle'
import { BulkActions, BulkAction } from './bulk-actions'
import { Checkbox } from './checkbox'

interface EnhancedDataTableProps<T> {
  data: T[]
  columns: Column[]
  sortOptions: SortOption[]
  bulkActions?: BulkAction[]
  onExport?: () => void
  searchPlaceholder?: string
  emptyState?: React.ReactNode
}

export function EnhancedDataTable<T extends { id: string }>({
  data,
  columns: initialColumns,
  sortOptions,
  bulkActions,
  onExport,
  searchPlaceholder = 'Search...',
  emptyState
}: EnhancedDataTableProps<T>) {
  const [columns, setColumns] = useState(initialColumns)
  const [sort, setSort] = useState(sortOptions[0]?.value || '')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const visibleColumns = columns.filter(c => c.visible)

  const toggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(c => 
      c.id === columnId ? { ...c, visible: !c.visible } : c
    ))
  }

  const toggleAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(data.map(item => item.id))
    }
  }

  const toggleItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <SortDropdown options={sortOptions} value={sort} onValueChange={setSort} />
        <ColumnToggle columns={columns} onToggle={toggleColumn} />
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {bulkActions && (
                <th className="w-12 px-4 py-3">
                  <Checkbox checked={selectedIds.length === data.length} onCheckedChange={toggleAll} />
                </th>
              )}
              {visibleColumns.map(column => (
                <th key={column.id} className="text-left px-4 py-3 text-sm font-medium text-gray-700">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (bulkActions ? 1 : 0)} className="px-4 py-8">
                  {emptyState || <div className="text-center text-gray-500">No data</div>}
                </td>
              </tr>
            ) : (
              data.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {bulkActions && (
                    <td className="px-4 py-3">
                      <Checkbox 
                        checked={selectedIds.includes(item.id)} 
                        onCheckedChange={() => toggleItem(item.id)} 
                      />
                    </td>
                  )}
                  {/* Column rendering would go here based on data structure */}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions */}
      {bulkActions && selectedIds.length > 0 && (
        <BulkActions
          selectedCount={selectedIds.length}
          actions={bulkActions}
          onClear={() => setSelectedIds([])}
        />
      )}
    </div>
  )
}



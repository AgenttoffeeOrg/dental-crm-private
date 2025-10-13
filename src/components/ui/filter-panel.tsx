'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'

interface FilterPanelProps {
  children: ReactNode
  open: boolean
  onClose: () => void
  onClear?: () => void
  onApply?: () => void
}

export function FilterPanel({ children, open, onClose, onClear, onApply }: FilterPanelProps) {
  if (!open) return null

  return (
    <Card className="absolute right-0 top-full mt-2 w-80 p-4 shadow-lg z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filters</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4">
        {children}
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t">
        {onClear && (
          <Button variant="outline" onClick={onClear} className="flex-1">
            Clear
          </Button>
        )}
        {onApply && (
          <Button onClick={onApply} className="flex-1">
            Apply
          </Button>
        )}
      </div>
    </Card>
  )
}


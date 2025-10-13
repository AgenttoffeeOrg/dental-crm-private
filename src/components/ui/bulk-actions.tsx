'use client'

import { Button } from './button'
import { Badge } from './badge'
import { LucideIcon } from 'lucide-react'

export interface BulkAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface BulkActionsProps {
  selectedCount: number
  actions: BulkAction[]
  onClear: () => void
}

export function BulkActions({ selectedCount, actions, onClear }: BulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-lg border p-4 flex items-center gap-4 z-50">
      <div className="flex items-center gap-2">
        <Badge>{selectedCount}</Badge>
        <span className="text-sm font-medium">selected</span>
      </div>
      <div className="h-6 w-px bg-gray-300" />
      <div className="flex gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
            size="sm"
            onClick={action.onClick}
          >
            <action.icon className="h-4 w-4 mr-2" />
            {action.label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  )
}


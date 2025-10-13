'use client'

import { LayoutList, LayoutGrid, Kanban } from 'lucide-react'
import { Button } from './button'

type View = 'list' | 'grid' | 'board'

interface ViewSwitcherProps {
  view: View
  onViewChange: (view: View) => void
}

export function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1">
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'board' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('board')}
      >
        <Kanban className="h-4 w-4" />
      </Button>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Plus, Star, MoreVertical, Edit, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

interface SavedView {
  id: string
  name: string
  isDefault?: boolean
}

interface SavedViewsProps {
  views: SavedView[]
  currentView?: string
  onViewSelect: (viewId: string) => void
  onViewSave: (name: string) => void
  onViewDelete: (viewId: string) => void
}

export function SavedViews({ views, currentView, onViewSelect, onViewSave, onViewDelete }: SavedViewsProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newViewName, setNewViewName] = useState('')

  const handleSave = () => {
    if (newViewName.trim()) {
      onViewSave(newViewName)
      setNewViewName('')
      setIsCreating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {views.map((view) => (
          <div key={view.id} className="flex items-center">
            <Button
              variant={currentView === view.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewSelect(view.id)}
            >
              {view.isDefault && <Star className="h-3 w-3 mr-1" />}
              {view.name}
            </Button>
            {!view.isDefault && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewDelete(view.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {isCreating ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder="View name..."
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-40"
            autoFocus
          />
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Save View
        </Button>
      )}
    </div>
  )
}


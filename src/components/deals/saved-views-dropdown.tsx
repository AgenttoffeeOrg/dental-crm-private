'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  BookmarkIcon,
  Star,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSavedDealViews, type DealFilters } from '@/hooks/use-saved-deal-views'
import { toast } from 'sonner'

interface SavedViewsDropdownProps {
  currentFilters: DealFilters
  onViewApplied: (filters: DealFilters, sortField?: string, sortOrder?: 'asc' | 'desc') => void
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

export function SavedViewsDropdown({
  currentFilters,
  onViewApplied,
  sortField,
  sortOrder,
}: SavedViewsDropdownProps) {
  const {
    views,
    currentView,
    createView,
    deleteView,
    toggleFavorite,
    applyView,
    setDefaultView,
  } = useSavedDealViews()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [newViewDescription, setNewViewDescription] = useState('')
  const [newViewIsDefault, setNewViewIsDefault] = useState(false)
  const [newViewIsFavorite, setNewViewIsFavorite] = useState(false)
  const [newViewIsShared, setNewViewIsShared] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleCreateView = async () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a view name')
      return
    }

    setSaving(true)
    try {
      const view = await createView(
        newViewName,
        currentFilters,
        sortField,
        sortOrder,
        {
          description: newViewDescription || undefined,
          isDefault: newViewIsDefault,
          isFavorite: newViewIsFavorite,
          isShared: newViewIsShared,
        }
      )

      if (view) {
        setShowCreateDialog(false)
        setNewViewName('')
        setNewViewDescription('')
        setNewViewIsDefault(false)
        setNewViewIsFavorite(false)
        setNewViewIsShared(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleApplyView = (view: typeof views[0]) => {
    applyView(view)
    onViewApplied(
      view.filters as DealFilters,
      view.sort_field,
      view.sort_order
    )
    toast.success(`Applied view: ${view.name}`)
  }

  const handleDeleteView = async (viewId: string, viewName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const confirmed = confirm(`Are you sure you want to delete "${viewName}"?`)
    if (!confirmed) return

    await deleteView(viewId)
  }

  const handleToggleFavorite = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await toggleFavorite(viewId)
  }

  const handleSetDefault = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await setDefaultView(viewId)
  }

  // Separate views into favorites and others
  const favoriteViews = views.filter(v => v.is_favorite)
  const regularViews = views.filter(v => !v.is_favorite)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            <div className="flex items-center gap-2">
              <BookmarkIcon className="h-4 w-4" />
              <span className="truncate">
                {currentView?.name || 'Select View'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Saved Views</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreateDialog(true)}
              className="h-6 px-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Favorite Views */}
          {favoriteViews.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                Favorites
              </DropdownMenuLabel>
              {favoriteViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => handleApplyView(view)}
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    currentView?.id === view.id && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    <span className="truncate">{view.name}</span>
                    {view.is_default && (
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleToggleFavorite(view.id, e)}
                      className="h-5 w-5 p-0"
                      title="Remove from favorites"
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                    {!view.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteView(view.id, view.name, e)}
                        className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                        title="Delete view"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Regular Views */}
          {regularViews.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                All Views
              </DropdownMenuLabel>
              {regularViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => handleApplyView(view)}
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    currentView?.id === view.id && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="truncate">{view.name}</span>
                    {view.is_default && (
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleToggleFavorite(view.id, e)}
                      className="h-5 w-5 p-0"
                      title="Add to favorites"
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                    {!view.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteView(view.id, view.name, e)}
                        className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                        title="Delete view"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}

          {views.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-gray-500">
              No saved views yet
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create View Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Save your current filter and sort configuration for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">View Name *</Label>
              <Input
                id="view-name"
                placeholder="e.g., High Priority Deals"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-description">Description (optional)</Label>
              <Textarea
                id="view-description"
                placeholder="Describe what this view shows..."
                value={newViewDescription}
                onChange={(e) => setNewViewDescription(e.target.value)}
                disabled={saving}
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default"
                  checked={newViewIsDefault}
                  onCheckedChange={(checked) => setNewViewIsDefault(checked as boolean)}
                  disabled={saving}
                />
                <label
                  htmlFor="default"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Set as default view
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="favorite"
                  checked={newViewIsFavorite}
                  onCheckedChange={(checked) => setNewViewIsFavorite(checked as boolean)}
                  disabled={saving}
                />
                <label
                  htmlFor="favorite"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Add to favorites
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shared"
                  checked={newViewIsShared}
                  onCheckedChange={(checked) => setNewViewIsShared(checked as boolean)}
                  disabled={saving}
                />
                <label
                  htmlFor="shared"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Share with team
                </label>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
              <strong>Current filters:</strong>
              <div className="mt-1 space-y-1">
                {Object.entries(currentFilters).map(([key, value]) => {
                  if (!value || value === 'all') return null
                  return (
                    <div key={key}>
                      • {key}: {value}
                    </div>
                  )
                })}
                {sortField && (
                  <div>
                    • Sort: {sortField} ({sortOrder})
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateView} disabled={saving || !newViewName.trim()}>
              {saving ? 'Saving...' : 'Save View'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


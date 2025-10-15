'use client'

/**
 * Saved Views Manager
 * 
 * Save and load dashboard filter states
 * 
 * Features:
 * - Save current filter/date range/metric selection
 * - Quick load saved views
 * - Personal views (private)
 * - Team views (public within tenant)
 * - Default view per dashboard
 * - View usage tracking
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bookmark, Plus, Trash2, Users, Lock, Star } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'

interface SavedView {
  id: string
  name: string
  dashboard: string
  filters: any
  isPublic: boolean
  isDefault: boolean
  viewCount: number
  createdBy: string
  createdByName: string
  lastViewed?: string
}

interface SavedViewsManagerProps {
  dashboard: string
  currentFilters: any
  onLoadView: (filters: any) => void
}

export function SavedViewsManager({
  dashboard,
  currentFilters,
  onLoadView,
}: SavedViewsManagerProps) {
  const [views, setViews] = useState<SavedView[]>([])
  const [loading, setLoading] = useState(true)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [viewName, setViewName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  
  useEffect(() => {
    loadViews()
  }, [dashboard])
  
  const loadViews = async () => {
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      
      if (!appUser) return
      
      // Load views for this dashboard
      const { data } = await supabase
        .from('analytics_saved_views')
        .select('*, app_users!created_by(full_name)')
        .eq('dashboard', dashboard)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('view_count', { ascending: false })
      
      if (data) {
        const formattedViews: SavedView[] = data.map((v: any) => ({
          id: v.id,
          name: v.name,
          dashboard: v.dashboard,
          filters: v.filters,
          isPublic: v.is_public,
          isDefault: false, // TODO: Add default view logic
          viewCount: v.view_count || 0,
          createdBy: v.user_id,
          createdByName: v.app_users?.full_name || 'Unknown',
          lastViewed: v.last_viewed_at,
        }))
        
        setViews(formattedViews)
      }
    } catch (error) {
      console.error('[Saved Views] Error loading views:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSaveView = async () => {
    if (!viewName.trim()) {
      toast.error('Please enter a view name')
      return
    }
    
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      
      if (!appUser) return
      
      const { error } = await supabase
        .from('analytics_saved_views')
        .insert({
          tenant_id: appUser.tenant_id,
          user_id: user.id,
          name: viewName,
          dashboard,
          filters: currentFilters,
          is_public: isPublic,
        })
      
      if (error) {
        toast.error('Failed to save view')
        console.error(error)
        return
      }
      
      toast.success('View saved successfully')
      setShowSaveDialog(false)
      setViewName('')
      setIsPublic(false)
      loadViews()
    } catch (error) {
      console.error('[Saved Views] Error saving view:', error)
      toast.error('Failed to save view')
    }
  }
  
  const handleLoadView = async (view: SavedView) => {
    try {
      onLoadView(view.filters)
      toast.success(`Loaded view: ${view.name}`)
      
      // Increment view count
      const supabase = createClient()
      await supabase
        .from('analytics_saved_views')
        .update({
          view_count: view.viewCount + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', view.id)
      
      // Reload views to show updated count
      setTimeout(loadViews, 1000)
    } catch (error) {
      console.error('[Saved Views] Error loading view:', error)
    }
  }
  
  const handleDeleteView = async (viewId: string) => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('analytics_saved_views')
        .delete()
        .eq('id', viewId)
      
      if (error) {
        toast.error('Failed to delete view')
        return
      }
      
      toast.success('View deleted')
      loadViews()
    } catch (error) {
      console.error('[Saved Views] Error deleting view:', error)
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      {/* Load View Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Bookmark className="h-4 w-4 mr-2" />
            Saved Views
            {views.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {views.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {views.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-600">
              No saved views yet
            </div>
          ) : (
            <>
              {views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => handleLoadView(view)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {view.isPublic ? (
                      <Users className="h-3 w-3 text-gray-500" />
                    ) : (
                      <Lock className="h-3 w-3 text-gray-500" />
                    )}
                    <span>{view.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {view.isDefault && <Star className="h-3 w-3 text-yellow-500" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteView(view.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowSaveDialog(true)}
                className="text-blue-600"
              >
                <Plus className="h-3 w-3 mr-2" />
                Save Current View
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Save View Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save your current filters and settings for quick access later
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>View Name</Label>
              <Input
                placeholder="e.g., Q1 Performance Review"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Share with Team</Label>
                <p className="text-xs text-gray-600">
                  Make this view available to all users in your organization
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveView}>
                Save View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


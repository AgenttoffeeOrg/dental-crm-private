import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export interface SavedDealView {
  id: string
  tenant_id: string
  user_id: string
  name: string
  description?: string
  is_default: boolean
  is_favorite: boolean
  is_shared: boolean
  filters: Record<string, any>
  sort_field?: string
  sort_order?: 'asc' | 'desc'
  visible_columns?: string[]
  created_at: string
  updated_at: string
}

export interface DealFilters {
  searchQuery?: string
  pipelineFilter?: string
  stageFilter?: string
  ownerFilter?: string
  agingFilter?: string
  valueFilter?: string
}

export function useSavedDealViews() {
  const { appUser } = useAuth()
  const supabase = createClient()
  const [views, setViews] = useState<SavedDealView[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<SavedDealView | null>(null)

  const loadViews = useCallback(async () => {
    if (!appUser?.tenant_id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('saved_deal_views')
        .select('*')
        .eq('tenant_id', appUser.tenant_id)
        .or(`user_id.eq.${appUser.id},is_shared.eq.true`)
        .order('is_favorite', { ascending: false })
        .order('name')

      if (error) throw error

      setViews(data || [])

      // Set default view if none is selected
      if (!currentView && data && data.length > 0) {
        const defaultView = data.find(v => v.is_default) || data[0]
        setCurrentView(defaultView)
      }
    } catch (error) {
      console.error('Error loading saved views:', error)
      toast.error('Failed to load saved views')
    } finally {
      setLoading(false)
    }
  }, [appUser, supabase])

  useEffect(() => {
    loadViews()
  }, [loadViews])

  const createView = async (
    name: string,
    filters: DealFilters,
    sortField?: string,
    sortOrder?: 'asc' | 'desc',
    options?: {
      description?: string
      isDefault?: boolean
      isFavorite?: boolean
      isShared?: boolean
    }
  ): Promise<SavedDealView | null> => {
    if (!appUser?.tenant_id) return null

    try {
      const { data, error } = await supabase
        .from('saved_deal_views')
        .insert({
          tenant_id: appUser.tenant_id,
          user_id: appUser.id,
          name,
          description: options?.description,
          is_default: options?.isDefault || false,
          is_favorite: options?.isFavorite || false,
          is_shared: options?.isShared || false,
          filters: filters as any,
          sort_field: sortField,
          sort_order: sortOrder,
        })
        .select()
        .single()

      if (error) throw error

      toast.success(`View "${name}" created`)
      loadViews()
      return data
    } catch (error) {
      console.error('Error creating view:', error)
      toast.error('Failed to create view')
      return null
    }
  }

  const updateView = async (
    viewId: string,
    updates: Partial<SavedDealView>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saved_deal_views')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', viewId)

      if (error) throw error

      toast.success('View updated')
      loadViews()
      return true
    } catch (error) {
      console.error('Error updating view:', error)
      toast.error('Failed to update view')
      return false
    }
  }

  const deleteView = async (viewId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('saved_deal_views')
        .delete()
        .eq('id', viewId)

      if (error) throw error

      toast.success('View deleted')
      if (currentView?.id === viewId) {
        setCurrentView(null)
      }
      loadViews()
      return true
    } catch (error) {
      console.error('Error deleting view:', error)
      toast.error('Failed to delete view')
      return false
    }
  }

  const setDefaultView = async (viewId: string): Promise<boolean> => {
    if (!appUser?.tenant_id) return false

    try {
      // Remove default flag from all user's views
      await supabase
        .from('saved_deal_views')
        .update({ is_default: false })
        .eq('user_id', appUser.id)

      // Set new default
      const { error } = await supabase
        .from('saved_deal_views')
        .update({ is_default: true })
        .eq('id', viewId)

      if (error) throw error

      toast.success('Default view updated')
      loadViews()
      return true
    } catch (error) {
      console.error('Error setting default view:', error)
      toast.error('Failed to set default view')
      return false
    }
  }

  const toggleFavorite = async (viewId: string): Promise<boolean> => {
    const view = views.find(v => v.id === viewId)
    if (!view) return false

    return updateView(viewId, { is_favorite: !view.is_favorite })
  }

  const applyView = (view: SavedDealView) => {
    setCurrentView(view)
  }

  return {
    views,
    loading,
    currentView,
    createView,
    updateView,
    deleteView,
    setDefaultView,
    toggleFavorite,
    applyView,
    refreshViews: loadViews,
  }
}


import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'

export interface SavedContactView {
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

export interface ContactFilters {
  searchQuery?: string
  typeFilter?: string
  sourceFilter?: string
  tagFilter?: string
}

export function useSavedContactViews() {
  const { appUser } = useAuth()
  const supabase = createClient()
  const [views, setViews] = useState<SavedContactView[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<SavedContactView | null>(null)

  const loadViews = useCallback(async () => {
    if (!appUser?.tenant_id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('saved_contact_views')
        .select('*')
        .eq('tenant_id', appUser.tenant_id)
        .or(`user_id.eq.${appUser.id},is_shared.eq.true`)
        .order('is_favorite', { ascending: false })
        .order('name')

      if (error) {
        const errorCode = (error as any)?.code
        const errorMessage = (error as any)?.message || ''
        
        if (errorCode === '42P01' || 
            errorCode === 'PGRST116' || 
            errorMessage.includes('does not exist') ||
            errorMessage.includes('relation') ||
            errorMessage.includes('not found')) {
          console.warn('💡 Saved contact views: Run migration first (supabase/sql/62_contact_saved_views.sql)')
          setViews([])
          setLoading(false)
          return
        }
        throw error
      }

      setViews(data || [])

      if (!currentView && data && data.length > 0) {
        const defaultView = data.find(v => v.is_default) || data[0]
        setCurrentView(defaultView)
      }
    } catch (error) {
      const err = error as any
      const errorCode = err?.code
      const errorMessage = err?.message || ''
      
      if (errorCode === '42P01' || 
          errorCode === 'PGRST116' || 
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('not found')) {
        console.warn('💡 Saved contact views: Run migration first (supabase/sql/62_contact_saved_views.sql)')
        setViews([])
      } else {
        console.error('Error loading saved contact views:', error)
        toast.error('Failed to load saved views')
      }
    } finally {
      setLoading(false)
    }
  }, [appUser, supabase])

  useEffect(() => {
    loadViews()
  }, [loadViews])

  const applyView = (view: SavedContactView) => {
    setCurrentView(view)
  }

  return {
    views,
    loading,
    currentView,
    applyView,
    refreshViews: loadViews,
  }
}


/**
 * Dashboard Preferences Service
 * 
 * Handles saving and loading user dashboard preferences.
 * Manages widget visibility, order, and settings.
 */

import { createClient } from './supabase-client'

export interface DashboardPreferences {
  widget_visibility: Record<string, boolean>
  widget_order: string[]
  widget_settings: Record<string, any>
  time_period_default: string
  auto_refresh_enabled: boolean
  auto_refresh_interval: number
  theme_preference: 'light' | 'dark' | 'system'
}

/**
 * Load user's dashboard preferences
 */
export async function loadDashboardPreferences(
  userId: string
): Promise<DashboardPreferences | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('user_dashboard_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences exist yet
        return null
      }
      throw error
    }

    return {
      widget_visibility: data.widget_visibility || {},
      widget_order: data.widget_order || [],
      widget_settings: data.widget_settings || {},
      time_period_default: data.time_period_default || 'month',
      auto_refresh_enabled: data.auto_refresh_enabled ?? true,
      auto_refresh_interval: data.auto_refresh_interval || 5,
      theme_preference: data.theme_preference || 'system'
    }
  } catch (error) {
    console.error('[Preferences] Error loading:', error)
    return null
  }
}

/**
 * Save user's dashboard preferences
 */
export async function saveDashboardPreferences(
  userId: string,
  preferences: Partial<DashboardPreferences>
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('user_dashboard_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('[Preferences] Error saving:', error)
    return false
  }
}

/**
 * Update widget visibility
 */
export async function updateWidgetVisibility(
  userId: string,
  widgetId: string,
  visible: boolean
): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Load current preferences
    const current = await loadDashboardPreferences(userId)
    const widgetVisibility = current?.widget_visibility || {}
    
    // Update specific widget
    widgetVisibility[widgetId] = visible
    
    // Save back
    return await saveDashboardPreferences(userId, {
      widget_visibility: widgetVisibility
    })
  } catch (error) {
    console.error('[Preferences] Error updating visibility:', error)
    return false
  }
}

/**
 * Update widget order
 */
export async function updateWidgetOrder(
  userId: string,
  newOrder: string[]
): Promise<boolean> {
  return await saveDashboardPreferences(userId, {
    widget_order: newOrder
  })
}

/**
 * Reset to default preferences
 */
export async function resetToDefaults(userId: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('user_dashboard_preferences')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('[Preferences] Error resetting:', error)
    return false
  }
}

/**
 * Hook for dashboard preferences
 */
import { useEffect, useState as useStateReact } from 'react'

export function useDashboardPreferences(userId: string | undefined) {
  const [preferences, setPreferences] = useStateReact<DashboardPreferences | null>(null)
  const [loading, setLoading] = useStateReact(true)

  useEffect(() => {
    if (userId) {
      loadPreferences()
    }
  }, [userId])

  const loadPreferences = async () => {
    if (!userId) return
    
    setLoading(true)
    const prefs = await loadDashboardPreferences(userId)
    setPreferences(prefs)
    setLoading(false)
  }

  const savePreferences = async (updates: Partial<DashboardPreferences>) => {
    if (!userId) return false
    
    const success = await saveDashboardPreferences(userId, updates)
    if (success) {
      await loadPreferences() // Reload to get latest
    }
    return success
  }

  const toggleWidget = async (widgetId: string) => {
    if (!userId) return false
    
    const currentVisibility = preferences?.widget_visibility[widgetId] ?? true
    const success = await updateWidgetVisibility(userId, widgetId, !currentVisibility)
    if (success) {
      await loadPreferences()
    }
    return success
  }

  const reorderWidgets = async (newOrder: string[]) => {
    if (!userId) return false
    
    const success = await updateWidgetOrder(userId, newOrder)
    if (success) {
      await loadPreferences()
    }
    return success
  }

  const reset = async () => {
    if (!userId) return false
    
    const success = await resetToDefaults(userId)
    if (success) {
      setPreferences(null)
    }
    return success
  }

  return {
    preferences,
    loading,
    savePreferences,
    toggleWidget,
    reorderWidgets,
    reset,
    refresh: loadPreferences
  }
}


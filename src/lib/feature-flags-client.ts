/**
 * Feature Flags - CLIENT-SIDE ONLY
 * 
 * Safe for use in client components and React hooks.
 * Uses client-side Supabase client only.
 */

'use client'

import { createClient } from '@/lib/supabase-client'
import { useState, useEffect } from 'react'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export type FeatureFlagKey =
  | 'multi_org_enabled'
  | 'location_roles_enabled'
  | 'org_validation_enabled'
  | 'email_verification_required'
  | 'bulk_invites_enabled'
  | 'maintenance_mode'
  | 'cutover_ready'
  | 'use_legacy_membership'

export interface FeatureFlag {
  key: FeatureFlagKey
  enabled: boolean
  description: string | null
  tenant_overrides: Record<string, boolean>
  rollout_percentage: number
  category: string | null
  requires_flags: string[] | null
  created_at: string
  updated_at: string
}

// =====================================================
// CLIENT-SIDE CHECKS
// =====================================================

/**
 * Check if feature is enabled globally (client-side)
 */
export async function checkFeatureFlag(flagKey: FeatureFlagKey): Promise<boolean> {
  const supabase = createClient()
  
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('key', flagKey)
    .single()
  
  return flag?.enabled ?? false
}

/**
 * Check if feature is enabled for specific tenant (client-side)
 */
export async function checkFeatureFlagForTenant(
  flagKey: FeatureFlagKey,
  tenantId: string
): Promise<boolean> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .rpc('check_feature_flag_for_tenant', {
      flag_key: flagKey,
      tenant_uuid: tenantId
    })
  
  if (error) {
    console.error(`[FeatureFlags] Error checking ${flagKey}:`, error)
    return false // Fail closed
  }
  
  return data ?? false
}

/**
 * Get all feature flags (admin only)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('key')
  
  if (error) {
    console.error('[FeatureFlags] Error fetching flags:', error)
    return []
  }
  
  return data || []
}

// =====================================================
// REACT HOOKS (client-side only)
// =====================================================

/**
 * React hook to check feature flag with automatic updates
 */
export function useFeatureFlag(flagKey: FeatureFlagKey, tenantId?: string): boolean {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function checkFlag() {
      try {
        const isEnabled = tenantId
          ? await checkFeatureFlagForTenant(flagKey, tenantId)
          : await checkFeatureFlag(flagKey)
        setEnabled(isEnabled)
      } catch (error) {
        console.error(`[useFeatureFlag] Error checking ${flagKey}:`, error)
        setEnabled(false) // Fail closed
      } finally {
        setLoading(false)
      }
    }
    
    checkFlag()
  }, [flagKey, tenantId])
  
  return enabled
}

/**
 * React hook for loading state
 */
export function useFeatureFlagWithLoading(
  flagKey: FeatureFlagKey,
  tenantId?: string
): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function checkFlag() {
      try {
        const isEnabled = tenantId
          ? await checkFeatureFlagForTenant(flagKey, tenantId)
          : await checkFeatureFlag(flagKey)
        setEnabled(isEnabled)
      } catch (error) {
        console.error(`[useFeatureFlag] Error checking ${flagKey}:`, error)
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }
    
    checkFlag()
  }, [flagKey, tenantId])
  
  return { enabled, loading }
}


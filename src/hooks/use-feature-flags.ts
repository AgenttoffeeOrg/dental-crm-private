import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'

export interface FeatureDefinition {
  feature_key: string
  feature_name: string
  description: string
  plan_tier_required: 'starter' | 'pro' | 'enterprise'
  category: 'advanced' | 'analytics' | 'automation' | 'integration' | 'ai'
  icon_name: string
  sort_order: number
  is_active: boolean
  monthly_price_cents: number
}

export interface TenantFeatureFlag {
  id: string
  tenant_id: string
  feature_key: string
  is_enabled: boolean
  is_trial: boolean
  trial_expires_at: string | null
  plan_tier: 'starter' | 'pro' | 'enterprise'
}

export function useFeatureFlags() {
  const { appUser } = useAuth()
  const supabase = createClient()
  
  const [features, setFeatures] = useState<FeatureDefinition[]>([])
  const [enabledFeatures, setEnabledFeatures] = useState<Map<string, TenantFeatureFlag>>(new Map())
  const [tenantPlan, setTenantPlan] = useState<'starter' | 'pro' | 'enterprise'>('starter')
  const [loading, setLoading] = useState(true)

  const loadFeatures = useCallback(async () => {
    if (!appUser?.tenant_id) return

    try {
      setLoading(true)

      // Load all feature definitions
      const { data: featuresData, error: featuresError } = await supabase
        .from('feature_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (featuresError) {
        // Table doesn't exist yet - graceful fallback
        if (featuresError.code === '42P01' || featuresError.code === 'PGRST116') {
          console.warn('💡 Feature flags: Run migration first (supabase/sql/64_marketing_feature_flags.sql)')
          setFeatures([])
          setLoading(false)
          return
        }
        throw featuresError
      }

      setFeatures(featuresData || [])

      // Load tenant's feature flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('tenant_feature_flags')
        .select('*')
        .eq('tenant_id', appUser.tenant_id)

      if (flagsError && flagsError.code !== '42P01' && flagsError.code !== 'PGRST116') {
        throw flagsError
      }

      // Build map of enabled features
      const flagsMap = new Map<string, TenantFeatureFlag>()
      flagsData?.forEach(flag => {
        // Check if trial expired
        if (flag.is_trial && flag.trial_expires_at) {
          const expiryDate = new Date(flag.trial_expires_at)
          if (expiryDate < new Date()) {
            flag.is_enabled = false
          }
        }
        flagsMap.set(flag.feature_key, flag)
      })
      setEnabledFeatures(flagsMap)

      // Get tenant's plan tier
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('marketing_plan')
        .eq('id', appUser.tenant_id)
        .single()

      setTenantPlan((tenantData?.marketing_plan as any) || 'starter')

    } catch (error) {
      const err = error as any
      if (err?.code !== '42P01' && err?.code !== 'PGRST116') {
        console.error('Error loading feature flags:', error)
        toast.error('Failed to load feature flags')
      }
    } finally {
      setLoading(false)
    }
  }, [appUser, supabase])

  useEffect(() => {
    loadFeatures()
  }, [loadFeatures])

  /**
   * Check if a feature is enabled for the current tenant
   */
  const isFeatureEnabled = useCallback((featureKey: string): boolean => {
    const flag = enabledFeatures.get(featureKey)
    if (!flag) return false
    
    // Check if trial expired
    if (flag.is_trial && flag.trial_expires_at) {
      const expiryDate = new Date(flag.trial_expires_at)
      if (expiryDate < new Date()) {
        return false
      }
    }
    
    return flag.is_enabled
  }, [enabledFeatures])

  /**
   * Check if tenant's plan allows enabling this feature
   */
  const canEnableFeature = useCallback((featureKey: string): boolean => {
    const feature = features.find(f => f.feature_key === featureKey)
    if (!feature) return false

    const planHierarchy = { starter: 0, pro: 1, enterprise: 2 }
    const currentLevel = planHierarchy[tenantPlan]
    const requiredLevel = planHierarchy[feature.plan_tier_required]

    return currentLevel >= requiredLevel
  }, [features, tenantPlan])

  /**
   * Get feature definition by key
   */
  const getFeature = useCallback((featureKey: string): FeatureDefinition | undefined => {
    return features.find(f => f.feature_key === featureKey)
  }, [features])

  /**
   * Enable a feature for the tenant
   */
  const enableFeature = async (featureKey: string, startTrial = false): Promise<boolean> => {
    if (!appUser?.tenant_id) return false

    try {
      const feature = getFeature(featureKey)
      if (!feature) {
        toast.error('Feature not found')
        return false
      }

      // Check if plan allows this
      if (!startTrial && !canEnableFeature(featureKey)) {
        toast.error(`This feature requires ${feature.plan_tier_required} plan`)
        return false
      }

      const flagData: any = {
        tenant_id: appUser.tenant_id,
        feature_key: featureKey,
        is_enabled: true,
        enabled_at: new Date().toISOString(),
        enabled_by_user_id: appUser.id,
        plan_tier: tenantPlan,
      }

      // If starting trial
      if (startTrial) {
        flagData.is_trial = true
        flagData.trial_started_at = new Date().toISOString()
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 14) // 14-day trial
        flagData.trial_expires_at = expiryDate.toISOString()
      }

      const { error } = await supabase
        .from('tenant_feature_flags')
        .upsert(flagData)

      if (error) throw error

      toast.success(startTrial ? `${feature.feature_name} trial started (14 days)` : `${feature.feature_name} enabled`)
      loadFeatures()
      return true
    } catch (error) {
      console.error('Error enabling feature:', error)
      toast.error('Failed to enable feature')
      return false
    }
  }

  /**
   * Disable a feature for the tenant
   */
  const disableFeature = async (featureKey: string): Promise<boolean> => {
    if (!appUser?.tenant_id) return false

    try {
      const { error } = await supabase
        .from('tenant_feature_flags')
        .update({
          is_enabled: false,
          disabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', appUser.tenant_id)
        .eq('feature_key', featureKey)

      if (error) throw error

      const feature = getFeature(featureKey)
      toast.success(`${feature?.feature_name || 'Feature'} disabled`)
      loadFeatures()
      return true
    } catch (error) {
      console.error('Error disabling feature:', error)
      toast.error('Failed to disable feature')
      return false
    }
  }

  /**
   * Get days remaining in trial
   */
  const getTrialDaysRemaining = useCallback((featureKey: string): number | null => {
    const flag = enabledFeatures.get(featureKey)
    if (!flag || !flag.is_trial || !flag.trial_expires_at) return null

    const expiryDate = new Date(flag.trial_expires_at)
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(0, diffDays)
  }, [enabledFeatures])

  return {
    features,
    enabledFeatures: Array.from(enabledFeatures.values()),
    tenantPlan,
    loading,
    isFeatureEnabled,
    canEnableFeature,
    getFeature,
    enableFeature,
    disableFeature,
    getTrialDaysRemaining,
    refreshFeatures: loadFeatures,
  }
}


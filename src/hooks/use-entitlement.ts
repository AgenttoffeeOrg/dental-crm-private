/**
 * HARDENING PHASE 2.5: UI Entitlement Hook
 * Date: October 16, 2025
 * Purpose: Check feature entitlements in React components
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

/**
 * Hook to check if current user has access to a feature
 * 
 * Usage:
 * ```tsx
 * function MarketingDashboard() {
 *   const { hasAccess, isLoading, error } = useEntitlement('marketing')
 *   
 *   if (isLoading) return <Skeleton />
 *   if (!hasAccess) return <LockedFeature featureName="Marketing" />
 *   
 *   return <MarketingDashboardContent />
 * }
 * ```
 */
export function useEntitlement(featureCode: string, requireParent: boolean = true) {
  const [hasAccess, setHasAccess] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const checkAccess = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Call the SECURE check_entitlement() function
        // It uses current_tenant_id() internally - no bypass possible
        const { data, error: rpcError } = await supabase.rpc('check_entitlement', {
          p_feature_code: featureCode,
          p_require_parent: requireParent,
        })

        if (rpcError) {
          throw rpcError
        }

        if (isMounted) {
          setHasAccess(data === true)
        }
      } catch (err: any) {
        console.error('[useEntitlement] Error checking', featureCode, ':', err)
        if (isMounted) {
          setError(err.message || 'Failed to check entitlement')
          setHasAccess(false)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkAccess()

    return () => {
      isMounted = false
    }
  }, [featureCode, requireParent, supabase])

  return {
    hasAccess,
    isLoading,
    error,
  }
}

/**
 * Hook to check multiple entitlements at once
 * 
 * Usage:
 * ```tsx
 * function MarketingABTesting() {
 *   const { hasAccess, isLoading } = useEntitlements(
 *     ['marketing', 'marketing_ab_testing'],
 *     true // require ALL
 *   )
 *   
 *   if (!hasAccess) return <LockedFeature featureName="A/B Testing" />
 *   return <ABTestingContent />
 * }
 * ```
 */
export function useEntitlements(featureCodes: string[], requireAll: boolean = true) {
  const [hasAccess, setHasAccess] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entitledFeatures, setEntitledFeatures] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const checkAccess = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const results = await Promise.all(
          featureCodes.map(async (code) => {
            const { data, error: rpcError } = await supabase.rpc('check_entitlement', {
              p_feature_code: code,
              p_require_parent: true,
            })

            if (rpcError) {
              console.error('[useEntitlements] Error checking', code, ':', rpcError)
              return { code, hasAccess: false }
            }

            return { code, hasAccess: data === true }
          })
        )

        if (!isMounted) return

        const entitled = results.filter((r) => r.hasAccess).map((r) => r.code)
        setEntitledFeatures(entitled)

        if (requireAll) {
          // ALL mode: need all features
          setHasAccess(entitled.length === featureCodes.length)
        } else {
          // ANY mode: need at least one feature
          setHasAccess(entitled.length > 0)
        }
      } catch (err: any) {
        console.error('[useEntitlements] Error:', err)
        if (isMounted) {
          setError(err.message || 'Failed to check entitlements')
          setHasAccess(false)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkAccess()

    return () => {
      isMounted = false
    }
  }, [JSON.stringify(featureCodes), requireAll, supabase])

  return {
    hasAccess,
    isLoading,
    error,
    entitledFeatures,
  }
}

/**
 * Hook to get all entitlements for current user
 * Useful for rendering entitlements list in Settings
 * 
 * Usage:
 * ```tsx
 * function EntitlementsSettings() {
 *   const { entitlements, isLoading } = useAllEntitlements()
 *   
 *   return (
 *     <ul>
 *       {entitlements.map(e => (
 *         <li key={e.feature_code}>
 *           {e.feature_name} - {e.is_enabled ? 'Active' : 'Inactive'}
 *           {e.quota_limit && ` (${e.quota_used}/${e.quota_limit})`}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useAllEntitlements() {
  const [entitlements, setEntitlements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const fetchEntitlements = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: rpcError } = await supabase.rpc('get_user_entitlements')

        if (rpcError) {
          throw rpcError
        }

        if (isMounted) {
          setEntitlements(data || [])
        }
      } catch (err: any) {
        console.error('[useAllEntitlements] Error:', err)
        if (isMounted) {
          setError(err.message || 'Failed to fetch entitlements')
          setEntitlements([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchEntitlements()

    return () => {
      isMounted = false
    }
  }, [supabase])

  return {
    entitlements,
    isLoading,
    error,
  }
}

/**
 * Hook specifically for marketing automations
 * Checks BOTH automations and marketing entitlements
 * 
 * Usage:
 * ```tsx
 * function MarketingAutomationsTab() {
 *   const { hasAccess, isLoading, missingEntitlements } = useMarketingAutomations()
 *   
 *   if (!hasAccess) {
 *     return (
 *       <LockedFeature 
 *         featureName="Marketing Automations"
 *         requiredFeatures={missingEntitlements}
 *       />
 *     )
 *   }
 *   
 *   return <MarketingAutomationsContent />
 * }
 * ```
 */
export function useMarketingAutomations() {
  const [hasAccess, setHasAccess] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missingEntitlements, setMissingEntitlements] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    const checkAccess = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check both entitlements
        const [automationsResult, marketingResult] = await Promise.all([
          supabase.rpc('check_entitlement', {
            p_feature_code: 'automations',
            p_require_parent: false,
          }),
          supabase.rpc('check_entitlement', {
            p_feature_code: 'marketing',
            p_require_parent: false,
          }),
        ])

        if (!isMounted) return

        const hasAutomations = automationsResult.data === true
        const hasMarketing = marketingResult.data === true

        const missing: string[] = []
        if (!hasAutomations) missing.push('automations')
        if (!hasMarketing) missing.push('marketing')

        setMissingEntitlements(missing)
        setHasAccess(hasAutomations && hasMarketing)
      } catch (err: any) {
        console.error('[useMarketingAutomations] Error:', err)
        if (isMounted) {
          setError(err.message || 'Failed to check entitlements')
          setHasAccess(false)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkAccess()

    return () => {
      isMounted = false
    }
  }, [supabase])

  return {
    hasAccess,
    isLoading,
    error,
    missingEntitlements,
  }
}


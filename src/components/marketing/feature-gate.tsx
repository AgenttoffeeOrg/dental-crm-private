'use client'

/**
 * FeatureGate Component
 * Conditionally renders content based on feature flag status
 * Shows upgrade prompt if feature is locked
 */

import React from 'react'
import { useFeatureFlags } from '@/hooks/use-feature-flags'
import { UpgradePrompt } from './upgrade-prompt'

interface FeatureGateProps {
  featureKey: string
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgradePrompt?: boolean
}

export function FeatureGate({ 
  featureKey, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { isFeatureEnabled, getFeature, loading } = useFeatureFlags()

  // Show loading state
  if (loading) {
    return fallback || null
  }

  // Check if feature is enabled
  if (isFeatureEnabled(featureKey)) {
    return <>{children}</>
  }

  // Feature is locked - show upgrade prompt or custom fallback
  if (showUpgradePrompt) {
    const feature = getFeature(featureKey)
    return <UpgradePrompt feature={feature} />
  }

  return fallback || null
}

/**
 * Inline Feature Lock Badge
 * Shows a lock icon and plan tier for disabled features
 */
export function FeatureLockBadge({ featureKey }: { featureKey: string }) {
  const { getFeature, canEnableFeature } = useFeatureFlags()
  const feature = getFeature(featureKey)

  if (!feature || canEnableFeature(featureKey)) return null

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      {feature.plan_tier_required.toUpperCase()}
    </span>
  )
}


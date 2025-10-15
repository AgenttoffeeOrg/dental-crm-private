'use client'

/**
 * Feature Flags Panel - Marketing Settings
 * Shows all available features with toggle switches
 * Displays plan tier requirements and upgrade prompts
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useFeatureFlags } from '@/hooks/use-feature-flags'
import { UpgradeButton } from '../upgrade-prompt'
import { 
  TrendingUp, 
  MousePointer, 
  Brain, 
  Sparkles, 
  BarChart3, 
  Share2, 
  TestTube, 
  Workflow,
  MessageSquare,
  MessageCircle,
  Lock,
  Check,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FEATURE_ICONS: Record<string, any> = {
  TrendingUp,
  MousePointer,
  Brain,
  Sparkles,
  BarChart3,
  Share2,
  TestTube,
  Workflow,
  MessageSquare,
  MessageCircle,
}

export function FeatureFlagsPanel() {
  const {
    features,
    tenantPlan,
    loading,
    isFeatureEnabled,
    canEnableFeature,
    enableFeature,
    disableFeature,
    getTrialDaysRemaining,
  } = useFeatureFlags()

  const getPlanColor = (tier: string) => {
    if (tier === 'enterprise') return 'bg-purple-100 text-purple-800 border-purple-300'
    if (tier === 'pro') return 'bg-blue-100 text-blue-800 border-blue-300'
    return 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getPlanIcon = (tier: string) => {
    if (tier === 'enterprise') return '👑'
    if (tier === 'pro') return '⭐'
    return '📦'
  }

  // Group features by category
  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = []
    acc[feature.category].push(feature)
    return acc
  }, {} as Record<string, typeof features>)

  const categoryLabels = {
    advanced: 'Advanced Features',
    analytics: 'Analytics & Insights',
    automation: 'Automation & Workflows',
    integration: 'Integrations',
    ai: 'AI-Powered Features',
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading features...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Banner */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {getPlanIcon(tenantPlan)} Current Plan: {tenantPlan.toUpperCase()}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {tenantPlan === 'starter' && 'Free forever • Upgrade for advanced features'}
                {tenantPlan === 'pro' && '$29/month • Unlock Enterprise for AI features'}
                {tenantPlan === 'enterprise' && '$99/month • You have access to everything!'}
              </p>
            </div>
            {tenantPlan !== 'enterprise' && (
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                Upgrade Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            {categoryLabels[category as keyof typeof categoryLabels] || category}
          </h3>
          <div className="space-y-3">
            {categoryFeatures.map((feature) => {
              const enabled = isFeatureEnabled(feature.feature_key)
              const canEnable = canEnableFeature(feature.feature_key)
              const trialDays = getTrialDaysRemaining(feature.feature_key)
              const Icon = FEATURE_ICONS[feature.icon_name] || Sparkles

              return (
                <Card key={feature.feature_key} className={cn(
                  'transition-all',
                  enabled && 'border-green-300 bg-green-50/50'
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        'p-3 rounded-xl flex-shrink-0',
                        enabled ? 'bg-green-100' : 'bg-gray-100'
                      )}>
                        <Icon className={cn(
                          'h-6 w-6',
                          enabled ? 'text-green-600' : 'text-gray-500'
                        )} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              {feature.feature_name}
                              <Badge className={cn('text-xs', getPlanColor(feature.plan_tier_required))}>
                                {feature.plan_tier_required.toUpperCase()}
                              </Badge>
                              {enabled && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Enabled
                                </Badge>
                              )}
                              {trialDays !== null && trialDays > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Trial: {trialDays}d left
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {feature.description}
                            </p>
                            {feature.monthly_price_cents > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                Value: ${(feature.monthly_price_cents / 100).toFixed(0)}/month
                              </p>
                            )}
                          </div>

                          {/* Toggle / Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {canEnable ? (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">
                                  {enabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={async (checked) => {
                                    if (checked) {
                                      await enableFeature(feature.feature_key)
                                    } else {
                                      await disableFeature(feature.feature_key)
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-2">
                                <Lock className="h-5 w-5 text-gray-400" />
                                <UpgradeButton featureKey={feature.feature_key} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {features.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Features Available</h3>
            <p className="text-sm text-gray-600 mb-4">
              Run the feature flags migration to enable advanced features.
            </p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              supabase/sql/64_marketing_feature_flags.sql
            </code>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


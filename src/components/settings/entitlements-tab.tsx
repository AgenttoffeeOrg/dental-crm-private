/**
 * HARDENING PHASE 7.3: Entitlements Settings Tab
 * Date: October 16, 2025
 * Purpose: Display current entitlements and upgrade options
 */

'use client'

import { useState } from 'react'
import { useAllEntitlements } from '@/hooks/use-entitlement'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  LockClosedIcon,
  ArrowUpCircleIcon 
} from '@heroicons/react/24/outline'

export function EntitlementsTab() {
  const { entitlements, isLoading, error } = useAllEntitlements()
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load entitlements</p>
        <p className="text-sm text-gray-400 mt-2">{error}</p>
      </div>
    )
  }

  // Group entitlements by category
  const baseFeatures = entitlements.filter(e => e.feature_code === 'crm_base')
  const addons = entitlements.filter(e => 
    e.feature_code === 'marketing' || 
    e.feature_code === 'automations' ||
    e.feature_code === 'advanced_analytics'
  )
  const nestedAddons = entitlements.filter(e => e.feature_code.includes('_') && !addons.some(a => a.feature_code === e.feature_code))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Plan & Add-ons</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your subscription and feature add-ons
        </p>
      </div>

      {/* Base Features */}
      <Card>
        <CardHeader>
          <CardTitle>Base Features</CardTitle>
          <CardDescription>Included in your plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {baseFeatures.map((feature) => (
              <EntitlementRow key={feature.feature_code} feature={feature} />
            ))}
            {baseFeatures.length === 0 && (
              <p className="text-sm text-gray-500">No base features found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>Premium Add-ons</CardTitle>
          <CardDescription>Enhance your CRM with powerful features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {addons.map((feature) => (
              <EntitlementRow 
                key={feature.feature_code} 
                feature={feature}
                expandable
                isExpanded={expandedFeature === feature.feature_code}
                onToggleExpand={() => setExpandedFeature(
                  expandedFeature === feature.feature_code ? null : feature.feature_code
                )}
                nestedFeatures={nestedAddons.filter(n => 
                  n.feature_code.startsWith(feature.feature_code + '_')
                )}
              />
            ))}
            {addons.length === 0 && (
              <div className="text-center py-8">
                <LockClosedIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  No add-ons activated yet
                </p>
                <Button
                  onClick={() => window.location.href = '/settings/billing'}
                >
                  <ArrowUpCircleIcon className="h-4 w-4 mr-2" />
                  Explore Add-ons
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Upgrades */}
      <AvailableUpgradesSection />
    </div>
  )
}

interface EntitlementRowProps {
  feature: any
  expandable?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  nestedFeatures?: any[]
}

function EntitlementRow({ 
  feature, 
  expandable, 
  isExpanded, 
  onToggleExpand,
  nestedFeatures = []
}: EntitlementRowProps) {
  const hasQuota = feature.quota_limit !== null
  const quotaPercent = hasQuota && feature.quota_limit > 0
    ? Math.min(100, (feature.quota_used / feature.quota_limit) * 100)
    : 0

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{feature.feature_name}</h4>
            {feature.is_enabled ? (
              <Badge variant="success">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircleIcon className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>

          {/* Quota Display */}
          {hasQuota && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Usage this month</span>
                <span className="font-medium">
                  {feature.quota_used.toLocaleString()} / {feature.quota_limit.toLocaleString()}
                </span>
              </div>
              <Progress value={quotaPercent} className="h-1.5" />
              {quotaPercent >= 85 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Approaching quota limit
                </p>
              )}
            </div>
          )}

          {/* Expiry Warning */}
          {feature.expires_at && new Date(feature.expires_at) < new Date() && (
            <p className="text-xs text-red-600 mt-2">
              Expired on {new Date(feature.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {expandable && nestedFeatures.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
            >
              {isExpanded ? 'Hide' : 'Show'} Add-ons ({nestedFeatures.length})
            </Button>
          )}
          {!feature.is_enabled && (
            <Button
              size="sm"
              onClick={() => window.location.href = `/settings/billing?upgrade=${feature.feature_code}`}
            >
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* Nested Features */}
      {isExpanded && nestedFeatures.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-2">
          {nestedFeatures.map((nested) => (
            <div key={nested.feature_code} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                {nested.is_enabled ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <LockClosedIcon className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm text-gray-700">{nested.feature_name}</span>
              </div>
              {!nested.is_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = `/settings/billing?upgrade=${nested.feature_code}`}
                >
                  Unlock
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AvailableUpgradesSection() {
  const upgrades = [
    {
      code: 'marketing',
      name: 'Marketing Module',
      description: 'Campaigns, journeys, templates, and analytics',
      price: '$49/mo',
      features: ['Email campaigns', 'SMS campaigns', 'Journey builder', 'Marketing analytics'],
    },
    {
      code: 'automations',
      name: 'Automations',
      description: 'Automate your workflows across deals, pipelines, and tasks',
      price: '$29/mo',
      features: ['Visual automation builder', 'Deal automations', 'Task automations', 'Pipeline automations'],
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Upgrades</CardTitle>
        <CardDescription>Unlock more powerful features</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {upgrades.map((upgrade) => (
            <div
              key={upgrade.code}
              className="border rounded-lg p-4 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{upgrade.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{upgrade.description}</p>
                </div>
                <Badge variant="outline" className="font-semibold">
                  {upgrade.price}
                </Badge>
              </div>

              <ul className="space-y-1 mb-4">
                {upgrade.features.map((f, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-center">
                    <CheckCircleIcon className="h-3 w-3 text-green-500 mr-2" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                onClick={() => window.location.href = `/settings/billing?upgrade=${upgrade.code}`}
              >
                Add to Plan
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


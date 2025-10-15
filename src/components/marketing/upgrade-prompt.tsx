'use client'

/**
 * UpgradePrompt Component
 * Beautiful modal showing feature benefits and upgrade options
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, Lock, Zap } from 'lucide-react'
import type { FeatureDefinition } from '@/hooks/use-feature-flags'
import { useFeatureFlags } from '@/hooks/use-feature-flags'

interface UpgradePromptProps {
  feature?: FeatureDefinition
  open?: boolean
  onClose?: () => void
}

export function UpgradePrompt({ feature, open = true, onClose }: UpgradePromptProps) {
  const { enableFeature } = useFeatureFlags()
  const [startingTrial, setStartingTrial] = useState(false)

  if (!feature) return null

  const handleStartTrial = async () => {
    setStartingTrial(true)
    const success = await enableFeature(feature.feature_key, true)
    setStartingTrial(false)
    if (success && onClose) {
      onClose()
    }
  }

  const planBenefits = {
    pro: [
      'Click Heatmaps',
      'Dynamic Content Blocks',
      'Social Media Publishing',
      'Advanced Analytics',
      'Automation Journeys',
      'Up to 50,000 contacts',
      'Priority email support',
    ],
    enterprise: [
      'Everything in Pro',
      'Email Warmup Automation',
      'AI Send Time Optimization',
      'Unlimited contacts',
      'Dedicated IP address',
      'Priority phone support',
      'Custom integrations',
      'SSO & advanced security',
    ],
  }

  const requiredPlan = feature.plan_tier_required
  const price = requiredPlan === 'pro' ? '$29' : '$99'
  const benefits = planBenefits[requiredPlan as 'pro' | 'enterprise'] || []

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Unlock {feature.feature_name}</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Available in {requiredPlan.toUpperCase()} plan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Feature Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              {feature.description}
            </p>
          </div>

          {/* Pricing */}
          <div className="text-center py-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl">
            <Badge className="mb-3 text-sm px-3 py-1">{requiredPlan.toUpperCase()} PLAN</Badge>
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {price}
              <span className="text-xl font-normal text-gray-600">/month</span>
            </div>
            <p className="text-sm text-gray-600">Billed monthly • Cancel anytime</p>
          </div>

          {/* Plan Benefits */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">What's included:</h4>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trial CTA */}
          {requiredPlan !== 'starter' && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-900 mb-1">Try it free for 14 days</h4>
                  <p className="text-sm text-purple-700">
                    No credit card required. Full access to all {requiredPlan} features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Maybe Later
          </Button>
          {requiredPlan !== 'starter' && (
            <Button
              onClick={handleStartTrial}
              disabled={startingTrial}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {startingTrial ? (
                'Starting Trial...'
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start 14-Day Trial
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => {
              // TODO: Navigate to billing/upgrade page
              toast.info('Redirecting to upgrade page...')
              onClose?.()
            }}
            className="flex-1"
          >
            Upgrade to {requiredPlan.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Inline Upgrade Button
 * Small button to trigger upgrade flow
 */
export function UpgradeButton({ featureKey }: { featureKey: string }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const { getFeature } = useFeatureFlags()
  const feature = getFeature(featureKey)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowPrompt(true)}
        className="border-purple-300 text-purple-700 hover:bg-purple-50"
      >
        <Lock className="h-3 w-3 mr-2" />
        Upgrade to Unlock
      </Button>
      {showPrompt && (
        <UpgradePrompt
          feature={feature}
          open={showPrompt}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </>
  )
}


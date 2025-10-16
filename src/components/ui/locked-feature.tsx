/**
 * HARDENING PHASE 7.1: Locked Feature Component
 * Date: October 16, 2025
 * Purpose: Display locked features with upgrade CTAs
 */

import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface LockedFeatureProps {
  featureName: string
  description: string
  requiredPlan?: string
  requiredFeatures?: string[]
  benefits?: string[]
  icon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  onUpgrade?: () => void
}

export function LockedFeature({
  featureName,
  description,
  requiredPlan = 'Professional',
  requiredFeatures = [],
  benefits = [],
  icon,
  size = 'md',
  onUpgrade,
}: LockedFeatureProps) {
  const sizeClasses = {
    sm: 'p-6',
    md: 'p-12',
    lg: 'p-16',
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      // Default: navigate to billing page
      window.location.href = '/settings/billing?upgrade=' + encodeURIComponent(requiredFeatures[0] || featureName.toLowerCase())
    }
  }

  return (
    <div className={`relative rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 ${sizeClasses[size]} text-center`}>
      {/* Lock Icon */}
      <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
        {icon || <LockClosedIcon className="h-8 w-8 text-blue-600" />}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {featureName}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
        {description}
      </p>

      {/* Required Plan Badge */}
      {requiredPlan && (
        <Badge variant="outline" className="mb-4">
          {requiredPlan} Plan Required
        </Badge>
      )}

      {/* Required Features (for nested add-ons) */}
      {requiredFeatures.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Requires:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {requiredFeatures.map((feature) => (
              <Badge key={feature} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Benefits List */}
      {benefits.length > 0 && (
        <ul className="text-left max-w-sm mx-auto mb-6 space-y-2">
          {benefits.map((benefit, idx) => (
            <li key={idx} className="flex items-start text-sm text-gray-700">
              <SparklesIcon className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Upgrade Button */}
      <Button
        onClick={handleUpgrade}
        size="lg"
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        <SparklesIcon className="h-5 w-5 mr-2" />
        Upgrade Now
      </Button>

      {/* Info Text */}
      <p className="mt-4 text-xs text-gray-400">
        Unlock this feature to access powerful capabilities
      </p>
    </div>
  )
}

/**
 * Small inline locked badge for features in lists
 */
export function LockedBadge({
  featureName,
  onClick,
}: {
  featureName: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-xs"
      title={`${featureName} requires an upgrade`}
    >
      <LockClosedIcon className="h-3 w-3 mr-1" />
      Locked
    </button>
  )
}

/**
 * Empty state with locked feature
 */
export function LockedEmptyState({
  featureName,
  description,
  requiredPlan,
  onUpgrade,
}: Omit<LockedFeatureProps, 'benefits' | 'icon' | 'size'>) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <LockedFeature
        featureName={featureName}
        description={description}
        requiredPlan={requiredPlan}
        size="lg"
        onUpgrade={onUpgrade}
      />
    </div>
  )
}


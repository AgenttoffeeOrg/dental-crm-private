/**
 * Seat Usage Display Component
 * 
 * Visual display of subscription seat usage with upgrade prompts.
 * Shows current usage, limits, and warnings when approaching capacity.
 */

'use client'

import { Users, AlertTriangle, TrendingUp, Crown } from 'lucide-react'
import Link from 'next/link'

interface SeatUsageDisplayProps {
  activeSeats: number
  seatLimit: number
  planName?: string
  canUpgrade?: boolean
  className?: string
}

export function SeatUsageDisplay({
  activeSeats,
  seatLimit,
  planName = 'Current Plan',
  canUpgrade = true,
  className = '',
}: SeatUsageDisplayProps) {
  const availableSeats = seatLimit - activeSeats
  const usagePercentage = (activeSeats / seatLimit) * 100
  const isNearLimit = usagePercentage >= 80
  const isAtLimit = activeSeats >= seatLimit

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isAtLimit ? 'bg-red-50' : isNearLimit ? 'bg-yellow-50' : 'bg-blue-50'
          }`}>
            <Users className={`w-5 h-5 ${
              isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Seat Usage
            </h3>
            <p className="text-sm text-gray-600">
              {planName}
            </p>
          </div>
        </div>

        {canUpgrade && (isNearLimit || isAtLimit) && (
          <Link
            href="/settings/billing"
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Crown className="w-4 h-4" />
            Upgrade
          </Link>
        )}
      </div>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {activeSeats} / {seatLimit}
          </span>
          <span className="text-sm text-gray-600">
            {availableSeats} seat{availableSeats !== 1 ? 's' : ''} available
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isAtLimit 
                ? 'bg-red-500' 
                : isNearLimit 
                ? 'bg-yellow-500' 
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">0</span>
          <span className="text-xs text-gray-500">{seatLimit}</span>
        </div>
      </div>

      {/* Warning Messages */}
      {isAtLimit ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">
              Seat Limit Reached
            </p>
            <p className="text-sm text-red-700 mb-2">
              You cannot invite more users until you upgrade your plan or remove inactive users.
            </p>
            {canUpgrade && (
              <Link
                href="/settings/billing"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800"
              >
                <TrendingUp className="w-4 h-4" />
                Upgrade Plan
              </Link>
            )}
          </div>
        </div>
      ) : isNearLimit ? (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              Approaching Seat Limit
            </p>
            <p className="text-sm text-yellow-700 mb-2">
              You're using {Math.round(usagePercentage)}% of your seats. Consider upgrading soon.
            </p>
            {canUpgrade && (
              <Link
                href="/settings/billing"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-700 hover:text-yellow-800"
              >
                View Plans
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            You're using {Math.round(usagePercentage)}% of your available seats. {availableSeats} seat{availableSeats !== 1 ? 's' : ''} remaining.
          </p>
        </div>
      )}

      {/* Upgrade CTA */}
      {canUpgrade && !isAtLimit && !isNearLimit && (
        <div className="mt-4 text-center">
          <Link
            href="/settings/billing"
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            Need more seats? View upgrade options →
          </Link>
        </div>
      )}
    </div>
  )
}

/**
 * Compact Seat Usage Badge
 * For use in headers, cards, etc.
 */
interface SeatUsageBadgeProps {
  activeSeats: number
  seatLimit: number
  showLabel?: boolean
  className?: string
}

export function SeatUsageBadge({
  activeSeats,
  seatLimit,
  showLabel = true,
  className = '',
}: SeatUsageBadgeProps) {
  const usagePercentage = (activeSeats / seatLimit) * 100
  const isAtLimit = activeSeats >= seatLimit
  const isNearLimit = usagePercentage >= 80

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-gray-600">Seats:</span>
      )}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
        isAtLimit 
          ? 'bg-red-100 text-red-800 border border-red-200'
          : isNearLimit 
          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          : 'bg-blue-100 text-blue-800 border border-blue-200'
      }`}>
        <Users className="w-3.5 h-3.5" />
        <span>{activeSeats} / {seatLimit}</span>
      </div>
    </div>
  )
}


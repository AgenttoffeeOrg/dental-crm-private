/**
 * HARDENING PHASE 7.2: Quota Warning Component
 * Date: October 16, 2025
 * Purpose: Display quota usage warnings to users
 */

'use client'

import { useState, useEffect } from 'react'
import { ExclamationTriangleIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase-client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

interface QuotaWarningProps {
  featureCode: string
  showAlways?: boolean // Show even when not near limit
  className?: string
}

interface QuotaStatus {
  quota_limit: number | null
  quota_used: number
  quota_remaining: number | null
  quota_reset_at: string | null
  is_near_limit: boolean
  is_exceeded: boolean
}

export function QuotaWarning({ featureCode, showAlways = false, className = '' }: QuotaWarningProps) {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkQuota = async () => {
      try {
        const { data, error } = await supabase.rpc('check_quota_status', {
          p_feature_code: featureCode,
        })

        if (error) throw error

        if (data && data.length > 0) {
          setQuotaStatus(data[0])
        }
      } catch (err) {
        console.error('[QuotaWarning] Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkQuota()

    // Refresh every 5 minutes
    const interval = setInterval(checkQuota, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [featureCode, supabase])

  if (isLoading || !quotaStatus) return null

  // Don't show if unlimited quota
  if (quotaStatus.quota_limit === null) return null

  // Don't show if not near limit (unless showAlways is true)
  if (!showAlways && !quotaStatus.is_near_limit && !quotaStatus.is_exceeded) {
    return null
  }

  const usagePercent = quotaStatus.quota_limit > 0
    ? Math.min(100, (quotaStatus.quota_used / quotaStatus.quota_limit) * 100)
    : 0

  const resetDate = quotaStatus.quota_reset_at 
    ? new Date(quotaStatus.quota_reset_at).toLocaleDateString()
    : 'Unknown'

  return (
    <Alert
      variant={quotaStatus.is_exceeded ? 'destructive' : 'default'}
      className={className}
    >
      {quotaStatus.is_exceeded ? (
        <ExclamationTriangleIcon className="h-4 w-4" />
      ) : (
        <ChartBarIcon className="h-4 w-4" />
      )}
      
      <AlertTitle>
        {quotaStatus.is_exceeded ? 'Quota Exceeded' : 'Quota Alert'}
      </AlertTitle>
      
      <AlertDescription>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              {quotaStatus.quota_used.toLocaleString()} of {quotaStatus.quota_limit.toLocaleString()} used
            </span>
            <span className="text-gray-500">
              {usagePercent.toFixed(0)}%
            </span>
          </div>

          <Progress value={usagePercent} className="h-2" />

          <p className="text-xs text-gray-600">
            {quotaStatus.is_exceeded ? (
              <>
                You've reached your limit. Upgrade your plan to continue.
              </>
            ) : (
              <>
                Quota resets on {resetDate}
              </>
            )}
          </p>

          {quotaStatus.is_exceeded && (
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                window.location.href = '/settings/billing?upgrade=' + featureCode
              }}
            >
              Upgrade Plan
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Inline quota badge (for displaying in headers)
 */
export function QuotaBadge({ featureCode }: { featureCode: string }) {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkQuota = async () => {
      try {
        const { data, error } = await supabase.rpc('check_quota_status', {
          p_feature_code: featureCode,
        })

        if (error) throw error

        if (data && data.length > 0) {
          setQuotaStatus(data[0])
        }
      } catch (err) {
        console.error('[QuotaBadge] Error:', err)
      }
    }

    checkQuota()
  }, [featureCode, supabase])

  if (!quotaStatus || quotaStatus.quota_limit === null) return null

  const usagePercent = quotaStatus.quota_limit > 0
    ? (quotaStatus.quota_used / quotaStatus.quota_limit) * 100
    : 0

  if (usagePercent < 70) return null // Only show when >= 70%

  return (
    <Badge
      variant={usagePercent >= 100 ? 'destructive' : usagePercent >= 85 ? 'warning' : 'default'}
      className="ml-2"
    >
      {quotaStatus.quota_used}/{quotaStatus.quota_limit}
    </Badge>
  )
}


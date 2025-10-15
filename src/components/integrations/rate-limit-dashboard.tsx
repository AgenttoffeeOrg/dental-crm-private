'use client'

/**
 * Rate Limit Dashboard
 * 
 * Visual quota usage monitoring for all integrations
 * 
 * Features:
 * - Real-time quota usage meters
 * - Per-integration usage bars
 * - Time until reset
 * - Historical usage trends
 * - Quota warnings (80%+ usage)
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Activity, Clock, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface RateLimitUsage {
  integrationType: string
  limit: number
  used: number
  remaining: number
  percentage: number
  resetAt: string
}

export function RateLimitDashboard() {
  const [usage, setUsage] = useState<RateLimitUsage[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsage = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      
      if (!appUser) return
      
      // Get current rate limit usage
      const { data } = await supabase
        .from('integration_rate_limits')
        .select('*')
        .eq('tenant_id', appUser.tenant_id)
        .gte('reset_at', new Date().toISOString())
        .order('requests_count', { ascending: false })
      
      if (data) {
        const formatted: RateLimitUsage[] = data.map(item => ({
          integrationType: item.integration_type,
          limit: item.requests_limit,
          used: item.requests_count,
          remaining: item.requests_remaining || 0,
          percentage: (item.requests_count / item.requests_limit) * 100,
          resetAt: item.reset_at,
        }))
        
        setUsage(formatted)
      }
    } catch (error) {
      console.error('Error loading rate limit usage:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsage()
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadUsage, 15000)
    
    return () => clearInterval(interval)
  }, [])

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTimeUntilReset = (resetAt: string) => {
    const reset = new Date(resetAt)
    const now = new Date()
    const diffMs = reset.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffSeconds = Math.floor((diffMs % 60000) / 1000)
    
    if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds}s`
    }
    return `${diffSeconds}s`
  }

  if (loading && usage.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-xs">Loading quota usage...</p>
        </div>
      </div>
    )
  }

  if (usage.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No Active Usage</h3>
          <p className="text-sm text-gray-600">
            Rate limit usage will appear here once you start making API calls
          </p>
        </div>
      </Card>
    )
  }

  const highUsageIntegrations = usage.filter(u => u.percentage >= 75)

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {highUsageIntegrations.length > 0 && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-900">
                {highUsageIntegrations.length} integration{highUsageIntegrations.length > 1 ? 's are' : ' is'} approaching quota limits
              </p>
              <p className="text-sm text-yellow-800">
                Consider reducing request frequency or upgrading vendor tier
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usage.map((item) => (
          <Card key={item.integrationType} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {item.integrationType.replace(/_/g, ' ').toUpperCase()}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {item.used.toLocaleString()} / {item.limit.toLocaleString()} requests
                </p>
              </div>
              {item.percentage >= 90 ? (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {item.percentage.toFixed(0)}%
                </Badge>
              ) : item.percentage >= 75 ? (
                <Badge className="bg-yellow-500 text-xs">
                  {item.percentage.toFixed(0)}%
                </Badge>
              ) : (
                <Badge className="bg-green-500 text-xs">
                  {item.percentage.toFixed(0)}%
                </Badge>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <Progress 
                value={item.percentage} 
                className={`h-3 [&>div]:${getUsageColor(item.percentage)}`}
              />
            </div>

            {/* Details */}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {item.remaining} remaining
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Resets in {getTimeUntilReset(item.resetAt)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}


'use client'

/**
 * Integration Health Dashboard
 * 
 * Real-time monitoring dashboard for all integration connections
 * 
 * Features:
 * - Overall health score
 * - Per-integration status cards
 * - Success/error rate charts
 * - Token expiry warnings
 * - Last sync indicators
 * - Quick actions (reconnect, test, view logs)
 * - DLQ item count
 * - Rate limit usage
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface IntegrationHealth {
  id: string
  type: string
  name: string
  status: 'connected' | 'disconnected' | 'error' | 'expiring_soon' | 'refreshing'
  isActive: boolean
  isTestMode: boolean
  successRate24h: number | null
  errorCount24h: number
  totalRequests24h: number
  lastSyncAt: string | null
  tokenStatus: 'valid' | 'expiring_soon' | 'expired'
  tokenExpiresAt: string | null
  daysUntilExpiry: number | null
  errorMessage: string | null
  dlqCount: number
  lastSyncStatus: string | null
}

interface OverallHealth {
  score: number
  totalConnections: number
  activeConnections: number
  healthyConnections: number
  degradedConnections: number
  errorConnections: number
  expiringTokens: number
}

export function IntegrationHealthDashboard() {
  const [health, setHealth] = useState<{
    overallHealth: OverallHealth
    integrations: IntegrationHealth[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const loadHealth = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const response = await fetch('/api/integrations/health')
      
      if (!response.ok) {
        throw new Error('Failed to fetch integration health')
      }
      
      const data = await response.json()
      setHealth(data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading integration health:', error)
      toast.error('Failed to load integration health')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealth, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string, tokenStatus: string) => {
    if (tokenStatus === 'expired') {
      return (
        <Badge variant="destructive">
          <X className="h-3 w-3 mr-1" />
          Token Expired
        </Badge>
      )
    }
    
    if (status === 'connected') {
      return (
        <Badge className="bg-green-500">
          <Check className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      )
    }
    
    if (status === 'error') {
      return (
        <Badge variant="destructive">
          <X className="h-3 w-3 mr-1" />
          Error
        </Badge>
      )
    }
    
    if (status === 'expiring_soon' || tokenStatus === 'expiring_soon') {
      return (
        <Badge className="bg-yellow-500">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expiring Soon
        </Badge>
      )
    }
    
    if (status === 'refreshing') {
      return (
        <Badge className="bg-blue-500">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Refreshing
        </Badge>
      )
    }
    
    return (
      <Badge variant="secondary">
        Disconnected
      </Badge>
    )
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never'
    
    const syncDate = new Date(lastSyncAt)
    const now = new Date()
    const diffMs = now.getTime() - syncDate.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading integration health...</p>
        </div>
      </div>
    )
  }

  if (!health) {
    return <div>Error loading health data</div>
  }

  const { overallHealth, integrations } = health

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integration Health</h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time monitoring of all integration connections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Last updated: {formatLastSync(lastUpdated.toISOString())}
          </span>
          <Button onClick={loadHealth} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
          <div className="col-span-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overall Health</p>
                <p className={`text-4xl font-bold ${getHealthColor(overallHealth.score)}`}>
                  {overallHealth.score}%
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-semibold">{overallHealth.totalConnections}</p>
            <p className="text-xs text-gray-500 mt-1">Integrations</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500">Healthy</p>
            <p className="text-2xl font-semibold text-green-600">{overallHealth.healthyConnections}</p>
            <p className="text-xs text-gray-500 mt-1">
              <Check className="h-3 w-3 inline" /> Connected
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500">Degraded</p>
            <p className="text-2xl font-semibold text-yellow-600">{overallHealth.degradedConnections}</p>
            <p className="text-xs text-gray-500 mt-1">
              <AlertTriangle className="h-3 w-3 inline" /> Issues
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500">Errors</p>
            <p className="text-2xl font-semibold text-red-600">{overallHealth.errorConnections}</p>
            <p className="text-xs text-gray-500 mt-1">
              <X className="h-3 w-3 inline" /> Failed
            </p>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      {overallHealth.expiringTokens > 0 && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-900">
                {overallHealth.expiringTokens} integration{overallHealth.expiringTokens > 1 ? 's have' : ' has'} tokens expiring soon
              </p>
              <p className="text-sm text-yellow-800">
                Reconnect to prevent service interruption
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-yellow-300">
              View Details
            </Button>
          </div>
        </Card>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                  {integration.isTestMode && (
                    <Badge variant="outline" className="text-xs">TEST</Badge>
                  )}
                </div>
                {getStatusBadge(integration.status, integration.tokenStatus)}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              {/* Success Rate */}
              {integration.successRate24h !== null && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Success Rate (24h)</span>
                    <span className={`font-semibold ${
                      integration.successRate24h >= 95 ? 'text-green-600' :
                      integration.successRate24h >= 90 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {integration.successRate24h.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={integration.successRate24h} 
                    className={`h-2 ${
                      integration.successRate24h >= 95 ? '[&>div]:bg-green-500' :
                      integration.successRate24h >= 90 ? '[&>div]:bg-yellow-500' :
                      '[&>div]:bg-red-500'
                    }`}
                  />
                </div>
              )}

              {/* Request Volume */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Requests (24h)
                </span>
                <span className="font-semibold">{integration.totalRequests24h.toLocaleString()}</span>
              </div>

              {/* Error Count */}
              {integration.errorCount24h > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    Errors (24h)
                  </span>
                  <span className="font-semibold text-red-600">{integration.errorCount24h}</span>
                </div>
              )}

              {/* DLQ Count */}
              {integration.dlqCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Failed Items
                  </span>
                  <span className="font-semibold text-yellow-600">{integration.dlqCount}</span>
                </div>
              )}

              {/* Last Sync */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Sync
                </span>
                <span className="text-xs">{formatLastSync(integration.lastSyncAt)}</span>
              </div>

              {/* Token Expiry */}
              {integration.tokenExpiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Token Expires
                  </span>
                  <span className={`text-xs ${
                    integration.tokenStatus === 'expired' ? 'text-red-600 font-semibold' :
                    integration.tokenStatus === 'expiring_soon' ? 'text-yellow-600 font-semibold' :
                    'text-gray-600'
                  }`}>
                    {integration.daysUntilExpiry !== null 
                      ? `${integration.daysUntilExpiry}d` 
                      : 'Never'}
                  </span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {integration.errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
                <p className="text-red-800 font-medium mb-1">Last Error:</p>
                <p className="text-red-700 text-xs">{integration.errorMessage}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => toast.info('Reconnect coming soon!')}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toast.info('Logs coming soon!')}
              >
                View Logs
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {integrations.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Globe className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No integrations connected</h3>
            <p className="text-gray-600 mb-6">
              Connect your first integration to start monitoring health
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              Go to Settings
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function formatLastSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Never'
  
  const syncDate = new Date(lastSyncAt)
  const now = new Date()
  const diffMs = now.getTime() - syncDate.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}


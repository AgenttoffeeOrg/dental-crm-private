'use client'

/**
 * Token Expiry Alert Banners
 * 
 * Shows prominent warnings for expiring/expired OAuth tokens
 * 
 * Placement: Top of dashboard, settings, or as floating banner
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, X, RefreshCw, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface TokenAlert {
  connectionId: string
  integrationType: string
  integrationName: string
  expiresAt: string
  daysUntilExpiry: number
  status: 'expired' | 'expiring_soon'
}

export function TokenExpiryAlerts() {
  const [alerts, setAlerts] = useState<TokenAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAlerts()
    
    // Refresh every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const loadAlerts = async () => {
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      
      if (!appUser) return
      
      // Get connections with expiring tokens
      const { data: connections } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('tenant_id', appUser.tenant_id)
        .eq('is_active', true)
        .not('token_expires_at', 'is', null)
        .lte('token_expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      
      if (connections) {
        const tokenAlerts: TokenAlert[] = connections.map(conn => {
          const expiresAt = new Date(conn.token_expires_at)
          const now = new Date()
          const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          
          return {
            connectionId: conn.id,
            integrationType: conn.integration_type,
            integrationName: conn.integration_name || conn.integration_type,
            expiresAt: conn.token_expires_at,
            daysUntilExpiry: Math.floor(daysUntilExpiry),
            status: expiresAt < now ? 'expired' : 'expiring_soon',
          }
        })
        
        setAlerts(tokenAlerts)
      }
    } catch (error) {
      console.error('Error loading token expiry alerts:', error)
    }
  }

  const visibleAlerts = alerts.filter(alert => !dismissed.has(alert.connectionId))

  if (visibleAlerts.length === 0) return null

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <Card 
          key={alert.connectionId} 
          className={`p-4 ${
            alert.status === 'expired' 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
              alert.status === 'expired' ? 'text-red-600' : 'text-yellow-600'
            }`} />
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className={`font-semibold ${
                  alert.status === 'expired' ? 'text-red-900' : 'text-yellow-900'
                }`}>
                  {alert.status === 'expired' ? '🔴 Token Expired' : '⚠️ Token Expiring Soon'}
                </p>
                <Badge variant={alert.status === 'expired' ? 'destructive' : 'outline'}>
                  {alert.integrationName}
                </Badge>
              </div>
              
              <p className={`text-sm ${
                alert.status === 'expired' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {alert.status === 'expired' 
                  ? `The OAuth token has expired. Reconnect to restore integration.`
                  : `OAuth token expires in ${alert.daysUntilExpiry} day${alert.daysUntilExpiry !== 1 ? 's' : ''}. Reconnect to prevent service interruption.`
                }
              </p>
              
              {alert.status === 'expired' && (
                <p className="text-xs text-red-700 mt-2">
                  ⚠️ Integration is currently non-functional. Data may be lost until reconnected.
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant={alert.status === 'expired' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => window.location.href = '/settings?tab=integrations'}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Reconnect Now
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDismissed(prev => new Set(prev).add(alert.connectionId))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Compact token expiry indicator (for status bar)
 */
export function TokenExpiryIndicator() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    loadCount()
    
    const interval = setInterval(loadCount, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const loadCount = async () => {
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      
      if (!appUser) return
      
      const { count: expiringCount } = await supabase
        .from('integration_connections')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', appUser.tenant_id)
        .eq('is_active', true)
        .not('token_expires_at', 'is', null)
        .lte('token_expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      
      setCount(expiringCount || 0)
    } catch (error) {
      console.error('Error loading token expiry count:', error)
    }
  }

  if (count === 0) return null

  return (
    <Button 
      variant="ghost"
      size="sm"
      className="text-yellow-600 hover:text-yellow-700"
      onClick={() => window.location.href = '/settings?tab=integrations'}
    >
      <Clock className="h-4 w-4 mr-2" />
      {count} token{count > 1 ? 's' : ''} expiring
    </Button>
  )
}


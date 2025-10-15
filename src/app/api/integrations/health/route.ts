import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * Integration Health API
 * 
 * Returns real-time health status for all integrations
 * 
 * Metrics per integration:
 * - Status (connected, error, expiring_soon, disconnected)
 * - Last sync time
 * - Success rate (24h, 7d, 30d)
 * - Error count
 * - Token expiry
 * - Request volume
 * 
 * GET /api/integrations/health
 */

export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Get current user and tenant
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // 1. Get all integration connections for this tenant
    const { data: connections, error: connectionsError } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('tenant_id', appUser.tenant_id)
      .order('integration_type')
    
    if (connectionsError) {
      console.error('[Integration Health] Error fetching connections:', connectionsError)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }
    
    // 2. Get health metrics for each connection
    const healthData = await Promise.all(
      (connections || []).map(async (connection) => {
        // Get success rate for last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        const { data: logs24h } = await supabase
          .from('integration_logs')
          .select('status')
          .eq('connection_id', connection.id)
          .gte('created_at', twentyFourHoursAgo.toISOString())
        
        const total24h = logs24h?.length || 0
        const success24h = logs24h?.filter(l => l.status === 'success').length || 0
        const successRate24h = total24h > 0 ? (success24h / total24h) * 100 : null
        
        // Get last successful sync
        const { data: lastSyncLog } = await supabase
          .from('integration_logs')
          .select('created_at')
          .eq('connection_id', connection.id)
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        // Get error count in last 24h
        const errorCount24h = logs24h?.filter(l => l.status === 'error').length || 0
        
        // Get DLQ items
        const { data: dlqItems } = await supabase
          .from('integration_dlq')
          .select('id')
          .eq('connection_id', connection.id)
          .eq('status', 'pending')
        
        const dlqCount = dlqItems?.length || 0
        
        // Token status
        let tokenStatus = 'valid'
        let daysUntilExpiry = null
        
        if (connection.token_expires_at) {
          const expiresAt = new Date(connection.token_expires_at)
          const now = new Date()
          daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          
          if (daysUntilExpiry < 0) {
            tokenStatus = 'expired'
          } else if (daysUntilExpiry < 7) {
            tokenStatus = 'expiring_soon'
          }
        }
        
        return {
          id: connection.id,
          type: connection.integration_type,
          name: connection.integration_name || connection.integration_type,
          status: connection.status,
          isActive: connection.is_active,
          isTestMode: connection.is_test_mode,
          
          // Health metrics
          successRate24h,
          errorCount24h,
          totalRequests24h: total24h,
          lastSyncAt: lastSyncLog?.created_at || null,
          
          // Token info
          tokenStatus,
          tokenExpiresAt: connection.token_expires_at,
          daysUntilExpiry: daysUntilExpiry ? Math.floor(daysUntilExpiry) : null,
          
          // Errors
          errorMessage: connection.error_message,
          dlqCount,
          
          // Timestamps
          createdAt: connection.created_at,
          lastSyncStatus: connection.last_sync_status,
        }
      })
    )
    
    // 3. Calculate overall health score
    const activeConnections = healthData.filter(h => h.isActive && h.status !== 'disconnected')
    const healthyConnections = activeConnections.filter(h => 
      h.status === 'connected' && 
      (!h.successRate24h || h.successRate24h >= 95) &&
      h.tokenStatus === 'valid'
    )
    
    const overallHealthScore = activeConnections.length > 0
      ? (healthyConnections.length / activeConnections.length) * 100
      : 100
    
    return NextResponse.json({
      success: true,
      overallHealth: {
        score: Math.round(overallHealthScore),
        totalConnections: connections?.length || 0,
        activeConnections: activeConnections.length,
        healthyConnections: healthyConnections.length,
        degradedConnections: activeConnections.filter(h => 
          h.successRate24h && h.successRate24h >= 90 && h.successRate24h < 95
        ).length,
        errorConnections: activeConnections.filter(h => 
          h.status === 'error' || (h.successRate24h && h.successRate24h < 90)
        ).length,
        expiringTokens: activeConnections.filter(h => 
          h.tokenStatus === 'expiring_soon'
        ).length,
      },
      integrations: healthData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Integration Health] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}


/**
 * INTEGRATION AUTOMATION MONITORS
 * 
 * Monitors integration health and emits events for automation triggers:
 * - Token expiration warnings
 * - Sync failures
 * - Rate limit hits
 * - Connection health
 */

import { createClient } from '@/lib/supabase-client'
import { events } from '@/lib/events-unified'

// =====================================================
// INTEGRATION HEALTH MONITORING
// =====================================================

/**
 * Check for expiring integration tokens
 */
export async function checkExpiringTokens(tenantId: string): Promise<{
  checked: number
  expiring: number
}> {
  try {
    const supabase = createClient()

    // Get all integration connections
    const { data: connections } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    if (!connections || connections.length === 0) {
      return { checked: 0, expiring: 0 }
    }

    let expiring = 0

    for (const conn of connections) {
      if (!conn.token_expires_at) continue

      const expiresAt = new Date(conn.token_expires_at).getTime()
      const hoursUntilExpiry = Math.floor((expiresAt - Date.now()) / (1000 * 60 * 60))

      // Warn at 24 hours
      if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0) {
        await events.integrationTokenExpiring({
          integrationId: conn.id,
          integrationType: conn.integration_type,
          tenantId,
          expiresAt: conn.token_expires_at,
          hoursUntilExpiry,
        })

        expiring++
      }

      // Already expired
      if (hoursUntilExpiry <= 0) {
        await events.integrationTokenExpired({
          integrationId: conn.id,
          integrationType: conn.integration_type,
          tenantId,
          expiredAt: conn.token_expires_at,
        })

        expiring++
      }
    }

    console.log(`[Integration Monitor] Checked ${connections.length} integrations, found ${expiring} expiring tokens`)

    return { checked: connections.length, expiring }
  } catch (error) {
    console.error('[Integration Monitor] Error checking tokens:', error)
    return { checked: 0, expiring: 0 }
  }
}

/**
 * Monitor integration sync failures
 */
export async function checkSyncFailures(tenantId: string): Promise<{
  checked: number
  failed: number
}> {
  try {
    const supabase = createClient()

    // Get recent sync logs with errors
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: logs } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'error')
      .gte('created_at', oneHourAgo)

    if (!logs || logs.length === 0) {
      return { checked: 0, failed: 0 }
    }

    // Group by integration
    const failuresByIntegration = new Map<string, number>()

    for (const log of logs) {
      const count = failuresByIntegration.get(log.integration_id) || 0
      failuresByIntegration.set(log.integration_id, count + 1)
    }

    let failed = 0

    // Emit events for integrations with 3+ failures in 1 hour
    for (const [integrationId, failureCount] of failuresByIntegration) {
      if (failureCount >= 3) {
        const log = logs.find(l => l.integration_id === integrationId)!

        await events.integrationSyncFailed({
          integrationId,
          integrationType: log.integration_type || 'unknown',
          tenantId,
          error: log.error_message || 'Multiple sync failures',
          failedAt: log.created_at,
        })

        failed++
      }
    }

    console.log(`[Integration Monitor] Checked ${logs.length} error logs, emitted ${failed} sync failure events`)

    return { checked: logs.length, failed }
  } catch (error) {
    console.error('[Integration Monitor] Error checking sync failures:', error)
    return { checked: 0, failed: 0 }
  }
}

/**
 * Monitor rate limit hits
 */
export async function checkRateLimits(tenantId: string): Promise<{
  checked: number
  hitLimits: number
}> {
  try {
    const supabase = createClient()

    // Get rate limit records
    const { data: limits } = await supabase
      .from('integration_rate_limits')
      .select('*')
      .eq('tenant_id', tenantId)
      .gt('remaining', 0)
      .lt('remaining', 10) // Less than 10 requests remaining

    if (!limits || limits.length === 0) {
      return { checked: 0, hitLimits: 0 }
    }

    let hitLimits = 0

    for (const limit of limits) {
      await events.integrationRateLimitHit({
        integrationId: limit.integration_id,
        integrationType: limit.integration_type,
        tenantId,
        limit: limit.limit,
        resetAt: limit.reset_at,
      })

      hitLimits++
    }

    console.log(`[Integration Monitor] Checked ${limits.length} rate limits, found ${hitLimits} near limits`)

    return { checked: limits.length, hitLimits }
  } catch (error) {
    console.error('[Integration Monitor] Error checking rate limits:', error)
    return { checked: 0, hitLimits: 0 }
  }
}


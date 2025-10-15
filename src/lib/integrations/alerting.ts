/**
 * Integration Alerting System
 * 
 * Monitors integration health and sends alerts when issues detected
 * 
 * Alert Types:
 * - Token expiring (< 7 days)
 * - Token expired
 * - High error rate (> 10% in 1 hour)
 * - Webhook failures (3+ consecutive)
 * - Rate limit exceeded
 * - Sync job failed
 * - DLQ items accumulating (> 10 items)
 * 
 * Alert Channels:
 * - In-app notifications
 * - Email (admin)
 * - Slack webhook (optional)
 * - PagerDuty (optional, for P0)
 */

import { createServiceClient } from '@/lib/supabase-server'

export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  integrationType: string
  alertType: string
  message: string
  details: any
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  createdAt: string
}

export interface AlertCondition {
  type: string
  check: () => Promise<boolean>
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  details?: any
}

/**
 * Check if token is expiring soon
 */
export async function checkTokenExpiry(tenantId: string): Promise<Alert[]> {
  const supabase = createServiceClient()
  const alerts: Alert[] = []
  
  // Find connections with tokens expiring in next 7 days
  const { data: expiringConnections } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .not('token_expires_at', 'is', null)
    .lte('token_expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
  
  for (const connection of expiringConnections || []) {
    const expiresAt = new Date(connection.token_expires_at)
    const now = new Date()
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
    const daysUntilExpiry = hoursUntilExpiry / 24
    
    const severity = expiresAt < now ? 'critical' :
                    daysUntilExpiry < 1 ? 'error' :
                    daysUntilExpiry < 3 ? 'warning' : 'info'
    
    alerts.push({
      id: `token_expiry_${connection.id}`,
      severity,
      integrationType: connection.integration_type,
      alertType: expiresAt < now ? 'token_expired' : 'token_expiring',
      message: expiresAt < now 
        ? `OAuth token has expired for ${connection.integration_type}`
        : `OAuth token expires in ${Math.floor(daysUntilExpiry)} days for ${connection.integration_type}`,
      details: {
        connection_id: connection.id,
        expires_at: connection.token_expires_at,
        days_until_expiry: Math.floor(daysUntilExpiry),
      },
      acknowledged: false,
      createdAt: new Date().toISOString(),
    })
  }
  
  return alerts
}

/**
 * Check if integration has high error rate
 */
export async function checkErrorRate(tenantId: string): Promise<Alert[]> {
  const supabase = createServiceClient()
  const alerts: Alert[] = []
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  // Get error rates per integration
  const { data: logs } = await supabase
    .from('integration_logs')
    .select('integration_type, status')
    .eq('tenant_id', tenantId)
    .gte('created_at', oneHourAgo.toISOString())
  
  if (!logs || logs.length === 0) return alerts
  
  // Group by integration type
  const byIntegration = logs.reduce((acc, log) => {
    if (!acc[log.integration_type]) {
      acc[log.integration_type] = { total: 0, errors: 0 }
    }
    acc[log.integration_type].total++
    if (log.status === 'error') {
      acc[log.integration_type].errors++
    }
    return acc
  }, {} as Record<string, { total: number; errors: number }>)
  
  // Check error rate for each integration
  for (const [integrationType, stats] of Object.entries(byIntegration)) {
    const errorRate = (stats.errors / stats.total) * 100
    
    if (errorRate > 10) {
      const severity = errorRate > 50 ? 'critical' :
                      errorRate > 25 ? 'error' :
                      errorRate > 10 ? 'warning' : 'info'
      
      alerts.push({
        id: `error_rate_${integrationType}`,
        severity,
        integrationType,
        alertType: 'high_error_rate',
        message: `High error rate for ${integrationType}: ${errorRate.toFixed(1)}% (${stats.errors}/${stats.total} requests failed)`,
        details: {
          error_rate: errorRate,
          total_requests: stats.total,
          failed_requests: stats.errors,
          time_window: '1_hour',
        },
        acknowledged: false,
        createdAt: new Date().toISOString(),
      })
    }
  }
  
  return alerts
}

/**
 * Check DLQ accumulation
 */
export async function checkDLQAccumulation(tenantId: string): Promise<Alert[]> {
  const supabase = createServiceClient()
  const alerts: Alert[] = []
  
  // Count pending/failed DLQ items
  const { data: dlqItems } = await supabase
    .from('integration_dlq')
    .select('integration_type, status')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'failed'])
  
  if (!dlqItems || dlqItems.length === 0) return alerts
  
  // Group by integration type
  const byIntegration = dlqItems.reduce((acc, item) => {
    if (!acc[item.integration_type]) {
      acc[item.integration_type] = 0
    }
    acc[item.integration_type]++
    return acc
  }, {} as Record<string, number>)
  
  for (const [integrationType, count] of Object.entries(byIntegration)) {
    if (count >= 10) {
      const severity = count >= 50 ? 'critical' :
                      count >= 25 ? 'error' : 'warning'
      
      alerts.push({
        id: `dlq_accumulation_${integrationType}`,
        severity,
        integrationType,
        alertType: 'dlq_accumulation',
        message: `${count} failed operations pending retry for ${integrationType}`,
        details: {
          dlq_count: count,
          action: 'Review DLQ dashboard and retry or discard items',
        },
        acknowledged: false,
        createdAt: new Date().toISOString(),
      })
    }
  }
  
  return alerts
}

/**
 * Check for stale syncs (no successful sync in 24+ hours)
 */
export async function checkStaleSyncs(tenantId: string): Promise<Alert[]> {
  const supabase = createServiceClient()
  const alerts: Alert[] = []
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  // Find connections that haven't synced in 24 hours
  const { data: staleConnections } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('sync_frequency', 'daily')
    .or(`last_sync_at.is.null,last_sync_at.lt.${twentyFourHoursAgo.toISOString()}`)
  
  for (const connection of staleConnections || []) {
    alerts.push({
      id: `stale_sync_${connection.id}`,
      severity: 'warning',
      integrationType: connection.integration_type,
      alertType: 'stale_sync',
      message: `No successful sync in 24+ hours for ${connection.integration_type}`,
      details: {
        connection_id: connection.id,
        last_sync_at: connection.last_sync_at,
        last_sync_status: connection.last_sync_status,
      },
      acknowledged: false,
      createdAt: new Date().toISOString(),
    })
  }
  
  return alerts
}

/**
 * Run all alert checks and return combined alerts
 */
export async function checkIntegrationAlerts(tenantId: string): Promise<Alert[]> {
  const allAlerts: Alert[] = []
  
  try {
    const tokenAlerts = await checkTokenExpiry(tenantId)
    const errorRateAlerts = await checkErrorRate(tenantId)
    const dlqAlerts = await checkDLQAccumulation(tenantId)
    const staleSyncAlerts = await checkStaleSyncs(tenantId)
    
    allAlerts.push(...tokenAlerts, ...errorRateAlerts, ...dlqAlerts, ...staleSyncAlerts)
  } catch (error) {
    console.error('[Alerting] Error checking alerts:', error)
  }
  
  // Sort by severity
  const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 }
  allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  
  return allAlerts
}

/**
 * Send alert via preferred channel
 * 
 * @param alert - Alert to send
 * @param channels - Channels to send to ('email', 'slack', 'pagerduty')
 */
export async function sendAlert(
  alert: Alert,
  channels: ('email' | 'slack' | 'pagerduty')[] = ['email']
) {
  // Email notification
  if (channels.includes('email')) {
    // TODO: Implement email alert
    console.log(`[Alerting] Would send email for alert: ${alert.message}`)
  }
  
  // Slack notification
  if (channels.includes('slack') && process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ ${alert.severity.toUpperCase()}: ${alert.message}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${alert.alertType}*\n${alert.message}`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Integration: \`${alert.integrationType}\` | Severity: \`${alert.severity}\``,
                },
              ],
            },
          ],
        }),
      })
      
      console.log(`[Alerting] Slack notification sent for alert: ${alert.id}`)
    } catch (error) {
      console.error('[Alerting] Failed to send Slack notification:', error)
    }
  }
  
  // PagerDuty notification (for critical alerts only)
  if (channels.includes('pagerduty') && alert.severity === 'critical' && process.env.PAGERDUTY_INTEGRATION_KEY) {
    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
          event_action: 'trigger',
          payload: {
            summary: alert.message,
            severity: alert.severity,
            source: 'dental-crm-integrations',
            custom_details: alert.details,
          },
        }),
      })
      
      console.log(`[Alerting] PagerDuty incident created for alert: ${alert.id}`)
    } catch (error) {
      console.error('[Alerting] Failed to create PagerDuty incident:', error)
    }
  }
}


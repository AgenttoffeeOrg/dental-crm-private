import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * Integration Metrics API
 * 
 * Advanced analytics endpoint for integration performance
 * 
 * Provides:
 * - Time-series data for charts
 * - Per-integration breakdown
 * - Latency percentiles (P50, P95, P99)
 * - Top errors
 * - Request volume trends
 * 
 * GET /api/integrations/metrics?days=7&integration_type=twilio_sms
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const integrationType = searchParams.get('integration_type')
    
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
    
    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Build query
    let query = supabase
      .from('integration_logs')
      .select('*')
      .eq('tenant_id', appUser.tenant_id)
      .gte('created_at', startDate.toISOString())
    
    if (integrationType) {
      query = query.eq('integration_type', integrationType)
    }
    
    const { data: logs, error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!logs || logs.length === 0) {
      return NextResponse.json({
        success: true,
        metrics: {
          totalRequests: 0,
          successCount: 0,
          errorCount: 0,
          successRate: 0,
          avgDuration: 0,
          p50Duration: 0,
          p95Duration: 0,
          p99Duration: 0,
        },
        timeSeries: [],
        topErrors: [],
        byIntegration: [],
      })
    }
    
    // Calculate metrics
    const successLogs = logs.filter(l => l.status === 'success')
    const errorLogs = logs.filter(l => l.status === 'error')
    
    const durations = logs
      .filter(l => l.duration_ms)
      .map(l => l.duration_ms)
      .sort((a, b) => a - b)
    
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0
    
    // Time series data (group by date)
    const byDate: Record<string, { success: number; error: number; total: number }> = {}
    
    logs.forEach(log => {
      const date = log.created_at.split('T')[0]
      
      if (!byDate[date]) {
        byDate[date] = { success: 0, error: 0, total: 0 }
      }
      
      byDate[date].total++
      if (log.status === 'success') {
        byDate[date].success++
      } else if (log.status === 'error') {
        byDate[date].error++
      }
    })
    
    const timeSeries = Object.entries(byDate).map(([date, stats]) => ({
      date,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      successCount: stats.success,
      errorCount: stats.error,
      totalRequests: stats.total,
    }))
    
    // Top errors
    const errorByType: Record<string, number> = {}
    errorLogs.forEach(log => {
      const errorKey = log.error_code || log.error_message || 'unknown'
      errorByType[errorKey] = (errorByType[errorKey] || 0) + 1
    })
    
    const topErrors = Object.entries(errorByType)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    // By integration type
    const byIntegration: Record<string, { success: number; error: number; total: number }> = {}
    
    logs.forEach(log => {
      const type = log.integration_type
      
      if (!byIntegration[type]) {
        byIntegration[type] = { success: 0, error: 0, total: 0 }
      }
      
      byIntegration[type].total++
      if (log.status === 'success') {
        byIntegration[type].success++
      } else if (log.status === 'error') {
        byIntegration[type].error++
      }
    })
    
    const integrationBreakdown = Object.entries(byIntegration).map(([type, stats]) => ({
      integrationType: type,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      successCount: stats.success,
      errorCount: stats.error,
      totalRequests: stats.total,
    }))
    
    return NextResponse.json({
      success: true,
      metrics: {
        totalRequests: logs.length,
        successCount: successLogs.length,
        errorCount: errorLogs.length,
        successRate: logs.length > 0 ? (successLogs.length / logs.length) * 100 : 0,
        avgDuration: Math.round(avgDuration),
        p50Duration: p50,
        p95Duration: p95,
        p99Duration: p99,
      },
      timeSeries,
      topErrors,
      byIntegration: integrationBreakdown,
      timeRange: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[Integration Metrics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}


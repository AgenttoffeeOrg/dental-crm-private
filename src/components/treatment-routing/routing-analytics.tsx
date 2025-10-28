/**
 * =====================================================
 * ROUTING ANALYTICS - PERFORMANCE & AUDIT TRAIL
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 6 - Routing Analytics UI
 * =====================================================
 * 
 * PURPOSE:
 * Comprehensive analytics dashboard for treatment tag routing performance
 * 
 * FEATURES:
 * - Routing accuracy chart (% deals routed correctly)
 * - Routing method breakdown (pie chart)
 * - Tag performance table (conversion rate per tag)
 * - Routing logs viewer (filterable audit trail)
 * - Export logs to CSV/Excel
 * - Date range filtering
 * - Real-time statistics
 * - Performance metrics
 * 
 * USAGE:
 * ```typescript
 * <RoutingAnalytics tenantId={tenantId} />
 * ```
 * 
 * =====================================================
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { handleDatabaseError, checkTableExists } from '@/lib/treatment-routing/migration-checker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  Activity,
  Target,
  Zap,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import { format, subDays, subMonths } from 'date-fns'

// =====================================================
// TYPES
// =====================================================

interface RoutingLog {
  id: string
  deal_id: string
  routing_method: string
  routed_to_pipeline_id: string
  routed_to_stage_id: string | null
  matched_tag_ids: string[]
  matched_keywords: string[]
  confidence_score: number
  routing_reason: string
  deal_title: string
  deal_value_cents: number
  deal_treatment_tags: string[]
  routing_duration_ms: number
  was_manual_override: boolean
  routed_at: string
  // Joined data
  pipeline?: { name: string }
  stage?: { name: string }
  user?: { name: string }
}

interface RoutingStats {
  total_routed: number
  user_override_count: number
  tag_mapping_count: number
  ai_keyword_count: number
  unsorted_fallback_count: number
  avg_confidence: number
  avg_duration_ms: number
}

interface TagPerformance {
  tag_id: string
  tag_name: string
  tag_color: string
  tag_icon: string
  total_deals: number
  deals_won: number
  deals_lost: number
  deals_in_progress: number
  conversion_rate: number
  avg_deal_value_cents: number
  total_revenue_cents: number
}

interface RoutingMethodData {
  name: string
  value: number
  color: string
}

interface AccuracyData {
  date: string
  accuracy: number
  total_deals: number
}

// =====================================================
// CONSTANTS
// =====================================================

const METHOD_COLORS: Record<string, string> = {
  'user_override': '#667eea',
  'tag_mapping': '#10b981',
  'ai_keyword_match': '#f59e0b',
  'value_based': '#8b5cf6',
  'unsorted_fallback': '#ef4444',
  'legacy_config': '#6b7280',
  'api_specified': '#06b6d4'
}

const METHOD_LABELS: Record<string, string> = {
  'user_override': 'User Override',
  'tag_mapping': 'Tag Mapping',
  'ai_keyword_match': 'AI Keyword Match',
  'value_based': 'Value-Based',
  'unsorted_fallback': 'Unsorted Fallback',
  'legacy_config': 'Legacy Config',
  'api_specified': 'API Specified'
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(cents / 100)
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

function exportLogsToCSV(logs: RoutingLog[]) {
  const headers = [
    'Date',
    'Deal Title',
    'Deal Value',
    'Routing Method',
    'Destination Pipeline',
    'Destination Stage',
    'Matched Tags',
    'Confidence Score',
    'Routing Reason',
    'Duration (ms)',
    'Manual Override'
  ]

  const rows = logs.map(log => [
    format(new Date(log.routed_at), 'yyyy-MM-dd HH:mm:ss'),
    log.deal_title,
    formatCurrency(log.deal_value_cents),
    METHOD_LABELS[log.routing_method] || log.routing_method,
    log.pipeline?.name || 'Unknown',
    log.stage?.name || 'First Stage',
    log.deal_treatment_tags.join('; '),
    log.confidence_score.toString(),
    log.routing_reason,
    log.routing_duration_ms.toString(),
    log.was_manual_override ? 'Yes' : 'No'
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `routing-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  toast.success(`Exported ${logs.length} routing logs`)
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function RoutingAnalytics({ tenantId }: { tenantId: string }) {
  const [stats, setStats] = useState<RoutingStats | null>(null)
  const [logs, setLogs] = useState<RoutingLog[]>([])
  const [tagPerformance, setTagPerformance] = useState<TagPerformance[]>([])
  const [methodBreakdown, setMethodBreakdown] = useState<RoutingMethodData[]>([])
  const [accuracyData, setAccuracyData] = useState<AccuracyData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [tenantId, dateRange])

  const loadData = async () => {
    try {
      setLoading(true)

      // Check if table exists first
      const tableExists = await checkTableExists('treatment_routing_logs')
      if (!tableExists) {
        console.warn('[RoutingAnalytics] Treatment routing tables not yet created. Migrations need to be run.')
        setLogs([])
        setStats({
          total_routed: 0,
          user_override_count: 0,
          tag_mapping_count: 0,
          ai_keyword_count: 0,
          unsorted_fallback_count: 0,
          avg_confidence: 0,
          avg_duration_ms: 0
        })
        setMethodBreakdown([])
        setAccuracyData([])
        setTagPerformance([])
        setLoading(false)
        return
      }

      const startDate = subDays(new Date(), parseInt(dateRange))

      // Load routing stats
      const { data: logsData, error: logsError } = await supabase
        .from('treatment_routing_logs')
        .select(`
          *,
          pipeline:pipelines(name),
          stage:pipeline_stages(name),
          user:app_users(name)
        `)
        .eq('tenant_id', tenantId)
        .gte('routed_at', startDate.toISOString())
        .order('routed_at', { ascending: false })

      if (logsError) throw logsError

      setLogs(logsData || [])

      // Calculate statistics
      const total = logsData?.length || 0
      const userOverride = logsData?.filter(l => l.routing_method === 'user_override').length || 0
      const tagMapping = logsData?.filter(l => l.routing_method === 'tag_mapping').length || 0
      const aiKeyword = logsData?.filter(l => l.routing_method === 'ai_keyword_match').length || 0
      const unsorted = logsData?.filter(l => l.routing_method === 'unsorted_fallback').length || 0
      const avgConfidence = total > 0
        ? logsData.reduce((sum, l) => sum + l.confidence_score, 0) / total
        : 0
      const avgDuration = total > 0
        ? logsData.reduce((sum, l) => sum + (l.routing_duration_ms || 0), 0) / total
        : 0

      setStats({
        total_routed: total,
        user_override_count: userOverride,
        tag_mapping_count: tagMapping,
        ai_keyword_count: aiKeyword,
        unsorted_fallback_count: unsorted,
        avg_confidence: avgConfidence,
        avg_duration_ms: avgDuration
      })

      // Method breakdown for pie chart
      const methods: Record<string, number> = {}
      logsData?.forEach(log => {
        methods[log.routing_method] = (methods[log.routing_method] || 0) + 1
      })

      const methodData = Object.entries(methods).map(([method, count]) => ({
        name: METHOD_LABELS[method] || method,
        value: count,
        color: METHOD_COLORS[method] || '#6b7280'
      }))

      setMethodBreakdown(methodData)

      // Accuracy over time (simplified: % non-fallback routes)
      const accuracyByDate: Record<string, { total: number, success: number }> = {}
      logsData?.forEach(log => {
        const date = format(new Date(log.routed_at), 'MMM dd')
        if (!accuracyByDate[date]) {
          accuracyByDate[date] = { total: 0, success: 0 }
        }
        accuracyByDate[date].total++
        if (log.routing_method !== 'unsorted_fallback') {
          accuracyByDate[date].success++
        }
      })

      const accuracyChartData = Object.entries(accuracyByDate).map(([date, data]) => ({
        date,
        accuracy: (data.success / data.total) * 100,
        total_deals: data.total
      }))

      setAccuracyData(accuracyChartData)

      // Load tag performance
      const { data: tagsData, error: tagsError } = await supabase
        .from('treatment_tags')
        .select('id, name, color, icon, usage_count, conversion_rate, avg_deal_value_cents')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(10)

      if (tagsError) throw tagsError

      // Transform to tag performance format
      const tagPerfData: TagPerformance[] = (tagsData || []).map(tag => ({
        tag_id: tag.id,
        tag_name: tag.name,
        tag_color: tag.color,
        tag_icon: tag.icon,
        total_deals: tag.usage_count || 0,
        deals_won: 0, // TODO: Calculate from deals status
        deals_lost: 0,
        deals_in_progress: tag.usage_count || 0,
        conversion_rate: tag.conversion_rate || 0,
        avg_deal_value_cents: tag.avg_deal_value_cents || 0,
        total_revenue_cents: (tag.avg_deal_value_cents || 0) * (tag.usage_count || 0)
      }))

      setTagPerformance(tagPerfData)

    } catch (error) {
      const errorInfo = handleDatabaseError(error, 'LoadRoutingAnalytics')
      
      // Only log if it's not an empty error object
      if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        console.error('Error loading routing analytics:', error)
      } else {
        console.info('[RoutingAnalytics] No data available or table not configured')
      }
      
      if (errorInfo.isTableMissing) {
        console.info('[RoutingAnalytics] Treatment routing tables not yet migrated')
        // Don't show toast - just fail silently for optional features
      } else if (errorInfo.userMessage && errorInfo.userMessage !== 'An unexpected error occurred') {
        // Only show toast for real errors
        console.warn('[RoutingAnalytics] Error:', errorInfo.userMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesMethod = methodFilter === 'all' || log.routing_method === methodFilter
    const matchesSearch = !searchQuery ||
      log.deal_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.routing_reason.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesMethod && matchesSearch
  })

  // Calculate routing accuracy (% non-fallback)
  const routingAccuracy = stats && stats.total_routed > 0
    ? ((stats.total_routed - stats.unsorted_fallback_count) / stats.total_routed) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Routing Analytics</h2>
          <p className="text-sm text-gray-600">Performance metrics and audit trail</p>
        </div>
        <div className="flex gap-4 items-center">
          <Label htmlFor="dateRange">Date Range:</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 365 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => exportLogsToCSV(filteredLogs)}
            disabled={filteredLogs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Routed</p>
                <p className="text-2xl font-bold">{stats?.total_routed || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Routing Accuracy</p>
                <p className="text-2xl font-bold">{formatPercentage(routingAccuracy)}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold">{formatPercentage(stats?.avg_confidence || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold">{Math.round(stats?.avg_duration_ms || 0)}ms</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Routing Accuracy Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Routing Accuracy Over Time</CardTitle>
            <CardDescription>Percentage of deals successfully routed (non-fallback)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                  name="Accuracy %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Routing Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Routing Method Breakdown</CardTitle>
            <CardDescription>How deals are being routed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={methodBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {methodBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tag Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Tags</CardTitle>
          <CardDescription>Conversion rate and revenue by treatment tag</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tag performance...</div>
          ) : tagPerformance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tag performance data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tag</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Total Deals</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Conversion Rate</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Avg Deal Value</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {tagPerformance.map(tag => (
                    <tr key={tag.tag_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-lg"
                            style={{ backgroundColor: tag.tag_color + '20' }}
                          >
                            {tag.tag_icon}
                          </div>
                          <span className="font-medium">{tag.tag_name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">{tag.total_deals}</td>
                      <td className="text-right py-3 px-4">
                        <Badge variant={tag.conversion_rate >= 50 ? 'default' : 'secondary'}>
                          {formatPercentage(tag.conversion_rate)}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4">{formatCurrency(tag.avg_deal_value_cents)}</td>
                      <td className="text-right py-3 px-4 font-semibold">{formatCurrency(tag.total_revenue_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Routing Logs Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Routing Logs</CardTitle>
          <CardDescription>Complete audit trail of routing decisions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by deal title or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="user_override">User Override</SelectItem>
                <SelectItem value="tag_mapping">Tag Mapping</SelectItem>
                <SelectItem value="ai_keyword_match">AI Keyword Match</SelectItem>
                <SelectItem value="unsorted_fallback">Unsorted Fallback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No routing logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.slice(0, 50).map(log => (
                <div key={log.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{log.deal_title}</h4>
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: METHOD_COLORS[log.routing_method] + '20',
                            color: METHOD_COLORS[log.routing_method],
                            borderColor: METHOD_COLORS[log.routing_method]
                          }}
                        >
                          {METHOD_LABELS[log.routing_method]}
                        </Badge>
                        {log.was_manual_override && (
                          <Badge variant="secondary" className="text-xs">Manual Override</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{log.routing_reason}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500">{format(new Date(log.routed_at), 'MMM dd, HH:mm')}</p>
                      <p className="font-medium">{formatCurrency(log.deal_value_cents)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>→ {log.pipeline?.name || 'Unknown Pipeline'}</span>
                    {log.stage && <span>• {log.stage.name}</span>}
                    <span>• Confidence: {log.confidence_score}%</span>
                    {log.routing_duration_ms && <span>• {log.routing_duration_ms}ms</span>}
                    {log.deal_treatment_tags.length > 0 && (
                      <span>• Tags: {log.deal_treatment_tags.join(', ')}</span>
                    )}
                  </div>
                </div>
              ))}

              {filteredLogs.length > 50 && (
                <p className="text-center text-sm text-gray-500 py-4">
                  Showing 50 of {filteredLogs.length} logs. Export for full data.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


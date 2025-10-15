'use client'

/**
 * Success/Error Rate Charts
 * 
 * Time-series visualization of integration health metrics
 * 
 * Features:
 * - 7-day and 30-day views
 * - Success rate line chart
 * - Error count bar chart
 * - Request volume area chart
 * - Per-integration filtering
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase-client'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface MetricData {
  date: string
  successRate: number
  errorCount: number
  totalRequests: number
}

export function SuccessErrorCharts() {
  const [data, setData] = useState<MetricData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')
  const [selectedIntegration, setSelectedIntegration] = useState<string>('all')
  const [integrations, setIntegrations] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [timeRange, selectedIntegration])

  const loadData = async () => {
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
      
      // Get date range
      const days = timeRange === '7d' ? 7 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      // Fetch logs
      let query = supabase
        .from('integration_logs')
        .select('integration_type, status, created_at')
        .eq('tenant_id', appUser.tenant_id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
      
      if (selectedIntegration !== 'all') {
        query = query.eq('integration_type', selectedIntegration)
      }
      
      const { data: logs } = await query
      
      if (logs) {
        // Group by date
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
        
        // Convert to array and calculate success rate
        const metricsData: MetricData[] = Object.entries(byDate).map(([date, stats]) => ({
          date,
          successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
          errorCount: stats.error,
          totalRequests: stats.total,
        }))
        
        setData(metricsData)
        
        // Get unique integrations
        const uniqueIntegrations = Array.from(new Set(logs.map(l => l.integration_type)))
        setIntegrations(uniqueIntegrations)
      }
    } catch (error) {
      console.error('Error loading metrics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const avgSuccessRate = data.length > 0
    ? data.reduce((sum, d) => sum + d.successRate, 0) / data.length
    : 0

  const totalRequests = data.reduce((sum, d) => sum + d.totalRequests, 0)
  const totalErrors = data.reduce((sum, d) => sum + d.errorCount, 0)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </Button>
        </div>
        
        <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Integrations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Integrations</SelectItem>
            {integrations.map(int => (
              <SelectItem key={int} value={int}>
                {int.replace(/_/g, ' ').toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Avg Success Rate</p>
              <p className="text-2xl font-bold text-green-600">{avgSuccessRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Errors</p>
              <p className="text-2xl font-bold text-red-600">{totalErrors}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Success Rate Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Success Rate Over Time</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Loading chart data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No data available for selected period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Success Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Error Count Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Error Count Over Time</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Loading chart data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No data available for selected period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="errorCount" fill="#ef4444" name="Errors" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Request Volume Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Request Volume Over Time</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Loading chart data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No data available for selected period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="totalRequests" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
                name="Total Requests"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}


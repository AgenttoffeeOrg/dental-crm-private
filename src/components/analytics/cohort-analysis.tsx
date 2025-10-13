'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/ui/export-button'
import { Users, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'

interface CohortData {
  cohort_month: string
  cohort_size: number
  active_month_1: number
  active_month_2: number
  active_month_3: number
  active_month_6: number
  active_month_12: number
  retention_rate_12m: number
}

interface LTVBySource {
  source: string
  total_customers: number
  total_revenue_cents: number
  avg_ltv_cents: number
  deals_per_customer: number
  avg_customer_age_days: number
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a']

export function CohortAnalysis({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [cohorts, setCohorts] = useState<CohortData[]>([])
  const [ltvData, setLtvData] = useState<LTVBySource[]>([])

  useEffect(() => {
    if (tenantId) {
      loadAllData()
    }
  }, [tenantId])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadCohortData(),
      loadLTVData()
    ])
    setLoading(false)
  }

  const loadCohortData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('cohort_retention_analysis')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('cohort_month', { ascending: false })
        .limit(12)

      if (!data) return

      setCohorts(data.map((c: any) => ({
        cohort_month: format(new Date(c.cohort_month), 'MMM yyyy'),
        cohort_size: c.cohort_size || 0,
        active_month_1: c.active_month_1 || 0,
        active_month_2: c.active_month_2 || 0,
        active_month_3: c.active_month_3 || 0,
        active_month_6: c.active_month_6 || 0,
        active_month_12: c.active_month_12 || 0,
        retention_rate_12m: c.retention_rate_12m || 0
      })))
    } catch (error) {
      console.error('[COHORT] Error loading cohort data:', error)
    }
  }

  const loadLTVData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('customer_ltv_by_source')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('avg_ltv_cents', { ascending: false })

      if (!data) return

      setLtvData(data.map((l: any) => ({
        source: l.source || 'Unknown',
        total_customers: l.total_customers || 0,
        total_revenue_cents: l.total_revenue_cents || 0,
        avg_ltv_cents: l.avg_ltv_cents || 0,
        deals_per_customer: l.deals_per_customer || 0,
        avg_customer_age_days: l.avg_customer_age_days || 0
      })))
    } catch (error) {
      console.error('[COHORT] Error loading LTV data:', error)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800 border-green-300'
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cohort Analysis</h2>
          <p className="text-sm text-gray-600">Patient retention and lifetime value tracking</p>
        </div>
        <ExportButton
          data={cohorts}
          filename="cohort-analysis"
          title="Cohort Analysis"
        />
      </div>

      {/* Retention Table */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Cohort Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cohort</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Size</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">M1</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">M2</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">M3</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">M6</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">M12</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">12M Rate</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort, index) => {
                  const calcRate = (active: number) => cohort.cohort_size > 0 
                    ? ((active / cohort.cohort_size) * 100).toFixed(0) 
                    : '0'

                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{cohort.cohort_month}</td>
                      <td className="text-center py-3 px-4 text-gray-700">{cohort.cohort_size}</td>
                      <td className="text-center py-3 px-4">
                        {cohort.active_month_1 > 0 ? (
                          <Badge className={getRetentionColor(Number(calcRate(cohort.active_month_1)))}>
                            {calcRate(cohort.active_month_1)}%
                          </Badge>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="text-center py-3 px-4">
                        {cohort.active_month_2 > 0 ? (
                          <Badge className={getRetentionColor(Number(calcRate(cohort.active_month_2)))}>
                            {calcRate(cohort.active_month_2)}%
                          </Badge>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="text-center py-3 px-4">
                        {cohort.active_month_3 > 0 ? (
                          <Badge className={getRetentionColor(Number(calcRate(cohort.active_month_3)))}>
                            {calcRate(cohort.active_month_3)}%
                          </Badge>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="text-center py-3 px-4">
                        {cohort.active_month_6 > 0 ? (
                          <Badge className={getRetentionColor(Number(calcRate(cohort.active_month_6)))}>
                            {calcRate(cohort.active_month_6)}%
                          </Badge>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="text-center py-3 px-4">
                        {cohort.active_month_12 > 0 ? (
                          <Badge className={getRetentionColor(Number(calcRate(cohort.active_month_12)))}>
                            {calcRate(cohort.active_month_12)}%
                          </Badge>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className={getRetentionColor(cohort.retention_rate_12m)} variant="outline">
                          {cohort.retention_rate_12m.toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
              <span className="text-gray-600">{'>'} 80% retention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
              <span className="text-gray-600">60-80% retention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
              <span className="text-gray-600">{'<'} 60% retention</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LTV by Source */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lifetime Value by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ltvData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="source" stroke="#6b7280" fontSize={11} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="avg_ltv_cents" fill="#667eea" name="Avg LTV" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals Per Customer by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ltvData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="source" stroke="#6b7280" fontSize={11} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip formatter={(value: number) => value.toFixed(2)} />
                <Bar dataKey="deals_per_customer" fill="#43e97b" name="Deals/Customer" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* LTV Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lifetime Value Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Customers</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Revenue</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg LTV</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deals/Customer</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Age (Days)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Quality Score</th>
                </tr>
              </thead>
              <tbody>
                {ltvData.map((source, index) => {
                  const qualityScore = source.avg_ltv_cents > 500000 ? 'Excellent' :
                                      source.avg_ltv_cents > 300000 ? 'Good' :
                                      source.avg_ltv_cents > 150000 ? 'Average' : 'Poor'
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-gray-900">{source.source}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">{source.total_customers}</td>
                      <td className="text-right py-3 px-4 font-semibold">{formatCurrency(source.total_revenue_cents)}</td>
                      <td className="text-right py-3 px-4 font-semibold text-indigo-600">
                        {formatCurrency(source.avg_ltv_cents)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {source.deals_per_customer.toFixed(1)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {Math.round(source.avg_customer_age_days)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge className={
                          qualityScore === 'Excellent' ? 'bg-green-600' :
                          qualityScore === 'Good' ? 'bg-blue-600' :
                          qualityScore === 'Average' ? 'bg-yellow-600' : 'bg-red-600'
                        }>
                          {qualityScore}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


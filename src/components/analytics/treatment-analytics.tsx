'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/ui/export-button'
import { Activity, DollarSign, TrendingUp, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface TreatmentTypeMetrics {
  treatment_type: string
  total_proposed: number
  total_accepted: number
  total_declined: number
  acceptance_rate: number
  avg_estimated_cost_cents: number
  total_revenue_cents: number
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a']

export function TreatmentAnalytics({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [treatmentData, setTreatmentData] = useState<TreatmentTypeMetrics[]>([])

  useEffect(() => {
    if (tenantId) {
      loadData()
    }
  }, [tenantId])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('treatment_type_analytics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_revenue_cents', { ascending: false })

      if (data) {
        setTreatmentData(data)
      }
    } catch (error) {
      console.error('[TREATMENT ANALYTICS] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  if (loading) {
    return <div className="text-center py-12">Loading treatment analytics...</div>
  }

  const totalRevenue = treatmentData.reduce((sum, t) => sum + t.total_revenue_cents, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Treatment Analytics</h2>
          <p className="text-sm text-gray-600">Performance by treatment type</p>
        </div>
        <ExportButton data={treatmentData} filename="treatment-analytics" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Treatment Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={treatmentData}
                  dataKey="total_revenue_cents"
                  nameKey="treatment_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.treatment_type}: ${formatCurrency(entry.total_revenue_cents)}`}
                >
                  {treatmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance Rate by Treatment</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={treatmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="treatment_type" stroke="#6b7280" fontSize={11} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="acceptance_rate" fill="#43e97b" name="Acceptance Rate (%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treatment Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Treatment Type</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Proposed</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Accepted</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Declined</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Accept Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Value</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {treatmentData.map((treatment, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-gray-900">{treatment.treatment_type}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700">{treatment.total_proposed}</td>
                    <td className="text-right py-3 px-4 text-green-600 font-semibold">{treatment.total_accepted}</td>
                    <td className="text-right py-3 px-4 text-red-600">{treatment.total_declined}</td>
                    <td className="text-right py-3 px-4">
                      <Badge variant="secondary">{treatment.acceptance_rate.toFixed(1)}%</Badge>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700">
                      {formatCurrency(treatment.avg_estimated_cost_cents)}
                    </td>
                    <td className="text-right py-3 px-4 font-semibold">
                      {formatCurrency(treatment.total_revenue_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



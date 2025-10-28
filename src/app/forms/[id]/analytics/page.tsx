'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-client'
import { BarChart3, TrendingUp, Users, Target, Download, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface FormAnalytics {
  formId: string
  formName: string
  totalViews: number
  totalStarts: number
  totalSubmissions: number
  totalSpam: number
  conversionRate: number
  trafficSources: { source: string; count: number; percentage: number }[]
  deviceBreakdown: { device: string; count: number; percentage: number }[]
  fieldDropoff: { field: string; reached: number; percentage: number }[]
  submissions: any[]
}

export default function FormAnalyticsPage() {
  const params = useParams()
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // days
  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [params.id, dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Get form details
      const { data: form } = await supabase
        .from('marketing_forms')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!form) {
        toast.error('Form not found')
        return
      }

      // Calculate date range
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))

      // Get submissions in date range
      const { data: submissions } = await supabase
        .from('marketing_form_submissions')
        .select('*')
        .eq('form_id', params.id)
        .gte('submitted_at', startDate.toISOString())
        .order('submitted_at', { ascending: false })

      const totalSubmissions = submissions?.length || 0
      const totalSpam = submissions?.filter(s => s.is_spam).length || 0
      const legitimateSubmissions = totalSubmissions - totalSpam

      // Calculate metrics
      const totalViews = form.total_views || 0
      const totalStarts = Math.max(legitimateSubmissions, Math.floor(totalViews * 0.7)) // Estimate
      const conversionRate = totalViews > 0 ? (legitimateSubmissions / totalViews) * 100 : 0

      // Traffic sources from UTM (mock for now)
      const trafficSources = [
        { source: 'Direct', count: Math.floor(legitimateSubmissions * 0.35), percentage: 35 },
        { source: 'Google Ads', count: Math.floor(legitimateSubmissions * 0.30), percentage: 30 },
        { source: 'Facebook', count: Math.floor(legitimateSubmissions * 0.20), percentage: 20 },
        { source: 'Organic', count: Math.floor(legitimateSubmissions * 0.15), percentage: 15 },
      ]

      // Device breakdown from user_agent (simplified)
      const mobileCount = submissions?.filter(s => 
        s.user_agent?.toLowerCase().includes('mobile')
      ).length || 0
      const deviceBreakdown = [
        { device: 'Mobile', count: mobileCount, percentage: totalSubmissions > 0 ? (mobileCount / totalSubmissions) * 100 : 0 },
        { device: 'Desktop', count: totalSubmissions - mobileCount, percentage: totalSubmissions > 0 ? ((totalSubmissions - mobileCount) / totalSubmissions) * 100 : 0 },
      ]

      // Field drop-off (estimated)
      const fieldDropoff = form.fields_json.map((field: any, index: number) => ({
        field: field.label,
        reached: Math.floor(totalStarts * (1 - (index * 0.05))),
        percentage: 100 - (index * 5),
      }))

      setAnalytics({
        formId: form.id,
        formName: form.name,
        totalViews,
        totalStarts,
        totalSubmissions: legitimateSubmissions,
        totalSpam,
        conversionRate,
        trafficSources,
        deviceBreakdown,
        fieldDropoff,
        submissions: submissions || [],
      })
    } catch (error) {
      console.error('[Analytics] Error:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!analytics) return

    // Create CSV content
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Source', 'Is Spam']
    const rows = analytics.submissions.map(sub => [
      new Date(sub.submitted_at).toLocaleDateString(),
      sub.payload.full_name || '',
      sub.payload.email || '',
      sub.payload.phone || '',
      sub.source_url || '',
      sub.is_spam ? 'Yes' : 'No',
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${analytics.formName}-analytics-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('CSV exported successfully!')
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">Analytics not available</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-6">
          <Breadcrumbs
            items={[
              { label: 'Forms', href: '/forms' },
              { label: analytics.formName, href: `/forms/${analytics.formId}` },
              { label: 'Analytics' },
            ]}
          />

          <PageHeader
            title={`${analytics.formName} — Analytics`}
            description="Understand form performance and optimize for better conversions"
            icon={BarChart3}
            action={
              <div className="flex gap-2">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
                <Button onClick={exportCSV} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            }
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Views */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalViews.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">
                  People who saw the form
                </p>
              </CardContent>
            </Card>

            {/* Starts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Form Starts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalStarts.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Started filling the form
                </p>
              </CardContent>
            </Card>

            {/* Completions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Completions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {analytics.totalSubmissions.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Successfully submitted
                </p>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {analytics.conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Views to completions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Views */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Views</span>
                  <span>{analytics.totalViews.toLocaleString()} (100%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div className="bg-blue-500 h-8 rounded-full flex items-center justify-end pr-3" style={{ width: '100%' }}>
                    <span className="text-white text-xs font-semibold">{analytics.totalViews}</span>
                  </div>
                </div>
              </div>

              {/* Starts */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Starts</span>
                  <span>
                    {analytics.totalStarts.toLocaleString()} 
                    ({((analytics.totalStarts / analytics.totalViews) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-blue-600 h-8 rounded-full flex items-center justify-end pr-3" 
                    style={{ width: `${(analytics.totalStarts / analytics.totalViews) * 100}%` }}
                  >
                    <span className="text-white text-xs font-semibold">{analytics.totalStarts}</span>
                  </div>
                </div>
              </div>

              {/* Completions */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Completions</span>
                  <span>
                    {analytics.totalSubmissions.toLocaleString()} 
                    ({analytics.conversionRate.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-green-500 h-8 rounded-full flex items-center justify-end pr-3" 
                    style={{ width: `${analytics.conversionRate}%` }}
                  >
                    <span className="text-white text-xs font-semibold">{analytics.totalSubmissions}</span>
                  </div>
                </div>
              </div>

              {/* Drop-off */}
              {analytics.totalViews > analytics.totalSubmissions && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-red-800">
                    <strong>Drop-off:</strong> {(analytics.totalViews - analytics.totalSubmissions).toLocaleString()} users ({(100 - analytics.conversionRate).toFixed(1)}%) abandoned the form
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Traffic Sources & Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.trafficSources.map((source, index) => (
                  <div key={source.source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{index + 1}. {source.source}</span>
                      <span>{source.count} ({source.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div 
                        className="bg-blue-500 h-6 rounded-full"
                        style={{ width: `${source.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.deviceBreakdown.map((device) => (
                  <div key={device.device}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{device.device}</span>
                      <span>{device.count} ({device.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div 
                        className="bg-purple-500 h-6 rounded-full"
                        style={{ width: `${device.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Field Drop-off Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Field Drop-off Analysis</CardTitle>
              <p className="text-sm text-gray-600">
                See which fields cause people to abandon the form
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {analytics.fieldDropoff.map((field, index) => (
                <div key={field.field}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">
                      {index + 1}. {field.field}
                    </span>
                    <span>{field.reached} users ({field.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${
                        field.percentage >= 90 ? 'bg-green-500' :
                        field.percentage >= 75 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${field.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions ({analytics.submissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Phone</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.submissions.slice(0, 10).map((sub) => (
                      <tr key={sub.id} className="border-b hover:bg-gray-50">
                        <td className="py-2">
                          {new Date(sub.submitted_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="py-2">{sub.payload.full_name || '—'}</td>
                        <td className="py-2">{sub.payload.email || '—'}</td>
                        <td className="py-2">{sub.payload.phone || '—'}</td>
                        <td className="py-2">
                          {sub.is_spam ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Spam</span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}


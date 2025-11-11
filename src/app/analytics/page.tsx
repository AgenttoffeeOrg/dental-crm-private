'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Download,
  Brain,
  Users as UsersIcon,
  Target,
  Sparkles,
  Globe
} from 'lucide-react'
import { ExecutiveDashboardV2 } from '@/components/analytics/executive-dashboard-v2'
import { CRMAnalyticsV2 } from '@/components/analytics/crm-analytics-v2'
import { MarketingAnalyticsV2 } from '@/components/analytics/marketing-analytics-v2'
import { CohortAnalysis } from '@/components/analytics/cohort-analysis'
import { PredictiveAnalytics } from '@/components/analytics/predictive-analytics'
import { ConversionIntelligenceDashboard } from '@/components/analytics/conversion-intelligence-dashboard'
import { CompetitiveInsightsDashboard } from '@/components/analytics/competitive-insights-dashboard'
import { useAuth } from '@/lib/auth'
import { LoadingState } from '@/components/ui/loading-state'
import { NoOrgEmptyState } from '@/components/guards'

export default function AnalyticsPage() {
  const { appUser, loading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)
  const [activeTab, setActiveTab] = useState('executive')

  // Show empty state if user has no tenant
  if (!hasTenant && !loading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Analytics" />
      </DashboardLayout>
    )
  }

  // Show loading state while auth is loading
  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading analytics..." size="lg" />
      </DashboardLayout>
    )
  }

  // Use the tenant_id from the logged in user
  const tenantId = appUser?.active_tenant_id || appUser?.tenant_id

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="p-8 max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-indigo-600" />
                Analytics & Business Intelligence
              </h1>
              <p className="text-gray-600 mt-1">Enterprise-grade insights to drive growth and profitability</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <a href="/analytics/metrics">
                  📖 Metrics Dictionary
                </a>
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export All Reports
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-5xl grid-cols-7 h-12">
              <TabsTrigger value="executive" className="text-sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Executive
              </TabsTrigger>
              <TabsTrigger value="crm" className="text-sm">
                <Target className="h-4 w-4 mr-2" />
                CRM Analytics
              </TabsTrigger>
              <TabsTrigger value="conversion" className="text-sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Conversion Intelligence
              </TabsTrigger>
              <TabsTrigger value="competitive" className="text-sm">
                <Globe className="h-4 w-4 mr-2" />
                Competitive
              </TabsTrigger>
              <TabsTrigger value="marketing" className="text-sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Marketing
              </TabsTrigger>
              <TabsTrigger value="cohort" className="text-sm">
                <UsersIcon className="h-4 w-4 mr-2" />
                Cohort
              </TabsTrigger>
              <TabsTrigger value="predictive" className="text-sm">
                <Brain className="h-4 w-4 mr-2" />
                Predictive
              </TabsTrigger>
            </TabsList>

            {/* Executive Dashboard */}
            <TabsContent value="executive" className="space-y-6">
              <ExecutiveDashboardV2 tenantId={tenantId} />
            </TabsContent>

            {/* CRM Analytics */}
            <TabsContent value="crm" className="space-y-6">
              <CRMAnalyticsV2 tenantId={tenantId} />
            </TabsContent>

            {/* Conversion Intelligence */}
            <TabsContent value="conversion" className="space-y-6">
              <ConversionIntelligenceDashboard tenantId={tenantId} />
            </TabsContent>

            {/* Competitive Insights */}
            <TabsContent value="competitive" className="space-y-6">
              <CompetitiveInsightsDashboard tenantId={tenantId} />
            </TabsContent>

            {/* Marketing Analytics */}
            <TabsContent value="marketing" className="space-y-6">
              <MarketingAnalyticsV2 tenantId={tenantId} />
            </TabsContent>

            {/* Cohort Analysis */}
            <TabsContent value="cohort" className="space-y-6">
              <CohortAnalysis tenantId={tenantId} />
            </TabsContent>

            {/* Predictive Analytics */}
            <TabsContent value="predictive" className="space-y-6">
              <PredictiveAnalytics tenantId={tenantId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}

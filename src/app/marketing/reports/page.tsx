'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MarketingReportsDashboard } from '@/components/marketing/marketing-reports-dashboard'

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Marketing Reports & Analytics</h1>
            <p className="text-gray-600">Track campaign performance and audience engagement</p>
          </div>

          <MarketingReportsDashboard />
        </div>
      </div>
    </DashboardLayout>
  )
}


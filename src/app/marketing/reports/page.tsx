'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AnalyticsDashboard } from '@/components/marketing/analytics-dashboard'
import { BarChart3 } from 'lucide-react'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-indigo-600" />
              Marketing Analytics
            </h1>
            <p className="text-gray-600 mt-1">Track campaign performance and audience engagement across all channels</p>
          </div>

          <AnalyticsDashboard />
        </div>
      </div>
    </DashboardLayout>
  )
}


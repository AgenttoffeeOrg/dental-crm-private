'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { CalendarAnalyticsDashboard } from '@/components/calendar/calendar-analytics-dashboard'
import { Button } from '@/components/ui/button'
import { Calendar, Download } from 'lucide-react'

export default function CalendarAnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-8 w-8 text-blue-600" />
                Calendar Analytics
              </h1>
              <p className="text-gray-600 mt-2">
                Performance metrics, utilization, and insights
              </p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          <CalendarAnalyticsDashboard tenantId="550e8400-e29b-41d4-a716-446655440000" />
        </div>
      </div>
    </DashboardLayout>
  )
}


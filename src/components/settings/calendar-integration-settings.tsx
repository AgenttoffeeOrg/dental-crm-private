'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Link2, Globe } from 'lucide-react'
import { SchedulingAppsIntegration } from '@/components/calendar/scheduling-apps-integration'
import { CalendarIntegrationTab } from '@/components/settings/calendar-integration-tab'

interface CalendarIntegrationSettingsProps {
  tenantId: string
}

export function CalendarIntegrationSettings({ tenantId }: CalendarIntegrationSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Calendar Integrations</h2>
        <p className="text-gray-600">
          Connect external calendars and scheduling tools
        </p>
      </div>

      <Tabs defaultValue="scheduling" className="w-full">
        <TabsList>
          <TabsTrigger value="scheduling">
            <Calendar className="h-4 w-4 mr-2" />
            Scheduling Apps
          </TabsTrigger>
          <TabsTrigger value="sync">
            <Globe className="h-4 w-4 mr-2" />
            Calendar Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduling" className="mt-6">
          <SchedulingAppsIntegration tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="sync" className="mt-6">
          <CalendarIntegrationTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}


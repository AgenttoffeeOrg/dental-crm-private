'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Users, MapPin, Clock, Bell, Settings } from 'lucide-react'
import { ProvidersManager } from '@/components/calendar/settings/providers-manager'
import { OperatoriesManager } from '@/components/calendar/settings/operatories-manager'
import { AppointmentTypesManager } from '@/components/calendar/settings/appointment-types-manager'
import { CalendarSettingsGeneral } from '@/components/calendar/settings/calendar-settings-general'
import { CalendarIntegrations } from '@/components/calendar/settings/calendar-integrations'
import { ReminderSettings} from '@/components/calendar/settings/reminder-settings'

export default function CalendarSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              Calendar Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Manage providers, rooms, appointment types, and scheduling preferences
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="general">
                <Settings className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="providers">
                <Users className="h-4 w-4 mr-2" />
                Providers
              </TabsTrigger>
              <TabsTrigger value="operatories">
                <MapPin className="h-4 w-4 mr-2" />
                Operatories
              </TabsTrigger>
              <TabsTrigger value="types">
                <Clock className="h-4 w-4 mr-2" />
                Appointment Types
              </TabsTrigger>
              <TabsTrigger value="reminders">
                <Bell className="h-4 w-4 mr-2" />
                Reminders
              </TabsTrigger>
              <TabsTrigger value="integrations">
                <Calendar className="h-4 w-4 mr-2" />
                Integrations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <CalendarSettingsGeneral tenantId="550e8400-e29b-41d4-a716-446655440000" />
            </TabsContent>

            <TabsContent value="providers">
              <ProvidersManager tenantId="550e8400-e29b-41d4-a716-446655440000" />
            </TabsContent>

            <TabsContent value="operatories">
              <OperatoriesManager tenantId="550e8400-e29b-41d4-a716-446655440000" />
            </TabsContent>

            <TabsContent value="types">
              <AppointmentTypesManager tenantId="550e8400-e29b-41d4-a716-446655440000" />
            </TabsContent>

            <TabsContent value="reminders">
              <ReminderSettings tenantId="550e8400-e29b-41d4-a716-446655440000" />
            </TabsContent>

            <TabsContent value="integrations">
              <CalendarIntegrations tenantId="550e8400-e29b-41d4-a716-446655440000" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}


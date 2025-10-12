'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your practice configuration</p>
          </div>
          <SettingsTabs />
        </div>
      </div>
    </DashboardLayout>
  )
}

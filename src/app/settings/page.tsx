'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="h-full">
          <SettingsTabs />
        </div>
      </div>
    </DashboardLayout>
  )
}

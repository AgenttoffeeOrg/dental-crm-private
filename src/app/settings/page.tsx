'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Breadcrumbs items={[{ label: 'Settings' }]} />
          <PageHeader
            title="Settings"
            description="Manage your practice configuration"
            icon={Settings}
          />
          <SettingsTabs />
        </div>
      </div>
    </DashboardLayout>
  )
}

'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MarketingSettingsTabs } from '@/components/marketing/settings/marketing-settings-tabs'
import { Settings } from 'lucide-react'

export default function MarketingSettingsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
        <div className="p-6 sm:p-8 lg:p-10 max-w-[1400px] mx-auto pb-24">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="h-8 w-8 text-blue-600" />
              Marketing Settings
            </h1>
            <p className="text-gray-600 mt-1">Configure campaigns, features, integrations, and compliance</p>
          </div>
          <MarketingSettingsTabs />
        </div>
      </div>
    </DashboardLayout>
  )
}


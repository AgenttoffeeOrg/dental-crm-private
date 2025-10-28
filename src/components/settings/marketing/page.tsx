'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MarketingSettingsTabs } from '@/components/marketing/settings/marketing-settings-tabs'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { Settings } from 'lucide-react'

export default function MarketingSettingsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
        <div className="p-6 sm:p-8 lg:p-10 max-w-[1400px] mx-auto pb-24">
          <Breadcrumbs 
            items={[
              { label: 'Settings', href: '/settings' }, 
              { label: 'Marketing' }
            ]} 
          />
          <PageHeader
            title="Marketing Settings"
            description="Configure campaigns, features, integrations, and compliance"
            icon={Settings}
          />
          <MarketingSettingsTabs />
        </div>
      </div>
    </DashboardLayout>
  )
}


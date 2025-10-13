'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IntegrationsHub } from '@/components/integrations/integrations-hub'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { Zap } from 'lucide-react'

export default function IntegrationsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <Breadcrumbs items={[{ label: "Integrations" }]} />
          <PageHeader
            title="Integrations"
            description="Connect your favorite tools and services"
            icon={Zap}
          />
          <IntegrationsHub />
        </div>
      </div>
    </DashboardLayout>
  )
}

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IntegrationsHub } from '@/components/integrations/integrations-hub'

export default function IntegrationsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <IntegrationsHub />
      </div>
    </DashboardLayout>
  )
}

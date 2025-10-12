import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IntegrationsHub } from '@/components/integrations/integrations-hub'

export default function IntegrationsPage() {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <IntegrationsHub />
        </div>
      </div>
    </DashboardLayout>
  )
}

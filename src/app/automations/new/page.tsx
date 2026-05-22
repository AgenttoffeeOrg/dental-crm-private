import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { WorkflowWizard } from '@/components/automations/workflow-wizard'

export const dynamic = 'force-dynamic'

export default function NewAutomationPage() {
  return (
    <DashboardLayout>
      <WorkflowWizard />
    </DashboardLayout>
  )
}

'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { ReceptionWorkspace } from '@/components/reception/reception-workspace'

export default function ReceptionPage() {
  return (
    <DashboardLayout>
      <ReceptionWorkspace />
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}







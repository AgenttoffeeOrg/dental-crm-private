'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export const dynamic = 'force-dynamic'

export default function PipelinePage() {
  return (
    <DashboardLayout>
      <div className="h-full p-6">
        <Breadcrumbs items={[{ label: 'Pipeline' }]} />
        <PipelineBoard />
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}

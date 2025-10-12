'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'

export default function PipelinePage() {
  return (
    <DashboardLayout>
      <div className="h-full">
        <PipelineBoard />
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}

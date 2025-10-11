'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'

export default function PipelinePage() {
  return (
    <DashboardLayout>
      <div className="h-full">
        <PipelineBoard />
      </div>
    </DashboardLayout>
  )
}

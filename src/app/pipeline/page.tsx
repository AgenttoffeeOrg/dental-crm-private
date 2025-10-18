'use client'

import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

// Dynamic import to prevent SSR hydration issues
const PipelineBoard = dynamic(
  () => import('@/components/pipeline/pipeline-board').then(mod => ({ default: mod.PipelineBoard })),
  { ssr: false }
)

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

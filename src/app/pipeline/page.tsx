'use client'

import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

// Dynamic import to prevent SSR hydration issues
const PipelineBoard = dynamic(
  () => import('@/components/pipeline/pipeline-board').then(mod => ({ default: mod.PipelineBoard })),
  { ssr: false }
)

export default function PipelinePage() {
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)

  // Show empty state if user has no tenant
  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Pipeline" />
        <GlobalAIAssistant />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full">
        <PipelineBoard />
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}

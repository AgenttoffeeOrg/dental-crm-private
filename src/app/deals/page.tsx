'use client'

import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

// Dynamic import of EnterpriseDealsTable (unified component)
const EnterpriseDealsTable = dynamic(
  () => import('@/components/deals/enterprise-deals-table').then(mod => ({ default: mod.EnterpriseDealsTable })),
  { ssr: false }
)

export default function DealsPage() {
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)

  // Show empty state if user has no tenant
  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Deals" />
        <GlobalAIAssistant />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <EnterpriseDealsTable 
          mode="universal"
          showViewToggle={false}
          showSavedViews={true}
        />
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}


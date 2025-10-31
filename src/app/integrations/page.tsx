'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IntegrationsHub } from '@/components/integrations/integrations-hub'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

export default function IntegrationsPage() {
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)

  // Show empty state if user has no tenant
  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Integrations" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full">
        <IntegrationsHub />
      </div>
    </DashboardLayout>
  )
}

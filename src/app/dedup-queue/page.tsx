'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DedupQueueList } from '@/components/dedup-queue/dedup-queue-list'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

/**
 * Phase 2a.2b — Dedup queue page.
 *
 * Wraps the list component in `DashboardLayout` and applies the same tenant
 * gating as `/contacts`. Permission gating is enforced server-side and the
 * list component renders an empty-state for 403 responses (per the prompt's
 * decision: don't redirect users who lack the permission, surface the page
 * so they know to ask their owner/admin for access).
 */
export default function DedupQueuePage() {
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(
    (appUser as { active_tenant_id?: string | null; tenant_id?: string | null } | null)
      ?.active_tenant_id ||
      (appUser as { active_tenant_id?: string | null; tenant_id?: string | null } | null)
        ?.tenant_id
  )

  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Dedup Queue" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="px-6 py-6">
        <DedupQueueList />
      </div>
    </DashboardLayout>
  )
}

'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ContactsListEnterprise as ContactsList } from '@/components/contacts/contacts-list-enterprise'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

export default function ContactsPage() {
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)

  // Show empty state if user has no tenant
  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Contacts" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full">
        <ContactsList />
      </div>
    </DashboardLayout>
  )
}

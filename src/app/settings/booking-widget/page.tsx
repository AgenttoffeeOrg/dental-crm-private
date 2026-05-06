'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { WidgetSettingsForm } from '@/components/booking-widget-settings/widget-settings-form'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

/**
 * Phase 2a.3 — Booking-widget settings page.
 *
 * Tenant-scoped, gated by `contacts.widget_manage` server-side. The form
 * shows a "no access" empty-state when the API returns 403 so users without
 * the permission see a clear next step instead of getting redirected.
 */
type AuthAppUser = { active_tenant_id?: string | null; tenant_id?: string | null } | null

function hasActiveTenant(user: AuthAppUser): boolean {
  if (!user) return false
  return Boolean(user.active_tenant_id || user.tenant_id)
}

export default function BookingWidgetSettingsPage() {
  const { appUser, loading: authLoading } = useAuth()
  const showNoOrg = !authLoading && !hasActiveTenant(appUser as AuthAppUser)

  return (
    <DashboardLayout>
      {showNoOrg ? <NoOrgEmptyState title="Booking widget" /> : <WidgetSettingsForm />}
    </DashboardLayout>
  )
}

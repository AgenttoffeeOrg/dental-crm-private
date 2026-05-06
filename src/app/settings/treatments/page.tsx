'use client'

/**
 * Phase 2a.8 \u2014 Treatment Offerings settings page (deep-link route).
 *
 * The same TreatmentOfferingsTab component is also rendered inside the Workflow
 * section of the main /settings page (see settings-tabs.tsx). This standalone
 * route exists so that practices can deep-link to /settings/treatments from
 * onboarding emails, help articles, and the booking-widget settings page.
 */

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TreatmentOfferingsTab } from '@/components/settings/treatment-offerings-tab'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

type AuthAppUser = { active_tenant_id?: string | null; tenant_id?: string | null } | null

function hasActiveTenant(user: AuthAppUser): boolean {
  if (!user) return false
  return Boolean(user.active_tenant_id || user.tenant_id)
}

export default function TreatmentOfferingsSettingsPage() {
  const { appUser, loading: authLoading } = useAuth()
  const showNoOrg = !authLoading && !hasActiveTenant(appUser as AuthAppUser)

  return (
    <DashboardLayout>
      {showNoOrg ? (
        <NoOrgEmptyState title="Treatment offerings" />
      ) : (
        <TreatmentOfferingsTab />
      )}
    </DashboardLayout>
  )
}

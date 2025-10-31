'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { useAuth } from '@/lib/auth'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)

  // Check if user has org, and if not, ensure they're on profile tab
  useEffect(() => {
    if (!authLoading && !hasTenant) {
      const section = searchParams.get('section')
      const tab = searchParams.get('tab')
      
      // Only allow account > profile without org
      if (section !== 'account' || tab !== 'profile') {
        router.replace('/settings?section=account&tab=profile')
      }
    }
  }, [hasTenant, authLoading, searchParams, router])

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="h-full">
          <SettingsTabs />
        </div>
      </div>
    </DashboardLayout>
  )
}

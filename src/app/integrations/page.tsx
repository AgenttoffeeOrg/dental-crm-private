'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Loader2 } from 'lucide-react'

/**
 * Redirects to unified integrations hub in Settings
 * All integrations are now managed in Settings → Integrations
 */
export default function IntegrationsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings?section=integrations&tab=integrations')
  }, [router])

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Redirecting to unified integrations hub...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

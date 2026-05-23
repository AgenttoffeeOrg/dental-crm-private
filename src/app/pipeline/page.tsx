'use client'

/**
 * Phase 2b.34.9 — /pipeline is now a thin redirect to /deals.
 *
 * The two pages were doing the same job with different surfaces:
 *   /deals    → list view of every deal
 *   /pipeline → kanban view of stages
 *
 * Per the 2026-05-23 product discussion the user wants a SINGLE
 * deals page with a List ↔ Kanban toggle (HubSpot/Salesforce-style),
 * not two top-level concepts. The sidebar "Pipeline" entry is
 * removed. Any bookmark / link to /pipeline lands on /deals which
 * carries the toggle — see `src/app/deals/page.tsx`.
 *
 * Keeping this redirect (rather than deleting the route) preserves
 * any saved bookmarks. Trivial to remove in a future cleanup phase.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Loader2 } from 'lucide-react'

export default function PipelinePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/deals')
  }, [router])

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Redirecting to Deals…</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

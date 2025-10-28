'use client'

/**
 * Deal Detail Page
 * Comprehensive deal view with all related information
 */

import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DealDetailView } from '@/components/deals/deal-detail-view'

export default function DealDetailPage() {
  const params = useParams()
  const dealId = params.id as string

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-hidden">
        <DealDetailView dealId={dealId} />
      </div>
    </DashboardLayout>
  )
}

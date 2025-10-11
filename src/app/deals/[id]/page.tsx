'use client'

import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DealDetailView } from '@/components/deals/deal-detail-view'

export default function DealDetailPage() {
  const params = useParams()
  const dealId = params.id as string

  return (
    <DashboardLayout>
      <DealDetailView dealId={dealId} />
    </DashboardLayout>
  )
}

'use client'

/**
 * Deal Detail Page
 * Comprehensive deal view with all related information
 */

import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DealDetailView } from '@/components/deals/deal-detail-view'
import { useAuth } from '@/lib/auth'

export default function DealDetailPage() {
  const params = useParams()
  const { appUser } = useAuth()
  const dealId = params.id as string

  return (
    <DashboardLayout>
      <div className="h-full overflow-hidden">
        <DealDetailView 
          dealId={dealId} 
          tenantId={appUser?.tenant_id}
        />
      </div>
    </DashboardLayout>
  )
}

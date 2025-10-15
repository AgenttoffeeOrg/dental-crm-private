'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DealsTable } from '@/components/deals/deals-table'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export const dynamic = 'force-dynamic'

export default function DealsPage() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <div className="px-6 pt-6 pb-4">
          <Breadcrumbs items={[{ label: 'Deals' }]} />
        </div>
        <div className="flex-1 overflow-hidden">
          <DealsTable />
        </div>
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}


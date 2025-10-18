'use client'

import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

// Dynamic import to prevent SSR hydration issues
const DealsTable = dynamic(
  () => import('@/components/deals/deals-table').then(mod => ({ default: mod.DealsTable })),
  { ssr: false }
)

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


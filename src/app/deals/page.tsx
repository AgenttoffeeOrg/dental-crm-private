'use client'

import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'

// Dynamic import of EnterpriseDealsTable (unified component)
const EnterpriseDealsTable = dynamic(
  () => import('@/components/deals/enterprise-deals-table').then(mod => ({ default: mod.EnterpriseDealsTable })),
  { ssr: false }
)

export default function DealsPage() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <EnterpriseDealsTable 
          mode="universal"
          showViewToggle={false}
          showSavedViews={true}
        />
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}


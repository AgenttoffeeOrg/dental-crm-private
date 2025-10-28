'use client'

import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'

// Dynamic import to prevent SSR hydration issues
const DealsTable = dynamic(
  () => import('@/components/deals/deals-table').then(mod => ({ default: mod.DealsTable })),
  { ssr: false }
)

export default function DealsPage() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        <DealsTable />
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}


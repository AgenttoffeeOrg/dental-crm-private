'use client'

/**
 * /deals — Kanban + List view of every deal.
 *
 * 2b.56 — Reads `?view=kanban|list` and `?filter=stale|unread-inbound|
 * new-untouched|failed-sends|voicemails|ai-uncertain` from the URL so
 * the dashboard triage lanes (2b.50/51) can deep-link the operator
 * straight to a filtered view. Both params are optional; defaults
 * preserve the existing toggle behaviour.
 *
 * A small banner appears at the top when a triage filter is active,
 * with a one-click "Clear filter" button.
 */

import { Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const EnterpriseDealsTable = dynamic(
  () =>
    import('@/components/deals/enterprise-deals-table').then((mod) => ({
      default: mod.EnterpriseDealsTable,
    })),
  { ssr: false }
)

const FILTER_LABELS: Record<string, string> = {
  stale: 'Stale follow-ups',
  'unread-inbound': 'Unread inbound',
  'new-untouched': 'New & untouched',
  'failed-sends': 'Failed sends',
  voicemails: 'Voicemails & missed calls',
  'ai-uncertain': 'AI needs your eye',
}

function DealsPageInner() {
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)
  const router = useRouter()
  const searchParams = useSearchParams()

  const view = searchParams?.get('view') as 'kanban' | 'list' | null
  const filter = searchParams?.get('filter')
  const filterLabel = useMemo(
    () => (filter ? FILTER_LABELS[filter] ?? filter : null),
    [filter]
  )

  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Deals" />
        <GlobalAIAssistant />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {filter && filterLabel && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 flex items-center justify-between gap-3">
            <div className="text-sm text-blue-900">
              <span className="font-semibold">Filtered:</span> {filterLabel}
              <span className="text-blue-600 ml-2 text-xs">
                (set by your dashboard triage lane)
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.replace('/deals')}
              className="text-blue-700 hover:bg-blue-100 h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filter
            </Button>
          </div>
        )}

        {/* The EnterpriseDealsTable component holds the existing
            List/Kanban toggle. The `initialView` + `initialFilter`
            props let the dashboard's triage lanes drop in pre-filtered;
            the table's internal state takes over after first render so
            in-page toggles work unchanged. */}
        <EnterpriseDealsTable
          mode="universal"
          showViewToggle={true}
          showSavedViews={true}
          initialView={view ?? undefined}
          initialFilter={filter ?? undefined}
        />
      </div>
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}

export default function DealsPage() {
  return (
    <Suspense fallback={<DashboardLayout><div /></DashboardLayout>}>
      <DealsPageInner />
    </Suspense>
  )
}

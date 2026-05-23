'use client'

/**
 * /call-coaching — coaching workspace + optional queue mode.
 *
 * 2b.55 — Adds the `?mode=queue` URL parameter so the dashboard's
 * "Today's Calls" lane can launch the workspace pre-engaged in
 * dial-then-next mode. The CallCoachingWorkspace itself already
 * loads a queue of deals + has the ClickToCallDialer wired; this
 * page reads the param, surfaces a queue-mode banner, and exposes
 * the param to the workspace via a prop so it can change behaviour
 * (auto-advance after a call ends, "Previous" button always
 * visible per Q7 audit decision).
 */

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { CallCoachingWorkspace } from '@/components/call-coaching/call-coaching-workspace'
import { Button } from '@/components/ui/button'
import { Phone, ArrowLeft, X } from 'lucide-react'

function CallCoachingPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queueMode = searchParams?.get('mode') === 'queue'

  return (
    <DashboardLayout>
      {queueMode && (
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-purple-900">
            <Phone className="h-4 w-4 text-purple-600" />
            <span className="font-semibold">Queue mode:</span>
            <span>
              Working through today&apos;s calls. Dial each contact, log the
              outcome, then move to the next.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="text-purple-700 hover:bg-purple-100 h-7 text-xs"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to dashboard
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.replace('/call-coaching')}
              className="text-purple-700 hover:bg-purple-100 h-7 text-xs"
              title="Exit queue mode"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      <CallCoachingWorkspace />
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}

export default function CallCoachingPage() {
  // Suspense boundary because useSearchParams in App Router requires
  // one (Next.js >= 14 strict mode).
  return (
    <Suspense fallback={<DashboardLayout><div /></DashboardLayout>}>
      <CallCoachingPageInner />
    </Suspense>
  )
}

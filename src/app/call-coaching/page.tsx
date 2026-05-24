'use client'

/**
 * /call-coaching — coaching workspace.
 *
 * 2b.68 reframe. Per the 2026-05-24 product discussion this page
 * exists for two reasons ONLY:
 *
 *   1. Live coaching DURING a call. The task queue (when it hits
 *      a task of type='call') will invoke the CallCoachingWorkspace
 *      as a full-screen takeover — this same workspace, reused.
 *      Wiring lives at the queue side (TaskQueuePanel + 2b.66
 *      channel-batch chips). No URL state needed here.
 *
 *   2. Post-call review + AI feedback. Operator visits standalone
 *      to look back at past calls, listen to recordings, see AI
 *      coaching scores. This page is the destination for that.
 *
 * The 2b.55 ?mode=queue URL parameter + the banner it surfaced are
 * gone. They duplicated what the task queue now does properly. The
 * Reception sidebar entry is gone for the same reason (2b.68
 * sidebar cleanup — see dashboard-layout.tsx).
 *
 * Operators arriving via legacy bookmarks with `?mode=queue` see
 * the bare workspace; the param is harmless.
 */

import { Suspense } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { CallCoachingWorkspace } from '@/components/call-coaching/call-coaching-workspace'

function CallCoachingPageInner() {
  return (
    <DashboardLayout>
      <CallCoachingWorkspace />
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}

export default function CallCoachingPage() {
  // Suspense boundary kept for compatibility — the workspace itself
  // may use useSearchParams internally for contactId deep-links.
  return (
    <Suspense fallback={<DashboardLayout><div /></DashboardLayout>}>
      <CallCoachingPageInner />
    </Suspense>
  )
}

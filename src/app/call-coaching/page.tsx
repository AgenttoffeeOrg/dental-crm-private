'use client'

/**
 * /call-coaching — post-call review.
 *
 * 2b.89 actually-cleanup. The 2b.68 work renamed/commented things but
 * didn't strip the Live Queue UI from the workspace. Now properly
 * split:
 *
 *   - This standalone page = pure post-call review. Recent calls
 *     list, AI coaching scores, recording playback. No "Start Call"
 *     buttons. No live queue.
 *
 *   - The full coaching workspace (with persona insights, scripts,
 *     dialer) only renders as a full-screen takeover from the Task
 *     Queue when an operator advances to a call task. After the
 *     outcome is logged, the queue resumes.
 *
 * Operators arriving via legacy ?mode=queue see the review page;
 * the param is harmless.
 */

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant'
import { CallCoachingReview } from '@/components/call-coaching/call-coaching-review'

export default function CallCoachingPage() {
  return (
    <DashboardLayout>
      <CallCoachingReview />
      <GlobalAIAssistant />
    </DashboardLayout>
  )
}

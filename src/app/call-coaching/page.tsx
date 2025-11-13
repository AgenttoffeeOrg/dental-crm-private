'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { GlobalAIAssistant } from '@/components/ai/global-ai-assistant';
import { CallCoachingWorkspace } from '@/components/call-coaching/call-coaching-workspace';

export default function CallCoachingPage() {
  return (
    <DashboardLayout>
      <CallCoachingWorkspace />
      <GlobalAIAssistant />
    </DashboardLayout>
  );
}

/**
 * Marketing Audit & Benchmarking - Main Page
 * 
 * This is the entry point for the Marketing Audit module.
 * Feature-flagged to ensure it doesn't break existing functionality.
 */

'use client';

import { useFeatureFlags } from '@/lib/hooks/use-feature-flags';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { AuditDashboard } from '@/components/marketing-audit/dashboard/audit-dashboard';

export default function MarketingAuditPage() {
  const { marketingAudit } = useFeatureFlags();
  
  useEffect(() => {
    if (!marketingAudit.enabled) {
      redirect('/dashboard');
    }
  }, [marketingAudit.enabled]);
  
  if (!marketingAudit.enabled) {
    return null;
  }
  
  return <AuditDashboard />;
}


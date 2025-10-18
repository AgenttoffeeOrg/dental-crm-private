/**
 * Marketing Audit & Benchmarking - Main Page
 * 
 * This is the entry point for the Marketing Audit module.
 * Feature-flagged to ensure it doesn't break existing functionality.
 */

'use client';

import { AuditDashboard } from '@/components/marketing-audit/dashboard/audit-dashboard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import { LineChart } from 'lucide-react';

export default function MarketingAuditPage() {
  // Feature is always available - removed feature flag check for production
  
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <Breadcrumbs items={[{ label: 'Marketing Audit' }]} />
          <PageHeader
            title="Marketing Audit & Benchmarking"
            description="Analyze your practice's marketing performance and benchmark against competitors"
            icon={LineChart}
          />
          <AuditDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
}


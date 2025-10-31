/**
 * Marketing Audit & Benchmarking - Main Page
 * 
 * This is the entry point for the Marketing Audit module.
 * Feature-flagged to ensure it doesn't break existing functionality.
 */

'use client';

import { AuditDashboard } from '@/components/marketing-audit/dashboard/audit-dashboard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { LineChart } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NoOrgEmptyState } from '@/components/guards';

export default function MarketingAuditPage() {
  const { appUser, loading: authLoading } = useAuth();
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id);
  
  // Show empty state if user has no tenant
  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Marketing Audit" />
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <LineChart className="h-8 w-8 text-indigo-600" />
              Marketing Audit & Benchmarking
            </h1>
            <p className="text-gray-600 mt-1">Analyze your practice's marketing performance and benchmark against competitors</p>
          </div>
          <AuditDashboard />
        </div>
      </div>
    </DashboardLayout>
  );
}


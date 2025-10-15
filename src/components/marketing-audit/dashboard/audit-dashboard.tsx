/**
 * Audit Dashboard Component
 * 
 * Main dashboard that orchestrates all audit UI components.
 * Fetches latest audit and displays:
 * - Quick Actions Bar
 * - Composite Score Card
 * - Sub-Scores Grid
 * - Recommendations Panel
 * - Alerts (if any)
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { CompositeScoreCard } from './composite-score-card';
import { SubScoresGrid } from './sub-scores-grid';
import { RecommendationsPanel } from './recommendations-panel';
import { QuickActionsBar } from './quick-actions-bar';
import { LoadingState } from './loading-state';
import { EmptyState } from './empty-state';
import { toast } from 'sonner';
import type { AuditRun } from '@/lib/marketing-audit/types';

export function AuditDashboard() {
  const supabase = createClient();
  const [latestAudit, setLatestAudit] = useState<AuditRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);
  
  useEffect(() => {
    fetchLatestAudit();
    
    // Set up real-time subscription for audit completion
    const channel = supabase
      .channel('audit-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'marketing_audit_runs',
          filter: `status=eq.completed`,
        },
        (payload) => {
          console.log('[AuditDashboard] Audit completed:', payload.new);
          setLatestAudit(payload.new as AuditRun);
          setRunningAudit(false);
          toast.success('Marketing audit completed!');
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  async function fetchLatestAudit() {
    setLoading(true);
    try {
      const response = await fetch('/api/marketing-audit/latest');
      
      // Handle non-200 responses
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuditDashboard] API error:', errorData);
        
        // If it's just "no data", don't show error toast
        if (response.status === 404 || errorData.message?.includes('No completed audits')) {
          setLatestAudit(null);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to fetch audit');
      }
      
      const data = await response.json();
      
      if (data.audit) {
        setLatestAudit(data.audit);
      } else {
        setLatestAudit(null);
      }
    } catch (error) {
      console.error('[AuditDashboard] Failed to fetch audit:', error);
      // Only show error toast for actual errors, not "no data"
      if (error instanceof Error && !error.message.includes('No completed audits')) {
        toast.error('Failed to load audit data');
      }
    } finally {
      setLoading(false);
    }
  }
  
  async function handleRunAudit() {
    setRunningAudit(true);
    toast.info('Starting marketing audit...');
    
    try {
      const response = await fetch('/api/marketing-audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Audit failed');
      }
      
      const result = await response.json();
      
      toast.success('Audit started! Results will appear in 2-3 minutes.');
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        const pollResponse = await fetch('/api/marketing-audit/latest');
        if (pollResponse.ok) {
          const pollData = await pollResponse.json();
          if (pollData.audit && pollData.audit.id === result.audit_id && pollData.audit.status === 'completed') {
            clearInterval(pollInterval);
            setLatestAudit(pollData.audit);
            setRunningAudit(false);
            toast.success('Marketing audit completed!');
          }
        }
      }, 5000); // Poll every 5 seconds
      
      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (runningAudit) {
          setRunningAudit(false);
          toast.error('Audit took longer than expected. Please refresh the page.');
        }
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('[AuditDashboard] Audit failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start audit');
      setRunningAudit(false);
    }
  }
  
  function handleCreateTask(rec: any) {
    // TODO: Open task creation slide-over with pre-filled data
    toast.info('Task creation feature coming soon!');
  }
  
  function handleDismissRecommendation(recId: string) {
    // TODO: Call API to dismiss recommendation
    toast.info('Dismiss feature coming soon!');
  }
  
  function handleViewDetails(category: string) {
    // TODO: Navigate to deep-dive tab
    toast.info(`View ${category} details feature coming soon!`);
  }
  
  if (loading) {
    return <LoadingState />;
  }
  
  // Always show the dashboard, even if no audit exists yet
  // This gives users a preview of what will be tracked
  return (
    <div className="space-y-6">
      {/* Quick Actions - Always show Run Audit button */}
      <QuickActionsBar
        onRunAudit={handleRunAudit}
        lastRunAt={latestAudit?.completed_at || latestAudit?.created_at}
        loading={runningAudit}
      />
      
      {/* Composite Score - Show N/A if no audit */}
      <CompositeScoreCard
        audit={latestAudit}
      />
      
      {/* Sub-Scores Grid - Show all categories with N/A if no audit */}
      <SubScoresGrid
        audit={latestAudit}
        onViewDetails={handleViewDetails}
      />
      
      {/* Recommendations - Only show if we have data */}
      {latestAudit && latestAudit.recommendations && latestAudit.recommendations.length > 0 && (
        <RecommendationsPanel
          recommendations={latestAudit.recommendations}
          onCreateTask={handleCreateTask}
          onDismiss={handleDismissRecommendation}
        />
      )}
      
      {/* Show helpful message if no audit exists yet */}
      {!latestAudit && !runningAudit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Ready to Analyze Your Marketing Performance?
          </h3>
          <p className="text-blue-700 mb-4">
            Click "Run Marketing Audit" above to get your first comprehensive marketing health report.
            <br />
            We'll analyze SEO, local presence, content quality, analytics setup, and conversion optimization.
          </p>
          <p className="text-sm text-blue-600">
            ⏱️ First audit typically takes 2-3 minutes
          </p>
        </div>
      )}
      
      {/* Show progress message if audit is running */}
      {runningAudit && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <h3 className="text-lg font-semibold text-purple-900">
              Audit in Progress...
            </h3>
          </div>
          <p className="text-purple-700">
            We're analyzing your website, local presence, and marketing performance.
            <br />
            This usually takes 2-3 minutes. You can leave this page and come back.
          </p>
        </div>
      )}
    </div>
  );
}


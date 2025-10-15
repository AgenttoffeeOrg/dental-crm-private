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
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit');
      }
      
      const data = await response.json();
      
      if (data.audit) {
        setLatestAudit(data.audit);
      }
    } catch (error) {
      console.error('[AuditDashboard] Failed to fetch audit:', error);
      toast.error('Failed to load audit data');
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
  
  if (!latestAudit) {
    return (
      <EmptyState
        onRunAudit={handleRunAudit}
        loading={runningAudit}
      />
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      <QuickActionsBar
        onRunAudit={handleRunAudit}
        lastRunAt={latestAudit.completed_at || latestAudit.created_at}
        loading={runningAudit}
      />
      
      <CompositeScoreCard
        audit={latestAudit}
      />
      
      <SubScoresGrid
        audit={latestAudit}
        onViewDetails={handleViewDetails}
      />
      
      <RecommendationsPanel
        recommendations={latestAudit.recommendations || []}
        onCreateTask={handleCreateTask}
        onDismiss={handleDismissRecommendation}
      />
    </div>
  );
}


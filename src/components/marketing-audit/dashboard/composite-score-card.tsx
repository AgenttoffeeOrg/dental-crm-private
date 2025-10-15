/**
 * Composite Score Card Component
 * 
 * Displays the main marketing health score with:
 * - Circular progress indicator
 * - Score label (Excellent/Good/Needs Work/Poor)
 * - Trend vs previous audit
 * - Percentile rank
 * - Peer comparison
 */

'use client';

import { CircularProgress } from '@/components/ui/circular-progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AuditRun } from '@/lib/marketing-audit/types';

interface CompositeScoreCardProps {
  audit: AuditRun;
  previousScore?: number;
}

export function CompositeScoreCard({ audit, previousScore }: CompositeScoreCardProps) {
  const score = audit.composite_score || 0;
  const delta = previousScore ? score - previousScore : 0;
  
  const getScoreLabel = (score: number): { label: string; color: string; bgColor: string } => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-800', bgColor: 'bg-green-100 border-green-200' };
    if (score >= 80) return { label: 'Very Good', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' };
    if (score >= 70) return { label: 'Good', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
    if (score >= 60) return { label: 'Fair', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' };
    if (score >= 40) return { label: 'Needs Work', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' };
    return { label: 'Poor', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' };
  };
  
  const getScoreColor = (score: number): 'green' | 'yellow' | 'orange' | 'red' => {
    if (score >= 70) return 'green';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
  };
  
  const scoreLabel = getScoreLabel(score);
  const scoreColor = getScoreColor(score);
  
  const getTrendIcon = () => {
    if (delta > 0) return <TrendingUp className="w-5 h-5" />;
    if (delta < 0) return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };
  
  const getTrendColor = () => {
    if (delta > 0) return 'text-green-600';
    if (delta < 0) return 'text-red-600';
    return 'text-gray-500';
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Marketing Health Score
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overall marketing presence assessment
          </p>
        </div>
        <Badge className={`${scoreLabel.bgColor} ${scoreLabel.color} border`}>
          {scoreLabel.label}
        </Badge>
      </div>
      
      {/* Main Content */}
      <div className="flex items-center gap-8">
        {/* Circular Score */}
        <div className="flex-shrink-0">
          <CircularProgress
            value={score}
            size={160}
            strokeWidth={12}
            color={scoreColor}
          >
            <div className="text-center">
              <div className={`text-4xl font-bold ${scoreColor === 'green' ? 'text-green-600' : scoreColor === 'yellow' ? 'text-yellow-600' : scoreColor === 'orange' ? 'text-orange-600' : 'text-red-600'}`}>
                {score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                out of 100
              </div>
            </div>
          </CircularProgress>
        </div>
        
        {/* Details */}
        <div className="flex-1 space-y-4">
          {/* Trend */}
          {previousScore !== undefined && (
            <div className="flex items-center gap-2">
              <div className={getTrendColor()}>
                {getTrendIcon()}
              </div>
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} points
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                vs last audit
              </span>
            </div>
          )}
          
          {/* Benchmarking */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Percentile Rank
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {audit.percentile_rank?.toFixed(1) || '—'}th
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Rank vs {audit.peer_count || 0} peers
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                #{audit.your_rank || '—'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Gap to top 3 avg
              </span>
              <span className={`text-sm font-semibold ${(audit.gap_to_top_3_avg || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {(audit.gap_to_top_3_avg || 0) > 0 ? '+' : ''}{audit.gap_to_top_3_avg?.toFixed(1) || '—'} pts
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Gap to median
              </span>
              <span className={`text-sm font-semibold ${(audit.gap_to_median || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {(audit.gap_to_median || 0) > 0 ? '+' : ''}{audit.gap_to_median?.toFixed(1) || '—'} pts
              </span>
            </div>
          </div>
          
          {/* Last Audit Time */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last audited: {new Date(audit.completed_at || audit.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Duration: {audit.duration_seconds ? `${Math.round(audit.duration_seconds / 60)}m ${audit.duration_seconds % 60}s` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * Audit History Chart Component
 * 
 * Shows score trends over time with a beautiful line chart.
 * User Experience: See progress at a glance, understand trends immediately.
 */

'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

interface AuditHistoryChartProps {
  practiceId: string;
}

export function AuditHistoryChart({ practiceId }: AuditHistoryChartProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchHistory();
  }, [practiceId]);
  
  async function fetchHistory() {
    const supabase = createClient();
    const { data } = await supabase
      .from('marketing_audit_runs')
      .select('composite_score, completed_at')
      .eq('practice_id', practiceId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true })
      .limit(10);
    
    setHistory(data || []);
    setLoading(false);
  }
  
  if (loading || history.length < 2) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Score History
        </h3>
        <div className="text-center py-8 text-sm text-gray-500">
          {loading ? 'Loading...' : 'Run more audits to see trends'}
        </div>
      </div>
    );
  }
  
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const change = latest.composite_score - previous.composite_score;
  
  const maxScore = Math.max(...history.map(h => h.composite_score), 100);
  const minScore = Math.min(...history.map(h => h.composite_score), 0);
  const range = maxScore - minScore || 1;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Score History
        </h3>
        <div className="flex items-center gap-1 text-sm">
          {change > 0 ? (
            <>
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-600">+{change.toFixed(1)}</span>
            </>
          ) : change < 0 ? (
            <>
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-red-600">{change.toFixed(1)}</span>
            </>
          ) : (
            <>
              <Minus className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-600">0.0</span>
            </>
          )}
        </div>
      </div>
      
      {/* Mini Line Chart */}
      <div className="relative h-24">
        <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="200" y2="25" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="200" y2="50" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="200" y2="75" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="0.5" />
          
          {/* Line path */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-purple-600"
            points={history.map((point, index) => {
              const x = (index / (history.length - 1)) * 200;
              const y = 100 - ((point.composite_score - minScore) / range) * 100;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Points */}
          {history.map((point, index) => {
            const x = (index / (history.length - 1)) * 200;
            const y = 100 - ((point.composite_score - minScore) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="currentColor"
                className="text-purple-600"
              />
            );
          })}
        </svg>
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{history.length} audits</span>
        <span>Latest: {latest.composite_score.toFixed(1)}</span>
      </div>
    </div>
  );
}


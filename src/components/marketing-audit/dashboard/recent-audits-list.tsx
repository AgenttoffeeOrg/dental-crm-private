/**
 * Recent Audits List Component
 * 
 * Shows recent audit history in compact list format.
 * User Experience: Quick access to historical audits, see trends immediately.
 */

'use client';

import { useEffect, useState } from 'react';
import { Clock, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';
import { ScoreBadge } from '../shared/score-badge';
import { formatAuditDate } from '@/lib/marketing-audit/utils/helpers';

interface RecentAuditsListProps {
  practiceId: string;
  limit?: number;
  onSelectAudit?: (auditId: string) => void;
}

export function RecentAuditsList({ practiceId, limit = 5, onSelectAudit }: RecentAuditsListProps) {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchAudits();
  }, [practiceId]);
  
  async function fetchAudits() {
    const supabase = createClient();
    const { data } = await supabase
      .from('marketing_audit_runs')
      .select('id, composite_score, completed_at, status, duration_seconds')
      .eq('practice_id', practiceId)
      .order('completed_at', { ascending: false })
      .limit(limit);
    
    setAudits(data || []);
    setLoading(false);
  }
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  if (audits.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Recent Audits
        </h3>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {audits.map((audit, index) => {
          const previousScore = index < audits.length - 1 ? audits[index + 1].composite_score : null;
          const delta = previousScore ? audit.composite_score - previousScore : 0;
          
          return (
            <button
              key={audit.id}
              onClick={() => onSelectAudit?.(audit.id)}
              className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <ScoreBadge score={audit.composite_score} size="sm" />
                  {delta !== 0 && (
                    <div className="flex items-center gap-1">
                      {delta > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">
                            +{delta.toFixed(1)}
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3 text-red-600" />
                          <span className="text-xs font-medium text-red-600">
                            {delta.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatAuditDate(audit.completed_at || audit.created_at)}</span>
                  {audit.duration_seconds && (
                    <span>• {Math.round(audit.duration_seconds / 60)}m</span>
                  )}
                </div>
              </div>
              
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}


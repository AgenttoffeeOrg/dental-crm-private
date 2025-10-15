/**
 * Empty State Component
 * 
 * Shown when no audits have been run yet.
 * Encourages user to run their first audit.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Play, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onRunAudit?: () => void;
  loading?: boolean;
}

export function EmptyState({
  title = 'No audits yet',
  description = 'Run your first marketing audit to see your practice\'s online presence health score and get actionable recommendations.',
  onRunAudit,
  loading = false,
}: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
      <div className="max-w-md mx-auto text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30">
            <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {title}
        </h2>
        
        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {description}
        </p>
        
        {/* CTA Button */}
        {onRunAudit && (
          <Button
            size="lg"
            onClick={onRunAudit}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running First Audit...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Run Your First Audit
              </>
            )}
          </Button>
        )}
        
        {/* Info Cards */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-left">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              2-3
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              minutes to complete
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              5
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              category scores
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              20+
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              recommendations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


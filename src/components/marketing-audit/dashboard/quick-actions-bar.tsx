/**
 * Quick Actions Bar Component
 * 
 * Top bar with quick actions:
 * - Run New Audit
 * - Schedule Audit
 * - Export Report
 * - Last run timestamp
 */

'use client';

import { Button } from '@/components/ui/button';
import { Play, Calendar, Download, RefreshCw } from 'lucide-react';

interface QuickActionsBarProps {
  onRunAudit?: () => void;
  onSchedule?: () => void;
  onExport?: () => void;
  lastRunAt?: string;
  loading?: boolean;
  nextRunAt?: string;
}

export function QuickActionsBar({
  onRunAudit,
  onSchedule,
  onExport,
  lastRunAt,
  loading = false,
  nextRunAt,
}: QuickActionsBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left Side - Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onRunAudit}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Audit...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run New Audit
              </>
            )}
          </Button>
          
          {onSchedule && (
            <Button
              variant="outline"
              onClick={onSchedule}
              disabled={loading}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
          )}
          
          {onExport && lastRunAt && (
            <Button
              variant="outline"
              onClick={onExport}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
        
        {/* Right Side - Info */}
        <div className="flex items-center gap-6 text-sm">
          {lastRunAt && (
            <div className="text-gray-600 dark:text-gray-400">
              <span className="text-gray-500 dark:text-gray-500">Last audit: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(lastRunAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
          
          {nextRunAt && (
            <div className="text-gray-600 dark:text-gray-400">
              <span className="text-gray-500 dark:text-gray-500">Next scheduled: </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(nextRunAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


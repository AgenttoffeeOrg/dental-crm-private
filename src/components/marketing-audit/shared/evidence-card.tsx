/**
 * Evidence Card Component
 * 
 * Displays evidence for a metric with:
 * - Metric name and value
 * - Source (PSI, GSC, GA4, etc.)
 * - Threshold indicators
 * - Link to source
 */

'use client';

import { ExternalLink, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceCardProps {
  metric: string;
  value: number | string;
  unit?: string;
  source: string;
  sourceUrl?: string;
  threshold?: {
    good?: number;
    needsImprovement?: number;
    poor?: number;
  };
  description?: string;
}

export function EvidenceCard({
  metric,
  value,
  unit,
  source,
  sourceUrl,
  threshold,
  description,
}: EvidenceCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  
  const getStatus = () => {
    if (!threshold) return null;
    
    if (threshold.good !== undefined && numericValue <= threshold.good) {
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Good' };
    }
    if (threshold.poor !== undefined && numericValue >= threshold.poor) {
      return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Poor' };
    }
    return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Needs Improvement' };
  };
  
  const status = getStatus();
  
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      status ? `${status.bg} border-${status.color.split('-')[1]}-200` : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {metric}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Source: {source}
          </div>
        </div>
        {status && (
          <div className="flex items-center gap-1">
            <status.icon className={`w-4 h-4 ${status.color}`} />
            <span className={`text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
          </div>
        )}
      </div>
      
      {/* Value */}
      <div className={cn(
        'text-2xl font-bold mb-2',
        status ? status.color : 'text-gray-900 dark:text-white'
      )}>
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span className="text-base ml-1">{unit}</span>}
      </div>
      
      {/* Threshold Info */}
      {threshold && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          {threshold.good !== undefined && `Good: ≤${threshold.good}${unit || ''}`}
          {threshold.needsImprovement !== undefined && ` • Needs Improvement: ≤${threshold.needsImprovement}${unit || ''}`}
          {threshold.poor !== undefined && ` • Poor: >${threshold.poor}${unit || ''}`}
        </div>
      )}
      
      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {description}
        </p>
      )}
      
      {/* Source Link */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
        >
          View in {source}
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      )}
    </div>
  );
}


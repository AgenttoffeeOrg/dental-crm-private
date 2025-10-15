/**
 * Trend Chart Component
 * 
 * Phase 2: Historical score trending visualization.
 * UX Focus: See progress at a glance, understand trajectory.
 */

'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatAuditDate } from '@/lib/marketing-audit/utils/date-helpers';

interface TrendChartProps {
  audits: Array<{
    id: string;
    composite_score: number;
    created_at: string;
    technical_score?: number;
    local_score?: number;
    content_score?: number;
    analytics_score?: number;
    conversion_score?: number;
  }>;
  metric?: 'composite' | 'technical' | 'local' | 'content' | 'analytics' | 'conversion';
  height?: number;
}

export function TrendChart({ audits, metric = 'composite', height = 200 }: TrendChartProps) {
  const data = useMemo(() => {
    return audits.map(audit => ({
      date: new Date(audit.created_at),
      score: metric === 'composite' 
        ? audit.composite_score 
        : audit[`${metric}_score`] || 0,
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [audits, metric]);
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500">
        No historical data available
      </div>
    );
  }
  
  const scores = data.map(d => d.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;
  
  const latestScore = scores[scores.length - 1];
  const previousScore = scores.length > 1 ? scores[scores.length - 2] : latestScore;
  const change = latestScore - previousScore;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Score Trend
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Last {data.length} audits
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {latestScore.toFixed(1)}
          </div>
          <div className={`
            flex items-center gap-1 text-sm font-medium mt-1
            ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}
          `}>
            {change > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : change < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            {change > 0 ? '+' : ''}{change.toFixed(1)}
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={200 - (y * 2)}
              x2="600"
              y2={200 - (y * 2)}
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-200 dark:text-gray-700"
              opacity="0.3"
            />
          ))}
          
          {/* Area fill */}
          <path
            d={`
              M 0 200
              ${data.map((point, index) => {
                const x = (index / (data.length - 1)) * 600;
                const y = 200 - ((point.score - minScore) / range) * 200;
                return `L ${x} ${y}`;
              }).join(' ')}
              L 600 200
              Z
            `}
            fill="url(#gradient)"
            opacity="0.2"
          />
          
          {/* Line */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-purple-600"
            points={data.map((point, index) => {
              const x = (index / (data.length - 1)) * 600;
              const y = 200 - ((point.score - minScore) / range) * 200;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Points */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 600;
            const y = 200 - ((point.score - minScore) / range) * 200;
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill="white"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-purple-600"
                />
                <title>
                  {formatAuditDate(point.date)}: {point.score.toFixed(1)}
                </title>
              </g>
            );
          })}
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#667eea" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Date labels */}
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
        <span>{formatAuditDate(data[0].date)}</span>
        <span>{formatAuditDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}


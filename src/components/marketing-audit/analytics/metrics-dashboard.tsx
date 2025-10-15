/**
 * Metrics Dashboard Component
 * 
 * Comprehensive analytics view with charts and KPIs.
 * UX Focus: Data storytelling, clear insights, actionable intelligence.
 */

'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Eye, MousePointerClick, Users } from 'lucide-react';
import { formatNumber, formatPercentage, formatCompactNumber } from '@/lib/marketing-audit/utils/format';

interface MetricsDashboardProps {
  metrics: {
    sessions?: number;
    users?: number;
    pageviews?: number;
    bounce_rate?: number;
    avg_session_duration?: number;
    conversion_rate?: number;
    goal_completions?: number;
    events_tracked?: number;
  };
  trends?: {
    sessions_change?: number;
    users_change?: number;
    conversion_change?: number;
  };
}

export function MetricsDashboard({ metrics, trends }: MetricsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  
  const kpis = [
    {
      label: 'Sessions',
      value: metrics.sessions || 0,
      change: trends?.sessions_change,
      icon: Eye,
      color: 'purple',
    },
    {
      label: 'Users',
      value: metrics.users || 0,
      change: trends?.users_change,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Conversion Rate',
      value: metrics.conversion_rate || 0,
      change: trends?.conversion_change,
      icon: MousePointerClick,
      color: 'green',
      isPercentage: true,
    },
    {
      label: 'Goal Completions',
      value: metrics.goal_completions || 0,
      icon: TrendingUp,
      color: 'orange',
    },
  ];
  
  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20',
      blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20',
      green: 'bg-green-100 text-green-600 dark:bg-green-900/20',
      orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20',
    };
    return colors[color] || colors.purple;
  };
  
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Analytics Overview
        </h2>
        
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${selectedPeriod === period
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }
              `}
            >
              {period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const hasPositiveChange = kpi.change !== undefined && kpi.change > 0;
          const hasNegativeChange = kpi.change !== undefined && kpi.change < 0;
          
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${getColorClasses(kpi.color)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                {kpi.change !== undefined && (
                  <div className={`
                    flex items-center gap-1 text-xs font-semibold
                    ${hasPositiveChange ? 'text-green-600' : hasNegativeChange ? 'text-red-600' : 'text-gray-600'}
                  `}>
                    {hasPositiveChange ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : hasNegativeChange ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : null}
                    {Math.abs(kpi.change).toFixed(1)}%
                  </div>
                )}
              </div>
              
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {kpi.isPercentage
                  ? formatPercentage(kpi.value, 1)
                  : formatCompactNumber(kpi.value)
                }
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {kpi.label}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bounce Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Bounce Rate
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {formatPercentage(metrics.bounce_rate || 0, 1)}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {(metrics.bounce_rate || 0) < 40 ? 'Excellent' : (metrics.bounce_rate || 0) < 60 ? 'Good' : 'Needs improvement'}
          </div>
        </div>
        
        {/* Avg Session Duration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Avg Session Duration
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {Math.floor((metrics.avg_session_duration || 0) / 60)}m {Math.floor((metrics.avg_session_duration || 0) % 60)}s
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {(metrics.avg_session_duration || 0) > 180 ? 'Excellent engagement' : 'Average engagement'}
          </div>
        </div>
        
        {/* Events Tracked */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Events Tracked
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCompactNumber(metrics.events_tracked || 0)}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {(metrics.events_tracked || 0) > 1000 ? 'Comprehensive tracking' : 'Basic tracking'}
          </div>
        </div>
      </div>
    </div>
  );
}


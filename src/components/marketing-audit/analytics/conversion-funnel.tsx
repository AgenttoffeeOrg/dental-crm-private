/**
 * Conversion Funnel Component
 * 
 * Phase 3: Attribution & conversion tracking visualization.
 * UX Focus: See exactly where visitors drop off, optimize conversion paths.
 */

'use client';

import { TrendingDown, Users, MousePointerClick, Phone, Calendar } from 'lucide-react';
import { formatNumber, formatPercentage } from '@/lib/marketing-audit/utils/format';

interface ConversionFunnelProps {
  data: {
    visitors: number;
    page_views: number;
    service_page_views: number;
    cta_clicks: number;
    form_starts: number;
    form_completions: number;
    phone_clicks: number;
    appointments_booked: number;
  };
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const steps = [
    {
      label: 'Visitors',
      value: data.visitors,
      icon: Users,
      color: 'purple',
    },
    {
      label: 'Service Page Views',
      value: data.service_page_views,
      icon: MousePointerClick,
      color: 'blue',
      conversion: (data.service_page_views / data.visitors) * 100,
    },
    {
      label: 'CTA Clicks',
      value: data.cta_clicks,
      icon: MousePointerClick,
      color: 'green',
      conversion: (data.cta_clicks / data.service_page_views) * 100,
    },
    {
      label: 'Form Starts',
      value: data.form_starts,
      icon: MousePointerClick,
      color: 'yellow',
      conversion: (data.form_starts / data.cta_clicks) * 100,
    },
    {
      label: 'Form Completions',
      value: data.form_completions,
      icon: Calendar,
      color: 'orange',
      conversion: (data.form_completions / data.form_starts) * 100,
    },
  ];
  
  const maxValue = data.visitors;
  
  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      purple: { bg: 'bg-purple-500', text: 'text-purple-700' },
      blue: { bg: 'bg-blue-500', text: 'text-blue-700' },
      green: { bg: 'bg-green-500', text: 'text-green-700' },
      yellow: { bg: 'bg-yellow-500', text: 'text-yellow-700' },
      orange: { bg: 'bg-orange-500', text: 'text-orange-700' },
    };
    return colors[color] || colors.purple;
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Conversion Funnel
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Last 30 days
        </div>
      </div>
      
      {/* Funnel Visualization */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const colors = getColorClasses(step.color);
          const widthPercentage = (step.value / maxValue) * 100;
          const dropOff = index > 0 ? steps[index - 1].value - step.value : 0;
          
          return (
            <div key={index}>
              {/* Step Card */}
              <div className="relative">
                {/* Bar */}
                <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700">
                  <div
                    className={`${colors.bg} transition-all duration-500 p-4`}
                    style={{ width: `${Math.max(widthPercentage, 15)}%` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-white font-semibold">
                            {step.label}
                          </div>
                          <div className="text-white text-sm opacity-90">
                            {formatNumber(step.value)} visitors
                          </div>
                        </div>
                      </div>
                      
                      {step.conversion !== undefined && (
                        <div className="text-white font-bold text-lg">
                          {formatPercentage(step.conversion, 1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Drop-off indicator */}
                {dropOff > 0 && (
                  <div className="absolute -bottom-3 right-0 flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-200 dark:border-red-800">
                    <TrendingDown className="w-3 h-3" />
                    {formatNumber(dropOff)} dropped off
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPercentage((data.form_completions / data.visitors) * 100, 1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Overall Conversion Rate
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.phone_clicks)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Phone Clicks
          </div>
        </div>
      </div>
      
      {/* Insights */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          💡 Key Insight
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          {((data.form_starts / data.cta_clicks) * 100) < 50
            ? 'Many visitors click CTAs but don\'t start forms. Consider simplifying your forms or adding trust signals.'
            : ((data.form_completions / data.form_starts) * 100) < 60
            ? 'Form abandonment is high. Try reducing form fields or adding progress indicators.'
            : 'Your conversion funnel is performing well! Focus on driving more traffic.'}
        </p>
      </div>
    </div>
  );
}


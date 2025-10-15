/**
 * Attribution Dashboard Component
 * 
 * Phase 3: Marketing attribution & ROI tracking.
 * UX Focus: See which marketing channels drive revenue, optimize spend.
 */

'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, Target, PieChart } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/marketing-audit/utils/format';

interface AttributionDashboardProps {
  report: {
    total_deals: number;
    total_revenue: number;
    by_source: Record<string, {
      deals: number;
      revenue: number;
      attribution_percent: number;
      avg_deal_value: number;
    }>;
    by_campaign: Record<string, {
      deals: number;
      revenue: number;
      cost?: number;
      roi?: number;
    }>;
    conversion_paths: Array<{
      path: string[];
      count: number;
      avg_revenue: number;
      avg_time_to_conversion_days: number;
    }>;
  };
}

export function AttributionDashboard({ report }: AttributionDashboardProps) {
  const [model, setModel] = useState<'linear' | 'first_touch' | 'last_touch'>('linear');
  
  const sources = Object.entries(report.by_source)
    .sort((a, b) => b[1].revenue - a[1].revenue);
  
  const campaigns = Object.entries(report.by_campaign)
    .sort((a, b) => b[1].revenue - a[1].revenue);
  
  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      organic: 'bg-green-500',
      paid: 'bg-blue-500',
      social: 'bg-purple-500',
      email: 'bg-orange-500',
      referral: 'bg-pink-500',
      direct: 'bg-gray-500',
    };
    return colors[source.toLowerCase()] || 'bg-gray-500';
  };
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(report.total_revenue)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Attributed Revenue
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(report.total_deals)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Deals Tracked
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {Object.keys(report.by_source).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Active Marketing Channels
          </div>
        </div>
      </div>
      
      {/* Attribution Model Selector */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Attribution Model
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Change how credit is assigned to marketing touchpoints
            </p>
          </div>
          
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as any)}
            className="px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="linear">Linear (Equal Credit)</option>
            <option value="first_touch">First Touch</option>
            <option value="last_touch">Last Touch</option>
          </select>
        </div>
      </div>
      
      {/* Revenue by Source */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Revenue by Source
        </h3>
        
        <div className="space-y-4">
          {sources.map(([source, data]) => (
            <div key={source}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getSourceColor(source)}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {source}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data.revenue)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.deals} deals • {formatPercentage(data.attribution_percent, 1)}
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getSourceColor(source)}`}
                  style={{ width: `${data.attribution_percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Campaign Performance */}
      {campaigns.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Campaign Performance
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Campaign
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Deals
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Revenue
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Cost
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    ROI
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {campaigns.map(([campaign, data]) => {
                  const roi = data.roi || 0;
                  const isPositiveROI = roi > 0;
                  
                  return (
                    <tr key={campaign} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {campaign}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                        {formatNumber(data.deals)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(data.revenue)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                        {data.cost ? formatCurrency(data.cost) : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {data.roi !== undefined ? (
                          <span className={`
                            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                            ${isPositiveROI 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }
                          `}>
                            {isPositiveROI ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                            {formatPercentage(roi, 0)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Top Conversion Paths */}
      {report.conversion_paths.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Conversion Paths
          </h3>
          
          <div className="space-y-3">
            {report.conversion_paths.slice(0, 5).map((path, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    {path.path.map((step, i) => (
                      <span key={i} className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded font-medium capitalize">
                          {step}
                        </span>
                        {i < path.path.length - 1 && (
                          <span className="text-gray-400">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {path.count} conversions
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>Avg revenue: {formatCurrency(path.avg_revenue)}</span>
                  <span>Avg time: {path.avg_time_to_conversion_days.toFixed(0)} days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


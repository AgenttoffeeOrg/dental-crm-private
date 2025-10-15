/**
 * Source Performance Heatmap Component
 * 
 * Phase 3: Visualize marketing channel performance over time.
 * UX Focus: Quickly identify best/worst performing channels and periods.
 */

'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/marketing-audit/utils/format';

interface SourcePerformanceHeatmapProps {
  data: Record<string, Record<string, number>>; // source -> month -> revenue
  months: string[];
}

export function SourcePerformanceHeatmap({ data, months }: SourcePerformanceHeatmapProps) {
  const sources = Object.keys(data);
  
  // Find min/max for color scaling
  const allValues = sources.flatMap(source => Object.values(data[source]));
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;
  
  const getHeatmapColor = (value: number): string => {
    const intensity = (value - minValue) / range;
    
    if (intensity > 0.8) return 'bg-green-600 text-white';
    if (intensity > 0.6) return 'bg-green-400 text-white';
    if (intensity > 0.4) return 'bg-yellow-400 text-gray-900';
    if (intensity > 0.2) return 'bg-orange-400 text-white';
    return 'bg-red-400 text-white';
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Channel Performance Heatmap
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                Source
              </th>
              {months.map(month => (
                <th key={month} className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                  {month}
                </th>
              ))}
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                Total
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {sources.map(source => {
              const monthlyValues = months.map(m => data[source][m] || 0);
              const total = monthlyValues.reduce((sum, v) => sum + v, 0);
              const firstMonth = monthlyValues[0];
              const lastMonth = monthlyValues[monthlyValues.length - 1];
              const trend = lastMonth - firstMonth;
              
              return (
                <tr key={source} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white capitalize">
                    {source}
                  </td>
                  {months.map(month => {
                    const value = data[source][month] || 0;
                    return (
                      <td key={month} className="px-4 py-2">
                        <div className={`
                          px-2 py-1 rounded text-xs font-semibold text-center
                          ${getHeatmapColor(value)}
                        `}>
                          {value > 0 ? formatCurrency(value, 0) : '—'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">
                    {formatCurrency(total, 0)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className={`
                      inline-flex items-center gap-1 text-xs font-medium
                      ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'}
                    `}>
                      {trend > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          {formatCurrency(trend, 0)}
                        </>
                      ) : trend < 0 ? (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          {formatCurrency(Math.abs(trend), 0)}
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs">
        <span className="text-gray-600 dark:text-gray-400">Performance:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-400 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-400 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span className="text-gray-600 dark:text-gray-400">High</span>
        </div>
      </div>
    </div>
  );
}


/**
 * ROI Calculator Component
 * 
 * Phase 3: Calculate and visualize marketing ROI.
 * UX Focus: Clear ROI metrics, justify marketing spend.
 */

'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, Calculator, PieChart } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/marketing-audit/utils/format';

interface ROICalculatorProps {
  attributionData?: {
    total_revenue: number;
    by_source: Record<string, {
      revenue: number;
      deals: number;
    }>;
    by_campaign: Record<string, {
      revenue: number;
      cost?: number;
    }>;
  };
}

export function ROICalculator({ attributionData }: ROICalculatorProps) {
  const [manualInputs, setManualInputs] = useState({
    seoInvestment: 0,
    ppcSpend: 0,
    socialAdsSpend: 0,
    contentCost: 0,
    toolsCost: 0,
  });
  
  const totalMarketingSpend = Object.values(manualInputs).reduce((sum, v) => sum + v, 0);
  const totalAttributedRevenue = attributionData?.total_revenue || 0;
  const profit = totalAttributedRevenue - totalMarketingSpend;
  const roi = totalMarketingSpend > 0 ? (profit / totalMarketingSpend) * 100 : 0;
  const roas = totalMarketingSpend > 0 ? totalAttributedRevenue / totalMarketingSpend : 0;
  
  return (
    <div className="space-y-6">
      {/* ROI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalAttributedRevenue)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Revenue Generated
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalMarketingSpend)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Marketing Spend
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${
              roi > 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                roi > 0 ? 'text-green-600' : 'text-red-600 rotate-180'
              }`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            roi > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatPercentage(roi, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            ROI
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Calculator className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {roas.toFixed(1)}x
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            ROAS
          </div>
        </div>
      </div>
      
      {/* Manual Cost Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Marketing Costs (Manual Input)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SEO Investment
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                value={manualInputs.seoInvestment || ''}
                onChange={(e) => setManualInputs(prev => ({ ...prev, seoInvestment: parseFloat(e.target.value) || 0 }))}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              PPC/Google Ads Spend
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                value={manualInputs.ppcSpend || ''}
                onChange={(e) => setManualInputs(prev => ({ ...prev, ppcSpend: parseFloat(e.target.value) || 0 }))}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Social Media Ads
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                value={manualInputs.socialAdsSpend || ''}
                onChange={(e) => setManualInputs(prev => ({ ...prev, socialAdsSpend: parseFloat(e.target.value) || 0 }))}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content Creation
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                value={manualInputs.contentCost || ''}
                onChange={(e) => setManualInputs(prev => ({ ...prev, contentCost: parseFloat(e.target.value) || 0 }))}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tools & Software
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                type="number"
                value={manualInputs.toolsCost || ''}
                onChange={(e) => setManualInputs(prev => ({ ...prev, toolsCost: parseFloat(e.target.value) || 0 }))}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* ROI Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          ROI Breakdown
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Revenue
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalAttributedRevenue)}
            </span>
          </div>
          
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Marketing Spend
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              -{formatCurrency(totalMarketingSpend)}
            </span>
          </div>
          
          <div className="flex items-center justify-between pb-4 border-b-2 border-gray-300 dark:border-gray-600">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Net Profit
            </span>
            <span className={`text-xl font-bold ${
              profit > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(profit)}
            </span>
          </div>
          
          <div className={`
            p-4 rounded-lg
            ${roi > 100 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : roi > 0
              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }
          `}>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${
                roi > 100 ? 'text-green-600' : roi > 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                {formatPercentage(roi, 0)}
              </div>
              <div className={`text-sm ${
                roi > 100 ? 'text-green-800 dark:text-green-200' : roi > 0 ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200'
              }`}>
                Return on Investment
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                For every $1 spent, you generate ${roas.toFixed(2)} in revenue
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Channel Performance */}
      {attributionData && Object.keys(attributionData.by_source).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Channel Performance
          </h3>
          
          <div className="space-y-3">
            {Object.entries(attributionData.by_source)
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .map(([source, data]) => (
                <div key={source} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white capitalize">
                      {source}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {data.deals} deals
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(data.revenue)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Insights */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
        <h4 className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-3">
          💡 ROI Insights
        </h4>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          {roi > 200 && (
            <p>🎉 Exceptional ROI! Your marketing is highly efficient. Consider increasing spend on top-performing channels.</p>
          )}
          {roi > 100 && roi <= 200 && (
            <p>✅ Healthy ROI. Your marketing is profitable. Look for opportunities to scale successful campaigns.</p>
          )}
          {roi > 0 && roi <= 100 && (
            <p>⚠️ Positive but modest ROI. Optimize underperforming channels and double down on what's working.</p>
          )}
          {roi <= 0 && (
            <p>🚨 Negative ROI. Immediate action needed. Review channel performance and pause unprofitable campaigns.</p>
          )}
          
          {totalMarketingSpend === 0 && (
            <p>📝 Enter your marketing costs above to calculate accurate ROI.</p>
          )}
        </div>
      </div>
    </div>
  );
}


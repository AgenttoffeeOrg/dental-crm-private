/**
 * Campaign Impact Analyzer Component
 * 
 * Phase 3: Analyze marketing campaign performance and impact.
 * UX Focus: See which campaigns drive results, optimize budget allocation.
 */

'use client';

import { useState } from 'react';
import { Target, DollarSign, TrendingUp, Users } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/marketing-audit/utils/format';

interface CampaignImpactAnalyzerProps {
  campaigns: Array<{
    name: string;
    source: string;
    start_date: string;
    end_date?: string;
    budget: number;
    spent: number;
    revenue: number;
    deals: number;
    impressions?: number;
    clicks?: number;
    conversions: number;
  }>;
}

export function CampaignImpactAnalyzer({ campaigns }: CampaignImpactAnalyzerProps) {
  const [sortBy, setSortBy] = useState<'roi' | 'revenue' | 'deals'>('roi');
  
  // Calculate metrics for each campaign
  const campaignsWithMetrics = campaigns.map(campaign => {
    const roi = campaign.spent > 0 ? ((campaign.revenue - campaign.spent) / campaign.spent) * 100 : 0;
    const cpa = campaign.deals > 0 ? campaign.spent / campaign.deals : 0;
    const conversionRate = campaign.clicks && campaign.clicks > 0 
      ? (campaign.conversions / campaign.clicks) * 100 
      : 0;
    const ctr = campaign.impressions && campaign.impressions > 0
      ? (campaign.clicks || 0) / campaign.impressions * 100
      : 0;
    
    return {
      ...campaign,
      roi,
      cpa,
      conversionRate,
      ctr,
      status: campaign.end_date ? 'completed' : 'active',
    };
  });
  
  // Sort campaigns
  const sorted = [...campaignsWithMetrics].sort((a, b) => {
    switch (sortBy) {
      case 'roi':
        return b.roi - a.roi;
      case 'revenue':
        return b.revenue - a.revenue;
      case 'deals':
        return b.deals - a.deals;
      default:
        return 0;
    }
  });
  
  // Overall statistics
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
  const totalDeals = campaigns.reduce((sum, c) => sum + c.deals, 0);
  const overallROI = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
  
  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Campaign Revenue
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(totalDeals)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Deals Generated
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalSpent)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Spent
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${
              overallROI > 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                overallROI > 0 ? 'text-green-600' : 'text-red-600 rotate-180'
              }`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            overallROI > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatPercentage(overallROI, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Overall ROI
          </div>
        </div>
      </div>
      
      {/* Campaigns Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Campaign Performance
            </h3>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="roi">Sort by ROI</option>
              <option value="revenue">Sort by Revenue</option>
              <option value="deals">Sort by Deals</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Campaign
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Spent
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Revenue
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Deals
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  CPA
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  ROI
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.map((campaign, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {campaign.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {campaign.source}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(campaign.spent)}
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(campaign.revenue)}
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-gray-900 dark:text-white">
                    {formatNumber(campaign.deals)}
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(campaign.cpa)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold
                      ${campaign.roi > 100
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : campaign.roi > 0
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }
                    `}>
                      {campaign.roi > 0 ? '+' : ''}{formatPercentage(campaign.roi, 0)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`
                      inline-block px-2 py-1 rounded-full text-xs font-medium
                      ${campaign.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }
                    `}>
                      {campaign.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


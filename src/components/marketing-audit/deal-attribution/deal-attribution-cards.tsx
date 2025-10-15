/**
 * Deal Attribution Cards Component
 * 
 * Phase 3: Visual cards showing which marketing touchpoints led to each deal.
 * UX Focus: Clear attribution story, understand customer journey.
 */

'use client';

import { useState } from 'react';
import { DollarSign, Calendar, TrendingUp, MapPin, Tag } from 'lucide-react';
import { formatCurrency, formatOrdinal } from '@/lib/marketing-audit/utils/format';
import { formatAuditDate } from '@/lib/marketing-audit/utils/date-helpers';

interface DealAttributionCardsProps {
  deals: Array<{
    id: string;
    title: string;
    value: number;
    won_date: string;
    touchpoints: Array<{
      source: string;
      medium: string;
      campaign?: string;
      timestamp: string;
      attribution_credit: number; // Percentage of credit (0-100)
    }>;
    primary_source: string;
    secondary_sources: string[];
  }>;
}

export function DealAttributionCards({ deals }: DealAttributionCardsProps) {
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  
  const sortedDeals = [...deals].sort((a, b) => 
    new Date(b.won_date).getTime() - new Date(a.won_date).getTime()
  );
  
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
    <div className="space-y-4">
      {sortedDeals.map((deal) => {
        const isExpanded = selectedDeal === deal.id;
        const sortedTouchpoints = [...deal.touchpoints].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return (
          <div
            key={deal.id}
            className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden hover:border-purple-300 dark:hover:border-purple-700 transition-all"
          >
            {/* Card Header */}
            <button
              onClick={() => setSelectedDeal(isExpanded ? null : deal.id)}
              className="w-full p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {deal.title}
                    </h3>
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${getSourceColor(deal.primary_source)} text-white
                    `}>
                      {deal.primary_source}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {formatCurrency(deal.value)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatAuditDate(deal.won_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {sortedTouchpoints.length} touchpoints
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(deal.value)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Deal Value
                  </div>
                </div>
              </div>
            </button>
            
            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/50">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Customer Journey ({sortedTouchpoints.length} touchpoints)
                </h4>
                
                <div className="space-y-3">
                  {sortedTouchpoints.map((touchpoint, index) => (
                    <div key={index} className="flex items-start gap-4">
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                          ${getSourceColor(touchpoint.source)}
                        `}>
                          {index + 1}
                        </div>
                        {index < sortedTouchpoints.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600 my-1" />
                        )}
                      </div>
                      
                      {/* Touchpoint Details */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white capitalize">
                              {touchpoint.source}
                            </span>
                            {touchpoint.campaign && (
                              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                / {touchpoint.campaign}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-purple-600">
                            {touchpoint.attribution_credit.toFixed(0)}% credit
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatAuditDate(touchpoint.timestamp)} • {touchpoint.medium}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Attribution Breakdown */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Attribution Breakdown
                  </h5>
                  <div className="space-y-2">
                    {Object.entries(
                      sortedTouchpoints.reduce((acc, tp) => {
                        acc[tp.source] = (acc[tp.source] || 0) + tp.attribution_credit;
                        return acc;
                      }, {} as Record<string, number>)
                    )
                      .sort((a, b) => b[1] - a[1])
                      .map(([source, credit]) => (
                        <div key={source} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getSourceColor(source)}`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                {source}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {credit.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getSourceColor(source)}`}
                                style={{ width: `${credit}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


/**
 * Keyword Dashboard Component
 * 
 * Phase 3: Enterprise keyword tracking powered by Semrush.
 * UX Focus: See which keywords you rank for, track positions, find opportunities.
 */

'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Search, Target, Minus } from 'lucide-react';
import { formatNumber, formatCompactNumber } from '@/lib/marketing-audit/utils/format';

interface KeywordDashboardProps {
  data: Array<{
    keyword: string;
    position: number;
    previous_position: number;
    search_volume: number;
    keyword_difficulty: number;
    cpc: number;
    url: string;
    traffic_percent: number;
  }>;
  summary: {
    total_keywords: number;
    top_3_keywords: number;
    top_10_keywords: number;
    avg_position: number;
    estimated_traffic: number;
  };
}

export function KeywordDashboard({ data, summary }: KeywordDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'top10' | 'improving' | 'declining'>('all');
  const [sortBy, setSortBy] = useState<'position' | 'volume' | 'difficulty'>('position');
  
  // Filter keywords
  let filtered = data;
  if (filter === 'top10') {
    filtered = filtered.filter(k => k.position <= 10);
  } else if (filter === 'improving') {
    filtered = filtered.filter(k => k.position < k.previous_position);
  } else if (filter === 'declining') {
    filtered = filtered.filter(k => k.position > k.previous_position);
  }
  
  // Sort keywords
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'position':
        return a.position - b.position;
      case 'volume':
        return b.search_volume - a.search_volume;
      case 'difficulty':
        return b.keyword_difficulty - a.keyword_difficulty;
      default:
        return 0;
    }
  });
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Search className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(summary.total_keywords)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Keywords Ranking
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(summary.top_10_keywords)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Top 10 Rankings
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.avg_position.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Average Position
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCompactNumber(summary.estimated_traffic)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Estimated Monthly Traffic
          </div>
        </div>
      </div>
      
      {/* Keywords Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Keyword Rankings
            </h3>
            
            <div className="flex items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Keywords</option>
                <option value="top10">Top 10 Only</option>
                <option value="improving">Improving</option>
                <option value="declining">Declining</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="position">Sort by Position</option>
                <option value="volume">Sort by Volume</option>
                <option value="difficulty">Sort by Difficulty</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Keyword
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Position
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Change
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Volume
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Difficulty
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Traffic %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.slice(0, 50).map((keyword, index) => {
                const change = keyword.previous_position - keyword.position;
                const isImproving = change > 0;
                const isDeclining = change < 0;
                
                return (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {keyword.keyword}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {keyword.url}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-bold
                        ${keyword.position <= 3
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : keyword.position <= 10
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : keyword.position <= 20
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }
                      `}>
                        #{keyword.position}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className={`
                        inline-flex items-center gap-1 text-xs font-medium
                        ${isImproving ? 'text-green-600' : isDeclining ? 'text-red-600' : 'text-gray-600'}
                      `}>
                        {isImproving ? (
                          <>
                            <TrendingUp className="w-3 h-3" />
                            +{change}
                          </>
                        ) : isDeclining ? (
                          <>
                            <TrendingDown className="w-3 h-3" />
                            {change}
                          </>
                        ) : (
                          <>
                            <Minus className="w-3 h-3" />
                            0
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                      {formatNumber(keyword.search_volume)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              keyword.keyword_difficulty >= 70 ? 'bg-red-500' :
                              keyword.keyword_difficulty >= 40 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${keyword.keyword_difficulty}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {keyword.keyword_difficulty.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                      {keyword.traffic_percent.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


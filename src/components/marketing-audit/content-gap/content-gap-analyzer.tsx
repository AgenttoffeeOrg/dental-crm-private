/**
 * Content Gap Analyzer Component
 * 
 * Phase 3: Identify content opportunities vs competitors.
 * UX Focus: Clear visualization of keyword gaps, prioritized opportunities.
 */

'use client';

import { useState } from 'react';
import { FileText, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { formatNumber } from '@/lib/marketing-audit/utils/format';

interface ContentGapAnalyzerProps {
  data: {
    your_keywords: string[];
    competitor_keywords: Record<string, string[]>; // competitor name -> keywords
    gaps: Array<{
      keyword: string;
      search_volume: number;
      difficulty: number;
      competitor_count: number; // How many competitors rank for this
      opportunity_score: number; // 0-100, higher = better opportunity
    }>;
  };
}

export function ContentGapAnalyzer({ data }: ContentGapAnalyzerProps) {
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [sortBy, setSortBy] = useState<'opportunity' | 'volume' | 'difficulty'>('opportunity');
  
  // Filter gaps
  let filtered = data.gaps;
  if (filterDifficulty === 'easy') {
    filtered = filtered.filter(g => g.difficulty < 40);
  } else if (filterDifficulty === 'medium') {
    filtered = filtered.filter(g => g.difficulty >= 40 && g.difficulty < 70);
  } else if (filterDifficulty === 'hard') {
    filtered = filtered.filter(g => g.difficulty >= 70);
  }
  
  // Sort gaps
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'opportunity':
        return b.opportunity_score - a.opportunity_score;
      case 'volume':
        return b.search_volume - a.search_volume;
      case 'difficulty':
        return a.difficulty - b.difficulty; // Lower difficulty first
      default:
        return 0;
    }
  });
  
  const topOpportunities = sorted.slice(0, 10);
  const quickWins = sorted.filter(g => g.difficulty < 40 && g.opportunity_score > 70).slice(0, 5);
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.gaps.length)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Content Gaps Identified
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(quickWins.length)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Quick Win Opportunities
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(
              sorted.slice(0, 10).reduce((sum, g) => sum + g.search_volume, 0)
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Monthly Search Volume
          </div>
        </div>
      </div>
      
      {/* Quick Wins Highlight */}
      {quickWins.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <Target className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-base font-bold text-green-900 dark:text-green-200 mb-2">
                🎯 Quick Wins: Easy Content to Create
              </h4>
              <p className="text-sm text-green-800 dark:text-green-300 mb-3">
                These {quickWins.length} keywords have high opportunity and low competition. Perfect for quick content wins!
              </p>
              <div className="flex flex-wrap gap-2">
                {quickWins.map((gap, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-full text-sm font-medium text-green-900 dark:text-green-200"
                  >
                    {gap.keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Gaps Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Content Opportunities
            </h3>
            
            <div className="flex items-center gap-3">
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Difficulty</option>
                <option value="easy">Easy (&lt;40)</option>
                <option value="medium">Medium (40-70)</option>
                <option value="hard">Hard (&gt;70)</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="opportunity">Best Opportunity</option>
                <option value="volume">Highest Volume</option>
                <option value="difficulty">Easiest First</option>
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
                  Opportunity
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Volume
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Difficulty
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Competitors
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topOpportunities.map((gap, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {gap.keyword}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            gap.opportunity_score >= 80 ? 'bg-green-500' :
                            gap.opportunity_score >= 60 ? 'bg-blue-500' :
                            gap.opportunity_score >= 40 ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${gap.opportunity_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {gap.opportunity_score.toFixed(0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-gray-900 dark:text-white">
                    {formatNumber(gap.search_volume)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`
                      inline-block px-2 py-1 rounded-full text-xs font-medium
                      ${gap.difficulty < 40
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : gap.difficulty < 70
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }
                    `}>
                      {gap.difficulty.toFixed(0)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-sm text-gray-900 dark:text-white">
                    {gap.competitor_count}/{Object.keys(data.competitor_keywords).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Content Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Content Strategy Recommendations
        </h3>
        
        <div className="space-y-3">
          {topOpportunities.slice(0, 3).map((gap, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Create content for "{gap.keyword}"
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    This keyword has {formatNumber(gap.search_volume)} monthly searches 
                    and {gap.competitor_count} of your competitors rank for it, but you don't.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Difficulty: {gap.difficulty}/100</span>
                    <span>Opportunity Score: {gap.opportunity_score}/100</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


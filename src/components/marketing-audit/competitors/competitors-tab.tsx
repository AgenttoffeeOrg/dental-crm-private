/**
 * Competitors Tab Component
 * 
 * Competitor benchmarking analysis:
 * - Comparison table
 * - Score distribution
 * - Gap analysis
 * - Percentile visualization
 */

'use client';

import type { Competitor } from '@/lib/marketing-audit/types';
import { Users, TrendingUp, Award } from 'lucide-react';
import { ScoreBadge } from '../shared/score-badge';

interface CompetitorsTabProps {
  yourScore: number;
  yourRank: number;
  percentile: number;
  gapToMedian: number;
  gapToTop3: number;
  competitors: Competitor[];
  yourPracticeName: string;
}

export function CompetitorsTab({
  yourScore,
  yourRank,
  percentile,
  gapToMedian,
  gapToTop3,
  competitors,
  yourPracticeName,
}: CompetitorsTabProps) {
  // Sort competitors by rank
  const sortedCompetitors = [...competitors].sort((a, b) => a.rank - b.rank);
  const top3 = sortedCompetitors.slice(0, 3);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Users className="w-7 h-7 text-green-600" />
          Competitor Benchmarking
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your position vs {competitors.length} local dental practices
        </p>
      </div>
      
      {/* Your Position Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Competitive Position
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Your Rank
            </div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              #{yourRank}
            </div>
            <div className="text-xs text-gray-500">
              of {competitors.length + 1} practices
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Percentile
            </div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {percentile.toFixed(1)}th
            </div>
            <div className="text-xs text-gray-500">
              {percentile >= 75 ? 'Top quartile' : percentile >= 50 ? 'Above average' : percentile >= 25 ? 'Below average' : 'Bottom quartile'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Gap to Median
            </div>
            <div className={`text-3xl font-bold ${gapToMedian >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gapToMedian > 0 ? '+' : ''}{gapToMedian.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">
              points {gapToMedian >= 0 ? 'ahead' : 'behind'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Gap to Top 3
            </div>
            <div className={`text-3xl font-bold ${gapToTop3 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gapToTop3 > 0 ? '+' : ''}{gapToTop3.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">
              points {gapToTop3 >= 0 ? 'ahead' : 'to catch up'}
            </div>
          </div>
        </div>
        
        {/* Percentile Visualization */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>0th</span>
            <span>25th</span>
            <span>50th</span>
            <span>75th</span>
            <span>100th</span>
          </div>
          <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
              style={{ width: '100%' }}
            />
            <div
              className="absolute top-0 h-full w-1 bg-purple-600 shadow-lg"
              style={{ left: `${percentile}%` }}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                You
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Top 3 Competitors */}
      {top3.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top 3 Competitors
            </h3>
          </div>
          
          <div className="space-y-3">
            {top3.map((comp, index) => (
              <div key={comp.id || index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {comp.competitor_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {comp.distance_miles} miles away
                      {comp.metrics.reviews_count && ` • ${comp.metrics.reviews_count} reviews`}
                      {comp.metrics.avg_rating && ` • ${comp.metrics.avg_rating.toFixed(1)}★`}
                    </div>
                  </div>
                </div>
                <ScoreBadge score={comp.composite_score} size="md" />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Full Comparison Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Full Competitor Comparison
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Practice Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Insert "You" row at correct position */}
              {sortedCompetitors.map((comp, index) => {
                const rows = [];
                
                // If this is where "You" should appear, insert it first
                if (comp.rank === yourRank) {
                  rows.push(
                    <tr key="you" className="bg-purple-50 dark:bg-purple-900/20">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-600">#{yourRank}</span>
                          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">YOU</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                        {yourPracticeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ScoreBadge score={yourScore} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">—</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">—</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">—</td>
                    </tr>
                  );
                }
                
                // Add competitor row
                rows.push(
                  <tr key={comp.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-600">{comp.rank}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {comp.competitor_name}
                      </div>
                      {comp.competitor_domain && (
                        <div className="text-xs text-gray-500">{comp.competitor_domain}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ScoreBadge score={comp.composite_score} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {comp.metrics.reviews_count || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {comp.metrics.avg_rating ? `${comp.metrics.avg_rating.toFixed(1)}★` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {comp.distance_miles ? `${comp.distance_miles} mi` : '—'}
                    </td>
                  </tr>
                );
                
                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Competitive Gap Recommendations ({recommendations.length})
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {index + 1}. {rec.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


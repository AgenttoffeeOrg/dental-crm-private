/**
 * Gap Analysis Chart Component
 * 
 * Shows gaps to median and top 3 performers visually.
 */

'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface GapAnalysisChartProps {
  yourScore: number;
  medianScore: number;
  top3AvgScore: number;
  category?: string;
}

export function GapAnalysisChart({ yourScore, medianScore, top3AvgScore, category }: GapAnalysisChartProps) {
  const gapToMedian = yourScore - medianScore;
  const gapToTop3 = yourScore - top3AvgScore;
  
  const maxScore = Math.max(yourScore, medianScore, top3AvgScore);
  
  return (
    <div className="space-y-6">
      {category && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {category} - Gap Analysis
        </h3>
      )}
      
      {/* Your Score */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Score
          </span>
          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {yourScore.toFixed(1)}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="h-full bg-purple-600 rounded-full transition-all"
            style={{ width: `${(yourScore / maxScore) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Median Score */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Median (50th Percentile)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {medianScore.toFixed(1)}
            </span>
            <span className={`text-xs font-semibold ${gapToMedian >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gapToMedian >= 0 ? '+' : ''}{gapToMedian.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="h-full bg-gray-400 rounded-full transition-all"
            style={{ width: `${(medianScore / maxScore) * 100}%` }}
          />
        </div>
        {gapToMedian !== 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs">
            {gapToMedian > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-green-600 font-medium">
                  {gapToMedian.toFixed(1)} points ahead of median
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-red-600" />
                <span className="text-red-600 font-medium">
                  {Math.abs(gapToMedian).toFixed(1)} points to reach median
                </span>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Top 3 Average */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Top 3 Average
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {top3AvgScore.toFixed(1)}
            </span>
            <span className={`text-xs font-semibold ${gapToTop3 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gapToTop3 >= 0 ? '+' : ''}{gapToTop3.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${(top3AvgScore / maxScore) * 100}%` }}
          />
        </div>
        {gapToTop3 !== 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs">
            {gapToTop3 > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-green-600 font-medium">
                  You're beating the top 3!
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-red-600" />
                <span className="text-red-600 font-medium">
                  {Math.abs(gapToTop3).toFixed(1)} points to reach top 3
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * Score Comparison Widget Component
 * 
 * Quick visual comparison: You vs Median vs Top 3.
 * User Experience: Instantly see where you stand competitively.
 */

'use client';

import { Trophy, Target, TrendingUp } from 'lucide-react';

interface ScoreComparisonWidgetProps {
  yourScore: number;
  medianScore: number;
  top3AvgScore: number;
  yourRank: number;
  totalPractices: number;
}

export function ScoreComparisonWidget({
  yourScore,
  medianScore,
  top3AvgScore,
  yourRank,
  totalPractices,
}: ScoreComparisonWidgetProps) {
  const maxScore = Math.max(yourScore, medianScore, top3AvgScore);
  
  const bars = [
    { label: 'You', score: yourScore, icon: Target, color: 'purple' },
    { label: 'Median', score: medianScore, icon: TrendingUp, color: 'gray' },
    { label: 'Top 3', score: top3AvgScore, icon: Trophy, color: 'yellow' },
  ];
  
  const getBarColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-600',
      gray: 'bg-gray-400',
      yellow: 'bg-yellow-500',
    };
    return colors[color];
  };
  
  const getLabelColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'text-purple-600',
      gray: 'text-gray-600',
      yellow: 'text-yellow-600',
    };
    return colors[color];
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Quick Comparison
      </h3>
      
      <div className="space-y-4">
        {bars.map((bar) => {
          const Icon = bar.icon;
          const barWidth = (bar.score / maxScore) * 100;
          
          return (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${getLabelColor(bar.color)}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {bar.label}
                  </span>
                </div>
                <span className={`text-sm font-bold ${getLabelColor(bar.color)}`}>
                  {bar.score.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(bar.color)}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          You rank <span className="font-semibold text-gray-900 dark:text-white">#{yourRank}</span> out of {totalPractices} practices
        </div>
      </div>
    </div>
  );
}


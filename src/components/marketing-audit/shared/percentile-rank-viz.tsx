/**
 * Percentile Rank Visualization Component
 * 
 * Visual representation of where you rank vs competitors.
 * Shows gradient bar with your position marker.
 */

'use client';

interface PercentileRankVizProps {
  percentile: number; // 0-100
  rank: number;
  totalPeers: number;
  label?: string;
}

export function PercentileRankViz({ percentile, rank, totalPeers, label }: PercentileRankVizProps) {
  const getPosition = () => {
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top Quartile';
    if (percentile >= 50) return 'Above Average';
    if (percentile >= 25) return 'Below Average';
    return 'Bottom Quartile';
  };
  
  return (
    <div>
      {label && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {label}
        </div>
      )}
      
      {/* Percentile Bar */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>0th</span>
          <span>25th</span>
          <span>50th</span>
          <span>75th</span>
          <span>100th</span>
        </div>
        
        <div className="relative w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* Gradient background */}
          <div
            className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-70"
          />
          
          {/* Your position marker */}
          <div
            className="absolute top-0 h-full w-1 bg-purple-600 shadow-lg z-10"
            style={{ left: `${percentile}%` }}
          >
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-md whitespace-nowrap shadow-lg">
              You ({percentile.toFixed(0)}th)
            </div>
            <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-600"></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>Worst</span>
          <span>Median</span>
          <span>Best</span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Position: </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {getPosition()}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Rank: </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            #{rank} of {totalPeers + 1}
          </span>
        </div>
      </div>
    </div>
  );
}


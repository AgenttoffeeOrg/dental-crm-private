/**
 * Competitors Grid Component
 * 
 * Grid layout showing all discovered competitors.
 * UX Focus: Easy scanning, clear ranking, visual comparison.
 */

'use client';

import { useState } from 'react';
import { CompetitorCard } from './competitor-card';
import { Users, Filter, SortAsc } from 'lucide-react';
import { EmptyState } from '../shared/empty-state';
import { LoadingSkeleton } from '../shared/loading-skeleton';

interface CompetitorsGridProps {
  competitors: any[];
  yourRank?: number;
  loading?: boolean;
  onViewDetails?: (competitor: any) => void;
}

export function CompetitorsGrid({
  competitors,
  yourRank,
  loading = false,
  onViewDetails,
}: CompetitorsGridProps) {
  const [sortBy, setSortBy] = useState<'rank' | 'score' | 'reviews' | 'distance'>('rank');
  const [filterTopPerformers, setFilterTopPerformers] = useState(false);
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <LoadingSkeleton key={i} type="card" />
        ))}
      </div>
    );
  }
  
  if (competitors.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Competitors Found"
        description="We couldn't find any competitors in your area. Try adjusting your practice location or specialty."
      />
    );
  }
  
  // Sort competitors
  const sorted = [...competitors].sort((a, b) => {
    switch (sortBy) {
      case 'rank':
        return (a.rank || 999) - (b.rank || 999);
      case 'score':
        return (b.score || 0) - (a.score || 0);
      case 'reviews':
        return (b.reviews_count || 0) - (a.reviews_count || 0);
      case 'distance':
        return (a.distance_km || 999) - (b.distance_km || 999);
      default:
        return 0;
    }
  });
  
  // Filter if needed
  const filtered = filterTopPerformers
    ? sorted.filter(c => c.is_top_performer)
    : sorted;
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <SortAsc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="rank">Rank</option>
            <option value="score">Score</option>
            <option value="reviews">Reviews</option>
            <option value="distance">Distance</option>
          </select>
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterTopPerformers}
            onChange={(e) => setFilterTopPerformers(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded"
          />
          <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Top performers only
          </span>
        </label>
      </div>
      
      {/* Stats Summary */}
      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
        <div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {filtered.length}
          </span>
          {' '}competitors found
        </div>
        
        {yourRank !== undefined && (
          <div>
            Your rank: <span className="font-semibold text-purple-600">
              #{yourRank}
            </span>
          </div>
        )}
        
        <div>
          Top 3 avg score: <span className="font-semibold text-gray-900 dark:text-white">
            {(sorted.slice(0, 3).reduce((sum, c) => sum + (c.score || 0), 0) / 3).toFixed(1)}
          </span>
        </div>
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((competitor, index) => (
          <CompetitorCard
            key={competitor.id || index}
            competitor={competitor}
            yourRank={yourRank}
            onViewDetails={() => onViewDetails?.(competitor)}
          />
        ))}
      </div>
      
      {/* No Results After Filter */}
      {filtered.length === 0 && filterTopPerformers && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No top performers found. Try removing the filter.
          </p>
        </div>
      )}
    </div>
  );
}


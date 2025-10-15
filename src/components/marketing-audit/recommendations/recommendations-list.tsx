/**
 * Recommendations List Component
 * 
 * Filterable, sortable list of all recommendations.
 * UX Focus: Help user find what matters most right now.
 */

'use client';

import { useState } from 'react';
import { RecommendationCard } from './recommendation-card';
import { Filter, SortDesc } from 'lucide-react';
import { EmptyState } from '../shared/empty-state';
import type { Recommendation } from '@/lib/marketing-audit/types';

interface RecommendationsListProps {
  recommendations: Recommendation[];
  onCreateTask?: (rec: Recommendation) => void;
  onDismiss?: (rec: Recommendation) => void;
  readonly?: boolean;
}

export function RecommendationsList({
  recommendations,
  onCreateTask,
  onDismiss,
  readonly = false,
}: RecommendationsListProps) {
  const [filterImpact, setFilterImpact] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'effort'>('priority');
  
  // Get unique categories
  const categories = Array.from(new Set(recommendations.map(r => r.category)));
  
  // Filter recommendations
  let filtered = recommendations;
  
  if (filterImpact !== 'all') {
    filtered = filtered.filter(r => r.impact === filterImpact);
  }
  
  if (filterCategory !== 'all') {
    filtered = filtered.filter(r => r.category === filterCategory);
  }
  
  // Sort recommendations
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return (b.priority_score || 0) - (a.priority_score || 0);
      case 'impact':
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      case 'effort':
        const effortOrder = { low: 3, medium: 2, high: 1 };
        return effortOrder[b.effort] - effortOrder[a.effort];
      default:
        return 0;
    }
  });
  
  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={Filter}
        title="No Recommendations"
        description="Great job! Your marketing looks excellent across all categories."
        variant="compact"
      />
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
          </div>
          
          {/* Impact Filter */}
          <select
            value={filterImpact}
            onChange={(e) => setFilterImpact(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Impact</option>
            <option value="high">High Impact</option>
            <option value="medium">Medium Impact</option>
            <option value="low">Low Impact</option>
          </select>
          
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        
        {/* Sort */}
        <div className="flex items-center gap-2">
          <SortDesc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="priority">Priority</option>
            <option value="impact">Impact</option>
            <option value="effort">Effort</option>
          </select>
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
        <div>
          Showing <span className="font-semibold text-gray-900 dark:text-white">
            {sorted.length}
          </span> of {recommendations.length} recommendations
        </div>
        
        <div>
          Total estimated time: <span className="font-semibold text-gray-900 dark:text-white">
            {sorted.reduce((sum, r) => sum + (r.estimated_hours || 0), 0)} hours
          </span>
        </div>
      </div>
      
      {/* List */}
      <div className="space-y-3">
        {sorted.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onCreateTask={() => onCreateTask?.(rec)}
            onDismiss={() => onDismiss?.(rec)}
            readonly={readonly}
          />
        ))}
      </div>
      
      {/* No Results After Filter */}
      {sorted.length === 0 && filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No recommendations match your filters. Try adjusting them.
          </p>
        </div>
      )}
    </div>
  );
}


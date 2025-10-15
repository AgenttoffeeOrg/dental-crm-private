/**
 * Mobile-Optimized Dashboard Component
 * 
 * UX Focus: Touch-friendly, swipeable, minimal scrolling.
 * Architecture: Responsive breakpoints, optimized for small screens.
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CompositeScoreCard } from './composite-score-card';
import { ScoreBadge } from '../shared/score-badge';
import type { AuditRun } from '@/lib/marketing-audit/types';

interface MobileDashboardProps {
  audit: AuditRun;
  onViewCategory?: (category: string) => void;
}

export function MobileDashboard({ audit, onViewCategory }: MobileDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  const categories = [
    { key: 'technical', label: 'Technical SEO', score: audit.technical_score, color: 'purple' },
    { key: 'local', label: 'Local Presence', score: audit.local_score, color: 'blue' },
    { key: 'content', label: 'Content', score: audit.content_score, color: 'green' },
    { key: 'analytics', label: 'Analytics', score: audit.analytics_score, color: 'orange' },
    { key: 'conversion', label: 'Conversion UX', score: audit.conversion_score, color: 'pink' },
  ];
  
  const topRecommendations = (audit.recommendations || []).slice(0, 5);
  
  return (
    <div className="space-y-4 pb-20"> {/* Extra padding for mobile nav */}
      {/* Composite Score - Always Visible */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center">
          <div className="text-5xl font-bold text-purple-600 mb-2">
            {audit.composite_score?.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Marketing Health Score
          </div>
          <ScoreBadge score={audit.composite_score || 0} size="md" showLabel />
          
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">
                #{audit.your_rank || '—'}
              </div>
              <div className="text-gray-500">Your Rank</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-white">
                {audit.percentile_rank?.toFixed(0) || '—'}th
              </div>
              <div className="text-gray-500">Percentile</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Scores - Collapsible */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('categories')}
          className="w-full p-4 flex items-center justify-between"
        >
          <span className="font-semibold text-gray-900 dark:text-white">
            Category Scores
          </span>
          {expandedSections.has('categories') ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.has('categories') && (
          <div className="px-4 pb-4 space-y-3">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => onViewCategory?.(cat.key)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg active:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {cat.label}
                </span>
                <ScoreBadge score={cat.score || 0} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Top Recommendations - Collapsible */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('recommendations')}
          className="w-full p-4 flex items-center justify-between"
        >
          <div className="text-left">
            <div className="font-semibold text-gray-900 dark:text-white">
              Top Recommendations
            </div>
            <div className="text-xs text-gray-500">
              {topRecommendations.length} high-priority items
            </div>
          </div>
          {expandedSections.has('recommendations') ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.has('recommendations') && (
          <div className="px-4 pb-4 space-y-3">
            {topRecommendations.map((rec, i) => (
              <div key={rec.id || i} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  {i + 1}. {rec.title}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {rec.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


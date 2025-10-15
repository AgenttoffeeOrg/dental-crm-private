/**
 * Recommendations Panel Component
 * 
 * Displays prioritized marketing audit recommendations with:
 * - Priority sorting
 * - Impact/Effort indicators
 * - Create Task button (opens slide-over)
 * - Dismiss button
 * - Filter by category
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  Filter,
  X,
  Plus
} from 'lucide-react';
import type { Recommendation } from '@/lib/marketing-audit/types';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  onCreateTask?: (rec: Recommendation) => void;
  onDismiss?: (recId: string) => void;
  onViewDetails?: (rec: Recommendation) => void;
}

export function RecommendationsPanel({
  recommendations,
  onCreateTask,
  onDismiss,
  onViewDetails,
}: RecommendationsPanelProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const categories = [
    { key: 'technical_seo', label: 'Technical', color: 'purple' },
    { key: 'local_presence', label: 'Local', color: 'blue' },
    { key: 'content_authority', label: 'Content', color: 'green' },
    { key: 'analytics_hygiene', label: 'Analytics', color: 'orange' },
    { key: 'conversion_ux', label: 'Conversion', color: 'pink' },
  ];
  
  const filtered = filter
    ? recommendations.filter(rec => rec.category === filter)
    : recommendations;
  
  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'bg-red-100 text-red-800 border-red-200';
    if (impact === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };
  
  const getEffortColor = (effort: string) => {
    if (effort === 'low') return 'bg-green-100 text-green-800 border-green-200';
    if (effort === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };
  
  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.key === category);
    const colors: Record<string, string> = {
      purple: 'bg-purple-100 text-purple-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      orange: 'bg-orange-100 text-orange-800',
      pink: 'bg-pink-100 text-pink-800',
    };
    return colors[cat?.color || 'purple'];
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recommended Actions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filtered.length} recommendation{filtered.length !== 1 ? 's' : ''} prioritized by impact and effort
            </p>
          </div>
        </div>
        
        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(null)}
            className="h-8"
          >
            All ({recommendations.length})
          </Button>
          {categories.map(cat => {
            const count = recommendations.filter(r => r.category === cat.key).length;
            return (
              <Button
                key={cat.key}
                variant={filter === cat.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(cat.key)}
                className="h-8"
              >
                {cat.label} ({count})
              </Button>
            );
          })}
        </div>
      </div>
      
      {/* Recommendations List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No recommendations in this category
            </p>
          </div>
        ) : (
          filtered.map((rec, index) => (
            <div key={rec.id || index} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
              {/* Recommendation Header */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {index + 1}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Title and Badges */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {rec.title}
                    </h3>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <Badge className={`border ${getImpactColor(rec.impact)}`} variant="outline">
                        {rec.impact} impact
                      </Badge>
                      <Badge className={`border ${getEffortColor(rec.effort)}`} variant="outline">
                        {rec.effort} effort
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Category & Time */}
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className={getCategoryColor(rec.category)} variant="secondary">
                      {categories.find(c => c.key === rec.category)?.label || rec.category}
                    </Badge>
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {rec.estimated_hours}h estimated
                    </span>
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Priority: {rec.priority_score}/100
                    </span>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {rec.description}
                  </p>
                  
                  {/* Current vs Target */}
                  {rec.current_value !== undefined && rec.target_value !== undefined && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Current: </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {rec.current_value}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Target: </span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {rec.target_value}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Steps (Expandable) */}
                  {rec.action_steps && rec.action_steps.length > 0 && (
                    <div className="mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                        className="h-7 text-xs px-2"
                      >
                        {expandedId === rec.id ? 'Hide' : 'Show'} action steps ({rec.action_steps.length})
                      </Button>
                      
                      {expandedId === rec.id && (
                        <ol className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400 pl-5 list-decimal">
                          {rec.action_steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {onCreateTask && (
                      <Button
                        size="sm"
                        onClick={() => onCreateTask(rec)}
                        className="h-9"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Create Task
                      </Button>
                    )}
                    
                    {onViewDetails && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(rec)}
                        className="h-9"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                    
                    {onDismiss && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDismiss(rec.id)}
                        className="h-9"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


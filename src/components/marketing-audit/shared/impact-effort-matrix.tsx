/**
 * Impact-Effort Matrix Component
 * 
 * 2x2 matrix showing recommendations by impact and effort.
 * User Experience: Visual prioritization - see quick wins vs long-term projects instantly.
 */

'use client';

import type { Recommendation } from '@/lib/marketing-audit/types';
import { Zap, Target, Clock, Award } from 'lucide-react';

interface ImpactEffortMatrixProps {
  recommendations: Recommendation[];
  onSelectRecommendation?: (rec: Recommendation) => void;
}

export function ImpactEffortMatrix({ recommendations, onSelectRecommendation }: ImpactEffortMatrixProps) {
  // Categorize recommendations
  const quickWins = recommendations.filter(r => r.impact === 'high' && r.effort === 'low');
  const majorProjects = recommendations.filter(r => r.impact === 'high' && r.effort === 'high');
  const fillIns = recommendations.filter(r => r.impact === 'low' && r.effort === 'low');
  const timeWasters = recommendations.filter(r => r.impact === 'low' && r.effort === 'high');
  const mediumEffort = recommendations.filter(r => r.effort === 'medium');
  
  const QuadrantCard = ({ 
    title, 
    icon: Icon, 
    items, 
    color, 
    description 
  }: { 
    title: string; 
    icon: any; 
    items: Recommendation[]; 
    color: string; 
    description: string;
  }) => (
    <div className={`p-5 rounded-lg border-2 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <span className="ml-auto text-sm font-bold">
          {items.length}
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      <div className="space-y-2">
        {items.slice(0, 3).map((rec, i) => (
          <button
            key={rec.id || i}
            onClick={() => onSelectRecommendation?.(rec)}
            className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            {rec.title}
          </button>
        ))}
        {items.length > 3 && (
          <div className="text-xs text-gray-500 text-center pt-1">
            +{items.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Impact-Effort Matrix
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Wins (High Impact, Low Effort) */}
        <QuadrantCard
          title="Quick Wins"
          icon={Zap}
          items={quickWins}
          color="border-green-200 bg-green-50 dark:bg-green-900/20"
          description="Do these first! High impact, low effort = maximum ROI"
        />
        
        {/* Major Projects (High Impact, High Effort) */}
        <QuadrantCard
          title="Major Projects"
          icon={Target}
          items={majorProjects}
          color="border-orange-200 bg-orange-50 dark:bg-orange-900/20"
          description="Plan carefully. High value but time-intensive"
        />
        
        {/* Fill-Ins (Low Impact, Low Effort) */}
        <QuadrantCard
          title="Fill-Ins"
          icon={Clock}
          items={fillIns}
          color="border-blue-200 bg-blue-50 dark:bg-blue-900/20"
          description="Do when you have spare time. Nice polish items"
        />
        
        {/* Time Wasters (Low Impact, High Effort) */}
        <QuadrantCard
          title="Time Wasters"
          icon={Award}
          items={timeWasters}
          color="border-gray-200 bg-gray-50 dark:bg-gray-900/50"
          description="Skip or defer. Not worth the investment right now"
        />
      </div>
      
      {/* Medium Effort Items */}
      {mediumEffort.length > 0 && (
        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Medium Effort Items ({mediumEffort.length})
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            These require moderate time investment. Prioritize by impact.
          </p>
        </div>
      )}
    </div>
  );
}


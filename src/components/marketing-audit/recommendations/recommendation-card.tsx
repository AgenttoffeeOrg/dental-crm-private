/**
 * Recommendation Card Component
 * 
 * Individual recommendation with all details and actions.
 * UX Focus: Scannable, actionable, clear priority.
 */

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  ChevronRight,
} from 'lucide-react';
import { PriorityBadge } from '../shared/priority-badge';
import { ActionStepsList } from '../shared/action-steps-list';
import { EvidenceCard } from '../shared/evidence-card';
import type { Recommendation } from '@/lib/marketing-audit/types';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onCreateTask?: () => void;
  onDismiss?: () => void;
  readonly?: boolean;
}

export function RecommendationCard({
  recommendation,
  onCreateTask,
  onDismiss,
  readonly = false,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const impactColor = {
    low: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    medium: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    high: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  };
  
  const effortColor = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-start gap-4">
          {/* Priority Badge */}
          <div className="flex-shrink-0 mt-1">
            <PriorityBadge priority={recommendation.impact} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {recommendation.title}
              </h3>
              
              {/* Expand Icon */}
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {recommendation.description}
            </p>
            
            {/* Meta Info */}
            <div className="flex items-center gap-4 flex-wrap text-xs">
              {/* Impact */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${impactColor[recommendation.impact]}`}>
                <Target className="w-3 h-3" />
                <span className="font-medium">{recommendation.impact} impact</span>
              </div>
              
              {/* Effort */}
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Clock className={`w-3 h-3 ${effortColor[recommendation.effort]}`} />
                <span>{recommendation.estimated_hours || 0}h effort</span>
              </div>
              
              {/* Current → Target */}
              {recommendation.current_value !== undefined && recommendation.target_value !== undefined && (
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="font-mono">{recommendation.current_value}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="font-mono text-green-600">{recommendation.target_value}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </button>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/50 space-y-5">
          {/* Action Steps */}
          {recommendation.action_steps && recommendation.action_steps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                How to Fix
              </h4>
              <ActionStepsList steps={recommendation.action_steps} />
            </div>
          )}
          
          {/* Evidence */}
          {recommendation.evidence && recommendation.evidence.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Evidence
              </h4>
              <div className="space-y-2">
                {recommendation.evidence.map((ev, i) => (
                  <EvidenceCard key={i} evidence={ev} />
                ))}
              </div>
            </div>
          )}
          
          {/* How It Helps */}
          {recommendation.expected_outcome && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                Expected Outcome
              </h4>
              <p className="text-sm text-green-800 dark:text-green-300">
                {recommendation.expected_outcome}
              </p>
            </div>
          )}
          
          {/* Actions */}
          {!readonly && (
            <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {onCreateTask && (
                <button
                  onClick={onCreateTask}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Create Task
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


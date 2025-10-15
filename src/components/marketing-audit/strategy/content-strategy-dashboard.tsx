/**
 * Content Strategy Dashboard Component
 * 
 * Phase 3: Actionable content strategy based on gaps and opportunities.
 * UX Focus: Clear roadmap, prioritized content ideas, easy implementation.
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, Calendar, CheckCircle, Clock } from 'lucide-react';
import { ContentStrategyWizard } from '@/lib/marketing-audit/content/content-strategy-wizard';
import type { ContentStrategyOutput } from '@/lib/marketing-audit/content/content-strategy-wizard';

interface ContentStrategyDashboardProps {
  gapData: {
    your_keywords: string[];
    competitor_keywords: Record<string, string[]>;
    content_gaps: Array<{
      keyword: string;
      search_volume: number;
      difficulty: number;
      opportunity_score: number;
    }>;
    current_content: Array<{
      url: string;
      title: string;
      word_count: number;
      last_updated: string;
    }>;
  };
}

export function ContentStrategyDashboard({ gapData }: ContentStrategyDashboardProps) {
  const [strategy, setStrategy] = useState<ContentStrategyOutput | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  
  useEffect(() => {
    const wizard = new ContentStrategyWizard();
    const result = wizard.generate(gapData);
    setStrategy(result);
  }, [gapData]);
  
  if (!strategy) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Immediate Actions */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-600 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              🚀 Immediate Content Opportunities
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              High-value content with the best chance of ranking quickly
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          {strategy.immediate_actions.map((action, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center font-bold text-purple-600">
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {action.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {action.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Target: {action.estimated_word_count}+ words</span>
                    <span>URL: {action.suggested_url}</span>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action.keywords_to_target.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded text-xs font-medium"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                  
                  <button className="mt-4 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">
                    Create Content Task →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 12-Week Content Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              12-Week Content Calendar
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Structured plan for consistent content creation
            </p>
          </div>
        </div>
        
        {/* Week selector */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {strategy.content_calendar.map(week => (
            <button
              key={week.week}
              onClick={() => setSelectedWeek(week.week)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0
                ${selectedWeek === week.week
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }
              `}
            >
              Week {week.week}
            </button>
          ))}
        </div>
        
        {/* Selected week details */}
        {strategy.content_calendar[selectedWeek - 1] && (
          <div className="space-y-3">
            {strategy.content_calendar[selectedWeek - 1].topics.map((topic, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      {topic}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span>Target keywords:</span>
                      {strategy.content_calendar[selectedWeek - 1].focus_keywords
                        .slice(index * 2, (index + 1) * 2)
                        .map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">
                            {kw}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Optimization Opportunities */}
      {strategy.optimization_opportunities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Content Optimization Opportunities
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Improve existing content for better rankings
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {strategy.optimization_opportunities.map((opp, index) => (
              <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {opp.existing_url}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Current: {opp.current_word_count} words → Target: {opp.suggested_word_count} words
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <strong>Add keywords:</strong> {opp.keywords_to_add.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Editorial Calendar Component
 * 
 * Phase 3: Drag-and-drop content calendar for planning.
 * UX Focus: Visual planning, easy rescheduling, clear deadlines.
 */

'use client';

import { useState } from 'react';
import { Calendar, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';

interface EditorialCalendarProps {
  initialPlan?: Array<{
    id: string;
    week: number;
    topic: string;
    keywords: string[];
    status: 'planned' | 'in_progress' | 'published';
    assigned_to?: string;
    due_date?: string;
  }>;
  onUpdatePlan?: (plan: any[]) => void;
}

export function EditorialCalendar({ initialPlan = [], onUpdatePlan }: EditorialCalendarProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const getPlanForWeek = (week: number) => {
    return plan.filter(item => item.week === week);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Editorial Calendar - Next 12 Weeks
              </h3>
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Content
            </button>
          </div>
        </div>
        
        {/* Week Selector */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 overflow-x-auto">
          {weeks.map(week => {
            const weekPlan = getPlanForWeek(week);
            const hasContent = weekPlan.length > 0;
            const allPublished = weekPlan.every(p => p.status === 'published');
            
            return (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`
                  relative flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${selectedWeek === week
                    ? 'bg-purple-600 text-white'
                    : hasContent
                    ? allPublished
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }
                `}
              >
                Week {week}
                {hasContent && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">
                    {weekPlan.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Selected Week Content */}
        <div className="p-5">
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Week {selectedWeek} - {new Date(Date.now() + (selectedWeek - 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </h4>
          </div>
          
          {getPlanForWeek(selectedWeek).length > 0 ? (
            <div className="space-y-3">
              {getPlanForWeek(selectedWeek).map(item => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        {item.topic}
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {item.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded text-xs"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {item.due_date && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Due: {new Date(item.due_date).toLocaleDateString()}
                      {item.assigned_to && ` • Assigned to: ${item.assigned_to}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-500">
              No content planned for this week.{' '}
              <button
                onClick={() => setShowAddModal(true)}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Add content
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Progress Summary
        </h4>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan.filter(p => p.status === 'planned').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Planned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {plan.filter(p => p.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {plan.filter(p => p.status === 'published').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Published</div>
          </div>
        </div>
      </div>
    </div>
  );
}


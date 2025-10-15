/**
 * Bulk Operations Panel Component
 * 
 * Batch actions on multiple recommendations/competitors.
 * UX Focus: Save time, manage many items efficiently.
 */

'use client';

import { useState } from 'react';
import { CheckSquare, Square, Trash2, Check, FileDown } from 'lucide-react';
import type { Recommendation } from '@/lib/marketing-audit/types';

interface BulkOperationsPanelProps {
  items: Recommendation[];
  onBulkDismiss?: (ids: string[]) => void;
  onBulkCreateTasks?: (ids: string[]) => void;
  onBulkExport?: (ids: string[]) => void;
}

export function BulkOperationsPanel({
  items,
  onBulkDismiss,
  onBulkCreateTasks,
  onBulkExport,
}: BulkOperationsPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };
  
  const handleBulkAction = async (action: 'dismiss' | 'create-tasks' | 'export') => {
    if (selectedIds.size === 0) return;
    
    setProcessing(true);
    const ids = Array.from(selectedIds);
    
    try {
      switch (action) {
        case 'dismiss':
          await onBulkDismiss?.(ids);
          break;
        case 'create-tasks':
          await onBulkCreateTasks?.(ids);
          break;
        case 'export':
          await onBulkExport?.(ids);
          break;
      }
      
      setSelectedIds(new Set());
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Bulk Actions Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Select All */}
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {selectedIds.size === items.length ? (
                <CheckSquare className="w-5 h-5 text-purple-600" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              Select All ({items.length})
            </button>
            
            {selectedIds.size > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.size} selected
              </span>
            )}
          </div>
          
          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('create-tasks')}
                disabled={processing}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Create {selectedIds.size} Tasks
              </button>
              
              <button
                onClick={() => handleBulkAction('export')}
                disabled={processing}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                Export
              </button>
              
              <button
                onClick={() => handleBulkAction('dismiss')}
                disabled={processing}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Items List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={() => toggleSelect(item.id)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                {item.title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {item.description}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className={`
                px-2 py-1 rounded-full font-medium
                ${item.impact === 'high'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : item.impact === 'medium'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                }
              `}>
                {item.impact}
              </span>
              
              <span className="text-gray-500">
                {item.estimated_hours || 0}h
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}


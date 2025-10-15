/**
 * Empty State Component
 * 
 * Friendly, helpful empty states with clear CTAs.
 * UX Focus: Never leave user confused - always show next action.
 */

'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'compact';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className="text-center py-8">
        <Icon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
          {title}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="text-center py-12 px-6">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full mb-4">
        <Icon className="w-8 h-8 text-purple-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {description}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}


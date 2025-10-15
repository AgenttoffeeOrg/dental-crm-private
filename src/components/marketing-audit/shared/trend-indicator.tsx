/**
 * Trend Indicator Component
 * 
 * Visual indicator for score/metric trends (up, down, stable).
 * UX Focus: Instant understanding of performance direction.
 */

'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  current: number;
  previous: number;
  showValue?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  inverse?: boolean; // For metrics where lower is better (e.g., load time)
}

export function TrendIndicator({
  current,
  previous,
  showValue = true,
  showIcon = true,
  size = 'md',
  inverse = false,
}: TrendIndicatorProps) {
  const delta = current - previous;
  const percentChange = previous !== 0 ? ((delta / previous) * 100) : 0;
  
  // Determine if trend is positive, negative, or neutral
  const isPositive = inverse ? delta < 0 : delta > 0;
  const isNegative = inverse ? delta > 0 : delta < 0;
  const isNeutral = Math.abs(delta) < 0.1; // Less than 0.1 difference = neutral
  
  // Size classes
  const sizeClasses = {
    sm: {
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    lg: {
      icon: 'w-5 h-5',
      text: 'text-base',
    },
  };
  
  // Color classes
  const colorClasses = isNeutral
    ? 'text-gray-600 dark:text-gray-400'
    : isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';
  
  // Icon component
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div className={`flex items-center gap-1 ${colorClasses} ${sizeClasses[size].text}`}>
      {showIcon && <Icon className={sizeClasses[size].icon} />}
      {showValue && (
        <span className="font-semibold">
          {isPositive && '+'}
          {delta.toFixed(1)}
          {Math.abs(percentChange) > 0 && ` (${percentChange.toFixed(1)}%)`}
        </span>
      )}
    </div>
  );
}


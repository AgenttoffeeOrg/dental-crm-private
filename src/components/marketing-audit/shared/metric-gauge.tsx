/**
 * Metric Gauge Component
 * 
 * Visual gauge for displaying metrics with thresholds.
 * Can be circular or linear.
 */

'use client';

import { cn } from '@/lib/utils';

interface MetricGaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  variant?: 'circular' | 'linear';
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue';
  showValue?: boolean;
}

export function MetricGauge({
  value,
  max,
  label,
  unit,
  variant = 'linear',
  size = 'md',
  color = 'purple',
  showValue = true,
}: MetricGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colorClasses = {
    green: 'text-green-600 bg-green-500',
    yellow: 'text-yellow-600 bg-yellow-500',
    orange: 'text-orange-600 bg-orange-500',
    red: 'text-red-600 bg-red-500',
    purple: 'text-purple-600 bg-purple-500',
    blue: 'text-blue-600 bg-blue-500',
  };
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };
  
  if (variant === 'circular') {
    const size = { sm: 60, md: 80, lg: 100 }[size];
    const strokeWidth = { sm: 4, md: 6, lg: 8 }[size];
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="text-center">
        <svg width={size} height={size} className="transform -rotate-90 mx-auto">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-500', colorClasses[color].split(' ')[0])}
          />
        </svg>
        <div className="mt-2">
          {showValue && (
            <div className={cn('text-lg font-bold', colorClasses[color].split(' ')[0])}>
              {value}{unit}
            </div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {label}
          </div>
        </div>
      </div>
    );
  }
  
  // Linear variant
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        {showValue && (
          <span className={cn('text-sm font-bold', colorClasses[color].split(' ')[0])}>
            {value}{unit} / {max}{unit}
          </span>
        )}
      </div>
      <div className={cn('w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color].split(' ')[1])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0</span>
        <span>{percentage.toFixed(0)}%</span>
        <span>{max}</span>
      </div>
    </div>
  );
}


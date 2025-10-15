/**
 * Circular Progress Component
 * 
 * Beautiful circular progress indicator for scores and percentages.
 * Supports custom colors, sizes, and children content in the center.
 */

'use client';

import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  showPercentage?: boolean;
  color?: 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue';
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  showPercentage = false,
  color,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = () => {
    if (color) {
      const colors = {
        green: 'text-green-600',
        yellow: 'text-yellow-600',
        orange: 'text-orange-600',
        red: 'text-red-600',
        purple: 'text-purple-600',
        blue: 'text-blue-600',
      };
      return colors[color];
    }
    
    // Auto color based on value
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    if (value >= 40) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const colorClass = getColor();
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        
        {/* Progress circle */}
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
          className={cn('transition-all duration-500 ease-out', colorClass, className)}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercentage && (
          <div className={cn('text-center', colorClass)}>
            <div className="text-2xl font-bold">
              {value.toFixed(1)}
            </div>
            {value < 100 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                out of 100
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


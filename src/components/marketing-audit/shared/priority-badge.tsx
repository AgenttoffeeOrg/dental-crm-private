/**
 * Priority Badge Component
 * 
 * Displays impact/effort/confidence indicators.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  type: 'impact' | 'effort' | 'confidence';
  level: 'high' | 'medium' | 'low';
  className?: string;
}

export function PriorityBadge({ type, level, className }: PriorityBadgeProps) {
  const getColor = () => {
    if (type === 'impact') {
      return {
        high: 'bg-red-100 text-red-800 border-red-200',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        low: 'bg-blue-100 text-blue-800 border-blue-200',
      }[level];
    }
    
    if (type === 'effort') {
      return {
        low: 'bg-green-100 text-green-800 border-green-200',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        high: 'bg-red-100 text-red-800 border-red-200',
      }[level];
    }
    
    return {
      high: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200',
    }[level];
  };
  
  return (
    <Badge
      className={cn('border text-xs', getColor(), className)}
      variant="outline"
    >
      {level} {type}
    </Badge>
  );
}


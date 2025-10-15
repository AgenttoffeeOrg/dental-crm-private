/**
 * Score Badge Component
 * 
 * Displays a score with color-coded badge.
 * Used throughout the audit interface for consistent score display.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ScoreBadge({ score, size = 'md', showLabel = false, className }: ScoreBadgeProps) {
  const getScoreData = (score: number) => {
    if (score >= 90) return { label: 'Excellent', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
    if (score >= 80) return { label: 'Very Good', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    if (score >= 70) return { label: 'Good', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' };
    if (score >= 60) return { label: 'Fair', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    if (score >= 40) return { label: 'Needs Work', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    return { label: 'Poor', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  const data = getScoreData(score);
  
  return (
    <Badge 
      className={cn(
        `${data.bg} ${data.text} border ${data.border} font-semibold`,
        sizeClasses[size],
        className
      )}
      variant="outline"
    >
      {score.toFixed(1)}
      {showLabel && ` - ${data.label}`}
    </Badge>
  );
}


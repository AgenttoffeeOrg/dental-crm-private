/**
 * Progress Ring Animation Component
 * 
 * Animated circular progress indicator for scores.
 * UX Focus: Smooth, satisfying animation that draws attention to scores.
 */

'use client';

import { useEffect, useState } from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  duration?: number;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#8B5CF6',
  backgroundColor = '#E5E7EB',
  duration = 1000,
  children,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startProgress = animatedProgress;
    const progressDiff = progress - startProgress;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const percentage = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic function
      const eased = 1 - Math.pow(1 - percentage, 3);
      const currentProgress = startProgress + (progressDiff * eased);
      
      setAnimatedProgress(currentProgress);
      
      if (percentage < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [progress]);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.3s ease',
          }}
        />
      </svg>
      
      {/* Content in center */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}


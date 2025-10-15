/**
 * Count Up Animation Component
 * 
 * Animated number counter for scores and metrics.
 * UX Focus: Satisfying visual feedback that emphasizes improvements.
 */

'use client';

import { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  onComplete?: () => void;
}

export function CountUp({
  end,
  start = 0,
  duration = 2000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  onComplete,
}: CountUpProps) {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  
  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentCount = start + (end - start) * eased;
      countRef.current = currentCount;
      setCount(currentCount);
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, start, duration, onComplete]);
  
  const formattedCount = count.toFixed(decimals);
  
  return (
    <span className={className}>
      {prefix}{formattedCount}{suffix}
    </span>
  );
}


/**
 * Skeleton Pulse Animation Component
 * 
 * Smooth pulsing animation for loading skeletons.
 * UX Focus: Indicate loading without frustration, maintain user engagement.
 */

'use client';

interface SkeletonPulseProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  count?: number;
  gap?: number;
}

export function SkeletonPulse({
  className = '',
  width = '100%',
  height = '20px',
  rounded = 'md',
  count = 1,
  gap = 12,
}: SkeletonPulseProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };
  
  const skeletons = Array.from({ length: count }, (_, i) => i);
  
  return (
    <>
      {skeletons.map((_, index) => (
        <div
          key={index}
          className={`
            bg-gray-200 dark:bg-gray-700 animate-pulse
            ${roundedClasses[rounded]}
            ${className}
          `}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            marginBottom: index < count - 1 ? `${gap}px` : 0,
            animationDelay: `${index * 100}ms`,
          }}
        />
      ))}
    </>
  );
}


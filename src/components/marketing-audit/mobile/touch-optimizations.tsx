/**
 * Mobile Touch Optimizations
 * 
 * Enhance touch interactions for mobile devices.
 * UX Focus: Responsive, natural feeling touch interactions.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Touch-optimized button with haptic feedback (if supported)
 */
interface TouchButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export function TouchButton({ children, onClick, className = '', disabled = false }: TouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  const handleTouchStart = () => {
    if (disabled) return;
    setIsPressed(true);
    
    // Haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };
  
  const handleTouchEnd = () => {
    setIsPressed(false);
    if (!disabled) {
      onClick();
    }
  };
  
  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${className}
        ${isPressed ? 'scale-95' : 'scale-100'}
        transition-transform duration-100
        touch-manipulation
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        minHeight: '44px', // Apple's recommended minimum
        minWidth: '44px',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Swipeable card with velocity tracking
 */
interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  className = '',
}: SwipeableCardProps) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX - startX);
  };
  
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    if (currentX > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (currentX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    
    setIsDragging(false);
    setCurrentX(0);
  };
  
  return (
    <div
      ref={ref}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={className}
      style={{
        transform: `translateX(${currentX}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Pull-to-refresh component
 */
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || containerRef.current?.scrollTop !== 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    setPullDistance(Math.min(distance, threshold * 1.5));
  };
  
  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    
    setPullDistance(0);
    setStartY(0);
  };
  
  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-auto"
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance / threshold,
        }}
      >
        <div className={`
          w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full
          ${isRefreshing ? 'animate-spin' : ''}
        `} />
      </div>
      
      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Long press handler
 */
export function useLongPress(
  callback: () => void,
  duration: number = 500
): {
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
} {
  const timerRef = useRef<NodeJS.Timeout>();
  
  const start = () => {
    timerRef.current = setTimeout(callback, duration);
  };
  
  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };
  
  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
  };
}


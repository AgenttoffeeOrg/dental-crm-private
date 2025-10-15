/**
 * Slide In Animation Component
 * 
 * Smooth slide-in animation for panels and modals.
 * UX Focus: Natural, physics-based motion.
 */

'use client';

import { useEffect, useState } from 'react';

interface SlideInProps {
  children: React.ReactNode;
  isOpen: boolean;
  from?: 'left' | 'right' | 'top' | 'bottom';
  duration?: number;
  className?: string;
}

export function SlideIn({
  children,
  isOpen,
  from = 'right',
  duration = 300,
  className = '',
}: SlideInProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);
  
  if (!shouldRender) return null;
  
  const getTransform = () => {
    if (isOpen) return 'translate(0, 0)';
    
    switch (from) {
      case 'left':
        return 'translate(-100%, 0)';
      case 'right':
        return 'translate(100%, 0)';
      case 'top':
        return 'translate(0, -100%)';
      case 'bottom':
        return 'translate(0, 100%)';
      default:
        return 'translate(0, 0)';
    }
  };
  
  return (
    <div
      className={className}
      style={{
        transform: getTransform(),
        transition: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      {children}
    </div>
  );
}


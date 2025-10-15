/**
 * Stagger Children Animation Component
 * 
 * Animate children with staggered delays for elegant sequential reveals.
 * UX Focus: Create flow and hierarchy through motion.
 */

'use client';

import { Children, cloneElement, isValidElement } from 'react';

interface StaggerChildrenProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggerChildren({
  children,
  staggerDelay = 100,
  className = '',
}: StaggerChildrenProps) {
  const childArray = Children.toArray(children);
  
  return (
    <div className={className}>
      {childArray.map((child, index) => {
        if (!isValidElement(child)) return child;
        
        return cloneElement(child as React.ReactElement<any>, {
          key: index,
          style: {
            ...child.props.style,
            animationDelay: `${index * staggerDelay}ms`,
          },
          className: `${child.props.className || ''} animate-fade-in-up`,
        });
      })}
    </div>
  );
}


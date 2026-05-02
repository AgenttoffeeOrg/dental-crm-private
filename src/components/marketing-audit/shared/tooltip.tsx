/**
 * Tooltip Component
 * 
 * Accessible tooltip for hover help text.
 * UX Focus: Contextual help without clutter.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  showIcon = true,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      
      let x = 0;
      let y = 0;
      
      switch (position) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 8;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + 8;
          break;
        case 'left':
          x = rect.left - 8;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 8;
          y = rect.top + rect.height / 2;
          break;
      }
      
      setCoords({ x, y });
    }
  }, [visible, position]);
  
  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Trigger */}
      {children || (
        showIcon && (
          <button className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
        )
      )}
      
      {/* Tooltip */}
      {visible && (
        <div
          className={`
            fixed z-50 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg
            max-w-xs
            ${position === 'top' ? '-translate-x-1/2 -translate-y-full' : ''}
            ${position === 'bottom' ? '-translate-x-1/2' : ''}
            ${position === 'left' ? '-translate-x-full -translate-y-1/2' : ''}
            ${position === 'right' ? '-translate-y-1/2' : ''}
          `}
          style={(() => {
            const styles: React.CSSProperties = {}
            if (position === 'top' || position === 'bottom') {
              styles.left = `${coords.x}px`
            }
            if (position === 'top') {
              styles.top = `${coords.y}px`
            }
            if (position === 'bottom') {
              styles.bottom = `calc(100vh - ${coords.y}px)`
            }
            if (position === 'left') {
              styles.right = `calc(100vw - ${coords.x}px)`
              styles.top = `${coords.y}px`
            }
            if (position === 'right') {
              styles.left = `${coords.x}px`
              styles.top = `${coords.y}px`
            }
            return styles
          })()}
        >
          {content}
          
          {/* Arrow */}
          <div
            className={`
              absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45
              ${position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' : ''}
              ${position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
              ${position === 'left' ? 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2' : ''}
              ${position === 'right' ? 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
}


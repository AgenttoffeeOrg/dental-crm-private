'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SimpleDropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}

export function SimpleDropdownMenu({
  trigger,
  children,
  align = 'end',
  className
}: SimpleDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        triggerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          console.log('[SimpleDropdown] Toggle clicked, current state:', isOpen)
          setIsOpen(!isOpen)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            console.log('[SimpleDropdown] Toggle key pressed, current state:', isOpen)
            setIsOpen(!isOpen)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Toggle dropdown menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute mt-1 min-w-[12rem] bg-white border border-gray-200 rounded-md shadow-lg z-[200] py-1',
            align === 'end' ? 'right-0' : 'left-0',
            className
          )}
          style={{ top: '100%' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface SimpleDropdownMenuItemProps {
  onClick?: () => void
  children: ReactNode
  className?: string
  destructive?: boolean
}

export function SimpleDropdownMenuItem({
  onClick,
  children,
  className,
  destructive = false
}: SimpleDropdownMenuItemProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left',
        destructive
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : 'text-gray-700 hover:bg-gray-100',
        className
      )}
    >
      {children}
    </button>
  )
}

interface SimpleDropdownMenuSeparatorProps {
  className?: string
}

export function SimpleDropdownMenuSeparator({ className }: SimpleDropdownMenuSeparatorProps) {
  return <div className={cn('my-1 border-t border-gray-200', className)} />
}



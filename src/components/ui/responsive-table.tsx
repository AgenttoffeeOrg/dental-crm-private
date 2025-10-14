'use client'

import React from 'react'

/**
 * ResponsiveTable - Automatically makes tables horizontally scrollable on mobile
 * Wraps any table in a mobile-friendly container
 */
export function ResponsiveTable({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * MobileCard - Alternative to tables on very small screens
 * Displays data in a card format
 */
export function MobileCard({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`block sm:hidden bg-white rounded-lg shadow p-4 mb-4 ${className}`}>
      {children}
    </div>
  )
}

/**
 * DesktopTable - Hides on mobile, shows on desktop
 */
export function DesktopTable({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`hidden sm:block ${className}`}>
      {children}
    </div>
  )
}


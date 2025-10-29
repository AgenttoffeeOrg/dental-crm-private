'use client'

/**
 * Compact Mode Toggle Button
 * 
 * Allows users to switch between normal and compact card display
 * Preference persists in localStorage
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LayoutList, LayoutGrid } from 'lucide-react'
import { getCompactMode, setCompactMode } from '@/lib/storage/compact-mode'

interface CompactModeToggleProps {
  onToggle?: (isCompact: boolean) => void
  className?: string
}

export function CompactModeToggle({ onToggle, className = '' }: CompactModeToggleProps) {
  const [isCompact, setIsCompact] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Initialize from localStorage after mount (avoid hydration mismatch)
  useEffect(() => {
    setIsCompact(getCompactMode())
    setMounted(true)
  }, [])
  
  const handleToggle = () => {
    const newValue = !isCompact
    setIsCompact(newValue)
    setCompactMode(newValue)
    onToggle?.(newValue)
  }
  
  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return <div className="h-10 w-10" /> // Placeholder
  }
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className={`h-10 w-10 p-0 ${className}`}
      title={isCompact ? 'Switch to normal view' : 'Switch to compact view'}
    >
      {isCompact ? (
        <LayoutList className="h-4 w-4" />
      ) : (
        <LayoutGrid className="h-4 w-4" />
      )}
    </Button>
  )
}



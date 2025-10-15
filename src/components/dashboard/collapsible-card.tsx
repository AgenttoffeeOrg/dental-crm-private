'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CollapsibleCardProps {
  title: string | React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  storageKey?: string
  icon?: React.ReactNode
  className?: string
}

/**
 * Collapsible Card Component
 * 
 * Provides expandable/collapsible functionality for dashboard widgets.
 * Remembers user's preference using localStorage.
 * Smooth animations for professional UX.
 */
export function CollapsibleCard({
  title,
  children,
  defaultExpanded = true,
  storageKey,
  icon,
  className = ''
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Load saved preference from localStorage
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`collapsible-${storageKey}`)
      if (saved !== null) {
        setIsExpanded(saved === 'true')
      }
    }
  }, [storageKey])

  // Save preference to localStorage
  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    if (storageKey) {
      localStorage.setItem(`collapsible-${storageKey}`, String(newState))
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="cursor-pointer" onClick={toggleExpanded}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation()
              toggleExpanded()
            }}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <CardContent className="pt-0">
          {children}
        </CardContent>
      </div>
    </Card>
  )
}


'use client'

import { Button } from './button'
import { analytics } from '@/lib/analytics-sdk'
import { ComponentProps } from 'react'

interface TrackedButtonProps extends ComponentProps<typeof Button> {
  trackingName: string
  trackingCategory?: string
}

export function TrackedButton({ 
  trackingName, 
  trackingCategory,
  onClick,
  children,
  ...props 
}: TrackedButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Track the click
    analytics.trackClick(trackingName, trackingCategory)
    
    // Call original onClick
    onClick?.(e)
  }

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  )
}


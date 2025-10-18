'use client'

/**
 * Demo Mode Banner
 * 
 * Displays at the top of the page when DEMO_MODE is enabled.
 * Alerts users that they're in a sandbox environment.
 */

import { X } from 'lucide-react'
import { useState, useEffect } from 'react'

export function DemoBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if demo mode is enabled
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
    
    // Check if user has dismissed the banner in this session
    const wasDismissed = sessionStorage.getItem('demo-banner-dismissed') === 'true'
    
    setVisible(isDemoMode && !wasDismissed)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    setVisible(false)
    sessionStorage.setItem('demo-banner-dismissed', 'true')
  }

  if (!visible || dismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 border-b-2 border-yellow-500 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                🎭
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Demo Mode — Sandbox Environment
              </p>
              <p className="text-xs text-gray-700">
                This is a demonstration environment. Changes may reset periodically. No real data is affected.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-yellow-500/20 rounded transition-colors"
            aria-label="Dismiss demo banner"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  )
}


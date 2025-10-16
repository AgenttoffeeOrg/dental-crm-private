'use client'

/**
 * Automations Page
 * 
 * Top-level entry point for all workflow automation
 * Currently redirects to Marketing Journeys, but can expand to show:
 * - All automation workflows (Marketing + CRM + Integrations)
 * - Unified automation dashboard
 * - Cross-module automation builder
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AutomationsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // For now, redirect to Marketing Journeys
    // In future, this will be a unified automation hub
    router.push('/marketing/journeys')
  }, [router])
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
    </div>
  )
}


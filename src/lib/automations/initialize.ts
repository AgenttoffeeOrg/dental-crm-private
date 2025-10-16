/**
 * AUTOMATION SYSTEM INITIALIZATION
 * 
 * Call this on app startup to initialize the complete automation system:
 * - Unified event system
 * - Automation event listener
 * - Event-to-automation mapping
 */

import { setupUnifiedEventListeners } from '@/lib/events-unified'
import { initializeAutomationEventListener } from '@/lib/automations/automation-event-listener'

/**
 * Initialize the complete automation system
 * 
 * Call this in your app's main layout or _app.tsx:
 * ```typescript
 * import { initializeAutomationSystem } from '@/lib/automations/initialize'
 * 
 * // On app mount
 * useEffect(() => {
 *   initializeAutomationSystem()
 * }, [])
 * ```
 */
export function initializeAutomationSystem(): void {
  console.log('[Automation System] Initializing...')
  
  try {
    // 1. Setup unified event listeners
    setupUnifiedEventListeners()
    
    // 2. Initialize automation event listener
    initializeAutomationEventListener()
    
    console.log('[Automation System] ✅ Initialized successfully')
    console.log('[Automation System] All events will now trigger matching automations')
  } catch (error) {
    console.error('[Automation System] ❌ Failed to initialize:', error)
  }
}

/**
 * Check if automation system is healthy
 */
export function checkAutomationSystemHealth(): {
  isHealthy: boolean
  message: string
} {
  // Add health checks here
  return {
    isHealthy: true,
    message: 'Automation system is running'
  }
}


// Simple in-process event system for the CRM
// In a production system, you might want to use a more robust event system

type EventCallback = (data: unknown) => void | Promise<void>

interface EventMap {
  'ACTIVITY.CREATED': { activityId: string; type: string; contactId?: string; dealId?: string }
  'DEAL.MOVED': { dealId: string; fromStageId: string; toStageId: string; userId?: string }
  'DEAL.CREATED': { dealId: string; contactId: string; userId?: string }
  'DEAL.UPDATED': { dealId: string; changes: Record<string, unknown>; userId?: string }
  'TASK.CREATED': { taskId: string; title: string; assigneeUserId?: string; autoCreated: boolean }
  'TASK.COMPLETED': { taskId: string; userId?: string }
  'TASK.ASSIGNED': { taskId: string; fromUserId?: string; toUserId: string }
  'CONTACT.CREATED': { contactId: string; source?: string; userId?: string }
  'CONTACT.UPDATED': { contactId: string; changes: Record<string, unknown>; userId?: string }
  'FILE.UPLOADED': { fileId: string; kind: string; activityId?: string }
  'AI.PROCESSING_STARTED': { activityId: string; kind: string }
  'AI.PROCESSING_COMPLETED': { activityId: string; kind: string; artifactIds: string[] }
  'AI.PROCESSING_FAILED': { activityId: string; kind: string; error: string }
}

class EventService {
  private listeners: Map<string, Set<EventCallback>> = new Map()

  /**
   * Subscribe to an event
   */
  on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void | Promise<void>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const eventListeners = this.listeners.get(event)!
    eventListeners.add(callback as EventCallback)

    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback as EventCallback)
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   */
  once<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void | Promise<void>): () => void {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe()
      callback(data)
    })
    return unsubscribe
  }

  /**
   * Emit an event
   */
  async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
    const listeners = this.listeners.get(event)
    if (!listeners || listeners.size === 0) {
      // Log the event even if no listeners
      console.log('[Event]', event, ':', data)
      return
    }

    console.log('[Event]', event, '(', listeners.size, 'listeners):', data)

    // Execute all listeners
    const promises = Array.from(listeners).map(async (listener) => {
      try {
        await listener(data)
      } catch (error) {
        console.error('[Event] Error in', event, 'listener:', error)
      }
    })

    await Promise.allSettled(promises)
  }

  /**
   * Remove all listeners for an event
   */
  off<K extends keyof EventMap>(event: K): void {
    this.listeners.delete(event)
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear()
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event)?.size || 0
  }

  /**
   * Get all registered events
   */
  getEvents(): string[] {
    return Array.from(this.listeners.keys())
  }
}

// Export singleton instance
export const eventService = new EventService()

// Convenience functions for common events
export const events = {
  // Activity events
  activityCreated: (data: EventMap['ACTIVITY.CREATED']) => 
    eventService.emit('ACTIVITY.CREATED', data),

  // Deal events
  dealMoved: (data: EventMap['DEAL.MOVED']) => 
    eventService.emit('DEAL.MOVED', data),
  
  dealCreated: (data: EventMap['DEAL.CREATED']) => 
    eventService.emit('DEAL.CREATED', data),
  
  dealUpdated: (data: EventMap['DEAL.UPDATED']) => 
    eventService.emit('DEAL.UPDATED', data),

  // Task events
  taskCreated: (data: EventMap['TASK.CREATED']) => 
    eventService.emit('TASK.CREATED', data),
  
  taskCompleted: (data: EventMap['TASK.COMPLETED']) => 
    eventService.emit('TASK.COMPLETED', data),
  
  taskAssigned: (data: EventMap['TASK.ASSIGNED']) => 
    eventService.emit('TASK.ASSIGNED', data),

  // Contact events
  contactCreated: (data: EventMap['CONTACT.CREATED']) => 
    eventService.emit('CONTACT.CREATED', data),
  
  contactUpdated: (data: EventMap['CONTACT.UPDATED']) => 
    eventService.emit('CONTACT.UPDATED', data),

  // File events
  fileUploaded: (data: EventMap['FILE.UPLOADED']) => 
    eventService.emit('FILE.UPLOADED', data),

  // AI events
  aiProcessingStarted: (data: EventMap['AI.PROCESSING_STARTED']) => 
    eventService.emit('AI.PROCESSING_STARTED', data),
  
  aiProcessingCompleted: (data: EventMap['AI.PROCESSING_COMPLETED']) => 
    eventService.emit('AI.PROCESSING_COMPLETED', data),
  
  aiProcessingFailed: (data: EventMap['AI.PROCESSING_FAILED']) => 
    eventService.emit('AI.PROCESSING_FAILED', data),
}

// Example usage and setup of common event listeners
export function setupEventListeners() {
  // Log all events in development
  if (process.env.NODE_ENV === 'development') {
    const allEvents: (keyof EventMap)[] = [
      'ACTIVITY.CREATED', 'DEAL.MOVED', 'DEAL.CREATED', 'DEAL.UPDATED',
      'TASK.CREATED', 'TASK.COMPLETED', 'TASK.ASSIGNED',
      'CONTACT.CREATED', 'CONTACT.UPDATED',
      'FILE.UPLOADED', 'AI.PROCESSING_STARTED', 'AI.PROCESSING_COMPLETED', 'AI.PROCESSING_FAILED'
    ]

    allEvents.forEach(event => {
      eventService.on(event, (data) => {
        console.log('[CRM Event]', event, ':', data)
      })
    })
  }

  // Example: Update deal last_activity_at when activity is created
  eventService.on('ACTIVITY.CREATED', async ({ activityId, dealId }) => {
    if (dealId) {
      // In a real app, you'd update the deal's last_activity_at here
      console.log(`[Auto] Updating deal ${dealId} last_activity_at due to activity ${activityId}`)
    }
  })

  // Example: Create audit entries for important events
  eventService.on('DEAL.MOVED', async ({ dealId, fromStageId, toStageId, userId }) => {
    console.log(`[Audit] Deal ${dealId} moved from ${fromStageId} to ${toStageId} by ${userId}`)
  })
}

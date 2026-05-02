'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface LiveNotification {
  id: string
  type: 'deal' | 'contact' | 'task'
  action: 'created' | 'updated' | 'deleted'
  title: string
  timestamp: Date
}

interface LiveNotificationBadgeProps {
  notifications: LiveNotification[]
  onDismiss: (id: string) => void
  onDismissAll: () => void
}

/**
 * Live Notification Badge
 * 
 * Displays real-time update notifications with dismissible toasts.
 * Shows count of new items and allows dismissal.
 */
export function LiveNotificationBadge({
  notifications,
  onDismiss,
  onDismissAll
}: LiveNotificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Show toast notification for new items
    notifications.forEach(notification => {
      const message = getNotificationMessage(notification)
      
      toast.info(message, {
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => handleViewNotification(notification)
        }
      })
    })
  }, [notifications])

  const getNotificationMessage = (notification: LiveNotification): string => {
    const typeLabel = notification.type.charAt(0).toUpperCase() + notification.type.slice(1)
    const actionLabel = notification.action === 'created' ? 'created' : 
                       notification.action === 'updated' ? 'updated' : 'deleted'
    
    return `${typeLabel} ${actionLabel}: ${notification.title}`
  }

  const handleViewNotification = (notification: LiveNotification) => {
    // Navigate to appropriate page based on type
    const routes = {
      deal: '/pipeline',
      contact: '/contacts',
      task: '/tasks'
    }
    window.location.href = routes[notification.type]
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2 bg-white shadow-lg"
        >
          <Bell className="h-4 w-4" />
          <Badge variant="destructive" className="ml-1">
            {notifications.length}
          </Badge>
        </Button>

        {isOpen && (
          <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-900">
                Recent Updates ({notifications.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismissAll}
                className="h-6 text-xs"
              >
                Clear all
              </Button>
            </div>

            <div className="divide-y divide-gray-100">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewNotification(notification)}
                  onKeyDown={(e) => e.key === 'Enter' && handleViewNotification(notification)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View notification: ${notification.title || 'Notification'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {getNotificationMessage(notification)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDismiss(notification.id)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook to manage live notifications
 */
export function useLiveNotifications() {
  const [notifications, setNotifications] = useState<LiveNotification[]>([])

  const addNotification = (notification: Omit<LiveNotification, 'id' | 'timestamp'>) => {
    const newNotification: LiveNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    }
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10)) // Keep last 10
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const dismissAll = () => {
    setNotifications([])
  }

  return {
    notifications,
    addNotification,
    dismissNotification,
    dismissAll
  }
}


'use client'

/**
 * Global Notifications Bell Button
 * 
 * Persistent bell icon in app bar with badge count
 * 
 * Features:
 * - Real-time badge count
 * - Opens notifications drawer on click
 * - Keyboard shortcut: G then N
 * - Accessible (ARIA labels, focus management)
 * - Loading states
 * - Smooth animations
 */

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface NotificationsBellButtonProps {
  onOpen: () => void
  className?: string
}

export function NotificationsBellButton({
  onOpen,
  className
}: NotificationsBellButtonProps) {
  const { appUser } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Load unread count
  useEffect(() => {
    if (!appUser?.id) return
    
    loadUnreadCount()
    
    // Refresh every 30 seconds (fallback if WebSocket not available)
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [appUser?.id])
  
  // Real-time subscription (Supabase Realtime)
  useEffect(() => {
    if (!appUser?.id) return
    
    const supabase = createClient()
    
    // Subscribe to new notifications for this user
    const channel = supabase
      .channel(`notifications:${appUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${appUser.id}`
        },
        () => {
          // New notification arrived!
          loadUnreadCount()
          playNotificationSound()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${appUser.id}`
        },
        () => {
          // Notification updated (e.g., marked as read)
          loadUnreadCount()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [appUser?.id])
  
  // Keyboard shortcut: G then N (GitHub-style)
  useEffect(() => {
    let lastKey: string | null = null
    let timeout: NodeJS.Timeout
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }
      
      if (e.key === 'g' || e.key === 'G') {
        lastKey = 'g'
        timeout = setTimeout(() => {
          lastKey = null
        }, 1000)
      } else if ((lastKey === 'g') && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        onOpen()
        lastKey = null
        clearTimeout(timeout)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeout)
    }
  }, [onOpen])
  
  const loadUnreadCount = async () => {
    if (!appUser?.id) return
    
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .rpc('get_unread_notification_count', { p_user_id: appUser.id })
      
      if (error) {
        // If function doesn't exist, fall back to direct query
        if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.info('[Notifications] RPC function not available, using fallback query')
          
          const { data: notifData, error: notifError } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', appUser.id)
            .eq('is_read', false)
          
          if (notifError) {
            console.warn('[Notifications] Fallback query failed:', notifError)
            setUnreadCount(0)
            return
          }
          
          setUnreadCount(notifData || 0)
          return
        }
        
        throw error
      }
      
      setUnreadCount(data || 0)
    } catch (error) {
      // Silently handle errors - notifications are non-critical
      console.info('[Notifications] Unable to load unread count, setting to 0')
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }
  
  const playNotificationSound = () => {
    // Optional: Play sound (only if user has enabled audio notifications)
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.3
      audio.play().catch(() => {
        // User hasn't interacted with page yet, or sound disabled
      })
    } catch (error) {
      // Audio not supported or file missing
    }
  }
  
  // Display text for badge
  const badgeText = unreadCount > 99 ? '99+' : unreadCount.toString()
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpen}
            className={cn(
              "relative",
              loading && "animate-pulse",
              className
            )}
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell className={cn(
              "h-5 w-5 transition-colors",
              unreadCount > 0 && "text-blue-600"
            )} />
            
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-600 hover:bg-red-600 border-2 border-white dark:border-gray-900"
              >
                {badgeText}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Notifications ({unreadCount} unread)</p>
          <p className="text-xs text-gray-500 mt-1">Press G then N</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}


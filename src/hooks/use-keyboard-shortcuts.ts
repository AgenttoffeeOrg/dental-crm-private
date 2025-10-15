/**
 * Keyboard Shortcuts Hook
 * 
 * Provides global keyboard shortcuts for power users.
 * Prevents conflicts with input fields and follows best practices.
 */

import { useEffect, useCallback, useState } from 'react'

export interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  category: 'navigation' | 'actions' | 'system'
}

export const DEFAULT_SHORTCUTS: Record<string, Omit<KeyboardShortcut, 'action'>> = {
  'c': {
    key: 'C',
    description: 'Create new contact',
    category: 'actions'
  },
  'd': {
    key: 'D',
    description: 'Create new deal',
    category: 'actions'
  },
  't': {
    key: 'T',
    description: 'Create new task',
    category: 'actions'
  },
  'r': {
    key: 'R',
    description: 'Refresh dashboard',
    category: 'system'
  },
  '/': {
    key: '/',
    description: 'Search',
    category: 'navigation'
  },
  '?': {
    key: '?',
    description: 'Show keyboard shortcuts',
    category: 'system'
  },
  'g h': {
    key: 'G then H',
    description: 'Go to home/dashboard',
    category: 'navigation'
  },
  'g c': {
    key: 'G then C',
    description: 'Go to contacts',
    category: 'navigation'
  },
  'g p': {
    key: 'G then P',
    description: 'Go to pipeline',
    category: 'navigation'
  },
  'g t': {
    key: 'G then T',
    description: 'Go to tasks',
    category: 'navigation'
  }
}

interface UseKeyboardShortcutsOptions {
  onCreateContact?: () => void
  onCreateDeal?: () => void
  onCreateTask?: () => void
  onRefresh?: () => void
  onShowHelp?: () => void
  onSearch?: () => void
  onNavigate?: (path: string) => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onCreateContact,
  onCreateDeal,
  onCreateTask,
  onRefresh,
  onShowHelp,
  onSearch,
  onNavigate,
  enabled = true
}: UseKeyboardShortcutsOptions) {
  const [lastKey, setLastKey] = useState<string | null>(null)

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    const key = e.key.toLowerCase()

    // Handle 'g' prefix for navigation
    if (lastKey === 'g') {
      e.preventDefault()
      switch (key) {
        case 'h':
          onNavigate?.('/dashboard')
          break
        case 'c':
          onNavigate?.('/contacts')
          break
        case 'p':
          onNavigate?.('/pipeline')
          break
        case 't':
          onNavigate?.('/tasks')
          break
      }
      setLastKey(null)
      return
    }

    // Handle single-key shortcuts
    switch (key) {
      case 'c':
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          onCreateContact?.()
        }
        break
      
      case 'd':
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          onCreateDeal?.()
        }
        break
      
      case 't':
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          onCreateTask?.()
        }
        break
      
      case 'r':
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          onRefresh?.()
        }
        break
      
      case '/':
        e.preventDefault()
        onSearch?.()
        break
      
      case '?':
        e.preventDefault()
        onShowHelp?.()
        break
      
      case 'g':
        setLastKey('g')
        // Reset after 1 second if no follow-up key
        setTimeout(() => setLastKey(null), 1000)
        break
      
      case 'escape':
        setLastKey(null)
        break
    }
  }, [lastKey, onCreateContact, onCreateDeal, onCreateTask, onRefresh, onShowHelp, onSearch, onNavigate])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress, enabled])
}


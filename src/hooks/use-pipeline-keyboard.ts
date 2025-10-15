import { useEffect, useCallback, useState } from 'react'

export interface PipelineKeyboardShortcuts {
  onNavigateNext: () => void
  onNavigatePrevious: () => void
  onOpenDeal: () => void
  onEditDeal: () => void
  onMoveDeal: () => void
  onDeleteDeal: () => void
  onSearch: () => void
  onShowHelp: () => void
  onNewDeal: () => void
  onRefresh: () => void
  enabled?: boolean
}

/**
 * Pipeline Keyboard Navigation Hook
 * 
 * Shortcuts:
 * - J / ↓  - Navigate to next deal
 * - K / ↑  - Navigate to previous deal
 * - Enter - Open selected deal
 * - E     - Edit selected deal
 * - M     - Move selected deal to another stage
 * - Del   - Delete selected deal (with confirmation)
 * - /     - Focus search
 * - ?     - Show help
 * - N     - New deal
 * - R     - Refresh
 */
export function usePipelineKeyboard({
  onNavigateNext,
  onNavigatePrevious,
  onOpenDeal,
  onEditDeal,
  onMoveDeal,
  onDeleteDeal,
  onSearch,
  onShowHelp,
  onNewDeal,
  onRefresh,
  enabled = true,
}: PipelineKeyboardShortcuts) {
  const [lastKeyTime, setLastKeyTime] = useState<number>(0)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea or if disabled
      if (!enabled) return
      
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      const isContentEditable = target.isContentEditable

      // Allow / to work even in non-input contexts for search
      if (e.key === '/' && !isInput && !isContentEditable) {
        e.preventDefault()
        onSearch()
        return
      }

      // Allow ? to work everywhere for help
      if (e.key === '?' && !isInput && !isContentEditable) {
        e.preventDefault()
        onShowHelp()
        return
      }

      // Skip other shortcuts if typing
      if (isInput || isContentEditable) return

      // Prevent default for navigation keys
      if (['j', 'k', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault()
      }

      // Debounce rapid key presses
      const now = Date.now()
      if (now - lastKeyTime < 100) return
      setLastKeyTime(now)

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          onNavigateNext()
          break

        case 'k':
        case 'arrowup':
          onNavigatePrevious()
          break

        case 'enter':
          e.preventDefault()
          onOpenDeal()
          break

        case 'e':
          e.preventDefault()
          onEditDeal()
          break

        case 'm':
          e.preventDefault()
          onMoveDeal()
          break

        case 'delete':
        case 'backspace':
          // Only delete with confirmation
          if (e.shiftKey) {
            e.preventDefault()
            onDeleteDeal()
          }
          break

        case 'n':
          e.preventDefault()
          onNewDeal()
          break

        case 'r':
          e.preventDefault()
          onRefresh()
          break
      }
    },
    [
      enabled,
      lastKeyTime,
      onNavigateNext,
      onNavigatePrevious,
      onOpenDeal,
      onEditDeal,
      onMoveDeal,
      onDeleteDeal,
      onSearch,
      onShowHelp,
      onNewDeal,
      onRefresh,
    ]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  return {
    shortcuts: {
      navigate: 'J / K or ↓ / ↑',
      open: 'Enter',
      edit: 'E',
      move: 'M',
      delete: 'Shift + Del',
      search: '/',
      help: '?',
      new: 'N',
      refresh: 'R',
    },
  }
}


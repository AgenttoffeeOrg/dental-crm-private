import { useEffect } from 'react'

interface Shortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  handler: () => void
}

export function useKeyboardShortcuts(shortcuts: Shortcut[] = []) {
  useEffect(() => {
    if (!shortcuts || shortcuts.length === 0) {
      return
    }
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      
      // Don't trigger if user is typing
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Allow Cmd+S and Escape even in inputs
        if (!(event.key === 's' && (event.ctrlKey || event.metaKey)) && event.key !== 'Escape') {
          return
        }
      }

      shortcuts.forEach(shortcut => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey
        const metaMatches = !!shortcut.metaKey === event.metaKey

        if (keyMatches && ctrlMatches && shiftMatches && metaMatches) {
          event.preventDefault()
          shortcut.handler()
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}



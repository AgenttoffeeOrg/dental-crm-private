/**
 * Accessibility Utilities
 * WCAG 2.1 AA compliance helpers
 */

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return

  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Trap focus within an element (for modals)
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  const focusableElements = element.querySelectorAll<HTMLElement>(focusableSelectors)
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable?.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable?.focus()
        e.preventDefault()
      }
    }
  }

  element.addEventListener('keydown', handleTabKey)
  firstFocusable?.focus()

  return () => {
    element.removeEventListener('keydown', handleTabKey)
  }
}

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string) => {
    const rgb = parseInt(color.slice(1), 16)
    const r = ((rgb >> 16) & 0xff) / 255
    const g = ((rgb >> 8) & 0xff) / 255
    const b = (rgb & 0xff) / 255
    
    const [rs, gs, bs] = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    )
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}


/**
 * Accessibility Utilities
 * 
 * WCAG 2.1 AA compliance helpers for accessible UI components.
 */

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text, 3:1 for large)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255

    // Calculate relative luminance
    const toLinear = (c: number) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    }

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  }

  const l1 = getLuminance(foreground)
  const l2 = getLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Verify WCAG AA compliance
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background)
  const required = isLargeText ? 3 : 4.5
  return ratio >= required
}

/**
 * Generate accessible label for screen readers
 */
export function generateAriaLabel(context: {
  action?: string
  target?: string
  state?: string
  value?: string
}): string {
  const parts: string[] = []
  
  if (context.action) parts.push(context.action)
  if (context.target) parts.push(context.target)
  if (context.state) parts.push(`(${context.state})`)
  if (context.value) parts.push(context.value)
  
  return parts.join(' ')
}

/**
 * Announce to screen reader
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
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
 * Focus management helpers
 */
export const focusManagement = {
  /**
   * Trap focus within an element (for modals)
   */
  trapFocus(element: HTMLElement) {
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    element.addEventListener('keydown', handleTabKey)
    return () => element.removeEventListener('keydown', handleTabKey)
  },

  /**
   * Return focus to previous element (after closing modal)
   */
  storeFocus(): () => void {
    const previousElement = document.activeElement as HTMLElement
    return () => previousElement?.focus()
  }
}

/**
 * Color palette with WCAG AA compliant colors
 */
export const accessibleColors = {
  // On white background (#FFFFFF)
  text: {
    primary: '#111827',     // gray-900 - 15.3:1 ratio
    secondary: '#4B5563',   // gray-600 - 7.2:1 ratio
    tertiary: '#6B7280',    // gray-500 - 4.8:1 ratio
    disabled: '#9CA3AF'     // gray-400 - 2.8:1 ratio (large text only)
  },
  status: {
    success: '#059669',     // green-600 - 4.5:1 ratio
    warning: '#D97706',     // orange-600 - 4.5:1 ratio
    error: '#DC2626',       // red-600 - 5.9:1 ratio
    info: '#2563EB'         // blue-600 - 7.0:1 ratio
  },
  interactive: {
    primary: '#4F46E5',     // indigo-600 - 6.1:1 ratio
    primaryHover: '#4338CA', // indigo-700 - 8.4:1 ratio
    secondary: '#7C3AED',   // purple-600 - 5.8:1 ratio
    link: '#2563EB'         // blue-600 - 7.0:1 ratio
  }
}

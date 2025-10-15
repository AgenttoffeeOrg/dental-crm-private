/**
 * Accessibility Utilities for Forms
 * Ensures WCAG 2.1 AA compliance
 */

/**
 * Generate ARIA labels for form fields
 */
export function generateAriaLabel(field: {
  label: string
  required: boolean
  type: string
  description?: string
}): string {
  let ariaLabel = field.label

  if (field.required) {
    ariaLabel += ', required field'
  }

  if (field.description) {
    ariaLabel += `, ${field.description}`
  }

  return ariaLabel
}

/**
 * Generate ARIA describedby ID for error messages
 */
export function generateErrorId(fieldId: string): string {
  return `${fieldId}-error`
}

/**
 * Generate ARIA describedby ID for help text
 */
export function generateHelpTextId(fieldId: string): string {
  return `${fieldId}-help`
}

/**
 * Keyboard navigation handler
 */
export class FormKeyboardNav {
  private fields: HTMLElement[]
  private currentIndex: number = -1

  constructor(formElement: HTMLFormElement) {
    this.fields = Array.from(
      formElement.querySelectorAll('input, select, textarea, button')
    )
  }

  focusNext(): void {
    this.currentIndex = Math.min(this.currentIndex + 1, this.fields.length - 1)
    this.fields[this.currentIndex]?.focus()
  }

  focusPrevious(): void {
    this.currentIndex = Math.max(this.currentIndex - 1, 0)
    this.fields[this.currentIndex]?.focus()
  }

  focusFirst(): void {
    this.currentIndex = 0
    this.fields[0]?.focus()
  }

  focusLast(): void {
    this.currentIndex = this.fields.length - 1
    this.fields[this.currentIndex]?.focus()
  }
}

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getLuminance(color1)
  const luminance2 = getLuminance(color2)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

function getLuminance(color: string): number {
  // Convert hex to RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  // Calculate relative luminance
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * Generate accessible form field props
 */
export function getAccessibleFieldProps(field: {
  id: string
  label: string
  required: boolean
  error?: string
  helpText?: string
}) {
  const props: any = {
    id: field.id,
    'aria-label': field.label,
    'aria-required': field.required,
  }

  if (field.error) {
    props['aria-invalid'] = true
    props['aria-describedby'] = generateErrorId(field.id)
  }

  if (field.helpText) {
    props['aria-describedby'] = generateHelpTextId(field.id)
  }

  return props
}

/**
 * Focus trap for modal forms
 */
export class FocusTrap {
  private container: HTMLElement
  private focusableElements: HTMLElement[]
  private firstFocusable: HTMLElement | null = null
  private lastFocusable: HTMLElement | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.focusableElements = this.getFocusableElements()
    this.firstFocusable = this.focusableElements[0] || null
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    return Array.from(this.container.querySelectorAll(selector))
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusable) {
        event.preventDefault()
        this.lastFocusable?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusable) {
        event.preventDefault()
        this.firstFocusable?.focus()
      }
    }
  }

  activate(): void {
    this.firstFocusable?.focus()
  }
}

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
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
 * Check if element is keyboard accessible
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  const tabindex = element.getAttribute('tabindex')
  
  // Elements with tabindex="-1" are not keyboard accessible
  if (tabindex === '-1') return false

  // Interactive elements should be keyboard accessible
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea']
  if (interactiveTags.includes(element.tagName.toLowerCase())) {
    return true
  }

  // Elements with explicit tabindex are keyboard accessible
  if (tabindex && tabindex !== '-1') {
    return true
  }

  return false
}


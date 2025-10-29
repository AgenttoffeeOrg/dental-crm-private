/**
 * Compact Mode Utilities
 * 
 * LocalStorage persistence for compact mode toggle
 * Used across pipeline board for consistent UI density
 */

const COMPACT_MODE_KEY = 'dental-crm-pipeline-compact-mode'

/**
 * Get compact mode preference from localStorage
 */
export function getCompactMode(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const stored = localStorage.getItem(COMPACT_MODE_KEY)
    return stored === 'true'
  } catch (error) {
    console.warn('Failed to read compact mode from localStorage:', error)
    return false
  }
}

/**
 * Set compact mode preference in localStorage
 */
export function setCompactMode(compact: boolean): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(COMPACT_MODE_KEY, compact ? 'true' : 'false')
  } catch (error) {
    console.warn('Failed to save compact mode to localStorage:', error)
  }
}

/**
 * Toggle compact mode and return new value
 */
export function toggleCompactMode(): boolean {
  const current = getCompactMode()
  const newValue = !current
  setCompactMode(newValue)
  return newValue
}



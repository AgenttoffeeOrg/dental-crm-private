/**
 * User Preferences Management
 * 
 * Stores user-specific settings like:
 * - Default view (board/list)
 * - Default pipeline
 * - Card density
 * - Filters
 * - Sort preferences
 */

export interface UserPreferences {
  // View Settings
  defaultView: 'board' | 'list' | 'auto'
  defaultPipeline: 'all_deals' | 'last_viewed' | string // pipeline ID
  cardDensity: 'compact' | 'comfortable' | 'spacious'
  defaultSort: 'value' | 'activity' | 'stage' | 'age'
  
  // Visibility Settings
  showContactPhoto: boolean
  showDealValue: boolean
  showLastActivity: boolean
  showTreatmentTags: boolean
  showHealthScore: boolean
  showOwnerAvatar: boolean
  showUrgencyIndicator: boolean
  
  // Color Coding
  colorBy: 'value' | 'age' | 'health' | 'none'
  
  // Filters
  myDealsOnly: boolean
  unassignedOnly: boolean
  highValueOnly: boolean
  
  // Notifications
  emailNotifications: boolean
  notifyOnAssignment: boolean
  notifyOnStageChange: boolean
  notifyOnStuck: boolean
  notifyOnHighValue: boolean
  digestFrequency: 'instant' | 'daily' | 'weekly' | 'never'
}

// Default preferences
export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultView: 'list',
  defaultPipeline: 'all_deals',
  cardDensity: 'comfortable',
  defaultSort: 'activity',
  
  showContactPhoto: true,
  showDealValue: true,
  showLastActivity: true,
  showTreatmentTags: true,
  showHealthScore: true,
  showOwnerAvatar: true,
  showUrgencyIndicator: true,
  
  colorBy: 'health',
  
  myDealsOnly: false,
  unassignedOnly: false,
  highValueOnly: false,
  
  emailNotifications: true,
  notifyOnAssignment: true,
  notifyOnStageChange: false,
  notifyOnStuck: true,
  notifyOnHighValue: true,
  digestFrequency: 'daily',
}

const STORAGE_KEY = 'dental_crm_user_preferences'

/**
 * Load user preferences from local storage
 */
export function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_PREFERENCES
    
    const parsed = JSON.parse(stored)
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch (error) {
    console.error('Error loading preferences:', error)
    return DEFAULT_PREFERENCES
  }
}

/**
 * Save user preferences to local storage
 */
export function savePreferences(preferences: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return
  
  try {
    const current = loadPreferences()
    const updated = { ...current, ...preferences }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving preferences:', error)
  }
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Get a specific preference
 */
export function getPreference<K extends keyof UserPreferences>(
  key: K
): UserPreferences[K] {
  const prefs = loadPreferences()
  return prefs[key]
}

/**
 * Set a specific preference
 */
export function setPreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void {
  savePreferences({ [key]: value } as Partial<UserPreferences>)
}


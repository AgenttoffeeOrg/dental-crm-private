import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO, addHours, differenceInDays, isPast } from 'date-fns'
import { enGB } from 'date-fns/locale'

// Default timezone for the dental practice
const DEFAULT_TIMEZONE = 'Europe/London'

/**
 * Format a date string or Date object for display
 */
export function formatDate(date: string | Date, formatStr = 'PPP'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: enGB })
  } catch (error) {
    console.error('formatDate error:', error)
    return 'Invalid date'
  }
}

/**
 * Format a date and time for display
 */
export function formatDateTime(date: string | Date, formatStr = 'PPP p'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: enGB })
  } catch (error) {
    console.error('formatDateTime error:', error)
    return 'Invalid date'
  }
}

/**
 * Format a time only
 */
export function formatTime(date: string | Date, formatStr = 'p'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: enGB })
  } catch (error) {
    console.error('formatTime error:', error)
    return 'Invalid time'
  }
}

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: enGB })
  } catch (error) {
    console.error('getRelativeTime error:', error)
    return 'Unknown time'
  }
}

/**
 * Get a human-friendly date description
 */
export function getFriendlyDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    if (isToday(dateObj)) {
      return 'Today'
    } else if (isTomorrow(dateObj)) {
      return 'Tomorrow'
    } else if (isYesterday(dateObj)) {
      return 'Yesterday'
    } else {
      return formatDate(dateObj, 'PPP')
    }
  } catch (error) {
    console.error('getFriendlyDate error:', error)
    return 'Unknown date'
  }
}

/**
 * Get a human-friendly date and time description
 */
export function getFriendlyDateTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    
    if (isToday(dateObj)) {
      return `Today at ${formatTime(dateObj)}`
    } else if (isTomorrow(dateObj)) {
      return `Tomorrow at ${formatTime(dateObj)}`
    } else if (isYesterday(dateObj)) {
      return `Yesterday at ${formatTime(dateObj)}`
    } else {
      return formatDateTime(dateObj)
    }
  } catch (error) {
    console.error('getFriendlyDateTime error:', error)
    return 'Unknown time'
  }
}

/**
 * Check if a date is overdue (past due)
 */
export function isOverdue(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isPast(dateObj)
  } catch (error) {
    console.error('isOverdue error:', error)
    return false
  }
}

/**
 * Check if a date is due today
 */
export function isDueToday(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isToday(dateObj)
  } catch (error) {
    console.error('isDueToday error:', error)
    return false
  }
}

/**
 * Check if a date is due tomorrow
 */
export function isDueTomorrow(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isTomorrow(dateObj)
  } catch (error) {
    console.error('isDueTomorrow error:', error)
    return false
  }
}

/**
 * Get the number of days until a date (negative if past)
 */
export function getDaysUntil(date: string | Date): number {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return differenceInDays(dateObj, new Date())
  } catch (error) {
    console.error('getDaysUntil error:', error)
    return 0
  }
}

/**
 * Add hours to a date and return ISO string
 */
export function addHoursToDate(date: string | Date, hours: number): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return addHours(dateObj, hours).toISOString()
  } catch (error) {
    console.error('addHoursToDate error:', error)
    return new Date().toISOString()
  }
}

/**
 * Get the age of an activity or record
 */
export function getActivityAge(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const daysDiff = differenceInDays(new Date(), dateObj)
    
    if (daysDiff === 0) {
      return 'Today'
    } else if (daysDiff === 1) {
      return '1 day ago'
    } else if (daysDiff < 7) {
      return `${daysDiff} days ago`
    } else if (daysDiff < 30) {
      const weeks = Math.floor(daysDiff / 7)
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
    } else if (daysDiff < 365) {
      const months = Math.floor(daysDiff / 30)
      return months === 1 ? '1 month ago' : `${months} months ago`
    } else {
      const years = Math.floor(daysDiff / 365)
      return years === 1 ? '1 year ago' : `${years} years ago`
    }
  } catch (error) {
    console.error('getActivityAge error:', error)
    return 'Unknown'
  }
}

/**
 * Format a date for form inputs (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, 'yyyy-MM-dd')
  } catch (error) {
    console.error('formatDateForInput error:', error)
    return format(new Date(), 'yyyy-MM-dd')
  }
}

/**
 * Format a datetime for form inputs (YYYY-MM-DDTHH:mm)
 */
export function formatDateTimeForInput(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, "yyyy-MM-dd'T'HH:mm")
  } catch (error) {
    console.error('formatDateTimeForInput error:', error)
    return format(new Date(), "yyyy-MM-dd'T'HH:mm")
  }
}

/**
 * Get priority badge color based on due date and priority
 */
export function getPriorityColor(
  priority: 'low' | 'normal' | 'high' | 'urgent',
  dueDate?: string | Date
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (dueDate && isOverdue(dueDate)) {
    return 'destructive'
  }
  
  switch (priority) {
    case 'urgent':
      return 'destructive'
    case 'high':
      return 'secondary'
    case 'normal':
      return 'default'
    case 'low':
      return 'outline'
    default:
      return 'default'
  }
}

/**
 * Get due date badge color
 */
export function getDueDateColor(dueDate: string | Date): 'default' | 'secondary' | 'destructive' {
  if (isOverdue(dueDate)) {
    return 'destructive'
  } else if (isDueToday(dueDate)) {
    return 'secondary'
  } else {
    return 'default'
  }
}

/**
 * Get business hours check (9 AM - 6 PM UK time)
 */
export function isBusinessHours(date: string | Date = new Date()): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const hour = dateObj.getHours()
    const day = dateObj.getDay() // 0 = Sunday, 6 = Saturday
    
    // Monday to Friday, 9 AM to 6 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18
  } catch (error) {
    console.error('isBusinessHours error:', error)
    return false
  }
}

/**
 * Get next business day
 */
export function getNextBusinessDay(date: string | Date = new Date()): Date {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const nextDay = new Date(dateObj)
    nextDay.setDate(nextDay.getDate() + 1)
    
    // If it's Saturday (6) or Sunday (0), move to Monday
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 1)
    }
    
    return nextDay
  } catch (error) {
    console.error('getNextBusinessDay error:', error)
    return new Date()
  }
}

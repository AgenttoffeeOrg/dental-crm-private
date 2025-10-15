/**
 * Date & Time Utility Helpers
 * 
 * Reusable date formatting and manipulation functions.
 */

/**
 * Format date for display in audit cards
 */
export function formatAuditDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
  return formatAuditDate(d);
}

/**
 * Get date range for queries (e.g., "last 30 days")
 */
export function getDateRange(range: 'day' | 'week' | 'month' | 'quarter' | 'year'): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  switch (range) {
    case 'day':
      start.setDate(start.getDate() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  
  return { start, end };
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is this week
 */
export function isThisWeek(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo && d <= today;
}

/**
 * Format duration in milliseconds to human-readable
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get next scheduled date for audit
 */
export function getNextScheduledDate(
  frequency: 'weekly' | 'monthly',
  dayOfWeek?: number,
  dayOfMonth?: number,
  hour: number = 9
): Date {
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  
  if (frequency === 'weekly' && dayOfWeek !== undefined) {
    const daysUntilNext = (dayOfWeek - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntilNext);
  } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
    next.setDate(dayOfMonth);
    if (next < new Date()) {
      next.setMonth(next.getMonth() + 1);
    }
  }
  
  return next;
}

/**
 * Format date for CSV export
 */
export function formatCSVDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get weekday name
 */
export function getWeekdayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

/**
 * Parse schedule description
 */
export function formatScheduleDescription(
  frequency: 'weekly' | 'monthly',
  dayOfWeek?: number,
  dayOfMonth?: number,
  hour: number = 9
): string {
  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
  
  if (frequency === 'weekly' && dayOfWeek !== undefined) {
    return `Every ${getWeekdayName(dayOfWeek)} at ${timeStr}`;
  }
  if (frequency === 'monthly' && dayOfMonth !== undefined) {
    const suffix = getDayOrdinalSuffix(dayOfMonth);
    return `${dayOfMonth}${suffix} of each month at ${timeStr}`;
  }
  return 'Unknown schedule';
}

/**
 * Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
 */
function getDayOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}


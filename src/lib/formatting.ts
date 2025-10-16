/**
 * Formatting Utilities for Enterprise UI
 * Consistent number, currency, date, and text formatting
 */

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format number with thousand separators
 * @example formatNumber(1234567.89) => "1,234,567.89"
 */
export function formatNumber(value: number | null | undefined, decimals?: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0'
  
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals !== undefined ? decimals : 0,
    maximumFractionDigits: decimals !== undefined ? decimals : 2,
  })
  
  return formatter.format(value)
}

/**
 * Format as currency (USD default)
 * @example formatCurrency(1234.56) => "$1,234.56"
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'USD',
  showCents: boolean = true
): string {
  if (value === null || value === undefined || isNaN(value)) return '$0'
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  })
  
  return formatter.format(value)
}

/**
 * Format as percentage
 * @example formatPercent(0.1234) => "12.34%"
 */
export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '0%'
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  
  return formatter.format(value)
}

/**
 * Format large numbers with abbreviations
 * @example formatCompact(1234567) => "1.2M"
 */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0'
  
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  })
  
  return formatter.format(value)
}

/**
 * Format change with +/- sign and color
 * @example formatChange(12.5) => { value: "+12.5%", color: "text-green-600" }
 */
export function formatChange(value: number | null | undefined, isPercent: boolean = true) {
  if (value === null || value === undefined || isNaN(value)) {
    return { value: '0%', color: 'text-gray-600', icon: null }
  }
  
  const sign = value > 0 ? '+' : ''
  const formatted = isPercent ? formatPercent(Math.abs(value / 100)) : formatNumber(Math.abs(value))
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'
  const icon = value > 0 ? '↗' : value < 0 ? '↘' : '→'
  
  return {
    value: `${sign}${formatted}`,
    color,
    icon,
  }
}

// ============================================
// DATE/TIME FORMATTING
// ============================================

/**
 * Format date in various styles
 * @example formatDate(new Date()) => "Jan 15, 2025"
 */
export function formatDate(
  date: Date | string | null | undefined,
  style: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  }[style]
  
  return new Intl.DateTimeFormat('en-US', options).format(d)
}

/**
 * Format time
 * @example formatTime(new Date()) => "3:45 PM"
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @example formatRelative(new Date(Date.now() - 3600000)) => "1 hour ago"
 */
export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return formatDate(d, 'short')
}

// ============================================
// TEXT FORMATTING
// ============================================

/**
 * Truncate text with ellipsis
 * @example truncate("Hello World", 8) => "Hello..."
 */
export function truncate(text: string | null | undefined, length: number = 50): string {
  if (!text) return ''
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}

/**
 * Convert to title case
 * @example titleCase("hello world") => "Hello World"
 */
export function titleCase(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Pluralize word based on count
 * @example pluralize(1, "item") => "1 item"
 * @example pluralize(5, "item") => "5 items"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`
  return `${count} ${plural || singular + 's'}`
}

/**
 * Format file size
 * @example formatFileSize(1536) => "1.5 KB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

// ============================================
// CONDITIONAL FORMATTING
// ============================================

/**
 * Get semantic color based on value and thresholds
 */
export function getColorByThreshold(
  value: number,
  thresholds: { low: number; high: number },
  invert: boolean = false
): string {
  if (invert) {
    if (value <= thresholds.low) return 'text-red-600'
    if (value >= thresholds.high) return 'text-green-600'
    return 'text-yellow-600'
  } else {
    if (value >= thresholds.high) return 'text-green-600'
    if (value <= thresholds.low) return 'text-red-600'
    return 'text-yellow-600'
  }
}

/**
 * Get badge variant based on status
 */
export function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  const statusLower = status?.toLowerCase() || ''
  
  if (['active', 'completed', 'success', 'won', 'paid', 'approved'].includes(statusLower)) {
    return 'success'
  }
  if (['pending', 'in_progress', 'processing', 'review'].includes(statusLower)) {
    return 'warning'
  }
  if (['failed', 'error', 'rejected', 'cancelled', 'lost'].includes(statusLower)) {
    return 'destructive'
  }
  if (['draft', 'paused', 'inactive'].includes(statusLower)) {
    return 'secondary'
  }
  
  return 'default'
}

// ============================================
// EXPORTS
// ============================================

export const format = {
  number: formatNumber,
  currency: formatCurrency,
  percent: formatPercent,
  compact: formatCompact,
  change: formatChange,
  date: formatDate,
  time: formatTime,
  relative: formatRelative,
  truncate,
  titleCase,
  pluralize,
  fileSize: formatFileSize,
  colorByThreshold: getColorByThreshold,
  statusVariant: getStatusVariant,
}

export default format


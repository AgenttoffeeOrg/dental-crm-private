/**
 * Formatting Utilities
 * 
 * Beautiful, consistent formatting for numbers, dates, and text.
 * UX Focus: Make data instantly understandable.
 */

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number, decimals: number = 0): string {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format number as percentage
 */
export function formatPercentage(num: number, decimals: number = 1): string {
  if (typeof num !== 'number' || isNaN(num)) return '0%';
  
  return `${formatNumber(num, decimals)}%`;
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  
  return num.toString();
}

/**
 * Format currency (USD)
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format milliseconds to seconds
 */
export function formatMilliseconds(ms: number, decimals: number = 1): string {
  if (typeof ms !== 'number' || isNaN(ms)) return '0s';
  
  const seconds = ms / 1000;
  return `${seconds.toFixed(decimals)}s`;
}

/**
 * Format score with appropriate precision
 */
export function formatScore(score: number): string {
  if (typeof score !== 'number' || isNaN(score)) return '0.0';
  
  // If whole number or .0, show one decimal
  // Otherwise show as-is
  return score % 1 === 0 ? `${score}.0` : score.toFixed(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Convert snake_case to Title Case
 */
export function toTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format phone number (US format)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

/**
 * Pluralize word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format list of items with proper grammar
 */
export function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  
  const allButLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];
  
  return `${allButLast}, and ${last}`;
}

/**
 * Format ordinal numbers (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  
  return `${num}th`;
}

/**
 * Format time range (e.g., "9am - 5pm")
 */
export function formatTimeRange(startHour: number, endHour: number): string {
  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const period = hour < 12 ? 'am' : 'pm';
    return `${h}${period}`;
  };
  
  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

/**
 * Format URL for display (remove protocol, www)
 */
export function formatURLForDisplay(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Highlight search term in text
 */
export function highlightText(text: string, searchTerm: string): string {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Format impact/effort/confidence as emoji
 */
export function formatImpactEmoji(level: 'low' | 'medium' | 'high'): string {
  const emojis = {
    low: '🔵',
    medium: '🟡',
    high: '🔴',
  };
  return emojis[level] || '⚪';
}

/**
 * Format array as readable sentence
 */
export function formatArraySentence(arr: string[]): string {
  if (arr.length === 0) return 'none';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}


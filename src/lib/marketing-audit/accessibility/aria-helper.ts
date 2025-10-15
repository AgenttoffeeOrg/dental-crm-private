/**
 * ARIA Helper Utilities
 * 
 * Accessibility helpers for WCAG 2.1 AA compliance.
 * UX Focus: Make the app usable by everyone, including screen reader users.
 */

/**
 * Generate ARIA label for score
 */
export function getScoreAriaLabel(score: number, category?: string): string {
  const label = score >= 90 ? 'Excellent' :
                score >= 80 ? 'Very Good' :
                score >= 70 ? 'Good' :
                score >= 60 ? 'Fair' :
                score >= 40 ? 'Needs Work' : 'Poor';
  
  const categoryText = category ? ` for ${category}` : '';
  return `Score: ${score.toFixed(1)} out of 100${categoryText}. Rating: ${label}`;
}

/**
 * Generate ARIA label for trend
 */
export function getTrendAriaLabel(current: number, previous: number, metric: string): string {
  const delta = current - previous;
  const direction = delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'unchanged';
  const change = Math.abs(delta).toFixed(1);
  
  return `${metric} ${direction} by ${change} points since last audit`;
}

/**
 * Generate ARIA label for recommendation
 */
export function getRecommendationAriaLabel(
  title: string,
  impact: string,
  effort: string,
  status: string
): string {
  return `Recommendation: ${title}. Impact: ${impact}. Effort required: ${effort}. Status: ${status}`;
}

/**
 * Generate ARIA label for progress
 */
export function getProgressAriaLabel(current: number, total: number, label: string): string {
  const percentage = (current / total) * 100;
  return `${label}: ${current} of ${total} completed, ${percentage.toFixed(0)} percent`;
}

/**
 * Generate ARIA live region announcement
 */
export function announceToScreenReader(message: string): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is keyboard accessible
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  const tabIndex = element.getAttribute('tabindex');
  const role = element.getAttribute('role');
  
  return (
    element.tagName === 'BUTTON' ||
    element.tagName === 'A' ||
    element.tagName === 'INPUT' ||
    element.tagName === 'SELECT' ||
    element.tagName === 'TEXTAREA' ||
    (tabIndex !== null && parseInt(tabIndex) >= 0) ||
    role === 'button' ||
    role === 'link'
  );
}

/**
 * Generate accessible table caption
 */
export function getTableAriaCaption(
  title: string,
  rowCount: number,
  columnCount: number
): string {
  return `${title}. Table with ${rowCount} rows and ${columnCount} columns`;
}

/**
 * Format number for screen readers
 */
export function formatNumberForScreenReader(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)} million`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} thousand`;
  }
  return num.toString();
}

/**
 * Get appropriate ARIA role for component
 */
export function getAriaRole(componentType: string): string {
  const roles: Record<string, string> = {
    card: 'article',
    list: 'list',
    listItem: 'listitem',
    navigation: 'navigation',
    search: 'search',
    banner: 'banner',
    main: 'main',
    complementary: 'complementary',
    alert: 'alert',
    status: 'status',
    dialog: 'dialog',
    menu: 'menu',
    menuitem: 'menuitem',
    tab: 'tab',
    tabpanel: 'tabpanel',
    tablist: 'tablist',
  };
  
  return roles[componentType] || '';
}

/**
 * Generate skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, label: string): React.ReactElement {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg"
    >
      {label}
    </a>
  ) as React.ReactElement;
}


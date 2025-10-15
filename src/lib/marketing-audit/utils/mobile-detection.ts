/**
 * Mobile Detection Utilities
 * 
 * UX Focus: Detect device type and optimize experience accordingly.
 */

/**
 * Check if user is on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if user is on tablet
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
}

/**
 * Get device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (isMobileDevice() && !isTabletDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
}

/**
 * Check if touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Get viewport width
 */
export function getViewportWidth(): number {
  if (typeof window === 'undefined') return 1920;
  return window.innerWidth;
}

/**
 * Check if viewport is small (mobile)
 */
export function isSmallViewport(): boolean {
  return getViewportWidth() < 640;
}

/**
 * Check if viewport is medium (tablet)
 */
export function isMediumViewport(): boolean {
  const width = getViewportWidth();
  return width >= 640 && width < 1024;
}

/**
 * Check if viewport is large (desktop)
 */
export function isLargeViewport(): boolean {
  return getViewportWidth() >= 1024;
}

/**
 * Optimize touch targets for mobile
 */
export function getTouchTargetSize(baseSize: number): number {
  if (isTouchDevice()) {
    return Math.max(baseSize, 44); // Apple's 44px minimum
  }
  return baseSize;
}

/**
 * Get appropriate font size for device
 */
export function getResponsiveFontSize(
  mobile: number,
  tablet: number,
  desktop: number
): number {
  const device = getDeviceType();
  if (device === 'mobile') return mobile;
  if (device === 'tablet') return tablet;
  return desktop;
}


/**
 * Web Vitals Performance Tracking
 * Monitors Core Web Vitals and sends to analytics
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

interface VitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(metric: VitalsMetric) {
  // Send to your analytics endpoint
  try {
    await fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true, // Important for page unload
    });
  } catch (error) {
    console.error('Failed to send web vitals:', error);
  }
}

/**
 * Get rating for a metric
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    FID: [100, 300],
    FCP: [1800, 3000],
    LCP: [2500, 4000],
    TTFB: [800, 1800],
    INP: [200, 500],
  };

  const [good, poor] = thresholds[name] || [0, Infinity];
  
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Process and send metric
 */
function handleMetric(metric: Metric) {
  const vitalsMetric: VitalsMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
  };

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: Math.round(metric.value),
      rating: vitalsMetric.rating,
    });
  }

  // Send to analytics
  sendToAnalytics(vitalsMetric);
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitalsTracking() {
  if (typeof window === 'undefined') return;

  // Track all Core Web Vitals
  onCLS(handleMetric);
  onFID(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);
  onINP(handleMetric);

  // Log initialization
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals] Tracking initialized');
  }
}

/**
 * Get current Web Vitals snapshot
 */
export async function getWebVitalsSnapshot(): Promise<VitalsMetric[]> {
  return new Promise((resolve) => {
    const metrics: VitalsMetric[] = [];
    let count = 0;
    const total = 6; // Number of metrics we're tracking

    const collect = (metric: Metric) => {
      metrics.push({
        name: metric.name,
        value: metric.value,
        rating: getRating(metric.name, metric.value),
        delta: metric.delta,
        id: metric.id,
      });
      count++;
      if (count === total) {
        resolve(metrics);
      }
    };

    onCLS(collect);
    onFID(collect);
    onFCP(collect);
    onLCP(collect);
    onTTFB(collect);
    onINP(collect);

    // Timeout after 5 seconds
    setTimeout(() => resolve(metrics), 5000);
  });
}

/**
 * Report Web Vitals to console (for debugging)
 */
export function reportWebVitals(metric: Metric) {
  if (process.env.NODE_ENV === 'development') {
    console.table({
      [metric.name]: {
        value: Math.round(metric.value),
        rating: getRating(metric.name, metric.value),
        id: metric.id,
      },
    });
  }
}

/**
 * Export for Next.js
 */
export { onCLS, onFID, onFCP, onLCP, onTTFB, onINP };


/**
 * Lazy Loading Helpers
 * Utilities for performance-optimized lazy loading
 */

import React from 'react'
import dynamic from 'next/dynamic';
import { ComponentType, lazy, Suspense } from 'react';

/**
 * Create a lazily loaded component with custom loading state
 */
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  LoadingComponent?: ComponentType
) {
  const Component = dynamic(importFn, {
    loading: () => LoadingComponent ? <LoadingComponent /> : null,
    ssr: false, // Disable SSR for heavy components
  });

  return Component;
}

/**
 * Lazy load a component only when it's in viewport
 */
export function lazyLoadOnVisible<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = {}
) {
  return dynamic(importFn, {
    loading: () => <div style={{ minHeight: '100px' }} />,
    ssr: false,
  });
}

/**
 * Preload a component before it's needed
 */
export async function preloadComponent(
  importFn: () => Promise<{ default: any }>
) {
  try {
    await importFn();
  } catch (error) {
    console.error('Failed to preload component:', error);
  }
}

/**
 * Lazy load based on network conditions
 */
export function lazyLoadIfFastNetwork<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: T
) {
  if (typeof window === 'undefined') return fallback;

  // Check connection type
  const connection = (navigator as any).connection;
  if (connection && connection.effectiveType === '4g') {
    return dynamic(importFn, { ssr: false });
  }

  return fallback;
}

/**
 * Lazy load with retry logic
 */
export function lazyLoadWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries: number = 3
) {
  const loadWithRetry = async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw lastError;
  };

  return dynamic(loadWithRetry, { ssr: false });
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useLazyLoad(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  if (typeof window === 'undefined') return null;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
        observer.disconnect();
      }
    });
  }, options);

  return observer;
}

/**
 * Prefetch resources
 */
export function prefetchResources(urls: string[]) {
  if (typeof window === 'undefined') return;

  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Preconnect to domains
 */
export function preconnectDomains(domains: string[]) {
  if (typeof window === 'undefined') return;

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * Load script dynamically
 */
export async function loadScript(src: string, id?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }

    // Check if already loaded
    if (id && document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    if (id) script.id = id;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

/**
 * Defer non-critical CSS
 */
export function deferCSS(href: string) {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
}


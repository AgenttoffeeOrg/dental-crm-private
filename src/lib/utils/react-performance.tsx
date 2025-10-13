// React performance optimization utilities

import { memo, useMemo, useCallback } from 'react'

// Memoize expensive components
export function memoizeComponent<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return memo(Component, areEqual)
}

// Hook for memoizing expensive calculations
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps)
}

// Hook for memoizing callbacks
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps) as T
}

// Lazy load component with suspense
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return React.lazy(importFunc)
}


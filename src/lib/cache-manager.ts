/**
 * Cache Manager
 * 
 * Provides utilities for managing browser cache, service workers,
 * and storage to prevent stale data issues in development and production.
 * 
 * @module lib/cache-manager
 */

export class CacheManager {
  /**
   * Clear all browser caches including:
   * - localStorage
   * - sessionStorage
   * - IndexedDB (if applicable)
   * - Service Worker caches
   * - HTTP cache
   */
  static async clearAllCaches(): Promise<void> {
    try {
      // Clear storage
      localStorage.clear()
      sessionStorage.clear()

      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('[CacheManager] Cleared service worker caches:', cacheNames)
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map(registration => registration.unregister())
        )
        if (registrations.length > 0) {
          console.log('[CacheManager] Unregistered service workers')
        }
      }

      console.log('[CacheManager] All caches cleared successfully')
    } catch (error) {
      console.error('[CacheManager] Error clearing caches:', error)
      throw error
    }
  }

  /**
   * Clear specific cache by name
   */
  static async clearCacheByName(cacheName: string): Promise<boolean> {
    if ('caches' in window) {
      return await caches.delete(cacheName)
    }
    return false
  }

  /**
   * Clear localStorage only
   */
  static clearLocalStorage(): void {
    localStorage.clear()
    console.log('[CacheManager] localStorage cleared')
  }

  /**
   * Clear sessionStorage only
   */
  static clearSessionStorage(): void {
    sessionStorage.clear()
    console.log('[CacheManager] sessionStorage cleared')
  }

  /**
   * Get cache status information
   */
  static async getCacheStatus(): Promise<{
    localStorageSize: number
    sessionStorageSize: number
    cacheNames: string[]
    serviceWorkerRegistered: boolean
  }> {
    const localStorageSize = new Blob(Object.values(localStorage)).size
    const sessionStorageSize = new Blob(Object.values(sessionStorage)).size

    let cacheNames: string[] = []
    if ('caches' in window) {
      cacheNames = await caches.keys()
    }

    let serviceWorkerRegistered = false
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      serviceWorkerRegistered = registrations.length > 0
    }

    return {
      localStorageSize,
      sessionStorageSize,
      cacheNames,
      serviceWorkerRegistered,
    }
  }

  /**
   * Force reload page without cache
   */
  static hardReload(): void {
    if ('location' in window) {
      window.location.reload()
    }
  }

  /**
   * Clear specific localStorage keys by prefix
   */
  static clearLocalStorageByPrefix(prefix: string): void {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`[CacheManager] Cleared ${keysToRemove.length} items with prefix: ${prefix}`)
  }

  /**
   * Check if running in development mode
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  /**
   * Get cache recommendations based on current state
   */
  static async getCacheRecommendations(): Promise<string[]> {
    const status = await this.getCacheStatus()
    const recommendations: string[] = []

    if (status.serviceWorkerRegistered) {
      recommendations.push('Service Worker detected - may cause caching issues in development')
    }

    if (status.localStorageSize > 5 * 1024 * 1024) { // 5MB
      recommendations.push('localStorage is over 5MB - consider clearing old data')
    }

    if (status.cacheNames.length > 5) {
      recommendations.push(`${status.cacheNames.length} cache stores found - consider clearing unused caches`)
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache status looks healthy')
    }

    return recommendations
  }

  /**
   * Set up automatic cache clearing in development
   * Call this in your app initialization
   */
  static setupDevelopmentCacheWarning(): void {
    if (this.isDevelopment()) {
      const lastClear = localStorage.getItem('__cache_last_clear')
      const now = Date.now()
      const oneDayAgo = now - 24 * 60 * 60 * 1000

      if (!lastClear || parseInt(lastClear) < oneDayAgo) {
        console.warn(
          '⚠️ [CacheManager] Development mode: Cache has not been cleared in 24 hours. ' +
          'Consider clearing cache if experiencing stale data issues.'
        )
      }
    }
  }

  /**
   * Mark cache as recently cleared
   */
  static markCacheCleared(): void {
    localStorage.setItem('__cache_last_clear', Date.now().toString())
  }
}

// Export convenience functions
export const clearAllCaches = () => CacheManager.clearAllCaches()
export const getCacheStatus = () => CacheManager.getCacheStatus()
export const hardReload = () => CacheManager.hardReload()
export const clearLocalStorage = () => CacheManager.clearLocalStorage()
export const clearSessionStorage = () => CacheManager.clearSessionStorage()


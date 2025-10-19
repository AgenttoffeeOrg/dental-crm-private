'use client'

import { Database } from 'lucide-react'

export function CacheControlSimple() {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const clearCacheAndReload = async () => {
    console.log('🧹 Starting cache clear process...')
    
    try {
      // Step 1: Clear localStorage
      console.log('📦 Clearing localStorage...')
      const localStorageKeys = Object.keys(localStorage)
      console.log(`  - Found ${localStorageKeys.length} items in localStorage`)
      localStorage.clear()
      console.log('  ✓ localStorage cleared')
      
      // Step 2: Clear sessionStorage
      console.log('📦 Clearing sessionStorage...')
      const sessionStorageKeys = Object.keys(sessionStorage)
      console.log(`  - Found ${sessionStorageKeys.length} items in sessionStorage`)
      sessionStorage.clear()
      console.log('  ✓ sessionStorage cleared')
      
      // Step 3: Clear cache storage
      if ('caches' in window) {
        console.log('💾 Clearing cache storage...')
        const cacheNames = await caches.keys()
        console.log(`  - Found ${cacheNames.length} cache(s):`, cacheNames)
        if (cacheNames.length > 0) {
          const results = await Promise.all(
            cacheNames.map(async (name) => {
              const deleted = await caches.delete(name)
              console.log(`  - ${deleted ? '✓' : '✗'} Cache "${name}"`)
              return deleted
            })
          )
          console.log(`  ✓ Cleared ${results.filter(Boolean).length}/${cacheNames.length} cache(s)`)
        } else {
          console.log('  - No caches to clear')
        }
      }
      
      // Step 4: Unregister service workers
      if ('serviceWorker' in navigator) {
        console.log('⚙️ Unregistering service workers...')
        const registrations = await navigator.serviceWorker.getRegistrations()
        console.log(`  - Found ${registrations.length} service worker(s)`)
        if (registrations.length > 0) {
          await Promise.all(
            registrations.map(async (reg) => {
              const unregistered = await reg.unregister()
              console.log(`  - ${unregistered ? '✓' : '✗'} Service worker unregistered`)
              return unregistered
            })
          )
          console.log('  ✓ All service workers unregistered')
        } else {
          console.log('  - No service workers to unregister')
        }
      }
      
      // Step 5: Force reload with cache bypass
      console.log('🔄 Reloading page...')
      console.log('✅ ALL CACHES CLEARED SUCCESSFULLY!')
      
      // Use a small delay to ensure all operations complete
      setTimeout(() => {
        // Force reload bypassing cache
        window.location.reload()
      }, 100)
      
    } catch (error) {
      console.error('❌ Error clearing cache:', error)
      console.error('Stack trace:', error)
      alert(`Error clearing cache: ${error instanceof Error ? error.message : String(error)}\n\nReloading anyway...`)
      // Still reload even if there's an error
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  }

  return (
    <button
      onClick={clearCacheAndReload}
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 99999,
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#f97316',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#ea580c'
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#f97316'
        e.currentTarget.style.transform = 'scale(1)'
      }}
      title="Clear Cache & Reload"
    >
      <Database size={24} />
    </button>
  )
}

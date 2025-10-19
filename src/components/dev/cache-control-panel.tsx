/**
 * Cache Control Panel
 * 
 * Development utility component for managing browser cache.
 * Only visible in development mode.
 * 
 * @module components/dev/cache-control-panel
 */

'use client'

import { useState, useEffect } from 'react'
import { CacheManager } from '@/lib/cache-manager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, RefreshCw, Trash2, Database, HardDrive } from 'lucide-react'

export function CacheControlPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [cacheStatus, setCacheStatus] = useState<{
    localStorageSize: number
    sessionStorageSize: number
    cacheNames: string[]
    serviceWorkerRegistered: boolean
  } | null>(null)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [isClearing, setIsClearing] = useState(false)

  // Only show in development and in browser
  const isDevelopment = process.env.NODE_ENV === 'development'
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component only renders on client
  useEffect(() => {
    setIsMounted(true)
    console.log('[CacheControlPanel] Component mounted, isDevelopment:', process.env.NODE_ENV === 'development')
  }, [])

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return
    
    if (isDevelopment) {
      loadCacheStatus()
      CacheManager.setupDevelopmentCacheWarning()
    }
  }, [isDevelopment])

  const loadCacheStatus = async () => {
    try {
      const status = await CacheManager.getCacheStatus()
      const recs = await CacheManager.getCacheRecommendations()
      setCacheStatus(status)
      setRecommendations(recs)
    } catch (error) {
      console.error('Error loading cache status:', error)
    }
  }

  const handleClearAllCaches = async () => {
    if (confirm('This will clear all browser caches and reload the page. Continue?')) {
      setIsClearing(true)
      try {
        await CacheManager.clearAllCaches()
        CacheManager.markCacheCleared()
        CacheManager.hardReload()
      } catch (error) {
        console.error('Error clearing caches:', error)
        setIsClearing(false)
      }
    }
  }

  const handleClearLocalStorage = () => {
    if (confirm('Clear localStorage? This may log you out.')) {
      CacheManager.clearLocalStorage()
      loadCacheStatus()
    }
  }

  const handleClearSessionStorage = () => {
    CacheManager.clearSessionStorage()
    loadCacheStatus()
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Don't render on server or in production
  if (!isDevelopment || !isMounted) {
    return null
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          console.log('[CacheControlPanel] Button clicked! Opening panel...')
          setIsOpen(!isOpen)
        }}
        className="fixed bottom-4 right-4 z-[9999] bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 shadow-lg transition-all cursor-pointer"
        title="Cache Control Panel"
        type="button"
      >
        <Database className="h-5 w-5" />
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9999] w-96">
          <Card className="shadow-2xl border-2 border-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Control Panel
                <Badge variant="outline" className="ml-auto">DEV</Badge>
              </CardTitle>
              <CardDescription>
                Manage browser cache and storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              {cacheStatus && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">localStorage:</span>
                    <span className="font-mono">{formatBytes(cacheStatus.localStorageSize)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">sessionStorage:</span>
                    <span className="font-mono">{formatBytes(cacheStatus.sessionStorageSize)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cache Stores:</span>
                    <span className="font-mono">{cacheStatus.cacheNames.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Service Worker:</span>
                    <Badge variant={cacheStatus.serviceWorkerRegistered ? 'destructive' : 'secondary'}>
                      {cacheStatus.serviceWorkerRegistered ? 'Active' : 'None'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-2 text-xs bg-orange-50 dark:bg-orange-950 p-2 rounded">
                      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t">
                <Button
                  onClick={handleClearAllCaches}
                  disabled={isClearing}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isClearing ? 'Clearing...' : 'Clear All & Reload'}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleClearLocalStorage}
                    variant="outline"
                    size="sm"
                  >
                    <HardDrive className="h-4 w-4 mr-1" />
                    Local
                  </Button>
                  <Button
                    onClick={handleClearSessionStorage}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Session
                  </Button>
                </div>

                <Button
                  onClick={loadCacheStatus}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
              </div>

              {/* Keyboard shortcut hint */}
              <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                Tip: Hard reload with <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Cmd/Ctrl + Shift + R</kbd>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}


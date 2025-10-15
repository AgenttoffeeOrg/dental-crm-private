'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [queuedSubmissions, setQueuedSubmissions] = useState(0)

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check queued submissions
    checkQueuedSubmissions()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline && queuedSubmissions > 0) {
      // Trigger sync when coming back online
      triggerSync()
    }
  }, [isOnline, queuedSubmissions])

  const checkQueuedSubmissions = async () => {
    try {
      const db = await openIndexedDB()
      const tx = db.transaction('submissions', 'readonly')
      const store = tx.objectStore('submissions')
      const index = store.index('synced')
      const unsynced = await index.count(false)
      setQueuedSubmissions(unsynced)
    } catch (error) {
      // IndexedDB not available or no queued submissions
      setQueuedSubmissions(0)
    }
  }

  const triggerSync = () => {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration: any) => {
        registration.sync.register('sync-form-submissions')
      })
    } else {
      // Fallback: send message to service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_NOW',
        })
      }
    }
  }

  const openIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FormSubmissionsDB', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  if (isOnline && queuedSubmissions === 0) {
    return null // Don't show indicator when online and no queue
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline ? (
        <Badge className="bg-red-600 text-white px-4 py-2 flex items-center gap-2 shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode</span>
          {queuedSubmissions > 0 && (
            <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {queuedSubmissions}
            </span>
          )}
        </Badge>
      ) : queuedSubmissions > 0 ? (
        <div className="bg-white border-2 border-green-500 rounded-lg shadow-lg p-3 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-green-600" />
            <span className="font-medium">Back Online</span>
            <Badge className="bg-green-600">{queuedSubmissions}</Badge>
          </div>
          <Button size="sm" onClick={triggerSync} className="bg-green-600 hover:bg-green-700">
            <Upload className="h-4 w-4 mr-1" />
            Sync Now
          </Button>
        </div>
      ) : null}
    </div>
  )
}


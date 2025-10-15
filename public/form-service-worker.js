/**
 * Form Service Worker for Offline/Kiosk Mode
 * Enables form submissions even when offline
 */

const CACHE_NAME = 'dentalcrm-forms-v1'
const FORM_QUEUE_KEY = 'form-submission-queue'

// Install service worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/forms/offline.html',
        '/forms/offline.css',
      ])
    })
  )
  
  self.skipWaiting()
})

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  
  return self.clients.claim()
})

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Handle form submissions
  if (request.url.includes('/api/marketing/forms/submit') && request.method === 'POST') {
    event.respondWith(handleFormSubmission(request))
    return
  }

  // Handle other requests (cache-first strategy for static assets)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request).catch(() => {
        // If offline and not cached, return offline page
        if (request.destination === 'document') {
          return caches.match('/forms/offline.html')
        }
      })
    })
  )
})

/**
 * Handle form submission (queue if offline)
 */
async function handleFormSubmission(request) {
  try {
    // Try to submit online first
    const response = await fetch(request.clone())
    
    if (response.ok) {
      console.log('[Service Worker] Form submitted online')
      return response
    }
  } catch (error) {
    console.log('[Service Worker] Offline - queuing submission')
  }

  // If offline or failed, queue the submission
  const formData = await request.json()
  await queueSubmission(formData)

  return new Response(
    JSON.stringify({
      success: true,
      offline: true,
      message: 'Submission queued. Will sync when online.',
    }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Queue submission for later sync
 */
async function queueSubmission(formData) {
  const db = await openIndexedDB()
  const tx = db.transaction('submissions', 'readwrite')
  const store = tx.objectStore('submissions')

  await store.add({
    id: Date.now().toString(),
    data: formData,
    timestamp: new Date().toISOString(),
    synced: false,
  })

  console.log('[Service Worker] Submission queued')
}

/**
 * Open IndexedDB for offline storage
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FormSubmissionsDB', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('submissions')) {
        const store = db.createObjectStore('submissions', { keyPath: 'id' })
        store.createIndex('synced', 'synced', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Sync queued submissions when online
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-form-submissions') {
    event.waitUntil(syncQueuedSubmissions())
  }
})

async function syncQueuedSubmissions() {
  const db = await openIndexedDB()
  const tx = db.transaction('submissions', 'readonly')
  const store = tx.objectStore('submissions')
  const index = store.index('synced')

  const unsynced = await index.getAll(false)

  console.log(`[Service Worker] Syncing ${unsynced.length} queued submissions`)

  for (const submission of unsynced) {
    try {
      const response = await fetch('/api/marketing/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission.data),
      })

      if (response.ok) {
        // Mark as synced
        const updateTx = db.transaction('submissions', 'readwrite')
        const updateStore = updateTx.objectStore('submissions')
        
        submission.synced = true
        submission.syncedAt = new Date().toISOString()
        await updateStore.put(submission)

        console.log('[Service Worker] Synced submission:', submission.id)
      }
    } catch (error) {
      console.error('[Service Worker] Error syncing submission:', error)
    }
  }
}

/**
 * Listen for online event to trigger sync
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncQueuedSubmissions())
  }
})


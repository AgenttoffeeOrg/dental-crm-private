/* eslint-disable no-restricted-globals */
/**
 * Service worker for Web Push (Phase 2b.70).
 *
 * Two responsibilities:
 *
 *   1. Receive 'push' events from the browser push service and render a
 *      native OS notification. Payload comes in JSON; we decode it,
 *      pull out title + body + URL, then call showNotification.
 *
 *   2. On 'notificationclick', open the URL the cron passed in
 *      (typically /tasks?taskId=... or /tasks?mode=queue). If a CRM tab
 *      is already open at any URL, focus it and navigate; otherwise
 *      open a new tab.
 *
 * This file is served from /sw.js at the site root (public/sw.js) so
 * its scope covers the whole app. Re-registered on every page load by
 * /src/lib/notifications/push-client.ts.
 *
 * Notes:
 *   - Keep this file dependency-free. It's not bundled by Next.js;
 *     the browser fetches /sw.js literally.
 *   - Don't introduce TypeScript syntax — plain JS.
 *   - Bump the SW_VERSION constant if you ever need to force a
 *     re-registration cycle. Browsers compare byte-for-byte so any
 *     change suffices, but the version comment helps debugging.
 */

const SW_VERSION = '2b.70.1'

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately on first install,
  // without needing the operator to close all tabs.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    // Some push providers send text/plain. Fall back gracefully.
    data = { title: 'New notification', body: (event.data && event.data.text()) || '' }
  }

  const title = data.title || 'Limelight Dental CRM'
  const body = data.body || ''
  const url = data.url || '/tasks?mode=queue'
  const tag = data.tag || 'limelight-task'

  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag,
    // renotify=true so consecutive same-tag notifications still
    // vibrate/sound on mobile. Useful for "second urgent task arrived".
    renotify: true,
    data: { url, taskId: data.taskId || null, sentAt: data.sentAt || null },
    requireInteraction: data.requireInteraction === true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data && event.notification.data.url) || '/tasks?mode=queue'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // If a CRM tab is already open, focus it and navigate.
      for (const client of allClients) {
        try {
          // Prefer same-origin tabs. Navigate the existing tab to the
          // target URL so the operator doesn't end up with N duplicate
          // tabs.
          if ('focus' in client && client.url.includes(self.location.origin)) {
            await client.focus()
            if ('navigate' in client) {
              try {
                await client.navigate(targetUrl)
              } catch (e) {
                // Some browsers throw on cross-origin nav; ignore.
              }
            }
            return
          }
        } catch (e) {
          // Continue to next client.
        }
      }

      // No matching tab — open a new one.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })()
  )
})

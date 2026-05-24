/**
 * Browser-side helpers for Web Push subscription (Phase 2b.70).
 *
 * Flow:
 *   1. Page calls `registerServiceWorker()` once.
 *   2. UI calls `requestPushPermission()` → triggers the browser's
 *      native permission prompt.
 *   3. If granted, UI calls `subscribeToPush()` which talks to the
 *      browser's PushManager + POSTs the resulting subscription to
 *      /api/push-subscriptions so the server can deliver pings later.
 *   4. `unsubscribeFromPush()` removes the subscription locally and
 *      tells the server to delete it.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function pushPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  try {
    // Same path as public/sw.js — registered at the site root so its
    // scope covers all routes.
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    // Ensure it's active before we hand it back.
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', () => {
          if (registration.active) resolve()
        })
      })
    }
    return registration
  } catch (err) {
    console.warn('[push-client] service worker registration failed', err)
    return null
  }
}

export async function requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export async function subscribeToPush(): Promise<
  | { success: true; subscription: PushSubscription }
  | { success: false; error: string }
> {
  if (!isPushSupported()) return { success: false, error: 'push_not_supported' }
  if (!VAPID_PUBLIC_KEY) return { success: false, error: 'vapid_public_key_missing' }
  if (Notification.permission !== 'granted') {
    return { success: false, error: 'permission_not_granted' }
  }

  const registration = await registerServiceWorker()
  if (!registration) return { success: false, error: 'sw_registration_failed' }

  try {
    // Reuse the existing subscription if there is one. Browsers
    // already dedup at the (endpoint, applicationServerKey) layer but
    // calling subscribe again is a no-op if everything matches.
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast to BufferSource — TS5 made Uint8Array generic-aware
        // (Uint8Array<ArrayBufferLike>) which the lib.dom signature
        // doesn't yet accept directly.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      })
    }

    // Hand the subscription to the server. The server uses
    // service-role to write into push_subscriptions (RLS blocks user
    // writes per migration 2b.59).
    const res = await fetch('/api/push-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        user_agent: navigator.userAgent,
      }),
      credentials: 'include',
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { success: false, error: body.error || `http_${res.status}` }
    }

    return { success: true, subscription }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'subscribe_failed',
    }
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: false, error: 'push_not_supported' }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    if (!registration) return { success: true }

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return { success: true }

    const endpoint = subscription.endpoint

    await subscription.unsubscribe()

    // Tell the server to drop the row. Don't fail the UI if this
    // request fails — the local unsubscribe already happened.
    try {
      await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
        credentials: 'include',
      })
    } catch {
      /* best-effort */
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'unsubscribe_failed',
    }
  }
}

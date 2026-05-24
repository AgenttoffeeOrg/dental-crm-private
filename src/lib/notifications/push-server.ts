/**
 * Server-side Web Push dispatcher (Phase 2b.70).
 *
 * Wraps the `web-push` library with our config + auto-prune of dead
 * subscriptions. Used by /api/cron/task-push-notifications.
 *
 * `web-push` is lazy-required inside `sendPushTo` so a missing
 * VAPID_* env var doesn't break unrelated Vercel cold-starts (per
 * the dispatcher / DOMPurify pattern in operational-gotchas).
 *
 * Errors from web-push that mean "this subscription is dead" (HTTP
 * 404 and 410 from the push service) trigger an immediate delete on
 * push_subscriptions so we stop trying to send to it. Other errors
 * surface to the caller without deletion.
 */

import { createServiceClient } from '@/lib/supabase-server'

export interface PushSubscriptionRow {
  id: string
  tenant_id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  taskId?: string
  tag?: string
  requireInteraction?: boolean
}

export interface PushSendResult {
  success: boolean
  pruned: boolean
  statusCode?: number
  error?: string
}

let webpushSingleton: typeof import('web-push') | null = null
let webpushConfigured = false

function getWebPush(): typeof import('web-push') {
  if (webpushSingleton) return webpushSingleton
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const lib = require('web-push') as typeof import('web-push')
  if (!webpushConfigured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? ''
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:noreply@example.com'
    if (publicKey && privateKey) {
      lib.setVapidDetails(subject, publicKey, privateKey)
      webpushConfigured = true
    }
  }
  webpushSingleton = lib
  return lib
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

/**
 * Send a single push to one subscription row. On 404/410 (dead
 * subscription) the row is pruned automatically.
 */
export async function sendPushTo(
  subscription: PushSubscriptionRow,
  payload: PushPayload
): Promise<PushSendResult> {
  if (!isPushConfigured()) {
    return { success: false, pruned: false, error: 'vapid_not_configured' }
  }

  const webpush = getWebPush()

  const subBody = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/tasks?mode=queue',
    taskId: payload.taskId ?? null,
    tag: payload.tag ?? 'limelight-task',
    requireInteraction: payload.requireInteraction === true,
    sentAt: new Date().toISOString(),
  })

  try {
    await webpush.sendNotification(subBody as any, body, { TTL: 60 * 60 })
    // Update last_used_at — best-effort.
    try {
      const service = createServiceClient()
      await service
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', subscription.id)
    } catch {
      /* swallow timestamp errors */
    }
    return { success: true, pruned: false }
  } catch (err: any) {
    const statusCode: number | undefined = err?.statusCode
    if (statusCode === 404 || statusCode === 410) {
      // Subscription is dead — prune the row so we don't keep trying.
      try {
        const service = createServiceClient()
        await service.from('push_subscriptions').delete().eq('id', subscription.id)
      } catch {
        /* swallow */
      }
      return { success: false, pruned: true, statusCode, error: 'gone' }
    }
    return {
      success: false,
      pruned: false,
      statusCode,
      error: err?.message || String(err),
    }
  }
}

/**
 * Convenience: load every subscription for a user and dispatch.
 * Returns aggregate counts.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ delivered: number; failed: number; pruned: number }> {
  const service = createServiceClient()
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, tenant_id, user_id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  let delivered = 0
  let failed = 0
  let pruned = 0

  for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
    const result = await sendPushTo(sub, payload)
    if (result.success) delivered += 1
    else if (result.pruned) pruned += 1
    else failed += 1
  }

  return { delivered, failed, pruned }
}

/**
 * Phase 2b.2.a.2 — signed-URL helper for the `message-media` storage bucket.
 *
 * Files in the bucket are private (`public: false` per the migration). To
 * render images / play audio / link downloads in the UI, callers need
 * short-lived signed URLs. This helper batches a list of paths through
 * `createSignedUrls` and returns a `path → signedUrl` map for easy lookup.
 *
 * Works on both server- and client-side Supabase clients — the browser
 * `authenticated` user can sign URLs for their own tenant's paths because
 * the storage RLS policy allows tenant-scoped SELECT on `storage.objects`.
 *
 * 1 hour TTL is a deliberate compromise: long enough that a CRM page's
 * embedded `<img>` / `<audio>` tags don't 401 mid-session, short enough
 * that a leaked URL doesn't grant indefinite access.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import { MESSAGE_MEDIA_BUCKET } from './media-store'

export const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600

/**
 * Generate signed URLs for a batch of `message-media` paths.
 *
 * - Returns a `Map<path, signedUrl>`. Paths that fail to sign are simply
 *   absent from the map; callers should treat missing entries as
 *   "currently unrenderable" and degrade gracefully.
 * - Empty input → empty map (no DB / network call).
 * - Duplicate paths in the input are de-duplicated before the call.
 */
export async function signMessageMediaUrls(
  supabase: SupabaseClient,
  paths: string[],
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const unique = Array.from(new Set(paths.filter((p) => p && p.length > 0)))
  if (unique.length === 0) return out

  const { data, error } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .createSignedUrls(unique, ttlSeconds)

  if (error || !data) {
    console.warn('[inbound-media] signMessageMediaUrls failed', {
      paths_count: unique.length,
      error_message: error?.message,
    })
    return out
  }

  for (const entry of data) {
    if (entry?.path && entry.signedUrl) {
      out.set(entry.path, entry.signedUrl)
    }
  }
  return out
}

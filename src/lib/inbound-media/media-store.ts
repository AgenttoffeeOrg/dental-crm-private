/**
 * Phase 2b.2.a.2 — inbound media download / upload / persist pipeline.
 *
 * A channel-agnostic helper layer. WhatsApp (via Twilio) uses it now;
 * Messenger (Phase 2b.2.b) will reuse the upload + persist halves with a
 * Messenger-specific download.
 *
 * Pipeline shape:
 *
 *   downloadTwilioMedia(url)
 *     ↓ Buffer + contentType + byteSize
 *   uploadMediaToStorage(supabaseAdmin, { tenantId, activityId, mediaIndex, ... })
 *     ↓ storagePath
 *   persistMessageMedia(supabaseAdmin, { tenantId, activityId, contactId, ... })
 *     ↓ messageMediaId
 *
 * `processInboundMediaItems` orchestrates all three for an array of media
 * items belonging to one inbound message. Per-item failures are logged and
 * skipped — the activity stays valid even with partial media loss, and the
 * caller decides what to do with the per-item result array.
 *
 * Safety rails:
 *   - 10-second hard timeout per Twilio download (`AbortSignal.timeout`).
 *   - 16 MiB content-length cap (matches Twilio's WhatsApp media maximum
 *     and the bucket's `file_size_limit`).
 *   - Idempotency at two layers: storage `upsert: false` rejects path
 *     collisions; the (external_message_id, media_index) partial unique
 *     index on `message_media` rejects duplicate rows.
 *   - Service-role Supabase client is required for writes (RLS bypass
 *     intentional — the webhook runs before any user auth).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// Errors
// =============================================================================

export type TwilioMediaDownloadReason =
  | 'timeout'
  | 'auth'
  | 'not_found'
  | 'network'
  | 'too_large'
  | 'unknown'

export class TwilioMediaDownloadError extends Error {
  public readonly reason: TwilioMediaDownloadReason
  public readonly status?: number
  public readonly contentLength?: number

  constructor(
    reason: TwilioMediaDownloadReason,
    message: string,
    extras?: { status?: number; contentLength?: number }
  ) {
    super(message)
    this.name = 'TwilioMediaDownloadError'
    this.reason = reason
    this.status = extras?.status
    this.contentLength = extras?.contentLength
  }
}

// =============================================================================
// Constants
// =============================================================================

/** Twilio's WhatsApp media size cap, also enforced at the bucket level. */
export const MAX_MEDIA_BYTES = 16 * 1024 * 1024

/** Hard timeout per media download. */
export const DOWNLOAD_TIMEOUT_MS = 10_000

/** Bucket id created in the 2b.2.a.2 migration. */
export const MESSAGE_MEDIA_BUCKET = 'message-media'

const POSTGRES_UNIQUE_VIOLATION = '23505'
const MESSAGE_MEDIA_UNIQUE_INDEX = 'idx_message_media_msg_idx_uniq'

/**
 * Map a content-type to a sensible file extension. Falls back to `bin` for
 * unknown types so the storage path is always well-formed; the bucket's
 * `allowed_mime_types` list is the real defense against unexpected payloads.
 */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'audio/wav': 'wav',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/3gpp': '3gp',
  'application/pdf': 'pdf',
}

export function extensionFor(contentType: string): string {
  const normalized = (contentType || '').toLowerCase().split(';')[0].trim()
  return EXTENSION_BY_CONTENT_TYPE[normalized] ?? 'bin'
}

// =============================================================================
// downloadTwilioMedia
// =============================================================================

/**
 * Download a media item from Twilio. Twilio media URLs require Basic Auth
 * with `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` — they are not publicly
 * accessible (good for patient privacy).
 *
 * Hard timeout: `DOWNLOAD_TIMEOUT_MS`. The default Node fetch follows the
 * 302 redirect Twilio issues to a temporary S3-presigned URL automatically.
 *
 * Error mapping:
 *   - DOMException (`AbortError`)  → `timeout`
 *   - 401 / 403                    → `auth`
 *   - 404                          → `not_found`
 *   - 4xx (other) / 5xx            → `network`
 *   - content-length > cap         → `too_large` (no body read)
 *   - any other thrown / unknown   → `unknown`
 */
export async function downloadTwilioMedia(url: string): Promise<{
  buffer: Buffer
  contentType: string
  byteSize: number
}> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? ''
  if (!accountSid || !authToken) {
    throw new TwilioMediaDownloadError(
      'auth',
      'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN env vars are not configured'
    )
  }

  const basic = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Authorization: `Basic ${basic}` },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new TwilioMediaDownloadError(
        'timeout',
        `Twilio media download timed out after ${DOWNLOAD_TIMEOUT_MS}ms`
      )
    }
    throw new TwilioMediaDownloadError(
      'network',
      err instanceof Error ? err.message : 'fetch failed'
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new TwilioMediaDownloadError(
      'auth',
      `Twilio media download returned ${response.status}`,
      { status: response.status }
    )
  }
  if (response.status === 404) {
    throw new TwilioMediaDownloadError('not_found', 'Twilio media URL returned 404', {
      status: 404,
    })
  }
  if (!response.ok) {
    throw new TwilioMediaDownloadError(
      'network',
      `Twilio media download returned ${response.status}`,
      { status: response.status }
    )
  }

  // Reject obviously oversized payloads BEFORE buffering. The bucket cap is
  // the second safety net.
  const contentLengthHeader = response.headers.get('content-length')
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : NaN
  if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_BYTES) {
    throw new TwilioMediaDownloadError(
      'too_large',
      `Twilio media exceeds ${MAX_MEDIA_BYTES} bytes (content-length=${contentLength})`,
      { status: response.status, contentLength }
    )
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Defensive: header-less responses still need bounding.
  if (buffer.byteLength > MAX_MEDIA_BYTES) {
    throw new TwilioMediaDownloadError(
      'too_large',
      `Twilio media exceeds ${MAX_MEDIA_BYTES} bytes (actual=${buffer.byteLength})`,
      { contentLength: buffer.byteLength }
    )
  }

  return {
    buffer,
    contentType: contentType.split(';')[0].trim(),
    byteSize: buffer.byteLength,
  }
}

// =============================================================================
// uploadMediaToStorage
// =============================================================================

interface UploadMediaArgs {
  tenantId: string
  activityId: string
  mediaIndex: number
  contentType: string
  buffer: Buffer
}

/**
 * Upload to Supabase Storage at `{tenantId}/{activityId}/{mediaIndex}.{ext}`.
 *
 * `upsert: false` is intentional — a path collision means the same media
 * item from a re-fired webhook is being processed; we report
 * `alreadyExists: true` and let `persistMessageMedia` find / return the
 * existing row.
 */
export async function uploadMediaToStorage(
  supabaseAdmin: SupabaseClient,
  args: UploadMediaArgs
): Promise<{ storagePath: string; alreadyExists: boolean }> {
  const ext = extensionFor(args.contentType)
  const storagePath = `${args.tenantId}/${args.activityId}/${args.mediaIndex}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .upload(storagePath, args.buffer, {
      contentType: args.contentType,
      upsert: false,
    })

  if (!error) {
    return { storagePath, alreadyExists: false }
  }

  if (isStorageCollision(error)) {
    return { storagePath, alreadyExists: true }
  }

  throw new Error(
    `uploadMediaToStorage failed: ${error.message ?? 'unknown storage error'}`
  )
}

/**
 * Heuristic for "the file already exists" errors from Supabase Storage. The
 * surfaced shape is unstable across versions; we match on substrings rather
 * than rely on a code field that's frequently undefined.
 */
function isStorageCollision(err: { message?: string; statusCode?: string | number }): boolean {
  const message = (err.message ?? '').toLowerCase()
  const status = err.statusCode != null ? String(err.statusCode) : ''
  return (
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('the resource already exists') ||
    status === '409'
  )
}

// =============================================================================
// persistMessageMedia
// =============================================================================

interface PersistMediaArgs {
  tenantId: string
  activityId: string
  contactId: string
  attributionTouchpointId: string
  externalMessageId: string
  mediaIndex: number
  storageBucket: string
  storagePath: string
  contentType: string
  byteSize: number
  originalUrl: string | null
}

/**
 * Insert a `message_media` row. On unique-violation against
 * `idx_message_media_msg_idx_uniq` (Twilio retry race), select the existing
 * row and return `{ messageMediaId, alreadyPersisted: true }` — idempotent.
 */
export async function persistMessageMedia(
  supabaseAdmin: SupabaseClient,
  args: PersistMediaArgs
): Promise<{ messageMediaId: string; alreadyPersisted: boolean }> {
  const insertPayload = {
    tenant_id: args.tenantId,
    activity_id: args.activityId,
    contact_id: args.contactId,
    attribution_touchpoint_id: args.attributionTouchpointId,
    external_message_id: args.externalMessageId,
    media_index: args.mediaIndex,
    storage_bucket: args.storageBucket,
    storage_path: args.storagePath,
    content_type: args.contentType,
    byte_size: args.byteSize,
    original_url: args.originalUrl,
  }

  const { data, error } = await supabaseAdmin
    .from('message_media')
    .insert(insertPayload)
    .select('id')
    .single()

  if (!error && data) {
    return { messageMediaId: data.id as string, alreadyPersisted: false }
  }

  if (error && isUniqueViolation(error)) {
    const existing = await fetchExistingMessageMediaId(supabaseAdmin, {
      externalMessageId: args.externalMessageId,
      mediaIndex: args.mediaIndex,
    })
    if (existing) {
      return { messageMediaId: existing, alreadyPersisted: true }
    }
  }

  throw new Error(
    `persistMessageMedia failed: ${error?.message ?? 'unknown insert error'}`
  )
}

function isUniqueViolation(err: { code?: string; message?: string; details?: string }): boolean {
  if (err.code !== POSTGRES_UNIQUE_VIOLATION) return false
  const haystack = `${err.message ?? ''} ${err.details ?? ''}`
  return (
    haystack.includes(MESSAGE_MEDIA_UNIQUE_INDEX) ||
    haystack.includes('external_message_id') ||
    haystack.includes('media_index')
  )
}

async function fetchExistingMessageMediaId(
  supabaseAdmin: SupabaseClient,
  args: { externalMessageId: string; mediaIndex: number }
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('message_media')
    .select('id')
    .eq('external_message_id', args.externalMessageId)
    .eq('media_index', args.mediaIndex)
    .limit(1)
    .maybeSingle()
  return data ? (data.id as string) : null
}

// =============================================================================
// processInboundMediaItems — orchestrator
// =============================================================================

export interface InboundMediaInput {
  url: string
  contentType: string
}

export type MediaItemResult =
  | { status: 'persisted'; mediaIndex: number; messageMediaId: string }
  | { status: 'already_persisted'; mediaIndex: number; messageMediaId: string }
  | { status: 'failed'; mediaIndex: number; reason: string }

interface ProcessInboundMediaArgs {
  tenantId: string
  activityId: string
  contactId: string
  attributionTouchpointId: string
  externalMessageId: string
  mediaUrls: InboundMediaInput[]
}

/**
 * For one inbound message with N media items, download → upload → persist
 * each one. Per-item failure does NOT fail the batch. We log a structured
 * error and continue.
 *
 * Cyclomatic complexity is kept ≤ 8 by delegating per-item work to
 * `processSingleMediaItem`.
 */
export async function processInboundMediaItems(
  supabaseAdmin: SupabaseClient,
  args: ProcessInboundMediaArgs
): Promise<MediaItemResult[]> {
  const results: MediaItemResult[] = []
  for (let mediaIndex = 0; mediaIndex < args.mediaUrls.length; mediaIndex++) {
    const item = args.mediaUrls[mediaIndex]
    // eslint-disable-next-line no-await-in-loop -- intentional sequential
    // processing so a slow / hung item can't fork N parallel downloads on
    // the webhook's request thread; volumes are low (<= 10 per Twilio).
    const result = await processSingleMediaItem(supabaseAdmin, {
      ...args,
      mediaIndex,
      url: item.url,
      contentType: item.contentType,
    })
    results.push(result)
  }
  return results
}

interface ProcessSingleMediaArgs {
  tenantId: string
  activityId: string
  contactId: string
  attributionTouchpointId: string
  externalMessageId: string
  mediaIndex: number
  url: string
  contentType: string
}

async function processSingleMediaItem(
  supabaseAdmin: SupabaseClient,
  args: ProcessSingleMediaArgs
): Promise<MediaItemResult> {
  try {
    const downloaded = await downloadTwilioMedia(args.url)
    const effectiveContentType = downloaded.contentType || args.contentType || 'application/octet-stream'

    const upload = await uploadMediaToStorage(supabaseAdmin, {
      tenantId: args.tenantId,
      activityId: args.activityId,
      mediaIndex: args.mediaIndex,
      contentType: effectiveContentType,
      buffer: downloaded.buffer,
    })

    const persisted = await persistMessageMedia(supabaseAdmin, {
      tenantId: args.tenantId,
      activityId: args.activityId,
      contactId: args.contactId,
      attributionTouchpointId: args.attributionTouchpointId,
      externalMessageId: args.externalMessageId,
      mediaIndex: args.mediaIndex,
      storageBucket: MESSAGE_MEDIA_BUCKET,
      storagePath: upload.storagePath,
      contentType: effectiveContentType,
      byteSize: downloaded.byteSize,
      originalUrl: args.url,
    })

    return {
      status: persisted.alreadyPersisted ? 'already_persisted' : 'persisted',
      mediaIndex: args.mediaIndex,
      messageMediaId: persisted.messageMediaId,
    }
  } catch (err) {
    const reason = describeFailure(err)
    console.error('[inbound-media] media item failed', {
      external_message_id: args.externalMessageId,
      media_index: args.mediaIndex,
      tenant_id: args.tenantId,
      activity_id: args.activityId,
      reason,
    })
    return { status: 'failed', mediaIndex: args.mediaIndex, reason }
  }
}

function describeFailure(err: unknown): string {
  if (err instanceof TwilioMediaDownloadError) return `download:${err.reason}`
  if (err instanceof Error) return err.message.slice(0, 200)
  return 'unknown'
}

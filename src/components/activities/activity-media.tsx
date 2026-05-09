'use client'

/**
 * Phase 2b.2.a.2 — render media attached to an activity (inbound WhatsApp
 * media: photo / voice note / video / PDF, etc.).
 *
 * Layout: a vertical stack of media items below the message body. Each
 * item is rendered based on its content-type:
 *
 *   image/*        → bounded `<img>` with click-to-open-fullsize
 *   audio/*        → `<audio controls preload="none">`
 *   video/*        → `<video controls preload="none" playsInline>`
 *   application/pdf
 *     and other    → download link with a generic file icon and a
 *                    human-readable size label
 *
 * Engineering notes:
 *   - `preload="none"` on audio/video keeps long timelines from spamming
 *     the bucket with range requests when nothing is playing.
 *   - Images are capped at 320 px wide so they don't blow out the timeline
 *     layout. Click opens the signed URL in a new tab as a lightweight
 *     "lightbox" — the project has no shared modal/lightbox primitive yet.
 *   - We accept paths whose signed URL failed to generate — those items
 *     render as a small inline message ("Media unavailable — refresh the
 *     page") rather than a broken `<img>` icon.
 */

import { FileText, Download, AlertCircle } from 'lucide-react'

export interface ActivityMediaItem {
  id: string
  contentType: string
  signedUrl: string | null
  byteSize: number
  storagePath?: string
}

interface ActivityMediaProps {
  items: ActivityMediaItem[]
}

type MediaKind = 'image' | 'audio' | 'video' | 'file'

function kindFor(contentType: string): MediaKind {
  const lower = (contentType || '').toLowerCase()
  if (lower.startsWith('image/')) return 'image'
  if (lower.startsWith('audio/')) return 'audio'
  if (lower.startsWith('video/')) return 'video'
  return 'file'
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unit]}`
}

function filenameFromPath(path?: string): string | null {
  if (!path) return null
  const parts = path.split('/')
  const last = parts[parts.length - 1]
  return last || null
}

function renderMediaItem(item: ActivityMediaItem) {
  if (!item.signedUrl) {
    return <UnavailableItem key={item.id} contentType={item.contentType} />
  }
  const kind = kindFor(item.contentType)
  if (kind === 'image') return <ImageItem key={item.id} item={item} />
  if (kind === 'audio') return <AudioItem key={item.id} item={item} />
  if (kind === 'video') return <VideoItem key={item.id} item={item} />
  return <FileItem key={item.id} item={item} />
}

export function ActivityMedia({ items }: ActivityMediaProps) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-2 space-y-2" data-testid="activity-media">
      {items.map(renderMediaItem)}
    </div>
  )
}

function ImageItem({ item }: { item: ActivityMediaItem }) {
  return (
    <a
      href={item.signedUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block overflow-hidden rounded-md border border-gray-200 bg-gray-50 hover:border-blue-300 transition-colors"
      style={{ maxWidth: 320 }}
      data-testid="activity-media-image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase
          URL changes per request; Next/Image's loader doesn't help here. */}
      <img
        src={item.signedUrl ?? ''}
        alt="WhatsApp attachment"
        loading="lazy"
        className="block w-full h-auto max-h-80 object-contain bg-gray-100"
      />
    </a>
  )
}

function AudioItem({ item }: { item: ActivityMediaItem }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2"
      onClick={(e) => e.stopPropagation()}
      data-testid="activity-media-audio"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- inbound voice
          notes have no caption track; the surrounding activity has full
          context. */}
      <audio
        controls
        preload="none"
        src={item.signedUrl ?? ''}
        className="w-full max-w-md"
      />
    </div>
  )
}

function VideoItem({ item }: { item: ActivityMediaItem }) {
  return (
    <div
      className="overflow-hidden rounded-md border border-gray-200 bg-black"
      style={{ maxWidth: 320 }}
      onClick={(e) => e.stopPropagation()}
      data-testid="activity-media-video"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- as above */}
      <video
        controls
        preload="none"
        playsInline
        src={item.signedUrl ?? ''}
        className="block w-full h-auto"
      />
    </div>
  )
}

function FileItem({ item }: { item: ActivityMediaItem }) {
  const filename = filenameFromPath(item.storagePath) ?? 'attachment'
  return (
    <a
      href={item.signedUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 hover:border-blue-300 hover:bg-blue-50/50 transition-colors max-w-md"
      data-testid="activity-media-file"
    >
      <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">{filename}</div>
        <div className="text-xs text-gray-500">
          {item.contentType || 'application/octet-stream'} · {formatBytes(item.byteSize)}
        </div>
      </div>
      <Download className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </a>
  )
}

function UnavailableItem({ contentType }: { contentType: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500"
      data-testid="activity-media-unavailable"
    >
      <AlertCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <span>Media unavailable ({contentType || 'unknown'}) — refresh the page to retry.</span>
    </div>
  )
}

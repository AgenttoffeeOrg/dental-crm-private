/**
 * Phase 2b.2.a.2 — one-off backfill for inbound media that arrived during
 * the deploy window (between the 2b.2.a.2 push and Vercel's auto-deploy
 * completing).
 *
 * The 2b.2.a code path captures every `MediaUrl{N}` / `MediaContentType{N}`
 * pair into `attribution_touchpoints.metadata.raw_payload._media_urls`,
 * even when the media-handling pipeline isn't live yet. Twilio media URLs
 * stay valid for ~7–30 days, so we can replay them through the new
 * `processInboundMediaItems` orchestrator after the fact and end up with
 * the same `message_media` rows + storage uploads we'd have got if the
 * deploy had been live when the message arrived.
 *
 * This script is run once and then deleted — it's not part of the
 * application code path.
 *
 * Usage:
 *   tsx scripts/2b-2-a-2-backfill-captured-media.ts <touchpoint_id> [<touchpoint_id> ...]
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import { createClient } from '@supabase/supabase-js'
import {
  processInboundMediaItems,
  type InboundMediaInput,
} from '../src/lib/inbound-media/media-store'

async function main() {
  const ids = process.argv.slice(2)
  if (ids.length === 0) {
    console.error('Usage: tsx 2b-2-a-2-backfill-captured-media.ts <touchpoint_id> ...')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  for (const touchpointId of ids) {
    console.log(`\n=== Backfill ${touchpointId} ===`)
    const { data: tp, error } = await admin
      .from('attribution_touchpoints')
      .select('id, tenant_id, contact_id, external_message_id, metadata, created_at')
      .eq('id', touchpointId)
      .single()
    if (error || !tp) {
      console.error('  → not found:', error?.message)
      continue
    }

    const raw = (tp.metadata as { raw_payload?: Record<string, unknown> } | null)
      ?.raw_payload as Record<string, unknown> | undefined
    const mediaUrlsRaw = raw?._media_urls
    if (!Array.isArray(mediaUrlsRaw) || mediaUrlsRaw.length === 0) {
      console.log('  → no _media_urls captured; skipping')
      continue
    }

    const mediaUrls: InboundMediaInput[] = mediaUrlsRaw
      .filter((m): m is { url: string; contentType: string } =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as { url?: unknown }).url === 'string' &&
        typeof (m as { contentType?: unknown }).contentType === 'string'
      )
      .map((m) => ({ url: m.url, contentType: m.contentType }))

    // Find the related activity (1:1 with the touchpoint per
    // ingestLead.insertActivity).
    const { data: act, error: actErr } = await admin
      .from('activities')
      .select('id')
      .eq('tenant_id', tp.tenant_id as string)
      .eq('source_channel', 'whatsapp_inbound')
      .gte('occurred_at', new Date(new Date(tp.created_at as string).getTime() - 5_000).toISOString())
      .lte('occurred_at', new Date(new Date(tp.created_at as string).getTime() + 30_000).toISOString())
      .eq('contact_id', tp.contact_id as string)
      .order('occurred_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (actErr || !act) {
      console.error('  → could not locate activity row:', actErr?.message)
      continue
    }

    console.log(`  touchpoint=${tp.id}`)
    console.log(`  external_message_id=${tp.external_message_id}`)
    console.log(`  activity=${act.id}`)
    console.log(`  contact=${tp.contact_id}`)
    console.log(`  mediaUrls=${mediaUrls.length}`)

    const results = await processInboundMediaItems(admin, {
      tenantId: tp.tenant_id as string,
      activityId: act.id as string,
      contactId: tp.contact_id as string,
      attributionTouchpointId: tp.id as string,
      externalMessageId: tp.external_message_id as string,
      mediaUrls,
    })

    for (const r of results) {
      console.log(`  result[${r.mediaIndex}]:`, JSON.stringify(r))
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FATAL', err)
    process.exit(1)
  })

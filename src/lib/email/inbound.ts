/**
 * Phase 2b.27 — Inbound email helpers.
 *
 * Until now the email webhook was a stub: it found a contact by
 * `primary_email = from`, wrote a single activity, and returned. No
 * dedup, no deal, no tenant resolution for unknown senders. Brand-new
 * email leads were silently dropped.
 *
 * This module supplies two helpers the rewritten webhook needs:
 *
 *   1. resolveTenantByInboundEmailAddress — match the practice's
 *      receiving address against `integration_settings.email_from_address`.
 *      That column is dual-purpose for Phase 1: practices typically
 *      send and receive at the same address, so the same column anchors
 *      both directions. A later phase can split into a dedicated
 *      `email_inbound_address` if practices need separate inboxes.
 *
 *   2. parseInboundEmailPayload — normalise the variant payload shapes
 *      that SendGrid Inbound Parse, Mailgun, Postmark and Resend each
 *      emit into a single typed shape `ingestLead` can consume.
 *
 * Service-role expectation: callers are inside the email webhook route.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface EmailTenantResolution {
  tenantId: string
  matchedAddress: string
}

export async function resolveTenantByInboundEmailAddress(
  supabase: SupabaseClient,
  toAddress: string
): Promise<EmailTenantResolution | null> {
  if (!toAddress) return null
  const normalised = toAddress.trim().toLowerCase()
  if (normalised.length === 0) return null

  // integration_settings.email_from_address is stored as the practice
  // typed it (mixed case); compare case-insensitively because email
  // local-parts are conventionally case-preserving but case-insensitive
  // per RFC 5321 §2.4.
  const { data, error } = await supabase
    .from('integration_settings')
    .select('tenant_id, email_from_address, created_at')
    .ilike('email_from_address', normalised)
    .order('created_at', { ascending: true })
    .limit(2)

  if (error) {
    console.warn('[email-inbound] tenant lookup failed', {
      to: normalised,
      error: error.message,
    })
    return null
  }
  if (!data || data.length === 0) return null
  if (data.length > 1) {
    console.warn(
      '[email-inbound] multi-tenant collision on email_from_address — oldest wins',
      {
        to: normalised,
        tenant_ids: data.map((r) => r.tenant_id),
      }
    )
  }
  return {
    tenantId: data[0].tenant_id as string,
    matchedAddress: (data[0].email_from_address as string) ?? normalised,
  }
}

export interface NormalisedInboundEmail {
  /** Sender email address (lowercased + trimmed). */
  fromEmail: string
  /** Sender display name if the provider extracted one. */
  fromName: string | null
  /** The address this email landed at (lowercased + trimmed). */
  toEmail: string
  /** All recipients including CC, for the activity row. */
  toAll: string[]
  subject: string | null
  /** Plain-text body (preferred over HTML for the ingest signal). */
  textBody: string | null
  /** Original HTML body, if any. */
  htmlBody: string | null
  /** Provider's stable message id — used for idempotency. */
  messageId: string | null
  /** Stable thread/reference id when available (In-Reply-To / References header). */
  inReplyTo: string | null
  hasAttachments: boolean
  /** Original payload — preserved for the touchpoint's raw_payload. */
  rawPayload: Record<string, unknown>
}

/**
 * Parse the body into a normalised shape. Accepts SendGrid Inbound
 * Parse, Mailgun, Postmark and Resend variants. Returns null when the
 * payload doesn't carry enough to ingest (missing from / to).
 */
export function parseInboundEmailPayload(
  body: Record<string, unknown>
): NormalisedInboundEmail | null {
  const fromRaw = firstString(body, ['from', 'From', 'sender', 'envelope_from']) ?? null
  const toRaw = firstString(body, ['to', 'To', 'recipient', 'envelope_to']) ?? null
  const subject = firstString(body, ['subject', 'Subject']) ?? null
  const textBody = firstString(body, ['text', 'Text', 'plain', 'body-plain', 'TextBody']) ?? null
  const htmlBody = firstString(body, ['html', 'Html', 'body-html', 'HtmlBody']) ?? null
  const messageId =
    firstString(body, ['message_id', 'Message-ID', 'message-id', 'MessageID', 'MessageId']) ?? null
  const inReplyTo =
    firstString(body, ['in_reply_to', 'In-Reply-To', 'references', 'References']) ?? null
  const ccRaw = firstString(body, ['cc', 'Cc']) ?? null

  if (!fromRaw || !toRaw) return null

  const fromParsed = parseAddress(fromRaw)
  const toParsed = parseAddress(toRaw)
  const toAll = [toRaw, ccRaw].filter(Boolean) as string[]

  // Attachments shape varies enormously; we just need to know if any
  // exist for the activity flag.
  const attachments = body.attachments
  const hasAttachments =
    (Array.isArray(attachments) && attachments.length > 0) ||
    (typeof attachments === 'string' && attachments.length > 2) ||
    (typeof body.attachment_count === 'string' && parseInt(body.attachment_count, 10) > 0) ||
    (typeof body.attachment_count === 'number' && body.attachment_count > 0)

  return {
    fromEmail: fromParsed.email,
    fromName: fromParsed.name,
    toEmail: toParsed.email,
    toAll,
    subject,
    textBody,
    htmlBody,
    messageId,
    inReplyTo,
    hasAttachments,
    rawPayload: body,
  }
}

function firstString(body: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = body[key]
    if (typeof v === 'string' && v.trim().length > 0) return v.trim()
  }
  return null
}

/**
 * "Name <email@example.com>" → { name: 'Name', email: 'email@example.com' }
 * Plain "email@example.com" → { name: null, email: 'email@example.com' }
 */
function parseAddress(raw: string): { name: string | null; email: string } {
  const m = raw.match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>\s*$/)
  if (m) {
    return { name: m[1].trim(), email: m[2].trim().toLowerCase() }
  }
  return { name: null, email: raw.trim().toLowerCase() }
}

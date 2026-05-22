/**
 * Phase 2b.27 — Inbound email webhook.
 *
 * Replaces the previous stub (which only logged an activity for
 * already-known contacts and silently dropped everything else).
 * Inbound email now flows through the canonical `ingestLead` engine
 * so:
 *
 *   - A new sender (unknown email) creates a no-name-needed contact
 *     and a deal in the default pipeline. Practice can rename + claim
 *     from the CRM.
 *   - A known sender (matched by email) gets an additive update + a
 *     fresh activity attached to whichever open deal the
 *     pipeline-aware judgement picks (matching pipeline → reuse,
 *     different pipeline → new deal, uncertain → stay on contact +
 *     soft uncertainty flag).
 *   - Replies on existing threads carry an idempotency key so a
 *     provider retry doesn't double-ingest.
 *
 * Tenant resolution: the practice's receiving address is matched
 * against `integration_settings.email_from_address`. Without a row
 * in `integration_settings` for that address the webhook returns
 * 401 — same posture as SMS / WhatsApp / voice.
 *
 * Configure in SendGrid / Mailgun / Postmark / Resend Inbound Parse:
 *   https://<host>/api/webhooks/email
 *
 * No provider signature check yet (the previous stub had none either
 * and providers vary widely). Production hardening pass should add
 * per-provider Svix / Basic Auth verification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { ingestLead } from '@/lib/lead-ingestion/ingest-lead'
import {
  parseInboundEmailPayload,
  resolveTenantByInboundEmailAddress,
} from '@/lib/email/inbound'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  try {
    const supabase = createServiceClient()

    // Providers send JSON or form-data depending on configuration.
    // Try JSON first, fall back to form-data.
    let body: Record<string, unknown> = {}
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      try {
        const form = await request.formData()
        body = Object.fromEntries(form.entries()) as Record<string, unknown>
      } catch {
        return NextResponse.json(
          { error: 'Invalid request body', correlation_id: correlationId },
          { status: 400 }
        )
      }
    }

    const parsed = parseInboundEmailPayload(body)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Could not parse inbound email payload', correlation_id: correlationId },
        { status: 400 }
      )
    }

    const tenant = await resolveTenantByInboundEmailAddress(supabase, parsed.toEmail)
    if (!tenant) {
      console.warn(`[WEBHOOK EMAIL][${correlationId}] No tenant claims inbound address`, {
        to: parsed.toEmail,
      })
      // 401 mirrors SMS / WhatsApp / voice — don't fingerprint which
      // addresses belong to which practices.
      return NextResponse.json(
        { error: 'Unknown receiving address', correlation_id: correlationId },
        { status: 401 }
      )
    }

    // The free-text body is the AI router's only signal here (no
    // explicit treatment_offering_id from email). Subject + body
    // concatenated give the judgement the best shot.
    const intentText = [parsed.subject, parsed.textBody].filter(Boolean).join('\n\n').trim()

    const result = await ingestLead(
      {
        tenant_id: tenant.tenantId,
        source_channel: 'email_inbound',
        contact: {
          email: parsed.fromEmail,
          full_name: parsed.fromName,
        },
        treatment_intent_text: intentText.length > 0 ? intentText : null,
        raw_payload: {
          ...parsed.rawPayload,
          _normalised: {
            from: parsed.fromEmail,
            to: parsed.toEmail,
            subject: parsed.subject,
            message_id: parsed.messageId,
            in_reply_to: parsed.inReplyTo,
            has_attachments: parsed.hasAttachments,
          },
        },
        // Idempotency anchor: providers retry on 5xx and Resend's Svix
        // pings can duplicate. `message-id` is the RFC 5322 stable id
        // for an email; fall back to a synthetic id if the provider
        // didn't surface it.
        event_id: parsed.messageId
          ? `email_inbound:${parsed.messageId}`
          : `email_inbound:${parsed.fromEmail}:${parsed.subject ?? ''}:${Date.now()}`,
        external_message_id: parsed.messageId,
      },
      supabase
    )

    console.log(`[WEBHOOK EMAIL][${correlationId}] ingested`, {
      dedup: result.dedup_decision,
      contact_id: result.contact_id,
      deal_id: result.deal_id,
      activity_id: result.activity_id,
    })

    return NextResponse.json({
      success: true,
      correlation_id: correlationId,
      dedup_decision: result.dedup_decision,
      contact_id: result.contact_id,
      deal_id: result.deal_id,
      activity_id: result.activity_id,
    })
  } catch (error: unknown) {
    console.error(`[WEBHOOK EMAIL][${correlationId}] error`, error)
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : String(error),
        correlation_id: correlationId,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: 'email-webhook',
    message: 'Inbound email webhook — flows through ingestLead (2b.27)',
  })
}

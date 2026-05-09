/**
 * API ENDPOINT: Marketing Form Submission
 *
 * Phase 2b.3 refactor (builds on Phase 2a.2a's drop-the-auth-gate work):
 *  - Tenant resolution from `formId` (no `auth.getUser()` — iframes on
 *    practice marketing sites have no logged-in CRM user).
 *  - Routes through the canonical `ingestLead()` engine, the same engine
 *    WhatsApp inbound and Google Lead Form already use. Pattern mirrored
 *    from `src/app/api/webhooks/google-lead-form/route.ts` and
 *    `src/app/api/webhooks/whatsapp/route.ts`.
 *  - Path-based `source_channel` detection (`/forms/embed/` vs `/f/`)
 *    rather than host-based: when the iframe is rendered inside a third
 *    party site, the iframe's own `window.location.href` is the
 *    `/forms/embed/<id>` URL we control, so we always have a reliable
 *    signal independent of the parent host.
 *  - Click-ID + `landing_page_url` capture from dedicated body fields
 *    (`clickIds`, `landingPageUrl`), so the renderer can capture
 *    `document.referrer` (the practice's marketing page) at iframe load
 *    time and forward gclid/fbclid/msclkid/ttclid alongside UTMs.
 *  - Identity gate (≥1 of email or phone) returns 400 explicitly before
 *    any engine call — keeps the message stable for tests and avoids
 *    leaking engine internals.
 *  - 404 with a generic body for unknown / inactive / unpublished forms
 *    (no leaking that the form exists across tenants).
 *  - Notifications + outbound webhooks dropped from this route — the
 *    `lead.arrived` notification fires from inside `ingestLead()` exactly
 *    like every other channel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { isMarketingEnabledServer } from '@/lib/marketing/feature-flags'
import { checkRateLimit, getTimeUntilReset } from '@/lib/rate-limiter'
import { verifyRecaptchaToken, evaluateRecaptchaScore } from '@/lib/forms/recaptcha'
import { ingestLead, IngestLeadValidationError } from '@/lib/lead-ingestion/ingest-lead'
import type { SourceChannelEnum } from '@/lib/lead-ingestion/types'

// Generic 404 body — never tells the caller whether the form is unknown,
// inactive, or unpublished. Same shape for all three cases so a probe can't
// learn that a UUID exists in another tenant or that an unpublished form is
// hiding behind the URL. Built per-call (rather than as a module-level
// constant) because `NextResponse` bodies are single-use streams.
function notFoundResponse(): NextResponse {
  return NextResponse.json({ error: 'Form not found' }, { status: 404 })
}

type ClickIds = {
  gclid?: string
  fbclid?: string
  msclkid?: string
  ttclid?: string
}

type UtmParams = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const {
      formId,
      formName,
      payload,
      sourceUrl,
      honeypot,
      formLoadTime,
      utmParams,
      clickIds,
      landingPageUrl,
      recaptchaToken,
      idempotencyKey,
    } = body as {
      formId?: string
      formName?: string
      payload?: Record<string, unknown>
      sourceUrl?: string
      honeypot?: string
      formLoadTime?: string | number
      utmParams?: UtmParams
      clickIds?: ClickIds
      landingPageUrl?: string
      recaptchaToken?: string
      idempotencyKey?: string
    }

    if (!formId || typeof formId !== 'string') {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 })
    }
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'payload is required' }, { status: 400 })
    }

    // ---- Rate limiting (per-IP) -----------------------------------------
    // Same shape as Phase 2a.2a (mirrors the WhatsApp route's IP extraction).
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    const rateLimit = await checkRateLimit({
      identifier: `form-submit:${ipAddress}`,
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      const retryAfter = getTimeUntilReset(rateLimit.resetTime)
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      )
    }

    // ---- Tenant resolution from formId (replaces auth.getUser) ---------
    // Service-role client — same canonical pattern WhatsApp inbound and
    // google-lead-form use. The form is the public surface; the tenant is
    // derived from `marketing_forms.tenant_id`.
    const supabase = createServiceClient()
    const { data: form, error: formErr } = await supabase
      .from('marketing_forms')
      .select('id, tenant_id, name, status, is_published')
      .eq('id', formId)
      .maybeSingle()

    if (formErr || !form) {
      return notFoundResponse()
    }
    if (form.status !== 'active' || !form.is_published) {
      // Same generic 404 — don't leak that the form exists but is unpublished
      // or archived. A spammer probing the endpoint must not learn anything
      // about the cross-tenant universe of forms.
      return notFoundResponse()
    }

    const tenantId = form.tenant_id as string
    const resolvedFormName = (formName as string | undefined) || (form.name as string) || 'Unknown Form'

    // Marketing-flag gate — applied AFTER tenant resolution (the flag is
    // per-tenant; we'd need a tenant to check it). Same return shape as
    // before so any existing client-side handling keeps working.
    const marketingEnabled = await isMarketingEnabledServer(tenantId)
    if (!marketingEnabled) {
      return NextResponse.json(
        { error: 'Marketing module is not enabled for this practice', code: 'MARKETING_DISABLED' },
        { status: 403 }
      )
    }

    // ---- Spam detection -------------------------------------------------
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const referrerUrl = req.headers.get('referer') || req.headers.get('referrer') || null

    let isSpam = false
    let spamScore = 1.0
    let honeypotTriggered = false
    let recaptchaScore = 1.0

    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken)
      recaptchaScore = recaptchaResult.score
      const evaluation = evaluateRecaptchaScore(recaptchaScore, 0.5)
      if (!evaluation.allowed) {
        isSpam = true
        spamScore = Math.min(spamScore, recaptchaScore)
      }
    }

    if (honeypot && typeof honeypot === 'string' && honeypot.trim().length > 0) {
      isSpam = true
      spamScore = 0.0
      honeypotTriggered = true
    }

    if (formLoadTime) {
      const loadedAt = parseInt(String(formLoadTime), 10)
      if (Number.isFinite(loadedAt)) {
        const submissionTime = Date.now() - loadedAt
        if (submissionTime < 2000) {
          isSpam = true
          spamScore = Math.min(spamScore, 0.3)
        }
      }
    }

    // ---- Spam shortcut: persist analytics row, return generic success ---
    // Per the audit: never tell a spammer they were detected. No counter
    // increment; no `ingestLead` call.
    if (isSpam) {
      await supabase.from('marketing_form_submissions').insert({
        tenant_id: tenantId,
        form_id: formId,
        contact_id: null,
        payload,
        source_url: sourceUrl ?? null,
        referrer_url: referrerUrl,
        contact_created: false,
        contact_updated: false,
        duplicate_submission: false,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_spam: true,
        spam_score: spamScore,
        honeypot_triggered: honeypotTriggered,
        processed: true,
        processed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
      return NextResponse.json({ success: true })
    }

    // ---- Identity gate (must come before ingestLead) --------------------
    // ingestLead's own `IngestLeadValidationError('no_identity', ...)` would
    // catch this too, but doing it in-route lets us return a stable
    // human-readable error without leaking engine internals to public
    // callers (and lets the test suite assert the exact message).
    const candidateEmail =
      typeof payload.email === 'string' ? (payload.email as string).trim() : ''
    const candidatePhoneRaw =
      typeof payload.phone === 'string' ? (payload.phone as string).trim() : ''
    if (!candidateEmail && !candidatePhoneRaw) {
      return NextResponse.json(
        { error: 'Form must capture either email or phone' },
        { status: 400 }
      )
    }

    // ---- Source channel from sourceUrl path -----------------------------
    const sourceChannel = detectSourceChannel(sourceUrl)

    // ---- Consent record (full GDPR shape, stamped onto raw_payload) -----
    // The live `IngestLeadInput.contact.consents` shape only has the boolean
    // flags + `consent_text_version` + `consent_method`. The richer GDPR
    // record (text, lawful basis, captured_at, IP/UA) is preserved on
    // `raw_payload.__consent_record` — exactly the pattern
    // `google-lead-form-adapter.ts` uses (lines 90-145). The engine writes
    // raw_payload into `attribution_touchpoints.metadata.raw_payload`
    // verbatim, so the audit trail is captured without a schema change.
    const marketingConsentChecked = (payload as Record<string, unknown>).marketing_consent === true
    const consentText = `Submitted form: ${resolvedFormName}`
    const consentMethod: 'form_checkbox' | 'implied_inquiry' = marketingConsentChecked
      ? 'form_checkbox'
      : 'implied_inquiry'
    const consentLawfulBasis: 'consent' | 'legitimate_interests' = marketingConsentChecked
      ? 'consent'
      : 'legitimate_interests'
    const consentCapturedAt = new Date().toISOString()
    const consentTextVersion = 'form_implicit_v1'

    const consentRecord = {
      method: consentMethod,
      lawful_basis: consentLawfulBasis,
      text_version: consentTextVersion,
      text: consentText,
      captured_at: consentCapturedAt,
      ip_address: ipAddress !== 'unknown' ? ipAddress : null,
      user_agent: userAgent,
    }

    // ---- raw_payload (replay material — capture liberally) --------------
    // Includes the form's payload, original utmParams, clickIds, sourceUrl,
    // referrerUrl, landingPageUrl, formId, formName, and the consent record.
    const enrichedRawPayload: Record<string, unknown> = {
      payload,
      utmParams: utmParams ?? {},
      clickIds: clickIds ?? {},
      sourceUrl: sourceUrl ?? null,
      referrerUrl,
      landingPageUrl: landingPageUrl ?? null,
      formId,
      formName: resolvedFormName,
      __consent_record: consentRecord,
    }

    // ---- Canonical lead ingestion --------------------------------------
    const eventId = `form_submit:${formId}:${idempotencyKey ?? randomUUID()}`

    let result
    try {
      result = await ingestLead({
        tenant_id: tenantId,
        source_channel: sourceChannel,
        contact: {
          email: candidateEmail || null,
          phone: candidatePhoneRaw || null,
          first_name:
            typeof payload.first_name === 'string'
              ? (payload.first_name as string)
              : typeof payload.firstName === 'string'
                ? (payload.firstName as string)
                : null,
          last_name:
            typeof payload.last_name === 'string'
              ? (payload.last_name as string)
              : typeof payload.lastName === 'string'
                ? (payload.lastName as string)
                : null,
          full_name:
            typeof payload.full_name === 'string'
              ? (payload.full_name as string)
              : typeof payload.name === 'string'
                ? (payload.name as string)
                : null,
          consents: {
            marketing_consent: marketingConsentChecked,
            // Form submission is itself implied transactional consent; default
            // email_consent stays true (matches engine default for new
            // contacts in `ingest-lead.ts` insertNewContact line 521).
            email_consent: true,
            sms_consent: !!candidatePhoneRaw && marketingConsentChecked,
            consent_text_version: consentTextVersion,
            consent_method: consentMethod,
          },
        },
        attribution: {
          utm_source: utmParams?.utm_source,
          utm_medium: utmParams?.utm_medium,
          utm_campaign: utmParams?.utm_campaign,
          utm_term: utmParams?.utm_term,
          utm_content: utmParams?.utm_content,
          gclid: clickIds?.gclid,
          fbclid: clickIds?.fbclid,
          msclkid: clickIds?.msclkid,
          ttclid: clickIds?.ttclid,
          // landing_page_url is the parent-site URL captured client-side at
          // iframe load via `document.referrer` (Phase 2b.3 §3.2). Falls back
          // to sourceUrl on the hosted-page path where document.referrer is
          // the visitor's prior page.
          landing_page_url: landingPageUrl ?? sourceUrl ?? undefined,
          referrer_url: referrerUrl ?? undefined,
          user_agent: userAgent,
          ip_address: ipAddress !== 'unknown' ? ipAddress : undefined,
        },
        treatment_offering_id:
          typeof (payload as Record<string, unknown>).treatment_offering_id === 'string'
            ? ((payload as Record<string, unknown>).treatment_offering_id as string)
            : null,
        treatment_intent_text:
          typeof (payload as Record<string, unknown>).treatment_intent === 'string'
            ? ((payload as Record<string, unknown>).treatment_intent as string)
            : typeof (payload as Record<string, unknown>).message === 'string'
              ? ((payload as Record<string, unknown>).message as string)
              : null,
        raw_payload: enrichedRawPayload,
        form_id: formId,
        event_id: eventId,
      })
    } catch (err) {
      if (err instanceof IngestLeadValidationError) {
        // The pre-flight identity gate catches `no_identity`; this branch
        // covers `missing_tenant` (programmer error — we just resolved it)
        // and `invalid_source_channel` (impossible here since we only emit
        // typed enum values). Surface the error message anyway to keep the
        // contract symmetric with other channels.
        return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
      }
      throw err
    }

    // `is_new_contact` mirrors the prompt's §2.4 spec. The live engine
    // returns `dedup_decision: 'new' | 'matched' | 'review_required'`
    // rather than a separate `is_new_contact` field — adapt accordingly.
    const isNewContact = result.dedup_decision === 'new'

    // ---- Persist the marketing_form_submissions analytics row ----------
    // contact_created/contact_updated/duplicate_submission semantics per the
    // prompt §2.4:
    //   contact_created   = is_new_contact
    //   contact_updated   = matched (not new, not review_required)
    //   duplicate_submission = false (no clear signal from ingestLead today)
    const { error: submissionError } = await supabase
      .from('marketing_form_submissions')
      .insert({
        tenant_id: tenantId,
        form_id: formId,
        contact_id: result.contact_id,
        payload,
        source_url: sourceUrl ?? null,
        referrer_url: referrerUrl,
        contact_created: isNewContact,
        contact_updated: result.dedup_decision === 'matched',
        duplicate_submission: false,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_spam: false,
        spam_score: spamScore,
        honeypot_triggered: false,
        processed: true,
        processed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      })
    if (submissionError) {
      // Analytics-row failure is not user-facing — engine-level work is
      // already committed. Log loudly so the operator notices.
      console.error('[forms/submit] failed to write marketing_form_submissions row', {
        tenant_id: tenantId,
        form_id: formId,
        contact_id: result.contact_id,
        error_message: submissionError.message,
      })
    }

    // Per-form counter (best-effort, unchanged behaviour).
    try {
      await supabase.rpc('increment_form_submissions', { form_id: formId })
    } catch {
      // intentionally swallowed: form-stats RPC failure is not user-visible
    }

    // Notifications: the legacy `sendFormSubmissionNotifications` and
    // `dispatchFormSubmissionWebhook` are intentionally NOT called from
    // here. ingestLead's own `lead.arrived` notification path handles
    // admin pings (mirrors WhatsApp + Google Lead Form). Outbound webhook
    // dispatch to the practice's Zapier/Make is deferred to a future
    // phase that builds it on top of ingestLead's notification router.

    // Response shape per prompt §2.5: { contact_id, deal_id, is_new_contact, sla_due_at }.
    return NextResponse.json({
      contact_id: result.contact_id,
      deal_id: result.deal_id ?? null,
      is_new_contact: isNewContact,
      sla_due_at: result.sla?.due_at ?? null,
    })
  } catch (error) {
    console.error('[forms/submit] Unhandled error', {
      error_message: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to process form submission' }, { status: 500 })
  }
}

/**
 * Decide between `form_embedded` and `form_hosted_landing` based on the
 * client-supplied `sourceUrl`'s pathname.
 *
 * In the iframe code path, `window.location.href` (the iframe's own URL,
 * not the parent's) is `/forms/embed/<id>` — we control that route and the
 * substring is reliable.
 *
 * On the hosted page (`/f/<slug>`) the FormRenderer mounts on our domain
 * and `window.location.href` carries `/f/`.
 *
 * Anything else (including a bad URL) defaults to `form_embedded` — most
 * likely an iframe with a custom path, and `form_embedded` is the safer
 * "not-our-hosted-domain" bucket.
 */
function detectSourceChannel(sourceUrl: string | undefined | null): SourceChannelEnum {
  if (typeof sourceUrl !== 'string' || sourceUrl.length === 0) {
    return 'form_embedded'
  }
  try {
    const path = new URL(sourceUrl).pathname
    if (path.includes('/forms/embed/')) return 'form_embedded'
    if (path.includes('/f/')) return 'form_hosted_landing'
  } catch {
    // not a parseable URL
  }
  return 'form_embedded'
}

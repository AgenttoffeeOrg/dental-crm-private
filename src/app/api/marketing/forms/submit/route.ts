/**
 * API ENDPOINT: Marketing Form Submission
 *
 * Phase 2a.2a refactor:
 * - No longer requires an authenticated CRM user (the iframe runs on the
 *   practice's marketing site, where the visitor isn't logged in).
 * - Resolves the tenant from the formId instead of the session.
 * - Delegates lead processing to the canonical `ingestLead()` engine, which
 *   handles dedup, SLA resolution, attribution touchpoints, activities, and
 *   `lead.arrived` notifications consistently with every other channel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { isMarketingEnabledServer } from '@/lib/marketing/feature-flags'
import { checkRateLimit, getTimeUntilReset } from '@/lib/rate-limiter'
import { verifyRecaptchaToken, evaluateRecaptchaScore } from '@/lib/forms/recaptcha'
import { sendFormSubmissionNotifications } from '@/lib/forms/admin-notifications'
import { dispatchFormSubmissionWebhook } from '@/lib/forms/webhook-dispatcher'
import { ingestLead, IngestLeadValidationError } from '@/lib/lead-ingestion/ingest-lead'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      formId,
      formName,
      payload,
      sourceUrl,
      // Spam-detection inputs
      honeypot,
      formLoadTime,
      utmParams,
      recaptchaToken,
      // Optional caller-supplied idempotency hint (e.g. dedup of double-clicks
      // from buggy form widgets). Falls back to a generated UUID per request.
      idempotencyKey,
    } = body

    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 })
    }
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'payload is required' }, { status: 400 })
    }

    // ---- Rate limiting (per-IP) -----------------------------------------
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
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

    // ---- Tenant resolution via formId (replaces auth.getUser) -----------
    const supabase = createServiceClient()
    const { data: form, error: formErr } = await supabase
      .from('marketing_forms')
      .select('id, tenant_id, name, status, is_published')
      .eq('id', formId)
      .maybeSingle()

    if (formErr || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }
    if (form.status !== 'active' || !form.is_published) {
      return NextResponse.json({ error: 'Form is not accepting submissions' }, { status: 403 })
    }

    const tenantId = form.tenant_id as string

    // Apply marketing-module gate against the form's tenant (NOT the session).
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

    if (honeypot && honeypot.trim().length > 0) {
      isSpam = true
      spamScore = 0.0
      honeypotTriggered = true
    }

    if (formLoadTime) {
      const submissionTime = Date.now() - parseInt(formLoadTime, 10)
      if (submissionTime < 2000) {
        isSpam = true
        spamScore = Math.min(spamScore, 0.3)
      }
    }

    // ---- Spam shortcut: persist the submission row and bail --------------
    // Don't pollute the contact graph with spam.
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
      return NextResponse.json({
        success: true,
        contactId: null,
        isSpam: true,
        message: 'Submission marked as spam',
      })
    }

    // ---- Canonical lead ingestion ---------------------------------------
    // event_id provides webhook-retry idempotency. We prefer caller-supplied
    // idempotencyKey for cross-attempt stability; otherwise generate per-request.
    const eventId = `form_submit:${formId}:${idempotencyKey ?? randomUUID()}`

    let result
    try {
      result = await ingestLead({
        tenant_id: tenantId,
        // form_embedded vs form_hosted_landing: detect via referrer host.
        // If the referrer host matches our app domain (CRM-hosted slug page),
        // call it form_hosted_landing; otherwise treat as embedded on a
        // third-party site. Default to form_embedded when uncertain.
        source_channel: detectFormChannel(referrerUrl, sourceUrl),
        contact: {
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          first_name: payload.first_name ?? payload.firstName ?? null,
          last_name: payload.last_name ?? payload.lastName ?? null,
          full_name: payload.full_name ?? payload.name ?? null,
          consents: {
            marketing_consent: !!payload.marketing_consent,
            email_consent: payload.email_consent !== false, // default true
            sms_consent: !!payload.sms_consent,
            consent_text_version: payload.consent_text_version ?? undefined,
            consent_method: 'form_submit',
          },
        },
        attribution: {
          utm_source: utmParams?.utm_source,
          utm_medium: utmParams?.utm_medium,
          utm_campaign: utmParams?.utm_campaign,
          utm_term: utmParams?.utm_term,
          utm_content: utmParams?.utm_content,
          gclid: utmParams?.gclid,
          fbclid: utmParams?.fbclid,
          ttclid: utmParams?.ttclid,
          msclkid: utmParams?.msclkid,
          landing_page_url: sourceUrl ?? undefined,
          referrer_url: referrerUrl ?? undefined,
          user_agent: userAgent,
          ip_address: ipAddress !== 'unknown' ? ipAddress.split(',')[0]?.trim() : undefined,
        },
        treatment_offering_id: payload.treatment_offering_id ?? null,
        treatment_intent_text: payload.treatment_intent ?? payload.message ?? null,
        raw_payload: payload,
        form_id: formId,
        event_id: eventId,
      })
    } catch (err) {
      if (err instanceof IngestLeadValidationError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 400 })
      }
      throw err
    }

    // ---- Persist the marketing_form_submissions analytics row ------------
    // Use ingestLead's authoritative dedup decision instead of the legacy
    // (and never-implemented) contactCreated/isDuplicate flags.
    const { error: submissionError } = await supabase
      .from('marketing_form_submissions')
      .insert({
        tenant_id: tenantId,
        form_id: formId,
        contact_id: result.contact_id,
        payload,
        source_url: sourceUrl ?? null,
        referrer_url: referrerUrl,
        contact_created: result.dedup_decision === 'new',
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
      console.error('[forms/submit] Error saving submission analytics row:', submissionError)
    }

    // Increment per-form counter (best-effort).
    try {
      await supabase.rpc('increment_form_submissions', { form_id: formId })
    } catch {
      // intentionally swallowed: form-stats RPC failure is not user-visible
    }

    // ---- Best-effort fan-out (admin notifications + outbound webhooks) ---
    // These wrap their own try/catch so a downstream blip never fails the
    // primary submission.
    sendFormSubmissionNotifications({
      formId,
      formName: formName || form.name || 'Unknown Form',
      tenantId,
      submissionData: payload,
      submittedAt: new Date().toISOString(),
      isSpam: false,
      spamScore,
      assignedUserId: undefined,
    }).catch((error) => {
      console.warn('[forms/submit] admin notifications failed (best-effort)', {
        route: '/api/marketing/forms/submit',
        tenant_id: tenantId,
        form_id: formId,
        error_message: error instanceof Error ? error.message : String(error),
      })
    })

    // Only fire the outbound webhook when we have a real contact (i.e. not
    // review_required). Webhook subscribers expect a contactId.
    if (result.contact_id) {
      dispatchFormSubmissionWebhook({
        formId,
        formName: formName || form.name || 'Unknown Form',
        tenantId,
        submissionId: result.attribution_touchpoint_id ?? eventId,
        submissionData: payload,
        contactId: result.contact_id,
        contactEmail: payload.email,
        contactName: payload.name || payload.full_name,
        metadata: {
          ip: ipAddress,
          userAgent,
          referrer: referrerUrl || undefined,
        },
      }).catch((error) => {
        console.warn('[forms/submit] outbound webhook dispatch failed (best-effort)', {
          route: '/api/marketing/forms/submit',
          tenant_id: tenantId,
          form_id: formId,
          error_message: error instanceof Error ? error.message : String(error),
        })
      })
    }

    return NextResponse.json({
      success: true,
      contact_id: result.contact_id,
      attribution_touchpoint_id: result.attribution_touchpoint_id,
      activity_id: result.activity_id,
      // Phase 2a.7: surface the deal id so the form's thank-you page can
      // optionally deep-link to /deals/{deal_id}. Always present in the
      // response shape (null when review_required or graceful-skip).
      deal_id: result.deal_id,
      dedup_decision: result.dedup_decision,
      queue_item_id: result.queue_item_id ?? null,
      sla: result.sla,
      isSpam: false,
      message:
        result.dedup_decision === 'review_required'
          ? 'Submission requires manual dedup review'
          : result.dedup_decision === 'new'
            ? 'New contact created'
            : 'Existing contact updated',
    })
  } catch (error) {
    console.error('[forms/submit] Unhandled error:', error)
    return NextResponse.json({ error: 'Failed to process form submission' }, { status: 500 })
  }
}

/**
 * Decide between `form_embedded` and `form_hosted_landing` based on whether
 * the form is being submitted from our own app domain or a third-party site.
 * Falls back to `form_embedded` when uncertain.
 */
function detectFormChannel(
  referrerUrl: string | null,
  sourceUrl: string | undefined | null
): 'form_embedded' | 'form_hosted_landing' {
  const appHostHints = ['localhost', 'auth-app', 'dental-crm']
  const candidate = sourceUrl ?? referrerUrl ?? ''
  try {
    const host = new URL(candidate).host.toLowerCase()
    if (appHostHints.some((h) => host.includes(h))) {
      return 'form_hosted_landing'
    }
  } catch {
    // not a parseable URL
  }
  return 'form_embedded'
}

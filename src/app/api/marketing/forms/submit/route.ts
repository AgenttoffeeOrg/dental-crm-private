/**
 * API ENDPOINT: Marketing Form Submission
 * Creates/updates CRM contacts, optionally creates deals
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import {
  processFormSubmission,
  type FormSubmission,
  type DealCreationRules,
} from '@/lib/marketing/form-processor';
import { withMarketingCheck } from '@/lib/marketing/api-middleware';
import { checkRateLimit, getTimeUntilReset } from '@/lib/rate-limiter';
import { verifyRecaptchaToken, evaluateRecaptchaScore } from '@/lib/forms/recaptcha';
import { sendFormSubmissionNotifications } from '@/lib/forms/admin-notifications';
import { dispatchFormSubmissionWebhook } from '@/lib/forms/webhook-dispatcher';

export async function POST(req: NextRequest) {
  // Check Marketing enabled
  const allowed = await withMarketingCheck(req);
  if (allowed instanceof NextResponse) return allowed;

  try {
    const body = await req.json();
    const {
      formId,
      formName,
      payload,
      sourceUrl,
      dealRules,
      honeypot,
      formLoadTime,
      utmParams,
      recaptchaToken,
    } = body;

    // Get IP address for rate limiting
    const ipAddress =
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Rate limiting: max 10 form submissions per hour per IP
    const rateLimit = await checkRateLimit({
      identifier: `form-submit:${ipAddress}`,
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimit.allowed) {
      const retryAfter = getTimeUntilReset(rateLimit.resetTime);
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
      );
    }

    // Get tenant ID from session
    const supabase = createServiceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract metadata from request
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const referrerUrl = req.headers.get('referer') || req.headers.get('referrer') || null;

    // Spam detection
    let isSpam = false;
    let spamScore = 1.0;
    let honeypotTriggered = false;
    let recaptchaScore = 1.0;

    // Check reCAPTCHA (if token provided)
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken);
      recaptchaScore = recaptchaResult.score;

      const evaluation = evaluateRecaptchaScore(recaptchaScore, 0.5);

      if (!evaluation.allowed) {
        isSpam = true;
        spamScore = Math.min(spamScore, recaptchaScore);
      }
    }

    // Check honeypot (if filled, it's spam)
    if (honeypot && honeypot.trim().length > 0) {
      isSpam = true;
      spamScore = 0.0;
      honeypotTriggered = true;
    }

    // Check submission time (< 2 seconds = likely spam)
    if (formLoadTime) {
      const submissionTime = Date.now() - parseInt(formLoadTime);
      if (submissionTime < 2000) {
        isSpam = true;
        spamScore = Math.min(spamScore, 0.3);
      }
    }

    const submission: FormSubmission = {
      formId,
      formName,
      payload,
      sourceUrl,
      tenantId: appUser.tenant_id,
    };

    // Process submission (creates Contact/Deal)
    const result = await processFormSubmission(submission, dealRules as DealCreationRules);

    // Get assigned user ID if deal was created
    let assignedUserId: string | undefined;
    if (result.dealId) {
      const { data: deal } = await supabase
        .from('deals')
        .select('owner_user_id')
        .eq('id', result.dealId)
        .single();
      assignedUserId = deal?.owner_user_id || undefined;
    }

    // Save submission to marketing_form_submissions table
    const { error: submissionError } = await supabase.from('marketing_form_submissions').insert({
      tenant_id: appUser.tenant_id,
      form_id: formId,
      contact_id: result.contactId,
      payload,
      source_url: sourceUrl,
      referrer_url: referrerUrl,
      contact_created: result.contactCreated || false,
      contact_updated: !result.contactCreated,
      duplicate_submission: result.isDuplicate || false,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_spam: isSpam,
      spam_score: spamScore,
      honeypot_triggered: honeypotTriggered,
      processed: true,
      processed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    });

    if (submissionError) {
      console.error('[Marketing API] Error saving submission:', submissionError);
      // Don't fail the request if submission save fails, just log it
    }

    // Update form stats (increment total_submissions)
    if (formId && !isSpam) {
      await supabase.rpc('increment_form_submissions', { form_id: formId });
    }

    // Send admin notifications (non-blocking)
    if (!isSpam) {
      sendFormSubmissionNotifications({
        formId,
        formName: formName || 'Unknown Form',
        tenantId: appUser.tenant_id,
        submissionData: payload,
        submittedAt: new Date().toISOString(),
        isSpam,
        spamScore,
        assignedUserId,
      }).catch((error) => {
        console.error('[Form Submission] Error sending admin notifications:', error);
        // Don't fail the request if notifications fail
      });

      // Dispatch webhooks (non-blocking)
      dispatchFormSubmissionWebhook({
        formId,
        formName: formName || 'Unknown Form',
        tenantId: appUser.tenant_id,
        submissionId: result.submissionId,
        submissionData: payload,
        contactId: result.contactId,
        contactEmail: payload.email,
        contactName: payload.name || payload.full_name,
        dealId: result.dealId,
        dealTitle: result.dealId
          ? `${payload.name || payload.full_name || 'Contact'} - ${formName || 'Form'}`
          : undefined,
        metadata: {
          ip: ipAddress,
          userAgent,
          referrer: referrerUrl || undefined,
        },
      }).catch((error) => {
        console.error('[Form Submission] Error dispatching webhooks:', error);
        // Don't fail the request if webhooks fail
      });
    }

    return NextResponse.json({
      success: true,
      contactId: result.contactId,
      dealId: result.dealId,
      submissionId: result.submissionId,
      isSpam,
      message: isSpam
        ? 'Submission marked as spam'
        : result.dealId
          ? 'Contact and deal created successfully'
          : 'Contact created successfully',
    });
  } catch (error) {
    console.error('[Marketing API] Form submission error:', error);
    return NextResponse.json({ error: 'Failed to process form submission' }, { status: 500 });
  }
}

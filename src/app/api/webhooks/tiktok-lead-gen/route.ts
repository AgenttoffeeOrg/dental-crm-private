/**
 * TikTok Lead Generation Webhook
 * Receives lead form submissions from TikTok advertising platform
 * Documentation: https://ads.tiktok.com/marketing_api/docs?id=1739588549794817
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import crypto from 'crypto';
import { randomUUID } from 'node:crypto';

/**
 * POST - Receive lead data from TikTok
 */
export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') ?? randomUUID();
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  try {
    const body = await request.text();
    const signature = request.headers.get('x-tiktok-signature');

    // Verify webhook signature
    const appSecret = process.env.TIKTOK_APP_SECRET;
    if (appSecret && signature) {
      const expectedSignature = crypto.createHmac('sha256', appSecret).update(body).digest('hex');

      if (signature !== expectedSignature) {
        console.error('[TikTok Webhook] Invalid signature', {
          correlation_id: correlationId,
          request_id: requestId,
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const payload = JSON.parse(body);
    console.log('[TikTok Webhook] Received payload:', payload);

    // TikTok sends event notifications
    if (payload.event === 'lead.create') {
      const result = await processTikTokLead(payload.data, { correlationId, requestId });
      if (!result.ok) {
        return NextResponse.json(
          { code: 1, message: result.error, correlation_id: correlationId },
          { status: result.status }
        );
      }
    }

    return NextResponse.json({ code: 0, message: 'OK', correlation_id: correlationId });
  } catch (error) {
    console.error('[TikTok Webhook] Error:', error, {
      correlation_id: correlationId,
      request_id: requestId,
    });
    return NextResponse.json(
      { code: 1, message: 'Processing failed', correlation_id: correlationId },
      { status: 500 }
    );
  }
}

type ProcessResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Resolve tenant from a TikTok advertiser_id by looking up an integration
 * connection. Returns null if no mapping exists.
 */
async function resolveTenantFromTikTokAdvertiser(
  supabase: ReturnType<typeof createServiceClient>,
  advertiserId: string
): Promise<string | null> {
  if (!advertiserId) return null;
  const { data } = await supabase
    .from('integration_connections')
    .select('tenant_id')
    .eq('provider', 'tiktok')
    .eq('external_account_id', advertiserId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  return (data?.tenant_id as string | undefined) ?? null;
}

/**
 * Process individual TikTok lead
 */
async function processTikTokLead(
  leadData: any,
  ctx: { correlationId: string; requestId: string }
): Promise<ProcessResult> {
  const supabase = createServiceClient();

  const { advertiser_id, ad_id, created_time, form_id, field_list } = leadData;

  // Parse field data
  const leadPayload: Record<string, any> = {};
  if (field_list && Array.isArray(field_list)) {
    field_list.forEach((field: any) => {
      leadPayload[field.field_name] = field.field_value || '';
    });
  }

  // Resolve tenant. Required: we no longer fall back to a zero-UUID tenant,
  // which historically caused cross-tenant data mixing.
  const tenantId = await resolveTenantFromTikTokAdvertiser(supabase, advertiser_id);
  if (!tenantId) {
    console.error('[ingestion] tenant resolution failed', {
      route: '/api/webhooks/tiktok-lead-gen',
      correlation_id: ctx.correlationId,
      request_id: ctx.requestId,
      advertiser_id,
      ad_id,
      form_id: form_id ?? null,
    });
    return {
      ok: false,
      status: 400,
      error: 'tenant resolution failed: no tiktok integration_connection for advertiser_id',
    };
  }

  // Create submission record
  const { data: submission, error: submissionError } = await supabase
    .from('marketing_form_submissions')
    .insert({
      tenant_id: tenantId,
      form_id: form_id || null,
      payload: leadPayload,
      source_url: 'tiktok_lead_gen',
      referrer_url: `tiktok://ad/${ad_id}`,
      ip_address: 'tiktok_platform',
      user_agent: 'TikTok Lead Generation',
      is_spam: false,
      spam_score: 0.9, // TikTok pre-filters spam
      processed: false,
      submitted_at: created_time
        ? new Date(created_time * 1000).toISOString()
        : new Date().toISOString(),
    })
    .select()
    .single();

  if (submissionError) {
    console.error('[TikTok Lead] Error creating submission:', submissionError, {
      correlation_id: ctx.correlationId,
      request_id: ctx.requestId,
      tenant_id: tenantId,
    });
    return { ok: false, status: 500, error: 'failed to persist submission' };
  }

  console.log('[TikTok Lead] Created submission:', submission.id, {
    correlation_id: ctx.correlationId,
    tenant_id: tenantId,
  });

  // TODO: Process submission to create Contact/Deal
  return { ok: true };
}

/**
 * GET - Health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'TikTok Lead Generation Webhook',
    timestamp: new Date().toISOString(),
  });
}

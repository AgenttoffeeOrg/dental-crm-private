/**
 * Meta (Facebook/Instagram) Lead Ads Webhook
 * Receives lead form submissions from Meta advertising platform
 * Documentation: https://developers.facebook.com/docs/marketing-api/guides/lead-ads
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * GET - Webhook verification (Meta setup requirement)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'dental-crm-meta-webhook-2025'

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta Webhook] Verification successful')
    return new NextResponse(challenge, { status: 200 })
  }

  console.error('[Meta Webhook] Verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

/**
 * POST - Receive lead data from Meta
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    // Verify webhook signature
    const appSecret = process.env.META_APP_SECRET
    if (appSecret && signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(body)
        .digest('hex')

      if (signature !== expectedSignature) {
        console.error('[Meta Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const payload = JSON.parse(body)
    console.log('[Meta Webhook] Received payload:', payload)

    // Process each entry
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'leadgen') {
          const leadgenId = change.value?.leadgen_id

          if (leadgenId) {
            await processMetaLead(leadgenId, change.value)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Meta Webhook] Error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

/**
 * Process individual Meta lead
 */
async function processMetaLead(leadId: string, leadData: any) {
  const supabase = createServiceClient()

  try {
    // Extract lead data
    const formId = leadData.form_id
    const pageId = leadData.page_id
    const adId = leadData.ad_id
    const createdTime = leadData.created_time

    // Fetch full lead details from Meta Graph API
    // (This would require Meta access token and API call)
    // For now, we'll use the webhook payload

    const fieldData = leadData.field_data || []
    const leadPayload: Record<string, any> = {}

    fieldData.forEach((field: any) => {
      leadPayload[field.name] = field.values?.[0] || ''
    })

    // Map Meta fields to our Contact fields
    const mappedData = {
      full_name: leadPayload.full_name || leadPayload.name || '',
      email: leadPayload.email || '',
      phone: leadPayload.phone_number || leadPayload.phone || '',
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('marketing_form_submissions')
      .insert({
        tenant_id: '00000000-0000-0000-0000-000000000000', // TODO: Map from Meta page ID
        form_id: formId || null,
        payload: leadPayload,
        source_url: 'meta_lead_ads',
        referrer_url: `meta://ad/${adId}`,
        ip_address: 'meta_platform',
        user_agent: 'Meta Lead Ads',
        is_spam: false,
        spam_score: 0.95, // Meta pre-filters spam
        processed: false, // Will be processed by background job
        submitted_at: createdTime || new Date().toISOString(),
      })
      .select()
      .single()

    if (submissionError) {
      console.error('[Meta Lead] Error creating submission:', submissionError)
      return
    }

    console.log('[Meta Lead] Created submission:', submission.id)

    // TODO: Process submission to create Contact/Deal
    // This would call the existing form processor

  } catch (error) {
    console.error('[Meta Lead] Processing error:', error)
  }
}


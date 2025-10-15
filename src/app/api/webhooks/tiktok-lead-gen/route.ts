/**
 * TikTok Lead Generation Webhook
 * Receives lead form submissions from TikTok advertising platform
 * Documentation: https://ads.tiktok.com/marketing_api/docs?id=1739588549794817
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * POST - Receive lead data from TikTok
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-tiktok-signature')

    // Verify webhook signature
    const appSecret = process.env.TIKTOK_APP_SECRET
    if (appSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(body)
        .digest('hex')

      if (signature !== expectedSignature) {
        console.error('[TikTok Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const payload = JSON.parse(body)
    console.log('[TikTok Webhook] Received payload:', payload)

    // TikTok sends event notifications
    if (payload.event === 'lead.create') {
      await processTikTokLead(payload.data)
    }

    return NextResponse.json({ code: 0, message: 'OK' })
  } catch (error) {
    console.error('[TikTok Webhook] Error:', error)
    return NextResponse.json({ code: 1, message: 'Processing failed' }, { status: 500 })
  }
}

/**
 * Process individual TikTok lead
 */
async function processTikTokLead(leadData: any) {
  const supabase = createServiceClient()

  try {
    const {
      lead_id,
      advertiser_id,
      ad_id,
      campaign_id,
      created_time,
      page_id,
      form_id,
      field_list,
    } = leadData

    // Parse field data
    const leadPayload: Record<string, any> = {}
    
    if (field_list && Array.isArray(field_list)) {
      field_list.forEach((field: any) => {
        leadPayload[field.field_name] = field.field_value || ''
      })
    }

    // Map TikTok fields to our Contact fields
    const mappedData = {
      full_name: leadPayload.full_name || leadPayload.name || '',
      email: leadPayload.email || '',
      phone: leadPayload.phone || leadPayload.phone_number || '',
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('marketing_form_submissions')
      .insert({
        tenant_id: '00000000-0000-0000-0000-000000000000', // TODO: Map from TikTok advertiser ID
        form_id: form_id || null,
        payload: leadPayload,
        source_url: 'tiktok_lead_gen',
        referrer_url: `tiktok://ad/${ad_id}`,
        ip_address: 'tiktok_platform',
        user_agent: 'TikTok Lead Generation',
        is_spam: false,
        spam_score: 0.9, // TikTok pre-filters spam
        processed: false,
        submitted_at: created_time ? new Date(created_time * 1000).toISOString() : new Date().toISOString(),
      })
      .select()
      .single()

    if (submissionError) {
      console.error('[TikTok Lead] Error creating submission:', submissionError)
      return
    }

    console.log('[TikTok Lead] Created submission:', submission.id)

    // TODO: Process submission to create Contact/Deal

  } catch (error) {
    console.error('[TikTok Lead] Processing error:', error)
  }
}

/**
 * GET - Health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'TikTok Lead Generation Webhook',
    timestamp: new Date().toISOString(),
  })
}


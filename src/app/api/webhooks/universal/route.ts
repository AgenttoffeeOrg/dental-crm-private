/**
 * Universal Webhook Endpoint
 * Accepts leads from any platform (Zapier, Make, custom integrations)
 * Provides flexibility for non-standard lead sources
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * POST - Receive lead from any source
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('x-webhook-signature')
    const webhookSecret = request.headers.get('x-webhook-secret')

    // Verify signature if provided
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const {
      tenantId,
      formId,
      source,
      payload,
      mapping,
    } = body

    if (!tenantId || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, payload' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Apply field mapping if provided
    let mappedPayload = payload
    if (mapping) {
      mappedPayload = {}
      Object.entries(mapping).forEach(([sourceField, targetField]) => {
        mappedPayload[targetField as string] = payload[sourceField]
      })
    }

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('marketing_form_submissions')
      .insert({
        tenant_id: tenantId,
        form_id: formId || null,
        payload: mappedPayload,
        source_url: source || 'webhook',
        referrer_url: null,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'Webhook',
        is_spam: false,
        spam_score: 0.8,
        processed: false,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (submissionError) {
      throw submissionError
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: 'Lead received and queued for processing',
    })
  } catch (error) {
    console.error('[Universal Webhook] Error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

/**
 * GET - Webhook documentation
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dentalcrm.com'

  return NextResponse.json({
    name: 'Universal Webhook Endpoint',
    url: `${baseUrl}/api/webhooks/universal`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': 'your-secret-key (optional)',
      'x-webhook-signature': 'hmac-sha256-signature (optional)',
    },
    body: {
      tenantId: 'uuid (required)',
      formId: 'uuid (optional)',
      source: 'string (e.g., "zapier", "custom") (optional)',
      payload: {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+447700900000',
        // ... any other fields
      },
      mapping: {
        firstName: 'full_name', // Map source fields to target fields
        emailAddress: 'email',
        // ... optional field mapping
      },
    },
    example: {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      source: 'zapier',
      payload: {
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+447700900123',
        treatment: 'Dental Implants',
      },
    },
  })
}


import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * Connect integration with API keys
 * POST /api/integrations/[type]/connect
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceClient()
    const { type } = params
    const body = await request.json()
    const { tenantId, credentials } = body

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify tenant access
    const { data: appUser } = await supabase
      .from('app_users')
      .select('active_tenant_id, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userTenantId = appUser.active_tenant_id || appUser.tenant_id
    if (userTenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized tenant access' }, { status: 403 })
    }

    // Validate credentials based on type
    const validationError = validateCredentials(type, credentials)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Store encrypted credentials
    const encryptionKey = process.env.INTEGRATION_CREDENTIAL_KEY
    if (!encryptionKey) {
      return NextResponse.json(
        { error: 'Integration encryption key not configured' },
        { status: 500 }
      )
    }

    // Prepare credentials object
    const credentialsToStore = prepareCredentials(type, credentials)

    // Store encrypted credentials
    await serviceSupabase.rpc('integration_store_credentials', {
      p_tenant_id: tenantId,
      p_plain_credentials: {
        [type]: credentialsToStore,
      },
      p_encryption_key: encryptionKey,
      p_updated_by: user.id,
    })

    // Update integration_channel_settings for Twilio/SendGrid
    if (type.startsWith('twilio_')) {
      const channelUpdate: any = {
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }

      if (type === 'twilio_sms') {
        channelUpdate.twilio_sms_enabled = true
        channelUpdate.twilio_account_sid = credentials.accountSid
        channelUpdate.twilio_sms_from_number = credentials.fromNumber
        channelUpdate.twilio_messaging_service_sid = credentials.messagingServiceSid
      } else if (type === 'twilio_whatsapp') {
        channelUpdate.twilio_whatsapp_enabled = true
        channelUpdate.twilio_account_sid = credentials.accountSid
        channelUpdate.twilio_whatsapp_number = credentials.whatsappNumber
      } else if (type === 'twilio_voice') {
        channelUpdate.twilio_voice_enabled = true
        channelUpdate.twilio_account_sid = credentials.accountSid
        channelUpdate.twilio_voice_caller_id = credentials.fromNumber
      }

      await serviceSupabase
        .from('integration_channel_settings')
        .upsert(channelUpdate, {
          onConflict: 'tenant_id',
        })
    } else if (type === 'sendgrid') {
      await serviceSupabase
        .from('integration_channel_settings')
        .upsert({
          tenant_id: tenantId,
          email_provider: 'sendgrid',
          default_from_email: credentials.fromEmail,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        }, {
          onConflict: 'tenant_id',
        })
    }

    // Create or update integration_connection
    const { error: connectionError } = await serviceSupabase
      .from('integration_connections')
      .upsert({
        tenant_id: tenantId,
        integration_type: type,
        integration_name: getIntegrationName(type),
        status: 'connected',
        is_active: true,
        credentials: {}, // Credentials stored separately in vault
        config: {
          account_id: credentials.accountSid || credentials.accountId,
          account_name: credentials.accountName,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,integration_type',
      })

    if (connectionError) {
      console.error('Error storing connection:', connectionError)
      return NextResponse.json(
        { error: 'Failed to store connection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${getIntegrationName(type)} connected successfully`,
    })
  } catch (error) {
    console.error('[Connect Integration] Error:', error)
    return NextResponse.json(
      { error: 'Failed to connect integration' },
      { status: 500 }
    )
  }
}

function validateCredentials(type: string, credentials: any): string | null {
  if (type.startsWith('twilio_')) {
    if (!credentials.accountSid) {
      return 'Twilio Account SID is required'
    }
    if (!credentials.authToken) {
      return 'Twilio Auth Token is required'
    }
    if (type === 'twilio_sms' && !credentials.fromNumber && !credentials.messagingServiceSid) {
      return 'Either phone number or messaging service SID is required'
    }
    if (type === 'twilio_whatsapp' && !credentials.whatsappNumber) {
      return 'WhatsApp number is required'
    }
    if (type === 'twilio_voice' && !credentials.fromNumber) {
      return 'Phone number is required'
    }
  } else if (type === 'sendgrid') {
    if (!credentials.apiKey) {
      return 'SendGrid API key is required'
    }
    if (!credentials.fromEmail) {
      return 'From email address is required'
    }
  }
  return null
}

function prepareCredentials(type: string, credentials: any): any {
  if (type.startsWith('twilio_')) {
    return {
      accountSid: credentials.accountSid,
      authToken: credentials.authToken,
      fromNumber: credentials.fromNumber,
      messagingServiceSid: credentials.messagingServiceSid,
      whatsappNumber: credentials.whatsappNumber,
    }
  } else if (type === 'sendgrid') {
    return {
      apiKey: credentials.apiKey,
      fromEmail: credentials.fromEmail,
      fromName: credentials.fromName,
    }
  }
  return credentials
}

function getIntegrationName(type: string): string {
  const names: Record<string, string> = {
    twilio_sms: 'Twilio SMS',
    twilio_whatsapp: 'Twilio WhatsApp',
    twilio_voice: 'Twilio Voice',
    sendgrid: 'SendGrid',
  }
  return names[type] || type
}


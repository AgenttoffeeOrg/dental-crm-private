import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * Disconnect an integration
 * POST /api/integrations/[type]/disconnect
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
    const { tenantId } = body

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

    // Update integration_connection status
    const { error: connectionError } = await serviceSupabase
      .from('integration_connections')
      .update({
        status: 'disconnected',
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('integration_type', type)

    if (connectionError) {
      console.error('Error disconnecting:', connectionError)
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    // Update integration_channel_settings for Twilio/SendGrid
    if (type.startsWith('twilio_')) {
      const channelUpdate: any = {
        updated_at: new Date().toISOString(),
      }

      if (type === 'twilio_sms') {
        channelUpdate.twilio_sms_enabled = false
      } else if (type === 'twilio_whatsapp') {
        channelUpdate.twilio_whatsapp_enabled = false
      } else if (type === 'twilio_voice') {
        channelUpdate.twilio_voice_enabled = false
      }

      await serviceSupabase
        .from('integration_channel_settings')
        .update(channelUpdate)
        .eq('tenant_id', tenantId)
    } else if (type === 'sendgrid') {
      await serviceSupabase
        .from('integration_channel_settings')
        .update({
          email_provider: null,
          default_from_email: null,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
    }

    // Note: We don't delete encrypted credentials from the vault
    // They remain encrypted and can be re-enabled later
    // If you want to delete them, you'd need to clear that specific key from the JSONB

    return NextResponse.json({
      success: true,
      message: `${type} disconnected successfully`,
    })
  } catch (error) {
    console.error('[Disconnect Integration] Error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    )
  }
}


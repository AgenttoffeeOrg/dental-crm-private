import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAllServiceStatuses } from '@/lib/integrations/scope-checker'
import { getGroupForService } from '@/lib/integrations/unified-scopes'

/**
 * Get integration status and service activation status
 * GET /api/integrations/[type]/status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceClient()
    const { type } = params

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant ID
    const { data: appUser } = await supabase
      .from('app_users')
      .select('active_tenant_id, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tenantId = appUser.active_tenant_id || appUser.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    // Get integration group
    const group = getGroupForService(type)
    if (!group) {
      return NextResponse.json({ error: 'Invalid integration type' }, { status: 400 })
    }

    // Get connection for this service
    const { data: connection } = await serviceSupabase
      .from('integration_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('integration_type', type)
      .single()

    if (!connection) {
      return NextResponse.json({
        provider: group.provider,
        connected: false,
        services: getAllServiceStatuses(group.provider, []),
      })
    }

    // Get granted scopes
    const grantedScopes = connection.scopes || connection.config?.granted_scopes || []

    // Get all service statuses
    const services = getAllServiceStatuses(group.provider, grantedScopes)

    return NextResponse.json({
      provider: group.provider,
      connected: connection.is_active,
      connectionStatus: connection.status,
      grantedScopes,
      services,
      tokenExpiresAt: connection.token_expires_at,
    })
  } catch (error) {
    console.error('[Integration Status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get integration status' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * OAuth callback handler
 * GET /api/integrations/[type]/oauth/callback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceClient()
    const { type } = params
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${error}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=missing_code_or_state', request.url)
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Get tenant ID
    const { data: appUser } = await supabase
      .from('app_users')
      .select('active_tenant_id, tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=user_not_found', request.url)
      )
    }

    const tenantId = appUser.active_tenant_id || appUser.tenant_id
    if (!tenantId) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_organization', request.url)
      )
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${type}/oauth/callback`
    const tokens = await exchangeCodeForTokens(type, code, redirectUri, state)

    // Store tokens in integration_connections
    const encryptionKey = process.env.INTEGRATION_CREDENTIAL_KEY
    if (!encryptionKey) {
      throw new Error('Integration credential encryption key not configured')
    }

    // Prepare credentials to store
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in 
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    }

    // Store encrypted credentials
    await serviceSupabase.rpc('integration_store_credentials', {
      p_tenant_id: tenantId,
      p_plain_credentials: {
        [type]: credentials,
      },
      p_encryption_key: encryptionKey,
      p_updated_by: user.id,
    })

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
        token_expires_at: credentials.expires_at,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,integration_type',
      })

    if (connectionError) {
      console.error('Error storing connection:', connectionError)
      return NextResponse.redirect(
        new URL('/settings/integrations?error=storage_failed', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/settings/integrations?success=connected', request.url)
    )
  } catch (error) {
    console.error('[OAuth Callback] Error:', error)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=callback_failed', request.url)
    )
  }
}

async function exchangeCodeForTokens(
  type: string,
  code: string,
  redirectUri: string,
  state: string
): Promise<{
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}> {
  switch (type) {
    case 'gmail':
    case 'google_analytics':
    case 'google_ads':
      return exchangeGoogleTokens(code, redirectUri)
    case 'facebook':
    case 'instagram':
      return exchangeFacebookTokens(code, redirectUri)
    case 'tiktok':
      return exchangeTikTokTokens(code, redirectUri)
    case 'outlook':
      return exchangeOutlookTokens(code, redirectUri)
    default:
      throw new Error(`Token exchange not implemented for ${type}`)
  }
}

async function exchangeGoogleTokens(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google token exchange failed: ${error}`)
  }

  return await response.json()
}

async function exchangeFacebookTokens(code: string, redirectUri: string) {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error('Facebook OAuth credentials not configured')
  }

  const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Facebook token exchange failed: ${error}`)
  }

  return await response.json()
}

async function exchangeTikTokTokens(code: string, redirectUri: string) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET

  if (!clientKey || !clientSecret) {
    throw new Error('TikTok OAuth credentials not configured')
  }

  const response = await fetch('https://www.tiktok.com/v2/auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_key: clientKey,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`TikTok token exchange failed: ${error}`)
  }

  return await response.json()
}

async function exchangeOutlookTokens(code: string, redirectUri: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Microsoft token exchange failed: ${error}`)
  }

  return await response.json()
}

function getIntegrationName(type: string): string {
  const names: Record<string, string> = {
    gmail: 'Gmail',
    google_analytics: 'Google Analytics',
    google_ads: 'Google Ads',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    outlook: 'Outlook',
  }
  return names[type] || type
}


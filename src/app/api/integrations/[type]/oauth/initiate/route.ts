import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import crypto from 'crypto'

/**
 * Initiate OAuth flow for an integration
 * POST /api/integrations/[type]/oauth/initiate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
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

    // Generate OAuth state and store it
    const state = crypto.randomBytes(32).toString('hex')
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')

    // Store state in database (you might want to create an oauth_states table)
    // For now, we'll use a simple approach with cookies or session
    // In production, store in database with expiration

    // Build OAuth URL based on integration type
    let authUrl = ''
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${type}/oauth/callback`

    switch (type) {
      case 'gmail':
      case 'google_analytics':
      case 'google_ads':
        authUrl = buildGoogleOAuthUrl(type, redirectUri, state, codeChallenge)
        break
      case 'facebook':
      case 'instagram':
        authUrl = buildFacebookOAuthUrl(type, redirectUri, state)
        break
      case 'tiktok':
        authUrl = buildTikTokOAuthUrl(redirectUri, state)
        break
      case 'outlook':
        authUrl = buildOutlookOAuthUrl(redirectUri, state, codeChallenge)
        break
      default:
        return NextResponse.json(
          { error: `OAuth not supported for ${type}` },
          { status: 400 }
        )
    }

    // Store state temporarily (in production, use database)
    // For now, we'll include it in the response and verify in callback
    // In production, store in database with tenant_id and expiration

    return NextResponse.json({
      authUrl,
      state,
      codeVerifier, // Store this securely - in production, store in database
    })
  } catch (error) {
    console.error('[OAuth Initiate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}

function buildGoogleOAuthUrl(
  type: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) {
    throw new Error('Google OAuth client ID not configured')
  }

  const scopes = getGoogleScopes(type)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function buildFacebookOAuthUrl(
  type: string,
  redirectUri: string,
  state: string
): string {
  const appId = process.env.FACEBOOK_APP_ID
  if (!appId) {
    throw new Error('Facebook App ID not configured')
  }

  const scopes = type === 'instagram' 
    ? ['instagram_basic', 'instagram_manage_messages', 'pages_read_engagement']
    : ['pages_manage_posts', 'pages_read_engagement', 'ads_management']

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes.join(','),
    response_type: 'code',
  })

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
}

function buildTikTokOAuthUrl(redirectUri: string, state: string): string {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  if (!clientKey) {
    throw new Error('TikTok Client Key not configured')
  }

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    scope: 'user.info.basic,user.info.profile',
  })

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
}

function buildOutlookOAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  if (!clientId) {
    throw new Error('Microsoft Client ID not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://graph.microsoft.com/Mail.Send offline_access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
}

function getGoogleScopes(type: string): string[] {
  // Unified OAuth: Request ALL Google scopes at once
  // User approves once, all Google services are connected
  const allGoogleScopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ]
  
  // For backward compatibility, still support individual service requests
  // But default to requesting all scopes for unified experience
  switch (type) {
    case 'gmail':
    case 'google_analytics':
    case 'google_ads':
    case 'google_calendar':
      // Request all Google scopes for unified connection
      return allGoogleScopes
    default:
      return []
  }
}


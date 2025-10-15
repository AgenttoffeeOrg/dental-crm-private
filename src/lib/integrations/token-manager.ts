/**
 * OAuth Token Manager
 * 
 * Handles automatic token refresh for OAuth 2.0 integrations:
 * - Google (Ads, Analytics, Search Console, Business Profile)
 * - Meta (Facebook, Instagram)
 * - LinkedIn
 * - TikTok
 * 
 * Features:
 * - Automatic refresh before expiry
 * - Background monitoring job
 * - Token rotation logging
 * - Error handling and alerts
 * 
 * References:
 * - Google OAuth: https://developers.google.com/identity/protocols/oauth2/web-server#offline
 * - Meta OAuth: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 * - LinkedIn OAuth: https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication
 */

import { createServiceClient } from '@/lib/supabase-server'
import { retryWithBackoff } from './retry-utility'

export interface TokenRefreshResult {
  success: boolean
  newToken?: string
  expiresAt?: Date
  error?: string
}

/**
 * Refresh Google OAuth token
 */
export async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenRefreshResult> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error_description || error.error || 'Token refresh failed')
    }

    const data = await response.json()
    
    return {
      success: true,
      newToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Refresh Meta (Facebook/Instagram) OAuth token
 * 
 * Note: Meta long-lived tokens expire after 60 days
 * They can be extended again before expiry
 */
export async function refreshMetaToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<TokenRefreshResult> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      })
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Token refresh failed')
    }

    const data = await response.json()
    
    return {
      success: true,
      newToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Refresh LinkedIn OAuth token
 */
export async function refreshLinkedInToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenRefreshResult> {
  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error_description || 'Token refresh failed')
    }

    const data = await response.json()
    
    return {
      success: true,
      newToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Refresh token for any integration type
 */
export async function refreshIntegrationToken(
  connectionId: string,
  integrationType: string
): Promise<TokenRefreshResult> {
  const supabase = createServiceClient()
  
  try {
    // Get connection details
    const { data: connection, error: fetchError } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('id', connectionId)
      .single()
    
    if (fetchError || !connection) {
      throw new Error('Connection not found')
    }
    
    const credentials = connection.credentials as any
    const config = connection.config as any
    
    let result: TokenRefreshResult
    
    // Route to appropriate refresh function
    if (integrationType.startsWith('google_')) {
      result = await refreshGoogleToken(
        credentials.refresh_token,
        config.client_id || process.env.GOOGLE_CLIENT_ID!,
        config.client_secret || process.env.GOOGLE_CLIENT_SECRET!
      )
    } else if (integrationType.startsWith('facebook_') || integrationType.startsWith('instagram_')) {
      result = await refreshMetaToken(
        credentials.access_token,
        config.app_id || process.env.META_APP_ID!,
        config.app_secret || process.env.META_APP_SECRET!
      )
    } else if (integrationType.startsWith('linkedin_')) {
      result = await refreshLinkedInToken(
        credentials.refresh_token,
        config.client_id || process.env.LINKEDIN_CLIENT_ID!,
        config.client_secret || process.env.LINKEDIN_CLIENT_SECRET!
      )
    } else {
      return {
        success: false,
        error: `Token refresh not implemented for ${integrationType}`,
      }
    }
    
    if (!result.success) {
      // Log failure
      await supabase.from('integration_logs').insert({
        tenant_id: connection.tenant_id,
        integration_type: integrationType,
        operation: 'refresh_token',
        direction: 'outbound',
        status: 'error',
        error_message: result.error,
        error_code: 'token_refresh_failed',
      })
      
      // Update connection status
      await supabase
        .from('integration_connections')
        .update({
          status: 'error',
          error_message: result.error,
          error_count: connection.error_count + 1,
          last_error_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
      
      return result
    }
    
    // Update connection with new token
    await supabase
      .from('integration_connections')
      .update({
        credentials: {
          ...credentials,
          access_token: result.newToken,
        },
        token_expires_at: result.expiresAt?.toISOString(),
        token_last_refreshed_at: new Date().toISOString(),
        status: 'connected',
        error_message: null,
        error_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
    
    // Log success
    await supabase.from('integration_logs').insert({
      tenant_id: connection.tenant_id,
      integration_type: integrationType,
      operation: 'refresh_token',
      direction: 'outbound',
      status: 'success',
      response_payload: { expires_at: result.expiresAt },
    })
    
    console.log(`[Token Manager] ✅ Refreshed token for ${integrationType}`)
    
    return result
  } catch (error) {
    console.error('[Token Manager] Error refreshing token:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Monitor token expiry and refresh tokens that are about to expire
 * 
 * This function should be called by a scheduled job (cron)
 * Frequency: Daily at 2 AM
 */
export async function monitorAndRefreshTokens(): Promise<{
  checked: number
  refreshed: number
  failed: number
}> {
  const supabase = createServiceClient()
  
  try {
    // Find connections with tokens expiring in the next 7 days
    const { data: expiringConnections, error: queryError } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('is_active', true)
      .neq('status', 'disconnected')
      .not('token_expires_at', 'is', null)
      .lte('token_expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('token_expires_at', { ascending: true })
    
    if (queryError) {
      console.error('[Token Manager] Error querying expiring tokens:', queryError)
      return { checked: 0, refreshed: 0, failed: 0 }
    }
    
    if (!expiringConnections || expiringConnections.length === 0) {
      console.log('[Token Manager] No tokens expiring in next 7 days')
      return { checked: 0, refreshed: 0, failed: 0 }
    }
    
    console.log(`[Token Manager] Found ${expiringConnections.length} tokens expiring in next 7 days`)
    
    let refreshed = 0
    let failed = 0
    
    for (const connection of expiringConnections) {
      console.log(`[Token Manager] Refreshing token for ${connection.integration_type}...`)
      
      const result = await refreshIntegrationToken(connection.id, connection.integration_type)
      
      if (result.success) {
        refreshed++
        
        // Update status to indicate token was refreshed
        await supabase
          .from('integration_connections')
          .update({ status: 'connected' })
          .eq('id', connection.id)
      } else {
        failed++
        
        // Update status to indicate token refresh failed
        await supabase
          .from('integration_connections')
          .update({ 
            status: connection.token_expires_at && new Date(connection.token_expires_at) < new Date() 
              ? 'error' 
              : 'expiring_soon'
          })
          .eq('id', connection.id)
      }
    }
    
    console.log(`[Token Manager] ✅ Completed: ${refreshed} refreshed, ${failed} failed`)
    
    return {
      checked: expiringConnections.length,
      refreshed,
      failed
    }
  } catch (error) {
    console.error('[Token Manager] Error in monitorAndRefreshTokens:', error)
    return { checked: 0, refreshed: 0, failed: 0 }
  }
}

/**
 * Check if token needs refresh before making API call
 * 
 * @param connectionId - Integration connection ID
 * @returns true if token was refreshed, false if no refresh needed or failed
 */
export async function ensureTokenFresh(connectionId: string): Promise<boolean> {
  const supabase = createServiceClient()
  
  try {
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('id', connectionId)
      .single()
    
    if (!connection || !connection.token_expires_at) {
      return false // No token expiry tracking
    }
    
    const expiresAt = new Date(connection.token_expires_at)
    const now = new Date()
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    // Refresh if expiring in less than 24 hours
    if (hoursUntilExpiry < 24) {
      console.log(`[Token Manager] Token expires in ${hoursUntilExpiry.toFixed(1)}h, refreshing...`)
      
      const result = await refreshIntegrationToken(connectionId, connection.integration_type)
      return result.success
    }
    
    return false // No refresh needed
  } catch (error) {
    console.error('[Token Manager] Error in ensureTokenFresh:', error)
    return false
  }
}


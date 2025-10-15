/**
 * Marketing Audit API - Google OAuth Callback
 * 
 * GET /api/marketing-audit/oauth/google/callback?code=xxx&state=xxx
 * 
 * Handles OAuth callback from Google.
 * Exchanges code for tokens and stores them securely.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { OAuthHandler } from '@/lib/marketing-audit/utils/oauth-handler';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/marketing-audit?error=${error}`, request.url)
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/marketing-audit?error=missing_code_or_state', request.url)
      );
    }
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/sign-in', request.url)
      );
    }
    
    // Get practice
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!appUser) {
      return NextResponse.redirect(
        new URL('/marketing-audit?error=user_not_found', request.url)
      );
    }
    
    const { data: practice } = await supabase
      .from('practices')
      .select('id')
      .eq('tenant_id', appUser.tenant_id)
      .single();
    
    if (!practice) {
      return NextResponse.redirect(
        new URL('/marketing-audit?error=practice_not_found', request.url)
      );
    }
    
    // Exchange code for tokens
    const oauthHandler = new OAuthHandler();
    const tokens = await oauthHandler.handleCallback(code, state);
    
    // Store tokens
    await oauthHandler.storeTokens(practice.id, 'google', tokens);
    
    // Redirect back to marketing audit page
    return NextResponse.redirect(
      new URL('/marketing-audit?oauth=success', request.url)
    );
    
  } catch (error) {
    console.error('[OAuth Callback API] Error:', error);
    return NextResponse.redirect(
      new URL(`/marketing-audit?error=oauth_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    );
  }
}


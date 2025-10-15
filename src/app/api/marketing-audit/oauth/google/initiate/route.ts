/**
 * Marketing Audit API - Initiate Google OAuth
 * 
 * POST /api/marketing-audit/oauth/google/initiate
 * 
 * Starts the OAuth flow for Google APIs (GSC, GA4).
 * Returns authorization URL for user to visit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { OAuthHandler, GOOGLE_AUDIT_SCOPES } from '@/lib/marketing-audit/utils/oauth-handler';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Initialize OAuth handler
    const oauthHandler = new OAuthHandler();
    
    // Generate authorization URL
    const { authUrl, state } = await oauthHandler.initiateGoogleOAuth(GOOGLE_AUDIT_SCOPES);
    
    return NextResponse.json({
      authUrl,
      state,
      message: 'Please visit the authorization URL to grant access',
    });
    
  } catch (error) {
    console.error('[OAuth Initiate API] Error:', error);
    return NextResponse.json({
      error: 'Failed to initiate OAuth',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}


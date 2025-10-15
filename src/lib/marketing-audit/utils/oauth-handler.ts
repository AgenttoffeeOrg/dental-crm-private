/**
 * Marketing Audit Module - OAuth Handler
 * 
 * Handles OAuth 2.0 flow for Google APIs (GSC, GA4, GBP).
 * Implements PKCE for security and token refresh logic.
 */

import { OAuthError } from './errors';
import type { OAuthTokens, APICredential } from '../types';
import { createServerClient } from '@/lib/supabase-server';

export class OAuthHandler {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  constructor(clientId?: string, clientSecret?: string, redirectUri?: string) {
    this.clientId = clientId || process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    this.clientSecret = clientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
    this.redirectUri = redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/marketing-audit/oauth/google/callback`;
    
    if (!this.clientId || !this.clientSecret) {
      throw new OAuthError('Google OAuth credentials not configured');
    }
  }
  
  /**
   * Initiate Google OAuth flow
   */
  async initiateGoogleOAuth(scopes: string[]): Promise<{ authUrl: string; state: string }> {
    const state = this.generateSecureRandom();
    const codeVerifier = this.generatePKCEVerifier();
    const codeChallenge = await this.generatePKCEChallenge(codeVerifier);
    
    // Store state and code verifier (in production, use Redis or database)
    await this.storeOAuthState(state, codeVerifier);
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    
    return { authUrl, state };
  }
  
  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<OAuthTokens> {
    // Verify state
    const storedState = await this.getOAuthState(state);
    if (!storedState) {
      throw new OAuthError('Invalid OAuth state', 'invalid_state');
    }
    
    // Exchange code for tokens
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: storedState.codeVerifier,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new OAuthError(
        'Token exchange failed',
        error.error,
        error.error_description
      );
    }
    
    const tokens = await response.json();
    
    // Clean up state
    await this.deleteOAuthState(state);
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
    };
  }
  
  /**
   * Refresh an expired access token
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new OAuthError(
        'Token refresh failed',
        error.error,
        error.error_description
      );
    }
    
    const tokens = await response.json();
    
    return {
      access_token: tokens.access_token,
      refresh_token: refreshToken, // Keep original refresh token
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
    };
  }
  
  /**
   * Store tokens in database
   */
  async storeTokens(
    practiceId: string,
    provider: 'google',
    tokens: OAuthTokens
  ): Promise<void> {
    const supabase = createServerClient();
    
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);
    
    await supabase.from('api_credentials').upsert({
      practice_id: practiceId,
      provider,
      access_token: tokens.access_token, // TODO: Encrypt in production
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: expiresAt.toISOString(),
      scopes: tokens.scope.split(' '),
      status: 'active',
    }, {
      onConflict: 'practice_id,provider',
    });
  }
  
  /**
   * Get valid access token (auto-refresh if expired)
   */
  async getValidToken(practiceId: string, provider: 'google'): Promise<string> {
    const supabase = createServerClient();
    
    const { data: credential, error } = await supabase
      .from('api_credentials')
      .select('*')
      .eq('practice_id', practiceId)
      .eq('provider', provider)
      .single();
    
    if (error || !credential) {
      throw new OAuthError('No credentials found. Please connect your Google account.');
    }
    
    // Check if token is expired
    const expiresAt = new Date(credential.expires_at);
    const now = new Date();
    
    if (expiresAt <= now && credential.refresh_token) {
      // Refresh token
      const newTokens = await this.refreshToken(credential.refresh_token);
      await this.storeTokens(practiceId, provider, newTokens);
      return newTokens.access_token;
    }
    
    return credential.access_token;
  }
  
  // ============================================
  // PKCE HELPERS
  // ============================================
  
  private generateSecureRandom(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  private generatePKCEVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }
  
  private async generatePKCEChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }
  
  private base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  // ============================================
  // STATE STORAGE (in-memory for MVP, Redis for production)
  // ============================================
  
  private stateStore = new Map<string, { codeVerifier: string; createdAt: number }>();
  
  private async storeOAuthState(state: string, codeVerifier: string): Promise<void> {
    this.stateStore.set(state, { codeVerifier, createdAt: Date.now() });
    
    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    for (const [key, value] of this.stateStore.entries()) {
      if (value.createdAt < tenMinutesAgo) {
        this.stateStore.delete(key);
      }
    }
  }
  
  private async getOAuthState(state: string): Promise<{ codeVerifier: string } | null> {
    const stored = this.stateStore.get(state);
    if (!stored) return null;
    
    // Check if expired (10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    if (stored.createdAt < tenMinutesAgo) {
      this.stateStore.delete(state);
      return null;
    }
    
    return { codeVerifier: stored.codeVerifier };
  }
  
  private async deleteOAuthState(state: string): Promise<void> {
    this.stateStore.delete(state);
  }
}

// Google OAuth scopes for Marketing Audit
export const GOOGLE_AUDIT_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly', // GSC
  'https://www.googleapis.com/auth/analytics.readonly',  // GA4
];


/**
 * Organization Discovery API
 * 
 * POST /api/organizations/discover
 * 
 * Finds organizations by email domain or website URL.
 * Used during signup/join flows to prevent duplicate orgs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  findOrganizationsByEmail, 
  findOrganizationsByWebsite,
  normalizeWebsiteHost,
  extractEmailDomain,
} from '@/lib/domain-utils'
import { FeatureFlags } from '@/lib/feature-flags'

export async function POST(request: NextRequest) {
  try {
    // Check if domain discovery is enabled
    if (!FeatureFlags.ENABLE_DOMAIN_DISCOVERY) {
      return NextResponse.json(
        { error: 'Domain discovery is not enabled' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { email, website } = body
    
    if (!email && !website) {
      return NextResponse.json(
        { error: 'Either email or website must be provided' },
        { status: 400 }
      )
    }
    
    let organizations: any[] = []
    let matchType: 'email' | 'website' | 'none' = 'none'
    let normalizedDomain: string | null = null
    
    // Try email domain matching first
    if (email) {
      const emailDomain = extractEmailDomain(email)
      
      if (emailDomain) {
        normalizedDomain = emailDomain
        const results = await findOrganizationsByEmail(email)
        
        if (results.length > 0) {
          organizations = results
          matchType = 'email'
        }
      }
    }
    
    // If no email matches, try website matching
    if (organizations.length === 0 && website) {
      const websiteHost = normalizeWebsiteHost(website)
      
      if (websiteHost) {
        normalizedDomain = websiteHost
        const results = await findOrganizationsByWebsite(website)
        
        if (results.length > 0) {
          organizations = results
          matchType = 'website'
        }
      }
    }
    
    // Return results
    return NextResponse.json({
      found: organizations.length > 0,
      matchType,
      normalizedDomain,
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        website_url: org.website_url,
        website_host: org.website_host,
        verified_at: org.verified_at,
        match_confidence: org.match_confidence || (org.verified_at ? 'high' : 'medium'),
      })),
    })
  } catch (error: any) {
    console.error('Organization discovery error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


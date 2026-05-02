/**
 * Domain Utilities
 * 
 * Functions for website URL normalization, email domain extraction,
 * and organization discovery by domain matching.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * Normalize a website URL to extract the host
 * 
 * Examples:
 *   https://www.smithdental.com/ → smithdental.com
 *   HTTP://SmithDental.COM → smithdental.com
 *   smithdental.com → smithdental.com
 *   www.smithdental.com → smithdental.com
 */
export function normalizeWebsiteHost(url: string): string | null {
  if (!url || url.trim() === '') {
    return null
  }
  
  try {
    // Add protocol if missing
    let normalizedUrl = url.trim()
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    // Parse URL
    const parsedUrl = new URL(normalizedUrl)
    let host = parsedUrl.hostname.toLowerCase()
    
    // Remove www. prefix
    if (host.startsWith('www.')) {
      host = host.substring(4)
    }
    
    // Validate host (must have at least one dot)
    if (!host.includes('.')) {
      return null
    }
    
    return host
  } catch (error) {
    // Invalid URL
    return null
  }
}

/**
 * Extract domain from email address
 * 
 * Examples:
 *   alex@smithdental.com → smithdental.com
 *   JOHN.DOE@SmithDental.COM → smithdental.com
 *   invalid-email → null
 */
export function extractEmailDomain(email: string): string | null {
  if (!email || email.trim() === '') {
    return null
  }
  
  // Basic email validation
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
  if (!emailRegex.test(email.trim())) {
    return null
  }
  
  // Extract domain (everything after @)
  const domain = email.trim().toLowerCase().split('@')[1]
  
  // Remove www. if present
  return domain.startsWith('www.') ? domain.substring(4) : domain
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
  return emailRegex.test(email.trim())
}

/**
 * Validate website URL format
 */
export function isValidWebsiteUrl(url: string): boolean {
  return normalizeWebsiteHost(url) !== null
}

/**
 * Find organizations by website host
 */
export async function findOrganizationsByWebsite(
  websiteUrl: string
): Promise<Array<{
  id: string
  name: string
  website_url: string | null
  website_host: string | null
  verified_at: string | null
  location_count: number
}>> {
  const host = normalizeWebsiteHost(websiteUrl)
  
  if (!host) {
    return []
  }
  
  const supabase = await createServerSupabaseClient()
  
  // Find tenants with matching website_host
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, website_url, website_host, verified_at')
    .eq('website_host', host)
    .order('verified_at', { ascending: false, nullsFirst: false })
  
  if (error || !tenants) {
    console.error('Error finding organizations by website:', error)
    return []
  }
  
  // For multi-location, group by dental_group_id
  // For single-location, return individual tenants
  
  // For now, return all matching tenants
  // (Can be enhanced to group multi-location later)
  return tenants.map(t => ({
    ...t,
    location_count: 1, // TODO: Count locations in dental group
  }))
}

/**
 * Find organizations by email domain
 */
export async function findOrganizationsByEmail(
  email: string
): Promise<Array<{
  id: string
  name: string
  website_url: string | null
  website_host: string | null
  verified_at: string | null
  match_confidence: 'high' | 'medium' | 'low'
}>> {
  const domain = extractEmailDomain(email)
  
  if (!domain) {
    return []
  }
  
  const supabase = await createServerSupabaseClient()
  
  // Find tenants with matching website_host
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, website_url, website_host, verified_at')
    .eq('website_host', domain)
    .order('verified_at', { ascending: false, nullsFirst: false })
  
  if (error || !tenants) {
    console.error('Error finding organizations by email:', error)
    return []
  }
  
  return tenants.map(t => ({
    ...t,
    match_confidence: t.verified_at ? 'high' : 'medium' as const,
  }))
}

/**
 * Check if website host is available (not taken by another org)
 */
export async function isWebsiteHostAvailable(
  websiteUrl: string,
  excludeTenantId?: string
): Promise<boolean> {
  const host = normalizeWebsiteHost(websiteUrl)
  
  if (!host) {
    return false
  }
  
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('tenants')
    .select('id')
    .eq('website_host', host)
  
  if (excludeTenantId) {
    query = query.neq('id', excludeTenantId)
  }
  
  const { data, error } = await query.limit(1)
  
  if (error) {
    console.error('Error checking website availability:', error)
    return false
  }
  
  return !data || data.length === 0
}

/**
 * Generate a unique subdomain slug from organization name
 */
export function generateSubdomainSlug(organizationName: string): string {
  return organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/(^-+|-+$)/g, '') // Remove leading/trailing hyphens
    .substring(0, 63) // Max 63 chars for DNS
}

/**
 * Check if subdomain is available
 */
export async function isSubdomainAvailable(
  subdomain: string,
  excludeTenantId?: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain.toLowerCase())
  
  if (excludeTenantId) {
    query = query.neq('id', excludeTenantId)
  }
  
  const { data, error } = await query.limit(1)
  
  if (error) {
    console.error('Error checking subdomain availability:', error)
    return false
  }
  
  return !data || data.length === 0
}

/**
 * Find or suggest a unique subdomain
 */
export async function findAvailableSubdomain(
  organizationName: string,
  maxAttempts: number = 10
): Promise<string> {
  let baseSlug = generateSubdomainSlug(organizationName)
  let attempt = 0
  
  // Try base slug first
  if (await isSubdomainAvailable(baseSlug)) {
    return baseSlug
  }
  
  // Try with numbers
  while (attempt < maxAttempts) {
    attempt++
    const slug = `${baseSlug}-${attempt}`
    
    if (await isSubdomainAvailable(slug)) {
      return slug
    }
  }
  
  // Last resort: append random string
  const random = Math.random().toString(36).substring(2, 8)
  return `${baseSlug}-${random}`
}

/**
 * Similarity score between two strings (for fuzzy matching)
 * Uses Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[b.length][a.length]
}

/**
 * Calculate similarity score (0-1, where 1 is identical)
 */
export function calculateSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length)
  if (maxLength === 0) return 1
  
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  return 1 - distance / maxLength
}

/**
 * Search organizations by name (fuzzy matching)
 */
export async function searchOrganizations(
  query: string,
  limit: number = 10
): Promise<Array<{
  id: string
  name: string
  website_url: string | null
  website_host: string | null
  similarity: number
}>> {
  if (!query || query.trim().length < 2) {
    return []
  }
  
  const supabase = await createServerSupabaseClient()
  
  // Use PostgreSQL full-text search
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, website_url, website_host')
    .textSearch('name', query, {
      type: 'websearch',
      config: 'english',
    })
    .limit(limit * 2) // Get more results for filtering
  
  if (error || !tenants) {
    console.error('Error searching organizations:', error)
    return []
  }
  
  // Calculate similarity and sort
  const results = tenants
    .map(t => ({
      ...t,
      similarity: calculateSimilarity(query, t.name),
    }))
    .filter(t => t.similarity > 0.3) // Filter out low similarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
  
  return results
}


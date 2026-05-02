/**
 * =====================================================
 * TREATMENT TAG ROUTING ENGINE - CORE LOGIC
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 3 - Core Routing Engine
 * =====================================================
 * 
 * PURPOSE:
 * Universal deal routing system that automatically routes deals to the
 * correct pipeline based on treatment tags, AI analysis, and business rules.
 * 
 * ROUTING LOGIC (4-TIER SYSTEM):
 * 1. User Override - Manual pipeline selection always wins
 * 2. Tag Mapping - Match treatment tags to configured pipeline mappings
 * 3. AI Keyword Match - Intelligent keyword analysis and matching
 * 4. Unsorted Fallback - Default pipeline if no matches found
 * 
 * FEATURES:
 * - Multi-location support (org-wide + location-specific tags)
 * - Confidence scoring (0-100)
 * - Complete audit trail
 * - Performance optimized (<50ms target)
 * - In-memory caching with TTL
 * - Type-safe with TypeScript
 * - Error-resilient with fallbacks
 * 
 * USAGE:
 * ```typescript
 * const result = await routeDealToPipeline({
 *   tenantId: 'uuid',
 *   treatmentTags: ['dental_implant', 'high_value'],
 *   dealTitle: 'Crown for John Smith',
 *   dealValue: 500000, // £5,000 in cents
 *   userId: 'uuid'
 * })
 * ```
 * 
 * =====================================================
 */

import { createClient } from '@/lib/supabase-client'
import { categorizeDeal, type TreatmentTagConfig } from '@/lib/deal-categorization'

// =====================================================
// TYPES & INTERFACES
// =====================================================

/**
 * Context data for routing decision
 * All information needed to make an intelligent routing choice
 */
export interface RoutingContext {
  // Required fields
  tenantId: string
  treatmentTags: string[] // User-selected or AI-extracted treatment tag names
  
  // Optional deal information
  dealTitle?: string
  dealDescription?: string
  dealValue?: number // In cents
  contactId?: string
  source?: string // 'website', 'referral', 'walk-in', etc.
  
  // Location context
  locationId?: string // For multi-location routing
  
  // Override options
  existingPipelineId?: string // If user manually selected pipeline
  existingStageId?: string // If user manually selected stage
  
  // User context (for audit trail)
  userId?: string // User making the routing decision
  
  // AI context
  aiConversationData?: any // AI conversation insights (if available)
  
  // Metadata
  metadata?: Record<string, any> // Additional context for advanced routing
}

/**
 * Result of routing decision
 * Complete information about where deal should go and why
 */
export interface RoutingResult {
  // Routing destination
  pipelineId: string
  pipelineName: string
  stageId: string // First stage of pipeline (or manually selected stage)
  stageName: string
  
  // Routing decision details
  routingMethod: 
    | 'user_override'       // User manually selected pipeline
    | 'tag_mapping'         // Matched via treatment_tag_pipeline_mappings
    | 'ai_keyword_match'    // AI matched keywords in deal text
    | 'value_based'         // Routed based on deal value threshold
    | 'unsorted_fallback'   // No matches, routed to "Unsorted" pipeline
    | 'legacy_config'       // Matched via old localStorage config (temporary)
    | 'api_specified'       // API call explicitly specified pipeline
  
  // Matching details
  matchedTagIds: string[] // UUIDs of matched treatment_tags
  matchedTagNames: string[] // Names of matched tags
  matchedKeywords: string[] // Which keywords triggered the match
  
  // Confidence & explanation
  confidence: number // 0-100 score
  reason: string // Human-readable explanation
  
  // Performance
  durationMs: number // How long routing took
  
  // Suggestions (for UI)
  alternativePipelines?: Array<{
    pipelineId: string
    pipelineName: string
    confidence: number
    reason: string
  }>
}

/**
 * Database types for treatment tags and mappings
 */
interface TreatmentTag {
  id: string
  tenant_id: string
  location_id: string | null
  name: string
  description: string | null
  keywords: string[]
  color: string
  icon: string
  category: string | null
  min_value_cents: number | null
  priority: number
  is_active: boolean
  scope: 'organization' | 'location'
}

interface TreatmentTagPipelineMapping {
  id: string
  tenant_id: string
  location_id: string | null
  treatment_tag_id: string
  pipeline_id: string
  stage_id: string | null
  min_value_cents: number | null
  max_value_cents: number | null
  priority: number
  is_active: boolean
  conditions: Record<string, any>
  auto_assign_owner: boolean
  assigned_owner_user_id: string | null
}

interface TenantRoutingSettings {
  routing_enabled: boolean
  ai_routing_enabled: boolean
  ai_confidence_threshold: number
  unsorted_pipeline_id: string | null
  auto_create_unsorted: boolean
  allow_user_override: boolean
  high_value_threshold_cents: number
}

// =====================================================
// IN-MEMORY CACHE (for performance)
// =====================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class RoutingCache {
  private readonly cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear(): void {
    this.cache.clear()
  }

  clearTenant(tenantId: string): void {
    // Clear all entries for a specific tenant
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.cache.delete(key)
      }
    }
  }
}

const routingCache = new RoutingCache()

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Fetch tenant routing settings from database
 */
async function getTenantRoutingSettings(tenantId: string): Promise<TenantRoutingSettings> {
  const cacheKey = `${tenantId}:settings`
  const cached = routingCache.get<TenantRoutingSettings>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('tenant_routing_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    // Return default settings if not found
    console.warn(`[Routing] No settings found for tenant ${tenantId}, using defaults`)
    return {
      routing_enabled: true,
      ai_routing_enabled: true,
      ai_confidence_threshold: 70,
      unsorted_pipeline_id: null,
      auto_create_unsorted: true,
      allow_user_override: true,
      high_value_threshold_cents: 500000 // £5,000
    }
  }

  const settings: TenantRoutingSettings = {
    routing_enabled: data.routing_enabled ?? true,
    ai_routing_enabled: data.ai_routing_enabled ?? true,
    ai_confidence_threshold: data.ai_confidence_threshold ?? 70,
    unsorted_pipeline_id: data.unsorted_pipeline_id,
    auto_create_unsorted: data.auto_create_unsorted ?? true,
    allow_user_override: data.allow_user_override ?? true,
    high_value_threshold_cents: data.high_value_threshold_cents ?? 500000
  }

  routingCache.set(cacheKey, settings)
  return settings
}

/**
 * Fetch active treatment tags for a tenant/location
 */
async function getTreatmentTags(
  tenantId: string,
  locationId?: string
): Promise<TreatmentTag[]> {
  const cacheKey = `${tenantId}:${locationId || 'org'}:tags`
  const cached = routingCache.get<TreatmentTag[]>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  let query = supabase
    .from('treatment_tags')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  // Get org-wide tags + location-specific tags
  if (locationId) {
    query = query.or(`location_id.is.null,location_id.eq.${locationId}`)
  } else {
    query = query.is('location_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Routing] Error fetching treatment tags:', error)
    return []
  }

  routingCache.set(cacheKey, data || [])
  return data || []
}

/**
 * Fetch active pipeline mappings for a tenant/location
 */
async function getPipelineMappings(
  tenantId: string,
  locationId?: string
): Promise<TreatmentTagPipelineMapping[]> {
  const cacheKey = `${tenantId}:${locationId || 'org'}:mappings`
  const cached = routingCache.get<TreatmentTagPipelineMapping[]>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  let query = supabase
    .from('treatment_tag_pipeline_mappings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  // Get org-wide mappings + location-specific mappings
  if (locationId) {
    query = query.or(`location_id.is.null,location_id.eq.${locationId}`)
  } else {
    query = query.is('location_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Routing] Error fetching pipeline mappings:', error)
    return []
  }

  routingCache.set(cacheKey, data || [])
  return data || []
}

/**
 * Get or create "Unsorted" pipeline for fallback routing
 */
async function getOrCreateUnsortedPipeline(
  tenantId: string
): Promise<{ pipelineId: string; stageId: string }> {
  const supabase = createClient()
  
  // Try to find existing "Unsorted" pipeline
  const { data: existingPipeline } = await supabase
    .from('pipelines')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .or('name.eq.Unsorted,name.ilike.%unsorted%')
    .limit(1)
    .single()

  if (existingPipeline) {
    // Get first stage
    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', existingPipeline.id)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (firstStage) {
      return {
        pipelineId: existingPipeline.id,
        stageId: firstStage.id
      }
    }
  }

  // Create new "Unsorted" pipeline
  console.log(`[Routing] Creating "Unsorted" pipeline for tenant ${tenantId}`)
  
  const { data: newPipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .insert({
      tenant_id: tenantId,
      name: 'Unsorted',
      created_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (pipelineError || !newPipeline) {
    throw new Error('Failed to create Unsorted pipeline')
  }

  // Create first stage
  const { data: newStage, error: stageError } = await supabase
    .from('pipeline_stages')
    .insert({
      tenant_id: tenantId,
      pipeline_id: newPipeline.id,
      name: 'New',
      position: 0,
      created_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (stageError || !newStage) {
    throw new Error('Failed to create stage for Unsorted pipeline')
  }

  return {
    pipelineId: newPipeline.id,
    stageId: newStage.id
  }
}

/**
 * Get pipeline and stage names for a given pipeline ID
 */
async function getPipelineDetails(pipelineId: string, stageId?: string): Promise<{
  pipelineName: string
  stageName: string
  stageId: string
}> {
  const supabase = createClient()
  
  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('name')
    .eq('id', pipelineId)
    .single()

  // If stage ID provided, get that stage
  if (stageId) {
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('id', stageId)
      .single()

    return {
      pipelineName: pipeline?.name || 'Unknown',
      stageName: stage?.name || 'Unknown',
      stageId: stage?.id || stageId
    }
  }

  // Otherwise, get first stage
  const { data: firstStage } = await supabase
    .from('pipeline_stages')
    .select('id, name')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
    .limit(1)
    .single()

  return {
    pipelineName: pipeline?.name || 'Unknown',
    stageName: firstStage?.name || 'New',
    stageId: firstStage?.id || ''
  }
}

/**
 * Log routing decision to audit trail
 */
async function logRoutingDecision(
  context: RoutingContext,
  result: RoutingResult,
  dealId?: string
): Promise<void> {
  try {
    const supabase = createClient()
    
    await supabase.from('treatment_routing_logs').insert({
      tenant_id: context.tenantId,
      deal_id: dealId || null,
      routed_to_pipeline_id: result.pipelineId,
      routed_to_stage_id: result.stageId,
      routing_method: result.routingMethod,
      matched_tag_ids: result.matchedTagIds,
      matched_keywords: result.matchedKeywords,
      confidence_score: result.confidence,
      routing_reason: result.reason,
      deal_title: context.dealTitle,
      deal_value_cents: context.dealValue,
      deal_treatment_tags: context.treatmentTags,
      deal_source: context.source,
      routing_duration_ms: result.durationMs,
      routed_by_user_id: context.userId,
      was_manual_override: result.routingMethod === 'user_override',
      metadata: context.metadata || {},
      routed_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Routing] Failed to log routing decision:', error)
    // Don't throw - logging failure shouldn't break routing
  }
}

// =====================================================
// MAIN ROUTING FUNCTION
// =====================================================

/**
 * Route a deal to the appropriate pipeline based on treatment tags and AI analysis
 * 
 * This is the main entry point for the routing system.
 * 
 * @param context - All information needed for routing decision
 * @returns Promise<RoutingResult> - Complete routing decision with confidence and explanation
 * 
 * @example
 * ```typescript
 * const result = await routeDealToPipeline({
 *   tenantId: 'uuid',
 *   treatmentTags: ['dental_implant'],
 *   dealTitle: 'Crown for John',
 *   dealValue: 500000,
 *   userId: 'uuid'
 * })
 * console.log(`Route to: ${result.pipelineName} (confidence: ${result.confidence}%)`)
 * ```
 */
export async function routeDealToPipeline(
  context: RoutingContext
): Promise<RoutingResult> {
  const startTime = Date.now()

  try {
    // ============================================
    // STEP 0: Validate input
    // ============================================
    if (!context.tenantId) {
      throw new Error('tenantId is required for routing')
    }

    // ============================================
    // STEP 1: Get tenant routing settings
    // ============================================
    const settings = await getTenantRoutingSettings(context.tenantId)

    // Check if routing is enabled
    if (!settings.routing_enabled) {
      console.log('[Routing] Routing disabled for tenant, using unsorted fallback')
      const { pipelineId, stageId } = await getOrCreateUnsortedPipeline(context.tenantId)
      const details = await getPipelineDetails(pipelineId, stageId)
      
      return {
        pipelineId,
        pipelineName: details.pipelineName,
        stageId: details.stageId,
        stageName: details.stageName,
        routingMethod: 'unsorted_fallback',
        matchedTagIds: [],
        matchedTagNames: [],
        matchedKeywords: [],
        confidence: 0,
        reason: 'Routing system disabled for this tenant',
        durationMs: Date.now() - startTime
      }
    }

    // ============================================
    // STEP 2: USER OVERRIDE (highest priority)
    // ============================================
    if (context.existingPipelineId && settings.allow_user_override) {
      console.log('[Routing] User override detected, respecting manual selection')
      const details = await getPipelineDetails(
        context.existingPipelineId,
        context.existingStageId
      )
      
      const result: RoutingResult = {
        pipelineId: context.existingPipelineId,
        pipelineName: details.pipelineName,
        stageId: details.stageId,
        stageName: details.stageName,
        routingMethod: 'user_override',
        matchedTagIds: [],
        matchedTagNames: [],
        matchedKeywords: [],
        confidence: 100,
        reason: 'User manually selected this pipeline',
        durationMs: Date.now() - startTime
      }

      // Log decision (async, don't wait)
      logRoutingDecision(context, result).catch(() => {})
      
      return result
    }

    // ============================================
    // STEP 3: TAG MAPPING (configured routing rules)
    // ============================================
    if (context.treatmentTags && context.treatmentTags.length > 0) {
      const [tags, mappings] = await Promise.all([
        getTreatmentTags(context.tenantId, context.locationId),
        getPipelineMappings(context.tenantId, context.locationId)
      ])

      // Find matching tags
      const matchedTags = tags.filter(tag =>
        context.treatmentTags.some(dealTag =>
          dealTag.toLowerCase() === tag.name.toLowerCase()
        )
      )

      if (matchedTags.length > 0) {
        // Find mappings for matched tags (sorted by priority)
        const relevantMappings = mappings.filter(mapping =>
          matchedTags.some(tag => tag.id === mapping.treatment_tag_id)
        )

        for (const mapping of relevantMappings) {
          // Check value constraints
          const meetsMinValue = !mapping.min_value_cents ||
            (context.dealValue && context.dealValue >= mapping.min_value_cents)
          const meetsMaxValue = !mapping.max_value_cents ||
            (context.dealValue && context.dealValue <= mapping.max_value_cents)

          // Check additional conditions (if any)
          let meetsConditions = true
          if (mapping.conditions && Object.keys(mapping.conditions).length > 0) {
            // TODO: Implement advanced condition checking
            // For now, we'll skip complex conditions
            console.log('[Routing] Advanced conditions exist but not yet implemented')
          }

          if (meetsMinValue && meetsMaxValue && meetsConditions) {
            // MATCH FOUND!
            const matchingTag = matchedTags.find(t => t.id === mapping.treatment_tag_id)!
            const details = await getPipelineDetails(mapping.pipeline_id, mapping.stage_id || undefined)
            
            const result: RoutingResult = {
              pipelineId: mapping.pipeline_id,
              pipelineName: details.pipelineName,
              stageId: details.stageId,
              stageName: details.stageName,
              routingMethod: 'tag_mapping',
              matchedTagIds: [matchingTag.id],
              matchedTagNames: [matchingTag.name],
              matchedKeywords: matchingTag.keywords,
              confidence: 95,
              reason: `Matched treatment tag "${matchingTag.name}" → ${details.pipelineName}`,
              durationMs: Date.now() - startTime
            }

            // Log decision (async)
            logRoutingDecision(context, result).catch(() => {})
            
            return result
          }
        }
      }
    }

    // ============================================
    // STEP 4: AI KEYWORD MATCHING
    // ============================================
    if (settings.ai_routing_enabled && (context.dealTitle || context.dealDescription)) {
      const tags = await getTreatmentTags(context.tenantId, context.locationId)
      
      // Convert tags to TreatmentTagConfig format for categorization
      const tagConfigs: TreatmentTagConfig[] = tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        keywords: tag.keywords,
        category: tag.category || undefined,
        min_value_cents: tag.min_value_cents || undefined,
        priority: tag.priority
      }))

      // Use existing categorization logic
      const category = categorizeDeal(
        context.dealTitle || '',
        context.dealDescription || '',
        context.treatmentTags,
        context.dealValue || 0,
        context.source,
        context.aiConversationData,
        tagConfigs
      )

      // Check if confidence meets threshold
      if (category.confidence >= settings.ai_confidence_threshold) {
        // Find pipeline by name (from categorization)
        const supabase = createClient()
        const { data: pipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('tenant_id', context.tenantId)
          .ilike('name', `%${category.pipelineName}%`)
          .limit(1)
          .single()

        if (pipeline) {
          const details = await getPipelineDetails(pipeline.id)
          
          const result: RoutingResult = {
            pipelineId: pipeline.id,
            pipelineName: details.pipelineName,
            stageId: details.stageId,
            stageName: details.stageName,
            routingMethod: 'ai_keyword_match',
            matchedTagIds: [],
            matchedTagNames: category.suggestedTags,
            matchedKeywords: category.suggestedTags,
            confidence: Math.round(category.confidence * 100),
            reason: category.reason,
            durationMs: Date.now() - startTime
          }

          // Log decision (async)
          logRoutingDecision(context, result).catch(() => {})
          
          return result
        }
      }
    }

    // ============================================
    // STEP 5: VALUE-BASED ROUTING
    // ============================================
    if (context.dealValue && context.dealValue >= settings.high_value_threshold_cents) {
      const supabase = createClient()
      const { data: highValuePipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .or('name.ilike.%high%value%,name.ilike.%premium%')
        .limit(1)
        .single()

      if (highValuePipeline) {
        const details = await getPipelineDetails(highValuePipeline.id)
        
        const result: RoutingResult = {
          pipelineId: highValuePipeline.id,
          pipelineName: details.pipelineName,
          stageId: details.stageId,
          stageName: details.stageName,
          routingMethod: 'value_based',
          matchedTagIds: [],
          matchedTagNames: [],
          matchedKeywords: [],
          confidence: 80,
          reason: `High deal value (£${((context.dealValue || 0) / 100).toLocaleString()}) → ${details.pipelineName}`,
          durationMs: Date.now() - startTime
        }

        // Log decision (async)
        logRoutingDecision(context, result).catch(() => {})
        
        return result
      }
    }

    // ============================================
    // STEP 6: UNSORTED FALLBACK
    // ============================================
    console.log('[Routing] No matches found, routing to Unsorted pipeline')
    const { pipelineId, stageId } = await getOrCreateUnsortedPipeline(context.tenantId)
    const details = await getPipelineDetails(pipelineId, stageId)
    
    const result: RoutingResult = {
      pipelineId,
      pipelineName: details.pipelineName,
      stageId: details.stageId,
      stageName: details.stageName,
      routingMethod: 'unsorted_fallback',
      matchedTagIds: [],
      matchedTagNames: [],
      matchedKeywords: [],
      confidence: 0,
      reason: 'No matching tags or keywords found. Please review and assign to appropriate pipeline.',
      durationMs: Date.now() - startTime
    }

    // Log decision (async)
    logRoutingDecision(context, result).catch(() => {})
    
    return result

  } catch (error) {
    console.error('[Routing] Fatal error in routing engine:', error)
    
    // Emergency fallback
    try {
      const { pipelineId, stageId } = await getOrCreateUnsortedPipeline(context.tenantId)
      const details = await getPipelineDetails(pipelineId, stageId)
      
      return {
        pipelineId,
        pipelineName: details.pipelineName,
        stageId: details.stageId,
        stageName: details.stageName,
        routingMethod: 'unsorted_fallback',
        matchedTagIds: [],
        matchedTagNames: [],
        matchedKeywords: [],
        confidence: 0,
        reason: `Routing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        durationMs: Date.now() - startTime
      }
    } catch (fallbackError) {
      // Absolute worst case - throw error
      throw new Error(`Routing failed completely: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// =====================================================
// CACHE MANAGEMENT
// =====================================================

/**
 * Clear routing cache for a specific tenant
 * Call this when tags or mappings are updated
 */
export function clearTenantRoutingCache(tenantId: string): void {
  routingCache.clearTenant(tenantId)
  console.log(`[Routing] Cache cleared for tenant ${tenantId}`)
}

/**
 * Clear entire routing cache
 * Call this for testing or debugging
 */
export function clearRoutingCache(): void {
  routingCache.clear()
  console.log('[Routing] Complete cache cleared')
}

// =====================================================
// EXPORTS
// =====================================================

export {
  getTenantRoutingSettings,
  getTreatmentTags,
  getPipelineMappings,
  getOrCreateUnsortedPipeline,
  logRoutingDecision
}


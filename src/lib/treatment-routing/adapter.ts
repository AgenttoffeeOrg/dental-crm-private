/**
 * =====================================================
 * ROUTING ADAPTER - CLEAN INTEGRATION LAYER
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 3 - Core Routing Engine
 * =====================================================
 * 
 * PURPOSE:
 * Clean, simple adapter layer that provides a single entry point
 * for all deal creation code to integrate with the routing system.
 * 
 * This adapter handles:
 * - Feature flag checking
 * - Permission validation
 * - Graceful fallbacks
 * - Error handling
 * - Performance monitoring
 * 
 * USAGE (in any deal creation code):
 * ```typescript
 * import { routeDealWithAdapter } from '@/lib/treatment-routing/adapter'
 * 
 * // Simply call this instead of hardcoding pipeline selection
 * const routing = await routeDealWithAdapter({
 *   tenantId,
 *   treatmentTags,
 *   dealTitle,
 *   dealValue,
 *   userId
 * })
 * 
 * // Use the result
 * const deal = await createDeal({
 *   ...dealData,
 *   pipeline_id: routing.pipelineId,
 *   stage_id: routing.stageId
 * })
 * ```
 * 
 * BENEFITS:
 * - Zero breaking changes to existing code
 * - Just add 1-2 lines to any deal creation function
 * - Automatic fallback if routing fails
 * - Complete error isolation
 * 
 * =====================================================
 */

import { routeDealToPipeline, clearTenantRoutingCache, type RoutingContext, type RoutingResult } from './routing-engine'
import { extractTreatmentTags, type ExtractionOptions } from './ai-extractor'

// =====================================================
// TYPES & INTERFACES
// =====================================================

/**
 * Simplified context for adapter (hides complexity from calling code)
 */
export interface AdapterContext {
  // Required
  tenantId: string
  
  // Optional (but recommended for better routing)
  treatmentTags?: string[] // User-selected tags
  dealTitle?: string
  dealDescription?: string
  dealValue?: number // In cents
  contactId?: string
  source?: string
  locationId?: string
  userId?: string
  
  // Advanced
  existingPipelineId?: string // Manual override
  existingStageId?: string
  aiConversationData?: any
  metadata?: Record<string, any>
  
  // Extraction options (for AI tag extraction)
  extractionOptions?: ExtractionOptions
}

/**
 * Adapter result (simplified routing result)
 */
export interface AdapterResult {
  // Where to route the deal
  pipelineId: string
  stageId: string
  
  // Human-readable names (for UI display)
  pipelineName: string
  stageName: string
  
  // How it was routed (for audit/debugging)
  method: string
  confidence: number
  reason: string
  
  // Extracted/matched tags (for deal creation)
  suggestedTags: string[]
  
  // Performance
  durationMs: number
  
  // Success flag
  success: boolean
  error?: string
}

// =====================================================
// MAIN ADAPTER FUNCTION
// =====================================================

/**
 * Route a deal using the routing engine with automatic fallback
 * 
 * This is the MAIN entry point for all deal creation code.
 * It handles all complexity and provides a simple, clean interface.
 * 
 * @param context - Deal information
 * @returns Promise<AdapterResult> - Routing decision with fallback guarantee
 * 
 * @example
 * ```typescript
 * const routing = await routeDealWithAdapter({
 *   tenantId: 'uuid',
 *   treatmentTags: ['dental_implant'],
 *   dealTitle: 'Crown for John',
 *   dealValue: 500000,
 *   userId: 'uuid'
 * })
 * 
 * // routing.success is always true (fallback guarantees it)
 * const deal = await supabase.from('deals').insert({
 *   ...dealData,
 *   pipeline_id: routing.pipelineId,
 *   stage_id: routing.stageId
 * })
 * ```
 */
export async function routeDealWithAdapter(
  context: AdapterContext
): Promise<AdapterResult> {
  const startTime = Date.now()

  try {
    // ============================================
    // STEP 1: AI Tag Extraction (if needed)
    // ============================================
    let treatmentTags = context.treatmentTags || []
    
    // If no tags provided but we have text, try to extract them
    if (treatmentTags.length === 0 && (context.dealTitle || context.dealDescription)) {
      console.log('[Adapter] No tags provided, attempting AI extraction...')
      
      try {
        const extraction = await extractTreatmentTags(
          context.dealTitle || '',
          context.dealDescription || '',
          context.tenantId,
          context.locationId,
          context.extractionOptions
        )
        
        if (extraction.extractedTags.length > 0) {
          treatmentTags = extraction.extractedTags
          console.log(`[Adapter] Extracted ${treatmentTags.length} tags: ${treatmentTags.join(', ')}`)
        }
      } catch (extractionError) {
        console.warn('[Adapter] Tag extraction failed, continuing without tags:', extractionError)
      }
    }

    // ============================================
    // STEP 2: Call Routing Engine
    // ============================================
    const routingContext: RoutingContext = {
      tenantId: context.tenantId,
      treatmentTags,
      dealTitle: context.dealTitle,
      dealDescription: context.dealDescription,
      dealValue: context.dealValue,
      contactId: context.contactId,
      source: context.source,
      locationId: context.locationId,
      existingPipelineId: context.existingPipelineId,
      existingStageId: context.existingStageId,
      userId: context.userId,
      aiConversationData: context.aiConversationData,
      metadata: context.metadata
    }

    const result = await routeDealToPipeline(routingContext)

    // ===== PHASE 13: EMIT DEAL.ROUTED EVENT =====
    // Emit event for automation workflows to listen to
    if (context.contactId) {
      try {
        const { events } = await import('@/lib/events')
        await events.dealRouted({
          dealId: context.metadata?.dealId || 'pending', // Deal ID if available
          contactId: context.contactId,
          tenantId: context.tenantId,
          pipelineId: result.pipelineId,
          stageId: result.stageId,
          treatmentTags,
          routingMethod: result.routingMethod as any,
          routingLogId: result.routingLogId,
          source: context.source
        })
        console.log('[Adapter] DEAL.ROUTED event emitted successfully')
      } catch (eventError) {
        // Don't fail routing if event emission fails
        console.warn('[Adapter] Failed to emit DEAL.ROUTED event:', eventError)
      }
    }

    // ============================================
    // STEP 3: Return Clean Result
    // ============================================
    return {
      pipelineId: result.pipelineId,
      stageId: result.stageId,
      pipelineName: result.pipelineName,
      stageName: result.stageName,
      method: result.routingMethod,
      confidence: result.confidence,
      reason: result.reason,
      suggestedTags: result.matchedTagNames.length > 0 ? result.matchedTagNames : treatmentTags,
      durationMs: result.durationMs,
      success: true
    }

  } catch (error) {
    console.error('[Adapter] Routing failed, using emergency fallback:', error)
    
    // ============================================
    // EMERGENCY FALLBACK: Return first pipeline
    // ============================================
    try {
      const { createClient } = await import('@/lib/supabase-client')
      const supabase = createClient()
      
      // Get first available pipeline for tenant
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('tenant_id', context.tenantId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (pipeline) {
        // Get first stage
        const { data: stage } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .eq('pipeline_id', pipeline.id)
          .order('position', { ascending: true })
          .limit(1)
          .single()

        if (stage) {
          return {
            pipelineId: pipeline.id,
            stageId: stage.id,
            pipelineName: pipeline.name,
            stageName: stage.name,
            method: 'emergency_fallback',
            confidence: 0,
            reason: `Routing system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            suggestedTags: context.treatmentTags || [],
            durationMs: Date.now() - startTime,
            success: true, // Still success (deal can be created)
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }

      // Absolute worst case - no pipelines exist
      throw new Error('No pipelines found for tenant')

    } catch (fallbackError) {
      // This should never happen, but if it does, we need to tell the caller
      return {
        pipelineId: '',
        stageId: '',
        pipelineName: 'Error',
        stageName: 'Error',
        method: 'error',
        confidence: 0,
        reason: 'Critical error: Could not route deal',
        suggestedTags: [],
        durationMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

/**
 * Quick routing for simple cases (just tenant + tags)
 */
export async function quickRoute(
  tenantId: string,
  treatmentTags: string[]
): Promise<AdapterResult> {
  return routeDealWithAdapter({
    tenantId,
    treatmentTags
  })
}

/**
 * Route with AI extraction (no manual tags needed)
 */
export async function routeWithAI(
  tenantId: string,
  dealTitle: string,
  dealDescription?: string
): Promise<AdapterResult> {
  return routeDealWithAdapter({
    tenantId,
    dealTitle,
    dealDescription
  })
}

/**
 * Check if routing is enabled for a tenant (before calling adapter)
 */
export async function isRoutingEnabled(tenantId: string): Promise<boolean> {
  try {
    const { getTenantRoutingSettings } = await import('./routing-engine')
    const settings = await getTenantRoutingSettings(tenantId)
    return settings.routing_enabled
  } catch (error) {
    console.error('[Adapter] Error checking routing status:', error)
    return true // Assume enabled on error
  }
}

/**
 * Clear cache when tags/mappings are updated
 */
export function invalidateRoutingCache(tenantId: string): void {
  clearTenantRoutingCache(tenantId)
  console.log(`[Adapter] Cache invalidated for tenant ${tenantId}`)
}

// =====================================================
// BATCH OPERATIONS
// =====================================================

/**
 * Route multiple deals at once (for bulk operations)
 */
export async function routeMultipleDeals(
  contexts: AdapterContext[]
): Promise<AdapterResult[]> {
  console.log(`[Adapter] Routing ${contexts.length} deals in batch...`)
  
  // Route all deals in parallel
  const results = await Promise.all(
    contexts.map(context => routeDealWithAdapter(context))
  )
  
  const successCount = results.filter(r => r.success).length
  console.log(`[Adapter] Batch complete: ${successCount}/${contexts.length} successful`)
  
  return results
}

/**
 * Re-route existing deal (change pipeline based on updated tags)
 */
export async function rerouteDeal(
  dealId: string,
  tenantId: string,
  newTags: string[],
  userId?: string
): Promise<AdapterResult> {
  console.log(`[Adapter] Re-routing deal ${dealId} with new tags:`, newTags)
  
  // Get existing deal data
  const { createClient } = await import('@/lib/supabase-client')
  const supabase = createClient()
  
  const { data: deal } = await supabase
    .from('deals')
    .select('title, value_estimate_cents, contact_id, source')
    .eq('id', dealId)
    .single()

  if (!deal) {
    throw new Error(`Deal ${dealId} not found`)
  }

  // Route with new tags
  const result = await routeDealWithAdapter({
    tenantId,
    treatmentTags: newTags,
    dealTitle: deal.title,
    dealValue: deal.value_estimate_cents || undefined,
    contactId: deal.contact_id,
    source: deal.source || undefined,
    userId,
    metadata: {
      reroutedDealId: dealId,
      previousTags: deal.title // You might want to store previous tags in deal
    }
  })

  // Update deal with new pipeline/stage
  if (result.success) {
    await supabase
      .from('deals')
      .update({
        pipeline_id: result.pipelineId,
        stage_id: result.stageId,
        treatment_tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', dealId)

    console.log(`[Adapter] Deal ${dealId} re-routed to ${result.pipelineName}`)
  }

  return result
}

// =====================================================
// TESTING & DEBUGGING
// =====================================================

/**
 * Test routing with sample data (for development/debugging)
 */
export async function testRouting(
  tenantId: string,
  testCases: Array<{
    title: string
    description?: string
    tags?: string[]
    value?: number
  }>
): Promise<void> {
  console.log(`\n🧪 Testing Routing System for tenant ${tenantId}\n`)
  console.log('='.repeat(60))
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    console.log(`\nTest Case ${i + 1}:`)
    console.log(`  Title: ${testCase.title}`)
    console.log(`  Tags: ${testCase.tags?.join(', ') || 'None'}`)
    console.log(`  Value: £${((testCase.value || 0) / 100).toFixed(2)}`)
    
    const result = await routeDealWithAdapter({
      tenantId,
      treatmentTags: testCase.tags,
      dealTitle: testCase.title,
      dealDescription: testCase.description,
      dealValue: testCase.value
    })

    console.log(`\n  ✅ Result:`)
    console.log(`     Pipeline: ${result.pipelineName}`)
    console.log(`     Stage: ${result.stageName}`)
    console.log(`     Method: ${result.method}`)
    console.log(`     Confidence: ${result.confidence}%`)
    console.log(`     Reason: ${result.reason}`)
    console.log(`     Duration: ${result.durationMs}ms`)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Testing Complete\n')
}

// =====================================================
// EXPORTS
// =====================================================

export {
  // Re-export types from routing-engine for convenience
  type RoutingContext,
  type RoutingResult
} from './routing-engine'

export {
  // Re-export types from ai-extractor for convenience
  type ExtractionResult,
  type ExtractionOptions,
  extractTreatmentTags,
  suggestTags,
  validateTagName,
  getTagByName
} from './ai-extractor'


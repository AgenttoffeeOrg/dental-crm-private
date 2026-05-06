// Phase 2a.5: removed quickRouteDeal/quickRoute aliases. Use routeDealWithAdapter({...}) only.
// History: positional-arg signature on the old aliases caused silent routing failure
// for ~3 months across 7 call sites. See quick_route_deal_bug_confirmation.md.

/**
 * =====================================================
 * TREATMENT TAG ROUTING SYSTEM - INDEX
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 3 - Core Routing Engine
 * =====================================================
 *
 * MAIN EXPORTS:
 * Clean, organized exports for the entire routing system
 *
 * USAGE:
 * ```typescript
 * // Simple usage - just import the adapter
 * import { routeDealWithAdapter } from '@/lib/treatment-routing'
 *
 * const routing = await routeDealWithAdapter({
 *   tenantId: 'uuid',
 *   treatmentTags: ['dental_implant'],
 *   dealTitle: 'Crown for John',
 *   dealValue: 500000
 * })
 * ```
 *
 * ADVANCED USAGE:
 * ```typescript
 * // Import specific functions for advanced use cases
 * import {
 *   routeDealToPipeline,
 *   extractTreatmentTags,
 *   getTreatmentTags,
 *   clearRoutingCache
 * } from '@/lib/treatment-routing'
 * ```
 *
 * =====================================================
 */

// =====================================================
// ADAPTER (MAIN ENTRY POINT - USE THIS!)
// =====================================================

export {
  // Main function - use this for all deal creation
  routeDealWithAdapter,

  // Convenience functions
  routeWithAI,
  isRoutingEnabled,
  invalidateRoutingCache,

  // Batch operations
  routeMultipleDeals,
  rerouteDeal,

  // Testing
  testRouting,

  // Types
  type AdapterContext,
  type AdapterResult
} from './adapter'

// =====================================================
// ROUTING ENGINE (ADVANCED - FOR CUSTOM INTEGRATIONS)
// =====================================================

export {
  // Core routing function
  routeDealToPipeline,
  
  // Helper functions
  getTenantRoutingSettings,
  getTreatmentTags,
  getPipelineMappings,
  getOrCreateUnsortedPipeline,
  logRoutingDecision,
  
  // Cache management
  clearTenantRoutingCache,
  clearRoutingCache,
  
  // Types
  type RoutingContext,
  type RoutingResult
} from './routing-engine'

// =====================================================
// AI EXTRACTOR (FOR TAG EXTRACTION FROM TEXT)
// =====================================================

export {
  // Main extraction function
  extractTreatmentTags,
  
  // Utility functions
  suggestTags,
  validateTagName,
  getTagByName,
  
  // Types
  type ExtractionResult,
  type ExtractionOptions
} from './ai-extractor'

// =====================================================
// RE-EXPORTS FROM DEAL-CATEGORIZATION (FOR COMPATIBILITY)
// =====================================================

export {
  categorizeDeal,
  getTreatmentCategory,
  isHighValue,
  isEmergency,
  autoTagDeal,
  type CategoryResult,
  type TreatmentTagConfig
} from '../deal-categorization'


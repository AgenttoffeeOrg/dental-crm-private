/**
 * =====================================================
 * FEATURE FLAGS CONFIGURATION
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 17 - Deployment & Monitoring
 * =====================================================
 * 
 * PURPOSE:
 * Feature flag system to safely roll out the Universal
 * Treatment Tag Routing System with zero risk.
 * 
 * DEFAULT STATE: ALL FLAGS OFF
 * 
 * FLAGS:
 * - ENABLE_TREATMENT_ROUTING: Master switch for routing system
 * - ENABLE_ROUTING_UI: Show routing settings UI
 * - ENABLE_ROUTING_ANALYTICS: Show routing analytics
 * - ENABLE_AUTO_TAG_EXTRACTION: AI-powered tag extraction
 * - ENABLE_BULK_REROUTING: Bulk operations panel
 * 
 * =====================================================
 */

export interface FeatureFlags {
  // Master switch - must be ON for any routing features
  ENABLE_TREATMENT_ROUTING: boolean
  
  // UI visibility flags
  ENABLE_ROUTING_UI: boolean
  ENABLE_ROUTING_ANALYTICS: boolean
  
  // Functionality flags
  ENABLE_AUTO_TAG_EXTRACTION: boolean
  ENABLE_BULK_REROUTING: boolean
  
  // Integration flags
  ENABLE_FORM_ROUTING: boolean
  ENABLE_PMS_ROUTING: boolean
  ENABLE_WEBHOOK_ROUTING: boolean
  
  // Advanced features
  ENABLE_AI_SUGGESTIONS: boolean
  ENABLE_ROUTING_EVENTS: boolean
}

// =====================================================
// DEFAULT CONFIGURATION (ALL OFF)
// =====================================================

const DEFAULT_FLAGS: FeatureFlags = {
  ENABLE_TREATMENT_ROUTING: false,
  ENABLE_ROUTING_UI: false,
  ENABLE_ROUTING_ANALYTICS: false,
  ENABLE_AUTO_TAG_EXTRACTION: false,
  ENABLE_BULK_REROUTING: false,
  ENABLE_FORM_ROUTING: false,
  ENABLE_PMS_ROUTING: false,
  ENABLE_WEBHOOK_ROUTING: false,
  ENABLE_AI_SUGGESTIONS: false,
  ENABLE_ROUTING_EVENTS: false
}

// =====================================================
// ENVIRONMENT-BASED CONFIGURATION
// =====================================================

function getEnvironmentFlags(): FeatureFlags {
  const env = process.env.NODE_ENV
  
  switch (env) {
    case 'development':
      // Development: All flags ON for testing
      return {
        ENABLE_TREATMENT_ROUTING: true,
        ENABLE_ROUTING_UI: true,
        ENABLE_ROUTING_ANALYTICS: true,
        ENABLE_AUTO_TAG_EXTRACTION: true,
        ENABLE_BULK_REROUTING: true,
        ENABLE_FORM_ROUTING: true,
        ENABLE_PMS_ROUTING: true,
        ENABLE_WEBHOOK_ROUTING: true,
        ENABLE_AI_SUGGESTIONS: true,
        ENABLE_ROUTING_EVENTS: true
      }
    
    case 'staging':
      // Staging: All flags ON for testing
      return {
        ENABLE_TREATMENT_ROUTING: true,
        ENABLE_ROUTING_UI: true,
        ENABLE_ROUTING_ANALYTICS: true,
        ENABLE_AUTO_TAG_EXTRACTION: true,
        ENABLE_BULK_REROUTING: true,
        ENABLE_FORM_ROUTING: true,
        ENABLE_PMS_ROUTING: true,
        ENABLE_WEBHOOK_ROUTING: true,
        ENABLE_AI_SUGGESTIONS: true,
        ENABLE_ROUTING_EVENTS: true
      }
    
    case 'production':
    default:
      // Production: ALL FLAGS OFF BY DEFAULT
      // Flags can be enabled via database or environment variables
      return DEFAULT_FLAGS
  }
}

// =====================================================
// DATABASE-DRIVEN FEATURE FLAGS (Per Tenant)
// =====================================================

interface TenantFeatureFlags extends FeatureFlags {
  tenant_id: string
  enabled_at?: string
  enabled_by?: string
}

export async function getTenantFeatureFlags(
  tenantId: string
): Promise<FeatureFlags> {
  // In production, check database for tenant-specific flags
  if (process.env.NODE_ENV === 'production') {
    try {
      const { createClient } = await import('@/lib/supabase-client')
      const supabase = createClient()
      
      const { data: flags, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('feature_category', 'treatment_routing')
        .single()
      
      if (!error && flags) {
        return {
          ENABLE_TREATMENT_ROUTING: flags.enabled ?? false,
          ENABLE_ROUTING_UI: flags.show_ui ?? false,
          ENABLE_ROUTING_ANALYTICS: flags.show_analytics ?? false,
          ENABLE_AUTO_TAG_EXTRACTION: flags.auto_extraction ?? false,
          ENABLE_BULK_REROUTING: flags.bulk_operations ?? false,
          ENABLE_FORM_ROUTING: flags.form_routing ?? false,
          ENABLE_PMS_ROUTING: flags.pms_routing ?? false,
          ENABLE_WEBHOOK_ROUTING: flags.webhook_routing ?? false,
          ENABLE_AI_SUGGESTIONS: flags.ai_suggestions ?? false,
          ENABLE_ROUTING_EVENTS: flags.emit_events ?? false
        }
      }
    } catch (error) {
      console.error('[FeatureFlags] Error loading tenant flags:', error)
    }
  }
  
  // Fallback to environment-based flags
  return getEnvironmentFlags()
}

// =====================================================
// ENVIRONMENT VARIABLE OVERRIDES
// =====================================================

export function getFeatureFlags(): FeatureFlags {
  const baseFlags = getEnvironmentFlags()
  
  // Allow environment variable overrides
  return {
    ENABLE_TREATMENT_ROUTING: 
      process.env.NEXT_PUBLIC_ENABLE_TREATMENT_ROUTING === 'true' 
      || baseFlags.ENABLE_TREATMENT_ROUTING,
    
    ENABLE_ROUTING_UI: 
      process.env.NEXT_PUBLIC_ENABLE_ROUTING_UI === 'true' 
      || baseFlags.ENABLE_ROUTING_UI,
    
    ENABLE_ROUTING_ANALYTICS: 
      process.env.NEXT_PUBLIC_ENABLE_ROUTING_ANALYTICS === 'true' 
      || baseFlags.ENABLE_ROUTING_ANALYTICS,
    
    ENABLE_AUTO_TAG_EXTRACTION: 
      process.env.ENABLE_AUTO_TAG_EXTRACTION === 'true' 
      || baseFlags.ENABLE_AUTO_TAG_EXTRACTION,
    
    ENABLE_BULK_REROUTING: 
      process.env.ENABLE_BULK_REROUTING === 'true' 
      || baseFlags.ENABLE_BULK_REROUTING,
    
    ENABLE_FORM_ROUTING: 
      process.env.ENABLE_FORM_ROUTING === 'true' 
      || baseFlags.ENABLE_FORM_ROUTING,
    
    ENABLE_PMS_ROUTING: 
      process.env.ENABLE_PMS_ROUTING === 'true' 
      || baseFlags.ENABLE_PMS_ROUTING,
    
    ENABLE_WEBHOOK_ROUTING: 
      process.env.ENABLE_WEBHOOK_ROUTING === 'true' 
      || baseFlags.ENABLE_WEBHOOK_ROUTING,
    
    ENABLE_AI_SUGGESTIONS: 
      process.env.ENABLE_AI_SUGGESTIONS === 'true' 
      || baseFlags.ENABLE_AI_SUGGESTIONS,
    
    ENABLE_ROUTING_EVENTS: 
      process.env.ENABLE_ROUTING_EVENTS === 'true' 
      || baseFlags.ENABLE_ROUTING_EVENTS
  }
}

// =====================================================
// REACT HOOK FOR COMPONENTS
// =====================================================

import { useEffect, useState } from 'react'

export function useFeatureFlags(tenantId?: string): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS)
  
  useEffect(() => {
    async function loadFlags() {
      if (tenantId) {
        // Load tenant-specific flags
        const tenantFlags = await getTenantFeatureFlags(tenantId)
        setFlags(tenantFlags)
      } else {
        // Load environment flags
        const envFlags = getFeatureFlags()
        setFlags(envFlags)
      }
    }
    
    loadFlags()
  }, [tenantId])
  
  return flags
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function isRoutingEnabled(tenantId?: string): Promise<boolean> {
  if (!tenantId) {
    return Promise.resolve(getFeatureFlags().ENABLE_TREATMENT_ROUTING)
  }
  return getTenantFeatureFlags(tenantId).then(flags => flags.ENABLE_TREATMENT_ROUTING)
}

export function shouldShowRoutingUI(tenantId?: string): Promise<boolean> {
  if (!tenantId) {
    return Promise.resolve(getFeatureFlags().ENABLE_ROUTING_UI)
  }
  return getTenantFeatureFlags(tenantId).then(flags => 
    flags.ENABLE_TREATMENT_ROUTING && flags.ENABLE_ROUTING_UI
  )
}

export function shouldShowRoutingAnalytics(tenantId?: string): Promise<boolean> {
  if (!tenantId) {
    return Promise.resolve(getFeatureFlags().ENABLE_ROUTING_ANALYTICS)
  }
  return getTenantFeatureFlags(tenantId).then(flags => 
    flags.ENABLE_TREATMENT_ROUTING && flags.ENABLE_ROUTING_ANALYTICS
  )
}

// =====================================================
// GRADUAL ROLLOUT STRATEGY
// =====================================================

export const ROLLOUT_PHASES = {
  PHASE_0: {
    name: 'Dark Launch',
    description: 'Code deployed but all flags OFF',
    flags: DEFAULT_FLAGS
  },
  
  PHASE_1: {
    name: 'Internal Testing',
    description: 'Enable for internal test tenant only',
    flags: {
      ...DEFAULT_FLAGS,
      ENABLE_TREATMENT_ROUTING: true,
      ENABLE_ROUTING_UI: true,
      ENABLE_ROUTING_ANALYTICS: true
    },
    tenants: ['internal-test-tenant-uuid'] // Add your test tenant ID
  },
  
  PHASE_2: {
    name: 'Beta Testing',
    description: 'Enable for 5 beta customers',
    flags: {
      ...DEFAULT_FLAGS,
      ENABLE_TREATMENT_ROUTING: true,
      ENABLE_ROUTING_UI: true,
      ENABLE_ROUTING_ANALYTICS: true,
      ENABLE_AUTO_TAG_EXTRACTION: true,
      ENABLE_FORM_ROUTING: true
    },
    tenants: [] // Add beta tenant IDs
  },
  
  PHASE_3: {
    name: 'Limited Release',
    description: 'Enable for 10% of customers',
    flags: {
      ...DEFAULT_FLAGS,
      ENABLE_TREATMENT_ROUTING: true,
      ENABLE_ROUTING_UI: true,
      ENABLE_ROUTING_ANALYTICS: true,
      ENABLE_AUTO_TAG_EXTRACTION: true,
      ENABLE_BULK_REROUTING: true,
      ENABLE_FORM_ROUTING: true,
      ENABLE_PMS_ROUTING: true
    },
    percentage: 10
  },
  
  PHASE_4: {
    name: 'General Availability',
    description: 'Enable for all customers',
    flags: {
      ENABLE_TREATMENT_ROUTING: true,
      ENABLE_ROUTING_UI: true,
      ENABLE_ROUTING_ANALYTICS: true,
      ENABLE_AUTO_TAG_EXTRACTION: true,
      ENABLE_BULK_REROUTING: true,
      ENABLE_FORM_ROUTING: true,
      ENABLE_PMS_ROUTING: true,
      ENABLE_WEBHOOK_ROUTING: true,
      ENABLE_AI_SUGGESTIONS: true,
      ENABLE_ROUTING_EVENTS: true
    },
    percentage: 100
  }
}

// =====================================================
// USAGE EXAMPLES
// =====================================================

/*
// Example 1: Check if routing enabled in component
import { useFeatureFlags } from '@/lib/feature-flags'

function MyComponent() {
  const flags = useFeatureFlags(currentTenant.id)
  
  if (!flags.ENABLE_TREATMENT_ROUTING) {
    return null // Hide feature
  }
  
  return <TreatmentRoutingUI />
}

// Example 2: Conditional routing in backend
import { isRoutingEnabled } from '@/lib/feature-flags'

async function createDeal(dealData) {
  const routingEnabled = await isRoutingEnabled(dealData.tenant_id)
  
  if (routingEnabled) {
    // Use new routing system
    const result = await routeDealWithAdapter(dealData)
    return createDealWithRouting(result)
  } else {
    // Use legacy system
    return createDealLegacy(dealData)
  }
}

// Example 3: Show/hide UI based on flag
import { shouldShowRoutingUI } from '@/lib/feature-flags'

function SettingsPage() {
  const [showRouting, setShowRouting] = useState(false)
  
  useEffect(() => {
    shouldShowRoutingUI(currentTenant.id).then(setShowRouting)
  }, [])
  
  return (
    <div>
      <GeneralSettings />
      {showRouting && <TreatmentRoutingSettings />}
    </div>
  )
}
*/


# 🛠️ Developer Guide: Routing Engine API

**Version:** 1.0.0  
**Last Updated:** October 19, 2025  
**Audience:** Software Engineers, Technical Integrators  

---

## 🎯 Overview

The Universal Treatment Tag Routing System provides a powerful, flexible API for automatically routing deals to appropriate pipelines based on treatment tags. This guide covers the core API, integration patterns, and advanced usage.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core API Reference](#core-api-reference)
3. [Integration Patterns](#integration-patterns)
4. [Type Definitions](#type-definitions)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)
7. [Testing](#testing)
8. [Migration Guide](#migration-guide)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────┐
│                   Entry Points                       │
│  (Manual Forms, Webhooks, PMS, Marketing, API)     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│                   Adapter Layer                      │
│              (Simplified Interface)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│                  Routing Engine                      │
│       (Core Logic: 4 Routing Methods)               │
│   1. User Override                                   │
│   2. Tag Mapping                                     │
│   3. AI Keyword Matching                            │
│   4. Unsorted Fallback                              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│                 AI Tag Extractor                     │
│     (Intelligent Tag Extraction from Text)          │
└─────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│                    Database                          │
│  (treatment_tags, mappings, routing_logs, deals)   │
└─────────────────────────────────────────────────────┘
```

### File Structure

```
src/lib/treatment-routing/
├── index.ts                 # Public exports
├── adapter.ts               # Simplified integration layer
├── routing-engine.ts        # Core routing logic
├── ai-extractor.ts          # AI-powered tag extraction
└── types.ts                 # TypeScript definitions

src/components/treatment-routing/
├── treatment-tags-settings.tsx
├── pipeline-mapping-settings.tsx
├── routing-analytics.tsx
├── bulk-operations-panel.tsx
├── migration-wizard.tsx
└── deal-audit-panel.tsx

src/app/api/treatment-routing/
└── bulk-reroute/
    └── route.ts             # Bulk operations API
```

---

## Core API Reference

### 1. High-Level Adapter API (Recommended)

#### `routeDealWithAdapter()`

**Purpose:** Simplified routing for most use cases

**Location:** `src/lib/treatment-routing/adapter.ts`

**Signature:**
```typescript
async function routeDealWithAdapter(
  context: AdapterRoutingContext
): Promise<AdapterRoutingResult>
```

**Parameters:**
```typescript
interface AdapterRoutingContext {
  // Required
  tenantId: string              // Organization UUID
  contactId: string             // Contact/patient UUID
  dealTitle: string             // Deal title (for AI extraction)
  
  // Optional - Treatment Tags
  treatmentTags?: string[]      // Explicit tag names
  dealDescription?: string      // Additional context for AI
  
  // Optional - User Override
  userOverridePipeline?: string // Force specific pipeline
  userOverrideStage?: string    // Force specific stage
  
  // Optional - Metadata
  userId?: string               // Who created the deal
  source?: string               // 'manual' | 'form' | 'pms_webhook' | 'api'
  metadata?: Record<string, any> // Additional context
}
```

**Returns:**
```typescript
interface AdapterRoutingResult {
  success: boolean
  pipelineId: string            // Target pipeline UUID
  stageId: string               // Target stage UUID
  treatmentTags: string[]       // Final tag names
  routingMethod: RoutingMethod  // How it was routed
  confidence: number            // 0-100
  reason: string                // Human-readable explanation
  routingLogId?: string         // Log UUID for traceability
  error?: string                // Error message if failed
}

type RoutingMethod =
  | 'user_override'
  | 'tag_mapping'
  | 'ai_keyword'
  | 'unsorted_fallback'
  | 'routing_disabled'
```

**Example Usage:**
```typescript
import { routeDealWithAdapter } from '@/lib/treatment-routing'

// Example 1: Manual Deal Creation
const result = await routeDealWithAdapter({
  tenantId: '123e4567-e89b-12d3-a456-426614174000',
  contactId: '123e4567-e89b-12d3-a456-426614174001',
  dealTitle: 'Patient needs dental implants',
  dealDescription: 'Full arch reconstruction required',
  treatmentTags: ['dental_implant', 'bone_graft'],
  userId: '123e4567-e89b-12d3-a456-426614174002',
  source: 'manual'
})

if (result.success) {
  console.log(`Routed to pipeline: ${result.pipelineId}`)
  console.log(`Method: ${result.routingMethod}`)
  console.log(`Confidence: ${result.confidence}%`)
  
  // Create deal with routing result
  const deal = await createDeal({
    contact_id: contactId,
    pipeline_id: result.pipelineId,
    stage_id: result.stageId,
    treatment_tags: result.treatmentTags,
    // ... other fields
  })
}
```

```typescript
// Example 2: Form Submission (No Explicit Tags)
const result = await routeDealWithAdapter({
  tenantId: '123e4567-e89b-12d3-a456-426614174000',
  contactId: '123e4567-e89b-12d3-a456-426614174001',
  dealTitle: 'Inquiry about teeth whitening',
  dealDescription: 'Patient wants brighter smile for wedding',
  source: 'marketing_form',
  metadata: {
    formId: 'wedding-special-form',
    campaign: 'summer-2025'
  }
})

// AI will extract 'whitening' tag automatically
console.log(result.treatmentTags) // ['whitening']
```

```typescript
// Example 3: User Override
const result = await routeDealWithAdapter({
  tenantId: '123e4567-e89b-12d3-a456-426614174000',
  contactId: '123e4567-e89b-12d3-a456-426614174001',
  dealTitle: 'Complex case',
  userOverridePipeline: 'specific-pipeline-uuid',
  userOverrideStage: 'specific-stage-uuid',
  userId: '123e4567-e89b-12d3-a456-426614174002',
  source: 'manual'
})

// Will respect user choice
console.log(result.routingMethod) // 'user_override'
console.log(result.confidence) // 100
```

---

### 2. Low-Level Routing Engine (Advanced)

#### `routeDealToPipeline()`

**Purpose:** Fine-grained control over routing logic

**Location:** `src/lib/treatment-routing/routing-engine.ts`

**Signature:**
```typescript
async function routeDealToPipeline(
  context: RoutingContext
): Promise<RoutingResult>
```

**Parameters:**
```typescript
interface RoutingContext {
  // Required
  tenantId: string
  treatmentTags: string[]       // Tag names
  dealTitle: string
  contactId: string
  
  // Optional
  dealDescription?: string
  existingPipelineId?: string   // User override pipeline
  existingStageId?: string      // User override stage
  userId?: string
  locationId?: string           // Multi-location
  metadata?: Record<string, any>
}
```

**Returns:**
```typescript
interface RoutingResult {
  pipelineId: string
  stageId: string
  pipelineName: string
  stageName: string
  routingMethod: RoutingMethod
  matchedTagNames: string[]
  confidence: number
  reason: string
  routingLogId?: string
  appliedMapping?: {
    id: string
    priority: number
    tagName: string
  }
}
```

**Example Usage:**
```typescript
import { routeDealToPipeline } from '@/lib/treatment-routing/routing-engine'

const result = await routeDealToPipeline({
  tenantId: '123e4567-e89b-12d3-a456-426614174000',
  treatmentTags: ['dental_implant', 'bone_graft'],
  dealTitle: 'Patient consultation',
  contactId: '123e4567-e89b-12d3-a456-426614174001',
  userId: '123e4567-e89b-12d3-a456-426614174002',
  locationId: 'downtown-office-uuid'
})

console.log(result.pipelineName) // "High-Value Procedures"
console.log(result.matchedTagNames) // ['dental_implant']
console.log(result.confidence) // 95
```

---

### 3. AI Tag Extraction

#### `extractTreatmentTags()`

**Purpose:** Extract treatment tags from unstructured text

**Location:** `src/lib/treatment-routing/ai-extractor.ts`

**Signature:**
```typescript
async function extractTreatmentTags(
  dealTitle: string,
  dealDescription: string,
  tenantId: string
): Promise<TagExtractionResult>
```

**Returns:**
```typescript
interface TagExtractionResult {
  extractedTags: string[]       // Tag names found
  matchedKeywords: string[]     // Keywords that matched
  confidence: number            // 0-100
  method: 'exact' | 'keyword' | 'fuzzy' | 'none'
  debugInfo?: {
    totalTagsChecked: number
    processingTime: number
    searchText: string
  }
}
```

**Example Usage:**
```typescript
import { extractTreatmentTags } from '@/lib/treatment-routing/ai-extractor'

const result = await extractTreatmentTags(
  'Patient needs implants',
  'Full consultation for dental implant procedure with bone grafting',
  '123e4567-e89b-12d3-a456-426614174000'
)

console.log(result.extractedTags) // ['dental_implant', 'bone_graft']
console.log(result.matchedKeywords) // ['implants', 'bone grafting']
console.log(result.confidence) // 85
```

---

### 4. Bulk Operations API

#### `POST /api/treatment-routing/bulk-reroute`

**Purpose:** Re-route multiple deals in batch

**Request Body:**
```typescript
{
  dealIds: string[]             // UUIDs of deals to re-route
  filters?: {
    pipelineId?: string         // Filter by pipeline
    stageId?: string            // Filter by stage
    treatmentTags?: string[]    // Filter by tags
    dateRange?: {
      start: string             // ISO date
      end: string               // ISO date
    }
  }
  updateTags?: boolean          // Re-extract tags before routing
  notifyOwners?: boolean        // Send notifications
  dryRun?: boolean             // Preview without changes
}
```

**Response:**
```typescript
{
  success: boolean
  summary: {
    totalDeals: number
    successful: number
    failed: number
    unchanged: number
  }
  details: Array<{
    dealId: string
    dealTitle: string
    oldPipelineId: string
    newPipelineId: string
    routingMethod: RoutingMethod
    confidence: number
    error?: string
  }>
  dryRun: boolean
}
```

**Example Usage:**
```typescript
// Dry-run preview
const response = await fetch('/api/treatment-routing/bulk-reroute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dealIds: ['deal-uuid-1', 'deal-uuid-2', 'deal-uuid-3'],
    dryRun: true
  })
})

const preview = await response.json()
console.log(`Would re-route ${preview.summary.successful} deals`)

// Actual execution
const response2 = await fetch('/api/treatment-routing/bulk-reroute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dealIds: ['deal-uuid-1', 'deal-uuid-2', 'deal-uuid-3'],
    updateTags: true,
    notifyOwners: true,
    dryRun: false
  })
})
```

---

## Integration Patterns

### Pattern 1: Manual Deal Creation

```typescript
// src/components/deals/create-deal-slide-over.tsx

import { routeDealWithAdapter } from '@/lib/treatment-routing'

async function handleSubmit(formData) {
  // 1. Route the deal
  const routingResult = await routeDealWithAdapter({
    tenantId: currentTenant.id,
    contactId: formData.contactId,
    dealTitle: formData.title,
    dealDescription: formData.description,
    treatmentTags: selectedTagIds.map(id => tagNameMap[id]),
    userOverridePipeline: formData.pipelineId, // If user selected manually
    userOverrideStage: formData.stageId,
    userId: currentUser.id,
    source: 'manual'
  })
  
  if (!routingResult.success) {
    toast.error('Routing failed')
    return
  }
  
  // 2. Create deal with routed pipeline/stage
  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      tenant_id: currentTenant.id,
      contact_id: formData.contactId,
      title: formData.title,
      description: formData.description,
      estimated_value: formData.estimatedValue,
      pipeline_id: routingResult.pipelineId,
      stage_id: routingResult.stageId,
      treatment_tags: routingResult.treatmentTags,
      owner_id: formData.ownerId,
      custom_fields: {
        routing_log_id: routingResult.routingLogId,
        routing_method: routingResult.routingMethod,
        routing_confidence: routingResult.confidence
      }
    })
    .select()
    .single()
  
  if (error) throw error
  
  toast.success(`Deal created in ${routingResult.pipelineName}`)
  onSuccess(deal)
}
```

---

### Pattern 2: Marketing Form Submission

```typescript
// src/lib/marketing/form-processor.ts

import { extractTreatmentTags, quickRouteDeal } from '@/lib/treatment-routing'

async function processFormSubmission(submission) {
  // 1. Extract tags from form text
  let treatmentTags: string[] = []
  
  if (submission.payload.treatment_tags) {
    // Explicit tags from form
    treatmentTags = submission.payload.treatment_tags
  } else {
    // AI extraction from form text
    const formText = `
      ${submission.payload.message || ''}
      ${submission.payload.inquiry_type || ''}
      ${submission.payload.service_interest || ''}
    `.trim()
    
    const extraction = await extractTreatmentTags(
      submission.payload.subject || 'Form Inquiry',
      formText,
      submission.tenant_id
    )
    
    treatmentTags = extraction.extractedTags
  }
  
  // 2. Route based on extracted tags
  const routingResult = await quickRouteDeal({
    tenantId: submission.tenant_id,
    contactId: contact.id,
    dealTitle: submission.payload.subject || 'Form Inquiry',
    dealDescription: submission.payload.message,
    treatmentTags,
    source: 'marketing_form',
    metadata: {
      formId: submission.form_id,
      campaignId: submission.campaign_id,
      submissionId: submission.id
    }
  })
  
  // 3. Create deal
  const deal = await createDeal({
    ...dealData,
    pipeline_id: routingResult.pipelineId,
    stage_id: routingResult.stageId,
    treatment_tags: routingResult.treatmentTags,
    marketing_source_id: submission.form_id,
    custom_fields: {
      routing_log_id: routingResult.routingLogId,
      form_payload: submission.payload
    }
  })
  
  return deal
}
```

---

### Pattern 3: PMS Webhook Integration

```typescript
// src/app/api/integrations/pms/webhooks/treatment-proposed/route.ts

import { extractTreatmentTags, quickRouteDeal } from '@/lib/treatment-routing'

async function handleTreatmentProposed(payload) {
  // 1. Try procedure code mapping
  let treatmentTags: string[] = []
  
  if (payload.procedure_codes?.length > 0) {
    const { data: mappings } = await supabase
      .from('pms_procedure_tag_mappings')
      .select('treatment_tag_name')
      .eq('tenant_id', tenantId)
      .in('procedure_code', payload.procedure_codes)
    
    treatmentTags = mappings?.map(m => m.treatment_tag_name) || []
  }
  
  // 2. Fallback to AI extraction
  if (treatmentTags.length === 0) {
    const extraction = await extractTreatmentTags(
      payload.treatment_type || 'PMS Treatment',
      payload.description || '',
      tenantId
    )
    treatmentTags = extraction.extractedTags
  }
  
  // 3. Route deal
  const routingResult = await quickRouteDeal({
    tenantId,
    contactId: contact.id,
    dealTitle: `${payload.treatment_type} - ${contact.full_name}`,
    dealDescription: payload.description,
    treatmentTags,
    source: 'pms_webhook',
    metadata: {
      pms_provider: payload.provider_name,
      pms_treatment_id: payload.treatment_id,
      procedure_codes: payload.procedure_codes
    }
  })
  
  // 4. Create deal
  const deal = await createDeal({
    ...dealData,
    pipeline_id: routingResult.pipelineId,
    stage_id: routingResult.stageId,
    treatment_tags: routingResult.treatmentTags
  })
  
  return deal
}
```

---

### Pattern 4: AI-Powered Routing (No Tags Provided)

```typescript
import { routeDealWithAdapter } from '@/lib/treatment-routing'

// Minimal context - AI does all the work
const result = await routeDealWithAdapter({
  tenantId: '123e4567-e89b-12d3-a456-426614174000',
  contactId: '123e4567-e89b-12d3-a456-426614174001',
  dealTitle: 'Patient called about missing tooth options',
  dealDescription: `
    Patient lost a tooth in accident. 
    Interested in permanent solution.
    Has good bone structure per X-ray.
    Budget is flexible for quality work.
  `,
  source: 'phone_call'
})

// AI will:
// 1. Extract tags: ['dental_implant', 'tooth_replacement']
// 2. Find best mapping: dental_implant → High-Value Pipeline
// 3. Route with confidence score
console.log(result.treatmentTags) // ['dental_implant']
console.log(result.pipelineName) // "High-Value Procedures"
console.log(result.confidence) // 82
```

---

## Type Definitions

### Complete TypeScript Types

```typescript
// src/lib/treatment-routing/types.ts

export interface TreatmentTag {
  id: string
  tenant_id: string
  name: string                  // Unique tag name
  display_name: string          // UI display
  keywords: string[]            // Matching keywords
  color: string                 // Hex color
  icon: string                  // Emoji
  description?: string
  location_id?: string          // Multi-location
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PipelineMapping {
  id: string
  tenant_id: string
  treatment_tag_id: string
  pipeline_id: string
  stage_id: string
  priority: number              // 1 = highest
  location_id?: string
  conditions?: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoutingLog {
  id: string
  tenant_id: string
  deal_id?: string
  contact_id: string
  treatment_tags: string[]
  routing_method: RoutingMethod
  target_pipeline_id: string
  target_stage_id: string
  confidence_score: number
  reason: string
  user_id?: string
  source?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface RoutingSettings {
  id: string
  tenant_id: string
  routing_enabled: boolean
  unsorted_pipeline_id: string
  default_stage_id: string
  auto_extract_tags: boolean
  min_confidence_threshold: number
  enable_ai_keywords: boolean
  created_at: string
  updated_at: string
}

export type RoutingMethod =
  | 'user_override'
  | 'tag_mapping'
  | 'ai_keyword'
  | 'unsorted_fallback'
  | 'routing_disabled'
  | 'manual_override'
  | 'fallback_manual'
  | 'fallback_error'
```

---

## Error Handling

### Common Errors

```typescript
try {
  const result = await routeDealWithAdapter(context)
  
  if (!result.success) {
    switch (result.error) {
      case 'TENANT_NOT_FOUND':
        // Tenant doesn't exist or is inactive
        break
      
      case 'ROUTING_DISABLED':
        // Routing is disabled for this tenant
        // Fall back to manual pipeline selection
        break
      
      case 'NO_UNSORTED_PIPELINE':
        // Unsorted pipeline not configured
        // Prompt admin to configure
        break
      
      case 'INVALID_PIPELINE':
        // Requested pipeline doesn't exist
        break
      
      case 'PERMISSION_DENIED':
        // User lacks permission
        break
      
      case 'DATABASE_ERROR':
        // Database connection or query failed
        // Retry with exponential backoff
        break
      
      default:
        // Unknown error
        console.error('Routing failed:', result.error)
    }
  }
} catch (error) {
  // Unexpected exception
  console.error('Fatal error:', error)
  // Implement fallback behavior
}
```

### Graceful Degradation

```typescript
async function createDealWithFallback(dealData) {
  try {
    // Attempt intelligent routing
    const result = await routeDealWithAdapter({
      tenantId: dealData.tenant_id,
      contactId: dealData.contact_id,
      dealTitle: dealData.title,
      treatmentTags: dealData.treatment_tags
    })
    
    if (result.success) {
      return createDeal({
        ...dealData,
        pipeline_id: result.pipelineId,
        stage_id: result.stageId
      })
    }
  } catch (error) {
    console.warn('Routing failed, using fallback:', error)
  }
  
  // Fallback: Use default pipeline
  const defaultPipeline = await getDefaultPipeline(dealData.tenant_id)
  
  return createDeal({
    ...dealData,
    pipeline_id: defaultPipeline.id,
    stage_id: defaultPipeline.stages[0].id
  })
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
import { LRUCache } from 'lru-cache'

// Cache routing settings per tenant
const settingsCache = new LRUCache<string, RoutingSettings>({
  max: 100,
  ttl: 1000 * 60 * 5 // 5 minutes
})

async function getRoutingSettings(tenantId: string) {
  let settings = settingsCache.get(tenantId)
  
  if (!settings) {
    settings = await fetchSettingsFromDB(tenantId)
    settingsCache.set(tenantId, settings)
  }
  
  return settings
}
```

### Batch Operations

```typescript
// Route multiple deals efficiently
async function routeMultipleDeals(contexts: RoutingContext[]) {
  const tenantId = contexts[0].tenantId
  
  // 1. Fetch all data once (not per deal)
  const [settings, tags, mappings] = await Promise.all([
    getRoutingSettings(tenantId),
    getTreatmentTags(tenantId),
    getPipelineMappings(tenantId)
  ])
  
  // 2. Route all deals
  const results = await Promise.all(
    contexts.map(context => 
      routeDealToPipeline({
        ...context,
        _cachedSettings: settings,
        _cachedTags: tags,
        _cachedMappings: mappings
      })
    )
  )
  
  return results
}
```

---

## Testing

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { routeDealToPipeline } from '@/lib/treatment-routing/routing-engine'

describe('Routing Engine', () => {
  it('should route via tag mapping', async () => {
    const result = await routeDealToPipeline({
      tenantId: 'test-tenant',
      treatmentTags: ['dental_implant'],
      dealTitle: 'Implant consultation',
      contactId: 'test-contact'
    })
    
    expect(result.routingMethod).toBe('tag_mapping')
    expect(result.pipelineId).toBeDefined()
    expect(result.confidence).toBeGreaterThan(80)
  })
})
```

### Integration Test Example

```typescript
describe('Deal Creation → Routing', () => {
  it('should create deal in correct pipeline', async () => {
    // 1. Route
    const routingResult = await routeDealWithAdapter({
      tenantId: testTenant.id,
      contactId: testContact.id,
      dealTitle: 'Patient needs implants',
      treatmentTags: ['dental_implant']
    })
    
    expect(routingResult.success).toBe(true)
    
    // 2. Create deal
    const deal = await createDeal({
      ...dealData,
      pipeline_id: routingResult.pipelineId,
      stage_id: routingResult.stageId
    })
    
    // 3. Verify
    const createdDeal = await getDeal(deal.id)
    expect(createdDeal.pipeline_id).toBe(routingResult.pipelineId)
    expect(createdDeal.treatment_tags).toContain('dental_implant')
  })
})
```

---

## Migration Guide

### Migrating from Legacy System

```typescript
// OLD: Hardcoded keyword matching
function oldCategorizeDeal(dealText: string) {
  if (dealText.includes('implant')) {
    return 'high-value-pipeline'
  }
  if (dealText.includes('crown')) {
    return 'standard-pipeline'
  }
  return 'general-pipeline'
}

// NEW: Universal routing system
import { routeDealWithAdapter } from '@/lib/treatment-routing'

async function newCategorizeDeal(dealText: string, tenantId: string, contactId: string) {
  const result = await routeDealWithAdapter({
    tenantId,
    contactId,
    dealTitle: dealText,
    source: 'migration'
  })
  
  return result.pipelineId
}
```

### Backward Compatibility

```typescript
// Support both old and new systems during migration
async function routeDealCompatible(context) {
  const tenant = await getTenant(context.tenantId)
  
  if (tenant.features.includes('universal_routing')) {
    // Use new system
    return routeDealWithAdapter(context)
  } else {
    // Use old system
    return oldRoutingLogic(context)
  }
}
```

---

## Need Help?

- 📧 **Email:** dev-support@dentalcrm.com
- 💬 **Slack:** #dev-routing-api
- 📚 **API Docs:** api.dentalcrm.com/docs
- 🐛 **Issues:** github.com/dentalcrm/issues

---

*Last Updated: October 19, 2025*  
*Version: 1.0.0*  
*© 2025 Dental CRM. All rights reserved.*


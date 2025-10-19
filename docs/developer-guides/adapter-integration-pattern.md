# 🛠️ Developer Guide: Adapter Integration Pattern

**Version:** 1.0.0  
**Last Updated:** October 19, 2025  
**Audience:** Software Engineers, Technical Integrators  

---

## 🎯 Overview

The Adapter Pattern is the recommended integration approach for the Universal Treatment Tag Routing System. It provides a clean, simplified interface that abstracts the complexity of the routing engine while maintaining flexibility and performance.

---

## 📋 Table of Contents

1. [Why Use the Adapter?](#why-use-the-adapter)
2. [Adapter Architecture](#adapter-architecture)
3. [Quick Start Guide](#quick-start-guide)
4. [Integration Examples](#integration-examples)
5. [Advanced Patterns](#advanced-patterns)
6. [Event System](#event-system)
7. [Performance Considerations](#performance-considerations)
8. [Best Practices](#best-practices)

---

## Why Use the Adapter?

### Problems the Adapter Solves

**Without Adapter (Direct Engine Access):**
```typescript
// ❌ Complex, tightly coupled, hard to maintain
import { routeDealToPipeline, getTreatmentTags, extractTreatmentTags } from '@/lib/treatment-routing/routing-engine'

async function createDeal(data) {
  // 1. Manually fetch settings
  const settings = await getRoutingSettings(data.tenantId)
  if (!settings.routing_enabled) {
    throw new Error('Routing disabled')
  }
  
  // 2. Extract tags yourself
  let tags = data.treatmentTags
  if (!tags || tags.length === 0) {
    const extraction = await extractTreatmentTags(
      data.title,
      data.description,
      data.tenantId
    )
    tags = extraction.extractedTags
  }
  
  // 3. Call engine with complex context
  const result = await routeDealToPipeline({
    tenantId: data.tenantId,
    treatmentTags: tags,
    dealTitle: data.title,
    dealDescription: data.description,
    contactId: data.contactId,
    existingPipelineId: data.pipelineId,
    existingStageId: data.stageId,
    userId: data.userId,
    metadata: {}
  })
  
  // 4. Handle errors manually
  if (!result.pipelineId) {
    // Fallback logic
  }
  
  // 5. Emit events manually
  await emitRoutingEvent(...)
  
  // 6. Create deal
  return insertDeal(...)
}
```

**With Adapter:**
```typescript
// ✅ Simple, clean, maintainable
import { routeDealWithAdapter } from '@/lib/treatment-routing'

async function createDeal(data) {
  const result = await routeDealWithAdapter({
    tenantId: data.tenantId,
    contactId: data.contactId,
    dealTitle: data.title,
    dealDescription: data.description,
    treatmentTags: data.treatmentTags,
    userOverridePipeline: data.pipelineId,
    userId: data.userId,
    source: 'manual'
  })
  
  if (!result.success) {
    throw new Error(result.error)
  }
  
  return insertDeal({
    ...data,
    pipeline_id: result.pipelineId,
    stage_id: result.stageId,
    treatment_tags: result.treatmentTags
  })
}
```

### Key Benefits

✅ **Simplified API** - One function call vs. many  
✅ **Automatic Tag Extraction** - AI extraction built-in  
✅ **Error Handling** - Graceful degradation included  
✅ **Event Emission** - Automatic DEAL.ROUTED events  
✅ **Logging** - Automatic routing log creation  
✅ **Type Safety** - Full TypeScript support  
✅ **Backward Compatible** - Works with legacy code  
✅ **Future-Proof** - Internal changes don't break integrations  

---

## Adapter Architecture

### Component Diagram

```
┌────────────────────────────────────────────────┐
│          Your Application Code                 │
│     (Forms, Webhooks, APIs, Integrations)     │
└──────────────────┬─────────────────────────────┘
                   │
                   │ Simple Interface
                   │
┌──────────────────▼─────────────────────────────┐
│              ADAPTER LAYER                      │
│  ┌──────────────────────────────────────────┐ │
│  │  1. Validate Input                       │ │
│  │  2. Extract Tags (if needed)             │ │
│  │  3. Call Routing Engine                  │ │
│  │  4. Handle Errors                        │ │
│  │  5. Emit Events                          │ │
│  │  6. Return Simplified Result             │ │
│  └──────────────────────────────────────────┘ │
└──────────────────┬─────────────────────────────┘
                   │
                   │ Complex Operations
                   │
┌──────────────────▼─────────────────────────────┐
│           ROUTING ENGINE                        │
│  - Settings Management                          │
│  - Tag Matching Logic                           │
│  - Pipeline Mapping                             │
│  - AI Keyword Matching                          │
│  - Fallback Handling                            │
└──────────────────┬─────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────┐
│              DATABASE                           │
│  - treatment_tags                               │
│  - treatment_tag_pipeline_mappings              │
│  - routing_logs                                 │
│  - routing_settings                             │
└─────────────────────────────────────────────────┘
```

### Data Flow

```
Input → Validation → Tag Extraction → Routing Engine → 
  → Logging → Event Emission → Output
```

---

## Quick Start Guide

### 1. Basic Installation

```typescript
// Import the adapter
import { routeDealWithAdapter } from '@/lib/treatment-routing'

// Or import everything
import * as routing from '@/lib/treatment-routing'
```

### 2. Minimum Viable Call

```typescript
const result = await routeDealWithAdapter({
  tenantId: '123e4567-e89b-12d3-a456-426614174000',
  contactId: '123e4567-e89b-12d3-a456-426614174001',
  dealTitle: 'Patient inquiry'
})

console.log(result.pipelineId) // Where deal should go
console.log(result.treatmentTags) // Extracted tags (if any)
```

### 3. Standard Usage

```typescript
const result = await routeDealWithAdapter({
  // Required
  tenantId: organization.id,
  contactId: patient.id,
  dealTitle: formData.title,
  
  // Recommended
  dealDescription: formData.description,
  treatmentTags: formData.selectedTags,
  userId: currentUser.id,
  source: 'manual',
  
  // Optional
  userOverridePipeline: formData.pipelineId,
  metadata: {
    formId: 'contact-form-2025',
    campaign: 'spring-promo'
  }
})

if (result.success) {
  // Use routing result
  const deal = await createDeal({
    pipeline_id: result.pipelineId,
    stage_id: result.stageId,
    treatment_tags: result.treatmentTags,
    // ... other fields
  })
} else {
  // Handle error
  console.error('Routing failed:', result.error)
}
```

---

## Integration Examples

### Example 1: Manual Deal Creation Form

```typescript
// src/components/deals/create-deal-slide-over.tsx

import { useState } from 'react'
import { routeDealWithAdapter } from '@/lib/treatment-routing'
import { useTenantContext } from '@/contexts/tenant-context'
import { useAuth } from '@/hooks/use-auth'

function CreateDealForm() {
  const { currentTenant } = useTenantContext()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    contactId: '',
    title: '',
    description: '',
    selectedTags: [],
    estimatedValue: 0
  })
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    try {
      // 1. Route the deal
      const routingResult = await routeDealWithAdapter({
        tenantId: currentTenant.id,
        contactId: formData.contactId,
        dealTitle: formData.title,
        dealDescription: formData.description,
        treatmentTags: formData.selectedTags,
        userId: user.id,
        source: 'manual'
      })
      
      if (!routingResult.success) {
        toast.error(`Routing failed: ${routingResult.error}`)
        return
      }
      
      // 2. Create deal with routing result
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
          owner_id: user.id,
          custom_fields: {
            routing_log_id: routingResult.routingLogId,
            routing_method: routingResult.routingMethod,
            routing_confidence: routingResult.confidence
          }
        })
        .select()
        .single()
      
      if (error) throw error
      
      // 3. Success feedback
      toast.success(
        `Deal created in ${routingResult.pipelineName} ` +
        `(${routingResult.routingMethod}, ${routingResult.confidence}% confidence)`
      )
      
      // 4. Navigate to deal
      router.push(`/deals/${deal.id}`)
    } catch (error) {
      console.error('Failed to create deal:', error)
      toast.error('Failed to create deal')
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

---

### Example 2: Marketing Form Webhook

```typescript
// src/app/api/webhooks/form-submission/route.ts

import { NextResponse } from 'next/server'
import { extractTagsFromDealText, quickRouteDeal } from '@/lib/treatment-routing'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    
    // 1. Validate webhook
    const isValid = await validateWebhookSignature(request, payload)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // 2. Find or create contact
    const contact = await findOrCreateContact({
      email: payload.email,
      name: payload.name,
      phone: payload.phone,
      tenantId: payload.tenantId
    })
    
    // 3. Extract treatment tags from form text
    let treatmentTags: string[] = []
    
    if (payload.treatment_tags) {
      // Explicit tags from form
      treatmentTags = Array.isArray(payload.treatment_tags) 
        ? payload.treatment_tags 
        : [payload.treatment_tags]
    } else {
      // AI extraction from form text
      const formText = `
        ${payload.message || ''}
        ${payload.inquiry_type || ''}
        ${payload.service_interest || ''}
      `.trim()
      
      const extraction = await extractTagsFromDealText(
        payload.subject || 'Website Form Inquiry',
        formText,
        payload.tenantId
      )
      
      treatmentTags = extraction.extractedTags
    }
    
    // 4. Route deal using adapter
    const routingResult = await quickRouteDeal({
      tenantId: payload.tenantId,
      contactId: contact.id,
      dealTitle: payload.subject || 'Website Inquiry',
      dealDescription: payload.message,
      treatmentTags,
      source: 'website_form',
      metadata: {
        formId: payload.formId,
        userAgent: request.headers.get('user-agent'),
        referrer: payload.referrer,
        ipAddress: request.headers.get('x-forwarded-for')
      }
    })
    
    if (!routingResult.success) {
      console.error('Routing failed:', routingResult.error)
      // Continue with default pipeline as fallback
    }
    
    // 5. Create deal
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        tenant_id: payload.tenantId,
        contact_id: contact.id,
        title: payload.subject || 'Website Inquiry',
        description: payload.message,
        estimated_value: payload.estimated_value || 0,
        pipeline_id: routingResult.pipelineId,
        stage_id: routingResult.stageId,
        treatment_tags: routingResult.treatmentTags,
        marketing_source_id: payload.formId,
        custom_fields: {
          form_payload: payload,
          routing_log_id: routingResult.routingLogId,
          routing_method: routingResult.routingMethod,
          routing_confidence: routingResult.confidence
        }
      })
      .select()
      .single()
    
    if (error) throw error
    
    // 6. Return success
    return NextResponse.json({
      success: true,
      dealId: deal.id,
      pipelineId: routingResult.pipelineId,
      treatmentTags: routingResult.treatmentTags,
      routingMethod: routingResult.routingMethod
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### Example 3: PMS Integration

```typescript
// src/lib/integrations/pms/sync-engine.ts

import { quickRouteDeal, extractTagsFromDealText } from '@/lib/treatment-routing'

export class PMSSyncEngine {
  async syncTreatmentProposal(treatment: PMSTreatment) {
    try {
      // 1. Find patient in CRM
      const contact = await this.findOrCreatePatient(treatment.patient)
      
      // 2. Extract treatment tags (3-tier strategy)
      let treatmentTags: string[] = []
      
      // Tier 1: Explicit tags from PMS
      if (treatment.treatment_tags) {
        treatmentTags = treatment.treatment_tags
      }
      
      // Tier 2: Procedure code mappings
      else if (treatment.procedure_codes?.length > 0) {
        const { data: mappings } = await supabase
          .from('pms_procedure_tag_mappings')
          .select('treatment_tag_name')
          .eq('tenant_id', this.tenantId)
          .in('procedure_code', treatment.procedure_codes)
        
        treatmentTags = mappings?.map(m => m.treatment_tag_name) || []
      }
      
      // Tier 3: AI extraction
      if (treatmentTags.length === 0) {
        const extraction = await extractTagsFromDealText(
          treatment.treatment_type,
          treatment.description || '',
          this.tenantId
        )
        treatmentTags = extraction.extractedTags
      }
      
      // 3. Route using adapter
      const routingResult = await quickRouteDeal({
        tenantId: this.tenantId,
        contactId: contact.id,
        dealTitle: `${treatment.treatment_type} - ${contact.full_name}`,
        dealDescription: treatment.description,
        treatmentTags,
        source: 'pms_integration',
        metadata: {
          pms_provider: this.providerName,
          pms_treatment_id: treatment.id,
          pms_patient_id: treatment.patient_id,
          procedure_codes: treatment.procedure_codes,
          estimated_cost: treatment.estimated_cost
        }
      })
      
      // 4. Create deal
      const deal = await this.createDeal({
        tenant_id: this.tenantId,
        contact_id: contact.id,
        title: `${treatment.treatment_type} - ${contact.full_name}`,
        description: treatment.description,
        estimated_value: treatment.estimated_cost,
        pipeline_id: routingResult.pipelineId,
        stage_id: routingResult.stageId,
        treatment_tags: routingResult.treatmentTags,
        custom_fields: {
          pms_integration_id: this.integrationId,
          pms_treatment_id: treatment.id,
          routing_log_id: routingResult.routingLogId,
          routing_method: routingResult.routingMethod,
          routing_confidence: routingResult.confidence
        }
      })
      
      // 5. Log sync
      await this.logSync({
        entity_type: 'treatment',
        entity_id: treatment.id,
        action: 'created',
        status: 'success',
        deal_id: deal.id,
        routing_method: routingResult.routingMethod
      })
      
      return deal
    } catch (error) {
      console.error('PMS sync error:', error)
      await this.logSync({
        entity_type: 'treatment',
        entity_id: treatment.id,
        action: 'created',
        status: 'error',
        error_message: error.message
      })
      throw error
    }
  }
}
```

---

### Example 4: Batch Processing

```typescript
// Process multiple deals efficiently

import { routeMultipleDeals } from '@/lib/treatment-routing'

async function processLeadBatch(leads: Lead[]) {
  // 1. Prepare contexts
  const contexts = leads.map(lead => ({
    tenantId: lead.tenant_id,
    contactId: lead.contact_id,
    dealTitle: lead.title,
    dealDescription: lead.message,
    treatmentTags: lead.tags,
    source: 'lead_import',
    metadata: {
      import_id: lead.import_id,
      imported_at: new Date().toISOString()
    }
  }))
  
  // 2. Route all deals in batch
  const results = await routeMultipleDeals(contexts)
  
  // 3. Create deals in bulk
  const dealsToInsert = results
    .filter(r => r.success)
    .map((result, index) => ({
      tenant_id: contexts[index].tenantId,
      contact_id: contexts[index].contactId,
      title: contexts[index].dealTitle,
      description: contexts[index].dealDescription,
      pipeline_id: result.pipelineId,
      stage_id: result.stageId,
      treatment_tags: result.treatmentTags,
      custom_fields: {
        routing_log_id: result.routingLogId,
        routing_method: result.routingMethod,
        import_id: leads[index].import_id
      }
    }))
  
  const { data: createdDeals, error } = await supabase
    .from('deals')
    .insert(dealsToInsert)
    .select()
  
  if (error) throw error
  
  // 4. Report results
  return {
    total: leads.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    deals: createdDeals
  }
}
```

---

## Advanced Patterns

### Pattern 1: Conditional Routing

```typescript
async function routeBasedOnValue(dealData) {
  const routingResult = await routeDealWithAdapter({
    tenantId: dealData.tenantId,
    contactId: dealData.contactId,
    dealTitle: dealData.title,
    treatmentTags: dealData.tags
  })
  
  // Override for high-value deals
  if (dealData.estimatedValue > 10000) {
    // Force to VIP pipeline regardless of tags
    const vipPipeline = await getVIPPipeline(dealData.tenantId)
    routingResult.pipelineId = vipPipeline.id
    routingResult.stageId = vipPipeline.stages[0].id
    routingResult.routingMethod = 'value_override'
    routingResult.reason = 'High-value deal ($10K+)'
  }
  
  return routingResult
}
```

### Pattern 2: Multi-Stage Validation

```typescript
async function routeWithValidation(dealData) {
  // Stage 1: Route using adapter
  const routingResult = await routeDealWithAdapter({
    tenantId: dealData.tenantId,
    contactId: dealData.contactId,
    dealTitle: dealData.title,
    treatmentTags: dealData.tags
  })
  
  // Stage 2: Validate pipeline assignment
  const pipeline = await getPipeline(routingResult.pipelineId)
  
  if (pipeline.requires_specialist && !dealData.hasSpecialistAvailable) {
    // Re-route to general pipeline
    const generalPipeline = await getGeneralPipeline(dealData.tenantId)
    routingResult.pipelineId = generalPipeline.id
    routingResult.stageId = generalPipeline.stages[0].id
    routingResult.reason += ' (no specialist available)'
  }
  
  // Stage 3: Check capacity
  const dealCount = await countDealsInPipeline(routingResult.pipelineId)
  
  if (dealCount > pipeline.max_capacity) {
    // Route to overflow pipeline
    const overflowPipeline = await getOverflowPipeline(dealData.tenantId)
    routingResult.pipelineId = overflowPipeline.id
    routingResult.stageId = overflowPipeline.stages[0].id
    routingResult.reason += ' (capacity exceeded)'
  }
  
  return routingResult
}
```

### Pattern 3: Fallback Chain

```typescript
async function routeWithFallbacks(dealData) {
  try {
    // Try intelligent routing
    return await routeDealWithAdapter(dealData)
  } catch (error) {
    console.warn('Intelligent routing failed:', error)
    
    try {
      // Fallback 1: Use tag-only routing
      return await routeByTagsOnly(dealData)
    } catch (error2) {
      console.warn('Tag routing failed:', error2)
      
      try {
        // Fallback 2: Use contact's last pipeline
        return await routeByContactHistory(dealData)
      } catch (error3) {
        console.warn('History routing failed:', error3)
        
        // Fallback 3: Use default pipeline
        return await routeToDefault(dealData)
      }
    }
  }
}
```

---

## Event System

### Understanding DEAL.ROUTED Event

When `routeDealWithAdapter` successfully routes a deal, it automatically emits a `DEAL.ROUTED` event that other parts of your system can listen to.

**Event Payload:**
```typescript
{
  dealId: string
  contactId: string
  tenantId: string
  pipelineId: string
  stageId: string
  treatmentTags: string[]
  routingMethod: RoutingMethod
  routingLogId: string
  source: string
}
```

### Listening to Events

```typescript
// src/lib/events.ts

import { events } from '@/lib/events'

// Listen for routing events
events.on('DEAL.ROUTED', async (data) => {
  console.log(`Deal ${data.dealId} routed to pipeline ${data.pipelineId}`)
  
  // Trigger automation workflows
  if (data.routingMethod === 'tag_mapping') {
    await triggerTagBasedWorkflow(data)
  }
  
  // Send notifications
  if (data.treatmentTags.includes('emergency')) {
    await notifyEmergencyTeam(data)
  }
  
  // Update analytics
  await trackRoutingMetrics(data)
})
```

### Custom Event Handlers

```typescript
// Notify team when high-value deal routed
events.on('DEAL.ROUTED', async (data) => {
  if (data.treatmentTags.includes('dental_implant')) {
    const deal = await getDeal(data.dealId)
    
    if (deal.estimated_value > 5000) {
      await sendSlackNotification({
        channel: '#high-value-deals',
        message: `🎯 New $${deal.estimated_value} implant case routed to ${deal.pipeline.name}`,
        dealId: deal.id
      })
    }
  }
})

// Track routing accuracy for ML improvement
events.on('DEAL.ROUTED', async (data) => {
  await logRoutingDecision({
    routingLogId: data.routingLogId,
    timestamp: new Date(),
    confidence: data.confidence,
    method: data.routingMethod,
    tags: data.treatmentTags
  })
})
```

---

## Performance Considerations

### Caching Strategy

```typescript
import { LRUCache } from 'lru-cache'

// Cache routing settings per tenant
const settingsCache = new LRUCache<string, RoutingSettings>({
  max: 100,
  ttl: 1000 * 60 * 5 // 5 minutes
})

// Cache treatment tags per tenant
const tagsCache = new LRUCache<string, TreatmentTag[]>({
  max: 100,
  ttl: 1000 * 60 * 10 // 10 minutes
})

async function routeDealWithCaching(context) {
  const cacheKey = `routing:${context.tenantId}`
  
  let settings = settingsCache.get(cacheKey)
  if (!settings) {
    settings = await fetchSettings(context.tenantId)
    settingsCache.set(cacheKey, settings)
  }
  
  return routeDealWithAdapter({
    ...context,
    _cachedSettings: settings
  })
}
```

### Parallel Processing

```typescript
// Process multiple operations in parallel
async function createDealWithAllData(dealData) {
  const [routingResult, contact, owner] = await Promise.all([
    routeDealWithAdapter({
      tenantId: dealData.tenantId,
      contactId: dealData.contactId,
      dealTitle: dealData.title,
      treatmentTags: dealData.tags
    }),
    getContact(dealData.contactId),
    getUser(dealData.ownerId)
  ])
  
  return createDeal({
    ...dealData,
    pipeline_id: routingResult.pipelineId,
    stage_id: routingResult.stageId,
    contact_name: contact.full_name,
    owner_name: owner.full_name
  })
}
```

---

## Best Practices

### 1. Always Handle Errors

```typescript
✅ DO:
const result = await routeDealWithAdapter(context)
if (!result.success) {
  console.error('Routing failed:', result.error)
  // Implement fallback
  return useDefaultPipeline()
}

❌ DON'T:
const result = await routeDealWithAdapter(context)
// Assume success, no error handling
createDeal({ pipeline_id: result.pipelineId })
```

### 2. Provide Context

```typescript
✅ DO:
await routeDealWithAdapter({
  ...context,
  source: 'marketing_form',
  metadata: {
    formId: 'spring-promo',
    campaign: 'implant-special',
    utmSource: 'google'
  }
})

❌ DON'T:
await routeDealWithAdapter(context)
// No source or metadata
```

### 3. Log Routing Decisions

```typescript
✅ DO:
const result = await routeDealWithAdapter(context)
console.log(`Routed via ${result.routingMethod} with ${result.confidence}% confidence`)

// Store routing log ID
await updateDeal(dealId, {
  custom_fields: {
    routing_log_id: result.routingLogId
  }
})

❌ DON'T:
await routeDealWithAdapter(context)
// No logging, can't debug issues
```

### 4. Test Integration

```typescript
✅ DO:
describe('Deal Creation with Routing', () => {
  it('should route implant cases to high-value pipeline', async () => {
    const result = await routeDealWithAdapter({
      tenantId: testTenant.id,
      contactId: testContact.id,
      dealTitle: 'Patient needs implants',
      treatmentTags: ['dental_implant']
    })
    
    expect(result.success).toBe(true)
    expect(result.pipelineName).toBe('High-Value Procedures')
  })
})

❌ DON'T:
// No tests, hope it works in production
```

---

## Need Help?

- 📧 **Email:** dev-support@dentalcrm.com
- 💬 **Slack:** #dev-adapter-pattern
- 📚 **API Docs:** api.dentalcrm.com/docs/adapter
- 🐛 **Issues:** github.com/dentalcrm/issues

---

*Last Updated: October 19, 2025*  
*Version: 1.0.0*  
*© 2025 Dental CRM. All rights reserved.*


import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { extractTagsFromDealText } from '@/lib/treatment-routing/ai-extractor'
import { quickRouteDeal } from '@/lib/treatment-routing'

// Schema for incoming lead data
const leadWebhookSchema = z.object({
  tenant_id: z.string().uuid(), // ✅ SECURITY: Require tenant_id in webhook payload
  source: z.string(),
  source_id: z.string().optional(),
  contact: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  message: z.string().optional(),
  treatment_tags: z.array(z.string()).optional(), // Allow explicit tags
  metadata: z.record(z.unknown()).optional(),
})

// Auto-categorization function. Best-effort: failure does NOT block lead capture
// — we just don't get a category back, the lead still lands in the DB.
async function categorizeLead(message: string, tenantId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .rpc('auto_categorize_lead', {
        p_message: message,
        p_tenant_id: tenantId
      })

    if (error) {
      console.warn('[lead-intake] categorization RPC returned error (best-effort, lead capture unaffected)', {
        route: '/api/webhooks/lead-intake',
        tenant_id: tenantId,
        error_message: error.message,
        error_code: error.code,
      })
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.warn('[lead-intake] categorization threw (best-effort, lead capture unaffected)', {
      route: '/api/webhooks/lead-intake',
      tenant_id: tenantId,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    })
    return null
  }
}

// Calculate lead score based on various factors
function calculateLeadScore(data: any): number {
  let score = 50 // Base score

  // Boost score for complete contact information
  if (data.contact.email) score += 15
  if (data.contact.phone) score += 15

  // Boost score for detailed messages
  if (data.message && data.message.length > 50) score += 10

  // Boost score for certain sources
  const highValueSources = ['referral', 'website']
  if (highValueSources.includes(data.source)) score += 20

  // Emergency keywords boost score significantly
  const emergencyKeywords = ['pain', 'urgent', 'emergency', 'broken', 'trauma']
  if (data.message && emergencyKeywords.some(keyword => 
    data.message.toLowerCase().includes(keyword)
  )) {
    score += 30
  }

  return Math.min(100, Math.max(0, score))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the incoming data - INCLUDES tenant_id validation! 🔒
    const validatedData = leadWebhookSchema.parse(body)
    
    const supabase = createServiceClient()
    const tenantId = validatedData.tenant_id // ✅ SECURITY: From validated request body

    // Find the lead source
    const { data: leadSource, error: sourceError } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('name', validatedData.source)
      .single()

    if (sourceError) {
      console.error('Lead source not found:', sourceError)
      return NextResponse.json(
        { error: 'Lead source not configured' },
        { status: 400 }
      )
    }

    // Create or find contact
    let contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`primary_email.eq.${validatedData.contact.email},primary_phone.eq.${validatedData.contact.phone}`)
      .single()

    if (existingContact) {
      contact = existingContact
    } else {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          tenant_id: tenantId,
          full_name: validatedData.contact.name,
          primary_email: validatedData.contact.email || null,
          primary_phone: validatedData.contact.phone || null,
          lead_source_id: leadSource.id,
          source: validatedData.source,
          tags: []
        })
        .select()
        .single()

      if (contactError) {
        console.error('Error creating contact:', contactError)
        return NextResponse.json(
          { error: 'Failed to create contact' },
          { status: 500 }
        )
      }

      contact = newContact
    }

    // Auto-categorize the lead if message is provided
    let categorization = null
    let dentalServiceId = null
    
    if (validatedData.message) {
      categorization = await categorizeLead(validatedData.message, tenantId, supabase)
      if (categorization) {
        dentalServiceId = categorization.service_id
      }
    }

    // Calculate lead score
    const leadScore = calculateLeadScore(validatedData)

    // Create lead intake record
    const { data: leadIntake, error: intakeError } = await supabase
      .from('lead_intakes')
      .insert({
        tenant_id: tenantId,
        lead_source_id: leadSource.id,
        contact_id: contact.id,
        dental_service_id: dentalServiceId,
        original_message: validatedData.message || null,
        lead_score: leadScore,
        qualification_status: leadScore >= 80 ? 'qualified' : 'unqualified',
        auto_categorized: !!categorization,
        categorization_confidence: categorization?.confidence || 0,
        external_id: validatedData.source_id || null,
        raw_data: validatedData.metadata || {}
      })
      .select()
      .single()

    if (intakeError) {
      console.error('Error creating lead intake:', intakeError)
      return NextResponse.json(
        { error: 'Failed to create lead intake' },
        { status: 500 }
      )
    }

    // ===== PHASE 9: TREATMENT TAG EXTRACTION & AUTO-ROUTING =====
    // Auto-create deal for high-score leads
    if (leadScore >= 80) {
      try {
        // Step 1: Extract or use explicit treatment tags
        let treatmentTags: string[] = []
        
        if (validatedData.treatment_tags && validatedData.treatment_tags.length > 0) {
          treatmentTags = validatedData.treatment_tags
          console.log(`[Lead Intake] Using explicit treatment tags:`, treatmentTags)
        } else if (validatedData.message) {
          // AI-powered tag extraction from message
          try {
            const extractionResult = await extractTagsFromDealText(
              validatedData.message,
              tenantId
            );
            treatmentTags = extractionResult.extractedTags.map(t => t.tagName);
            console.log(`[Lead Intake] AI extracted ${treatmentTags.length} tags:`, treatmentTags);
          } catch (error) {
            // Best-effort: tag extraction failure means the deal routes to
            // "unsorted" but the lead is still captured. Do not escalate.
            console.warn('[lead-intake] AI tag extraction failed (best-effort, will route unsorted)', {
              route: '/api/webhooks/lead-intake',
              tenant_id: tenantId,
              lead_intake_id: leadIntake.id,
              error_message: error instanceof Error ? error.message : String(error),
              error_stack: error instanceof Error ? error.stack : undefined,
            });
          }
        }

        // Step 2: Use universal routing to determine pipeline
        const routingResult = await quickRouteDeal({
          dealTitle: `Lead: ${contact.full_name}`,
          dealDescription: validatedData.message || '',
          contactId: contact.id,
          orgId: tenantId,
          treatmentTags,
          source: 'lead_intake',
        });

        console.log(`[Lead Intake] Routed to pipeline: ${routingResult.pipelineId} (${routingResult.routingMethod})`);

        // Step 3: Get service value if available
        let estimatedValue = 0;
        let serviceName = 'General Inquiry';
        
        if (dentalServiceId) {
          const { data: dentalService } = await supabase
            .from('dental_services')
            .select('*')
            .eq('id', dentalServiceId)
            .single()

          if (dentalService) {
            estimatedValue = dentalService.average_value_cents || 0;
            serviceName = dentalService.name;
          }
        }

        // Step 4: Create deal with routed pipeline
        const dealTitle = treatmentTags.length > 0 
          ? `${treatmentTags.join(', ')} - ${contact.full_name}`
          : `${serviceName} - ${contact.full_name}`;

        const { data: newDeal, error: dealError } = await supabase
          .from('deals')
          .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            pipeline_id: routingResult.pipelineId,
            stage_id: routingResult.stageId,
            title: dealTitle,
            value_estimate_cents: estimatedValue,
            currency: 'GBP',
            treatment_tags: treatmentTags,
            source: validatedData.source,
            dental_service_id: dentalServiceId,
            lead_intake_id: leadIntake.id,
            lead_score: leadScore,
            internal_notes: `Auto-created from lead intake. Lead score: ${leadScore}. Routing method: ${routingResult.routingMethod}.`,
            custom_fields: {
              lead_intake_id: leadIntake.id,
              routing_log_id: routingResult.routingLogId,
              auto_created: true,
            },
            last_activity_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (dealError) {
          // Lead and contact already persisted upstream; deal creation is the
          // downstream best-effort step. Log loudly with structured context so
          // operations can replay if needed, but do not 500 the webhook (the
          // lead itself is in the system and re-delivering would duplicate it).
          console.error('[lead-intake] deal creation failed (lead already captured; deal recoverable)', {
            route: '/api/webhooks/lead-intake',
            tenant_id: tenantId,
            lead_intake_id: leadIntake.id,
            contact_id: contact.id,
            pipeline_id: routingResult.pipelineId,
            error_message: dealError.message,
            error_code: dealError.code,
          })
        } else {
          console.log(`[Lead Intake] Created deal ${newDeal?.id} with ${treatmentTags.length} tags`)
        }
      } catch (routingError) {
        // Same rationale as above: lead/contact persisted; deal routing is best-effort.
        console.error('[lead-intake] deal routing threw (lead already captured; deal recoverable)', {
          route: '/api/webhooks/lead-intake',
          tenant_id: tenantId,
          lead_intake_id: leadIntake.id,
          contact_id: contact.id,
          error_message: routingError instanceof Error ? routingError.message : String(routingError),
          error_stack: routingError instanceof Error ? routingError.stack : undefined,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        lead_intake_id: leadIntake.id,
        contact_id: contact.id,
        lead_score: leadScore,
        categorization: categorization ? {
          service: categorization.service_name,
          confidence: categorization.confidence
        } : null,
        auto_qualified: leadScore >= 80
      }
    })

  } catch (error) {
    console.error('Webhook error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

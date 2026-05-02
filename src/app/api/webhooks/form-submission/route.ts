import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { extractTagsFromDealText } from '@/lib/treatment-routing/ai-extractor'
import { quickRouteDeal } from '@/lib/treatment-routing'

// Define a schema for incoming form data
const formSubmissionSchema = z.object({
  formId: z.string().uuid(),
  formData: z.record(z.string(), z.any()), // Dynamic form fields
  source: z.string().optional(), // e.g., "Website Contact Form", "Facebook Lead Ad"
  tenantId: z.string().uuid().optional(), // Allow tenant ID to be passed
})

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const correlationId = req.headers.get('x-correlation-id') ?? randomUUID()
  const requestId = req.headers.get('x-request-id') ?? randomUUID()

  try {
    const body = await req.json()
    const validatedData = formSubmissionSchema.parse(body)
    const { formId, formData, source, tenantId } = validatedData

    // Tenant must be resolvable from the request payload. We do NOT fall back
    // to a zero-UUID tenant: that historically routed every unresolvable
    // submission into a single bucket that mixed data across customers.
    if (!tenantId) {
      console.error('[ingestion] tenant resolution failed', {
        route: '/api/webhooks/form-submission',
        correlation_id: correlationId,
        request_id: requestId,
        form_id: formId,
        source: source ?? null,
      })
      return NextResponse.json(
        { error: 'tenant resolution failed', correlation_id: correlationId },
        { status: 400 }
      )
    }
    const effectiveTenantId = tenantId

    // Extract basic contact information
    const contactName = formData.full_name || 'Unknown Lead'
    const contactEmail = formData.email
    const contactPhone = formData.phone
    const reasonForInquiry = formData.reason_for_inquiry || ''

    // Calculate lead score based on form data
    let totalLeadScore = 50 // Base score
    let dealType: 'new_lead' | 'existing_patient' = 'new_lead'

    // Score based on urgency
    if (formData.urgency) {
      const urgencyScores: Record<string, number> = {
        'emergency': 50,
        '1_week': 30,
        '1_month': 20,
        '3_months': 10,
        'researching': 5
      }
      totalLeadScore += urgencyScores[formData.urgency] || 0
    }

    // Score based on budget
    if (formData.budget) {
      const budgetScores: Record<string, number> = {
        'under_500': 10,
        '500_1500': 20,
        '1500_5000': 30,
        '5000_15000': 40,
        '15000_plus': 50
      }
      totalLeadScore += budgetScores[formData.budget] || 0
    }

    // Score based on pain level
    if (formData.pain_level) {
      const painLevel = parseInt(formData.pain_level)
      if (!isNaN(painLevel)) {
        totalLeadScore += painLevel * 5 // 5 points per pain level
      }
    }

    // Score based on existing patient status
    if (formData.existing_patient === 'yes') {
      totalLeadScore += 15
    }

    // ===== PHASE 9: AI-POWERED TREATMENT TAG EXTRACTION =====
    let treatmentTags: string[] = []
    
    // Check if form explicitly provides treatment tags
    if (formData.treatment_tags && Array.isArray(formData.treatment_tags)) {
      treatmentTags = formData.treatment_tags
      console.log(`[Form Webhook] Using explicit treatment tags:`, treatmentTags)
    } else {
      // AI-powered tag extraction from form content
      const formText = [
        formData.reason_for_inquiry,
        formData.treatment_type,
        formData.service_interest,
        formData.message,
        formData.notes,
      ]
        .filter(Boolean)
        .join(' ');
      
      if (formText.trim()) {
        try {
          const extractionResult = await extractTagsFromDealText(
            formText,
            effectiveTenantId
          );
          treatmentTags = extractionResult.extractedTags.map(t => t.tagName);
          console.log(`[Form Webhook] AI extracted ${treatmentTags.length} tags:`, treatmentTags);
          
          // Add lead score bonus for high-value treatments
          if (treatmentTags.length > 0) {
            totalLeadScore += Math.min(20, treatmentTags.length * 5);
          }
        } catch (error) {
          console.error('[Form Webhook] Tag extraction failed:', error);
          // Continue without tags - will route to unsorted
        }
      }
    }

    // Ensure score is within bounds
    totalLeadScore = Math.max(0, Math.min(100, totalLeadScore))

    // Determine qualification status
    let qualificationStatus: 'unqualified' | 'qualified' | 'disqualified' = 'unqualified'
    if (totalLeadScore >= 70) {
      qualificationStatus = 'qualified'
    }

    // 1. Create or update Contact
    let contactId: string | null = null
    let existingContact = null

    if (contactEmail) {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, lead_score')
        .eq('primary_email', contactEmail)
        .single()
      if (data) existingContact = data
    } else if (contactPhone) {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, lead_score')
        .eq('primary_phone', contactPhone)
        .single()
      if (data) existingContact = data
    }

    if (existingContact) {
      contactId = existingContact.id
      dealType = 'existing_patient' // Set deal type for existing contacts
      // Update existing contact with higher lead score
      await supabase
        .from('contacts')
        .update({
          full_name: contactName,
          primary_phone: contactPhone,
          primary_email: contactEmail,
          lead_score: Math.max(existingContact.lead_score || 0, totalLeadScore),
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId)
    } else {
      const { data: newContact, error: newContactError} = await supabase
        .from('contacts')
        .insert({
          tenant_id: effectiveTenantId,
          full_name: contactName,
          primary_email: contactEmail,
          primary_phone: contactPhone,
          lead_score: totalLeadScore,
          tags: treatmentTags.length > 0 ? treatmentTags : [],
        })
        .select('id')
        .single()

      if (newContactError) throw newContactError
      contactId = newContact.id
    }

    // ===== PHASE 9: UNIVERSAL TREATMENT TAG ROUTING =====
    // 2. Create Deal with automatic routing
    let dealId: string | null = null
    if (contactId) {
      try {
        // Use routing system to determine pipeline and stage
        const routingResult = await quickRouteDeal({
          dealTitle: `${dealType === 'existing_patient' ? 'Existing Patient' : 'New Lead'}: ${contactName}`,
          dealDescription: reasonForInquiry,
          contactId,
          orgId: effectiveTenantId,
          treatmentTags,
          source: 'webhook_form',
        });

        console.log(`[Form Webhook] Routed to pipeline: ${routingResult.pipelineId} (${routingResult.routingMethod})`);

        // Estimate deal value based on budget and treatment type
        let estimatedValue = 0
        if (formData.budget) {
          const budgetValues: Record<string, number> = {
            'under_500': 25000, // £250 in pence
            '500_1500': 100000, // £1,000 in pence
            '1500_5000': 325000, // £3,250 in pence
            '5000_15000': 1000000, // £10,000 in pence
            '15000_plus': 2000000 // £20,000 in pence
          }
          estimatedValue = budgetValues[formData.budget] || 0
        }

        // Create the deal with routed pipeline
        const dealTitle = `${dealType === 'existing_patient' ? 'Existing Patient' : 'New Lead'}: ${contactName}${treatmentTags.length > 0 ? ` - ${treatmentTags.join(', ')}` : ' - General Inquiry'}`
        
        const { data: newDeal, error: newDealError } = await supabase
          .from('deals')
          .insert({
            tenant_id: effectiveTenantId,
            contact_id: contactId,
            pipeline_id: routingResult.pipelineId,
            stage_id: routingResult.stageId,
            title: dealTitle,
            deal_type: dealType,
            value_estimate_cents: estimatedValue,
            currency: 'GBP',
            treatment_tags: treatmentTags,
            source: source || 'Website Form',
            lead_score: totalLeadScore,
            conversion_probability: qualificationStatus === 'qualified' ? 75 : 35,
            follow_up_required: true,
            next_follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            patient_concerns: reasonForInquiry || null,
            internal_notes: `Auto-created from form submission. Deal type: ${dealType}. Lead score: ${totalLeadScore}. Routing method: ${routingResult.routingMethod}.`,
            custom_fields: {
              form_submission_id: formId,
              original_form_data: formData,
              auto_created: true,
              routing_log_id: routingResult.routingLogId,
            },
            last_activity_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (newDealError) {
          console.error('Error creating deal from form:', newDealError)
        } else {
          dealId = newDeal?.id || null
        }

        // 3. Create initial activity/note for the form submission
        if (dealId && reasonForInquiry) {
          await supabase
            .from('activities')
            .insert({
              tenant_id: effectiveTenantId,
              contact_id: contactId,
              deal_id: dealId,
              type: 'note',
              title: 'Form Submission',
              description: `Form submitted with inquiry: "${reasonForInquiry}"${treatmentTags.length > 0 ? `\n\nTreatment interests: ${treatmentTags.join(', ')}` : ''}`,
              metadata: {
                form_data: formData,
                lead_score: totalLeadScore,
                qualification_status: qualificationStatus,
                treatment_tags: treatmentTags,
                routing_method: routingResult.routingMethod,
              },
              created_at: new Date().toISOString(),
            })
        }
      } catch (routingError) {
        console.error('[Form Webhook] Routing failed:', routingError);
        throw new Error(`Deal routing failed: ${routingError instanceof Error ? routingError.message : String(routingError)}`);
      }
    }

    return NextResponse.json({
      message: 'Form submission processed successfully',
      contactId,
      dealId,
      leadScore: totalLeadScore,
      qualificationStatus,
      treatmentTags, // Changed from treatmentKeywords
      dealType,
      smartMatched: !!existingContact,
    }, { status: 200 })

  } catch (error) {
    console.error('Error processing form submission webhook:', error)
    return NextResponse.json({ 
      error: 'Failed to process form submission', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
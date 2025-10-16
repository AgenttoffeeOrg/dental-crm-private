import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

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
  metadata: z.record(z.unknown()).optional(),
})

// Auto-categorization function
async function categorizeLead(message: string, tenantId: string, supabase: any) {
  try {
    // Call the PostgreSQL function we created
    const { data, error } = await supabase
      .rpc('auto_categorize_lead', {
        p_message: message,
        p_tenant_id: tenantId
      })

    if (error) {
      console.error('Categorization error:', error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error('Error in categorization:', error)
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

    // Auto-create deal for high-score leads
    if (leadScore >= 80 && dentalServiceId) {
      const { data: dentalService } = await supabase
        .from('dental_services')
        .select('*')
        .eq('id', dentalServiceId)
        .single()

      if (dentalService) {
        const { data: pipeline } = await supabase
          .from('pipelines')
          .select('*')
          .eq('tenant_id', tenantId)
          .single()

        if (pipeline) {
          const { data: firstStage } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('pipeline_id', pipeline.id)
            .order('position')
            .limit(1)
            .single()

          if (firstStage) {
            const { error: dealError } = await supabase
              .from('deals')
              .insert({
                tenant_id: tenantId,
                contact_id: contact.id,
                pipeline_id: pipeline.id,
                stage_id: firstStage.id,
                title: `${dentalService.name} - ${contact.full_name}`,
                value_estimate_cents: dentalService.average_value_cents || 0,
                currency: 'GBP',
                treatment_tags: [dentalService.name.toLowerCase().replace(/\s+/g, '_')],
                source: validatedData.source,
                dental_service_id: dentalServiceId,
                lead_intake_id: leadIntake.id,
                last_activity_at: new Date().toISOString()
              })

            if (dealError) {
              console.error('Error creating deal:', dealError)
            }
          }
        }
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

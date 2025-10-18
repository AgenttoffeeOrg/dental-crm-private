import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Define a schema for incoming form data
const formSubmissionSchema = z.object({
  formId: z.string().uuid(),
  formData: z.record(z.string(), z.any()), // Dynamic form fields
  source: z.string().optional(), // e.g., "Website Contact Form", "Facebook Lead Ad"
})

export async function POST(req: Request) {
  const supabase = createServiceClient()

  try {
    const body = await req.json()
    const validatedData = formSubmissionSchema.parse(body)
    const { formId, formData, source } = validatedData

    // Extract basic contact information
    const contactName = formData.full_name || 'Unknown Lead'
    const contactEmail = formData.email
    const contactPhone = formData.phone
    const reasonForInquiry = formData.reason_for_inquiry || ''

    // Calculate lead score based on form data
    let totalLeadScore = 50 // Base score
    let treatmentKeywords: string[] = []
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

    // Extract treatment keywords from reason for inquiry
    if (reasonForInquiry) {
      const keywords = ['implant', 'whitening', 'braces', 'emergency', 'pain', 'checkup', 'cleaning']
      const lowerReason = reasonForInquiry.toLowerCase()
      keywords.forEach(keyword => {
        if (lowerReason.includes(keyword)) {
          treatmentKeywords.push(keyword)
          // Add keyword-based scoring
          const keywordScores: Record<string, number> = {
            'implant': 20,
            'whitening': 15,
            'braces': 15,
            'emergency': 30,
            'pain': 25,
            'checkup': 5,
            'cleaning': 5
          }
          totalLeadScore += keywordScores[keyword] || 0
        }
      })
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
      const { data: newContact, error: newContactError } = await supabase
        .from('contacts')
        .insert({
          tenant_id: DEFAULT_TENANT_ID,
          full_name: contactName,
          primary_email: contactEmail,
          primary_phone: contactPhone,
          lead_score: totalLeadScore,
          tags: treatmentKeywords.length > 0 ? treatmentKeywords : [],
        })
        .select('id')
        .single()

      if (newContactError) throw newContactError
      contactId = newContact.id
    }

    // 2. Create Deal directly in pipeline (skip leads table)
    let dealId: string | null = null
    if (contactId) {
      // Get default pipeline and stage
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id, pipeline_stages(id, name)')
        .eq('tenant_id', DEFAULT_TENANT_ID)
        .eq('is_default', true)
        .single()

      if (pipelineError || !pipeline) {
        throw new Error('Default pipeline not found')
      }

      const firstStage = pipeline.pipeline_stages?.[0]
      if (!firstStage) {
        throw new Error('No stages found in default pipeline')
      }

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

      // Create the deal
      const dealTitle = `${dealType === 'existing_patient' ? 'Existing Patient' : 'New Lead'}: ${contactName} - ${treatmentKeywords.join(', ') || 'General Inquiry'}`
      
      const { data: newDeal, error: newDealError } = await supabase
        .from('deals')
        .insert({
          tenant_id: DEFAULT_TENANT_ID,
          contact_id: contactId,
          pipeline_id: pipeline.id,
          stage_id: firstStage.id,
          title: dealTitle,
          deal_type: dealType,
          value_estimate_cents: estimatedValue,
          currency: 'GBP',
          treatment_tags: treatmentKeywords,
          source: source || 'Website Form',
          lead_score: totalLeadScore,
          conversion_probability: qualificationStatus === 'qualified' ? 75 : 35,
          follow_up_required: true,
          next_follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          patient_concerns: reasonForInquiry || null,
          internal_notes: `Auto-created from form submission. Deal type: ${dealType}. Lead score: ${totalLeadScore}.`,
          custom_fields: {
            form_submission_id: formId,
            original_form_data: formData,
            auto_created: true,
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
            tenant_id: DEFAULT_TENANT_ID,
            contact_id: contactId,
            deal_id: dealId,
            activity_type: 'note',
            title: 'Form Submission',
            description: `Form submitted with inquiry: "${reasonForInquiry}"`,
            metadata: {
              form_data: formData,
              lead_score: totalLeadScore,
              qualification_status: qualificationStatus
            },
            created_at: new Date().toISOString(),
          })
      }
    }

    return NextResponse.json({
      message: 'Form submission processed successfully',
      contactId,
      dealId,
      leadScore: totalLeadScore,
      qualificationStatus,
      treatmentKeywords,
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
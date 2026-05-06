// =====================================================
// TREATMENT PROPOSED WEBHOOK
// =====================================================
// Receives webhook when treatment plan is proposed in PMS
// Auto-creates deal in CRM with Universal Treatment Tag Routing
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { PMSSyncEngine } from '@/lib/integrations/pms/sync-engine'
import { routeDealWithAdapter } from '@/lib/treatment-routing'
import { extractTagsFromDealText } from '@/lib/treatment-routing/ai-extractor'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // Extract data from webhook
    const {
      tenant_id,
      integration_id,
      pms_patient_id,
      pms_treatment_id,
      treatment_type,
      description,
      procedure_codes,
      tooth_numbers,
      provider_name,
      estimated_cost,
      proposed_at
    } = payload

    if (!tenant_id || !pms_treatment_id || !pms_patient_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Find patient mapping
    const { data: mapping } = await supabase
      .from('pms_patient_mappings')
      .select('crm_contact_id')
      .eq('pms_patient_id', pms_patient_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!mapping) {
      return NextResponse.json(
        { error: 'Patient not found in CRM. Sync patient first.' },
        { status: 404 }
      )
    }

    // 2. Get integration settings
    const { data: integration } = await supabase
      .from('pms_integrations')
      .select('*')
      .eq('id', integration_id)
      .single()

    if (!integration || !integration.auto_create_deals) {
      return NextResponse.json({
        success: true,
        message: 'Auto-create deals disabled, treatment plan logged only'
      })
    }

    // 3. Check deal creation criteria
    const estimatedCostCents = Math.round(estimated_cost * 100)
    
    if (estimatedCostCents < integration.min_deal_value_cents) {
      return NextResponse.json({
        success: true,
        message: `Treatment below minimum value threshold ($${integration.min_deal_value_cents / 100})`
      })
    }

    // Check excluded procedures
    if (procedure_codes) {
      const hasExcludedCode = procedure_codes.some((code: string) =>
        integration.excluded_procedure_codes?.includes(code)
      )
      if (hasExcludedCode) {
        return NextResponse.json({
          success: true,
          message: 'Treatment procedure is excluded from deal creation'
        })
      }
    }

    // 4. Create treatment plan record
    const { data: treatmentPlan } = await supabase
      .from('treatment_plans')
      .insert({
        tenant_id,
        integration_id,
        pms_treatment_id,
        pms_patient_id,
        crm_contact_id: mapping.crm_contact_id,
        treatment_type,
        treatment_description: description,
        procedure_codes,
        tooth_numbers,
        provider_name,
        estimated_cost_cents: estimatedCostCents,
        status: 'proposed',
        proposed_at: proposed_at || new Date().toISOString()
      })
      .select()
      .single()

    // ===== PHASE 11: UNIVERSAL TREATMENT TAG ROUTING FOR PMS =====
    // 5. Extract treatment tags from PMS data
    console.log(`[PMS ROUTING] Extracting treatment tags for: ${treatment_type}`)
    
    let treatmentTags: string[] = []
    
    // Strategy 1: Check if PMS provides explicit treatment tags
    if (payload.treatment_tags && Array.isArray(payload.treatment_tags)) {
      treatmentTags = payload.treatment_tags
      console.log(`[PMS ROUTING] Using explicit treatment tags:`, treatmentTags)
    } 
    // Strategy 2: Convert procedure codes to treatment tags via PMS tag mappings
    else if (procedure_codes && procedure_codes.length > 0) {
      try {
        // Look up procedure code → treatment tag mappings
        const { data: pmsMappings } = await supabase
          .from('pms_procedure_tag_mappings')
          .select('treatment_tag_name')
          .eq('tenant_id', tenant_id)
          .in('procedure_code', procedure_codes)
        
        if (pmsMappings && pmsMappings.length > 0) {
          treatmentTags = [...new Set(pmsMappings.map(m => m.treatment_tag_name))]
          console.log(`[PMS ROUTING] Mapped procedure codes ${procedure_codes} to tags:`, treatmentTags)
        }
      } catch (error) {
        console.warn('[PMS ROUTING] Failed to lookup procedure code mappings:', error)
      }
    }
    
    // Strategy 3: AI extraction from treatment type + description
    if (treatmentTags.length === 0) {
      try {
        const treatmentText = [
          treatment_type,
          description,
          procedure_codes?.join(' '),
        ].filter(Boolean).join(' ')
        
        const extractionResult = await extractTagsFromDealText(treatmentText, tenant_id)
        treatmentTags = extractionResult.extractedTags.map(t => t.tagName)
        console.log(`[PMS ROUTING] AI extracted ${treatmentTags.length} tags from treatment:`, treatmentTags)
      } catch (error) {
        console.error('[PMS ROUTING] AI tag extraction failed:', error)
        // Continue with empty tags - will route to unsorted
      }
    }

    // 6. Use universal routing engine to determine pipeline & stage
    console.log(`[PMS ROUTING] Routing deal with tags:`, treatmentTags)
    
    let pipelineId: string
    let stageId: string
    let routingLogId: string | undefined
    let routingMethod: string
    
    try {
      const routingResult = await routeDealWithAdapter({
        dealTitle: `${treatment_type} - Treatment Plan`,
        dealDescription: description || '',
        contactId: mapping.crm_contact_id,
        tenantId: tenant_id,
        treatmentTags,
        existingPipelineId: undefined,
        source: 'pms_webhook',
      })

      pipelineId = routingResult.pipelineId
      stageId = routingResult.stageId
      routingLogId = undefined
      routingMethod = routingResult.method
      
      console.log(`[PMS ROUTING] ✅ Routed to pipeline ${pipelineId} via ${routingMethod}`)
    } catch (routingError) {
      console.error('[PMS ROUTING] Routing failed, using fallback:', routingError)
      
      // Fallback: Get default pipeline
      const { data: fallbackPipeline } = await supabase
        .from('pipelines')
        .select('id, pipeline_stages(id)')
        .eq('tenant_id', tenant_id)
        .eq('is_default', true)
        .single()
      
      if (!fallbackPipeline) {
        return NextResponse.json(
          { error: 'Routing failed and no default pipeline found' },
          { status: 500 }
        )
      }
      
      pipelineId = fallbackPipeline.id
      stageId = (fallbackPipeline.pipeline_stages as any[])?.[0]?.id
      routingMethod = 'fallback_error'
    }

    // 7. Create deal with routed pipeline
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        tenant_id,
        contact_id: mapping.crm_contact_id,
        pipeline_id: pipelineId,
        stage_id: stageId,
        title: `${treatment_type} - Treatment Plan`,
        value_estimate_cents: estimatedCostCents,
        source: 'PMS',
        pms_treatment_id,
        treatment_type,
        procedure_codes,
        treatment_tags: treatmentTags, // Store extracted tags
        custom_fields: {
          routing_log_id: routingLogId,
          routing_method: routingMethod,
          pms_integration_id: integration_id,
          pms_provider_name: provider_name,
        },
      })
      .select()
      .single()

    if (dealError) {
      console.error('[PMS WEBHOOK] Deal creation error:', dealError)
      return NextResponse.json(
        { error: 'Failed to create deal', details: dealError },
        { status: 500 }
      )
    }

    // 8. Link deal to treatment plan
    await supabase
      .from('treatment_plans')
      .update({ crm_deal_id: deal.id })
      .eq('id', treatmentPlan.id)

    // 9. Log sync operation with routing details
    await supabase
      .from('pms_sync_logs')
      .insert({
        tenant_id,
        integration_id,
        sync_type: 'treatment_plan',
        direction: 'pms_to_crm',
        status: 'success',
        records_processed: 1,
        records_created: 1,
        metadata: {
          treatment_type,
          procedure_codes,
          treatment_tags: treatmentTags,
          routing_method: routingMethod,
          routed_pipeline_id: pipelineId,
        },
        completed_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Treatment plan synced and deal created with intelligent routing',
      deal_id: deal.id,
      treatment_plan_id: treatmentPlan.id,
      treatment_tags: treatmentTags,
      routing_method: routingMethod,
      pipeline_id: pipelineId,
      stage_id: stageId,
    })

  } catch (error: any) {
    console.error('[PMS WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}


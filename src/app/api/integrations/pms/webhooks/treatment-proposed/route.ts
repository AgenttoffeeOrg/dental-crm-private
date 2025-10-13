// =====================================================
// TREATMENT PROPOSED WEBHOOK
// =====================================================
// Receives webhook when treatment plan is proposed in PMS
// Auto-creates deal in CRM
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { PMSSyncEngine } from '@/lib/integrations/pms/sync-engine'

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

    // 5. Get default pipeline and stage
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id, pipeline_stages(id, name)')
      .eq('tenant_id', tenant_id)
      .eq('is_default', true)
      .single()

    if (!pipeline) {
      return NextResponse.json(
        { error: 'No default pipeline found' },
        { status: 500 }
      )
    }

    // Find appropriate stage
    const stages = pipeline.pipeline_stages as any[]
    const proposalStage = stages.find(s => 
      s.name.toLowerCase().includes('proposal') ||
      s.name.toLowerCase().includes('treatment plan')
    ) || stages[0]

    // 6. Create deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        tenant_id,
        contact_id: mapping.crm_contact_id,
        pipeline_id: pipeline.id,
        stage_id: proposalStage.id,
        title: `${treatment_type} - Treatment Plan`,
        value_estimate_cents: estimatedCostCents,
        source: 'PMS',
        pms_treatment_id,
        treatment_type,
        procedure_codes
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

    // 7. Link deal to treatment plan
    await supabase
      .from('treatment_plans')
      .update({ crm_deal_id: deal.id })
      .eq('id', treatmentPlan.id)

    // 8. Log sync operation
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
        completed_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Treatment plan synced and deal created',
      deal_id: deal.id,
      treatment_plan_id: treatmentPlan.id
    })

  } catch (error: any) {
    console.error('[PMS WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}


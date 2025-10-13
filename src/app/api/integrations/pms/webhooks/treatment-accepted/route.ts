import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { tenant_id, pms_treatment_id, accepted_cost, accepted_at } = payload

    const supabase = createServiceClient()

    // 1. Find treatment plan
    const { data: treatmentPlan } = await supabase
      .from('treatment_plans')
      .select('id, crm_deal_id, crm_contact_id')
      .eq('pms_treatment_id', pms_treatment_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!treatmentPlan) {
      return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 })
    }

    // 2. Update treatment plan status
    await supabase
      .from('treatment_plans')
      .update({
        status: 'accepted',
        accepted_cost_cents: accepted_cost ? Math.round(accepted_cost * 100) : null,
        accepted_at: accepted_at || new Date().toISOString()
      })
      .eq('id', treatmentPlan.id)

    // 3. Move deal to "Won" stage if deal exists
    if (treatmentPlan.crm_deal_id) {
      // Get "Won" stage
      const { data: wonStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('tenant_id', tenant_id)
        .ilike('name', '%won%')
        .limit(1)
        .single()

      if (wonStage) {
        await supabase
          .from('deals')
          .update({
            stage_id: wonStage.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', treatmentPlan.crm_deal_id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Treatment accepted, deal marked as won'
    })

  } catch (error: any) {
    console.error('[PMS WEBHOOK] Treatment accepted error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


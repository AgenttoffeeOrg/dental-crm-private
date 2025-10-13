import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { tenant_id, pms_treatment_id, decline_reason, declined_at } = payload

    const supabase = createClient()

    // 1. Find treatment plan
    const { data: treatmentPlan } = await supabase
      .from('treatment_plans')
      .select('id, crm_deal_id')
      .eq('pms_treatment_id', pms_treatment_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!treatmentPlan) {
      return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 })
    }

    // 2. Update treatment plan
    await supabase
      .from('treatment_plans')
      .update({
        status: 'declined',
        decline_reason,
        declined_at: declined_at || new Date().toISOString()
      })
      .eq('id', treatmentPlan.id)

    // 3. Move deal to "Lost" if exists
    if (treatmentPlan.crm_deal_id) {
      const { data: lostStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('tenant_id', tenant_id)
        .ilike('name', '%lost%')
        .limit(1)
        .single()

      if (lostStage) {
        await supabase
          .from('deals')
          .update({
            stage_id: lostStage.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', treatmentPlan.crm_deal_id)

        // Record loss reason
        await supabase
          .from('deal_outcomes')
          .insert({
            tenant_id,
            deal_id: treatmentPlan.crm_deal_id,
            outcome: 'lost',
            primary_reason: decline_reason || 'Patient declined treatment',
            recorded_at: new Date().toISOString()
          })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Treatment declined, deal marked as lost'
    })

  } catch (error: any) {
    console.error('[PMS WEBHOOK] Treatment declined error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


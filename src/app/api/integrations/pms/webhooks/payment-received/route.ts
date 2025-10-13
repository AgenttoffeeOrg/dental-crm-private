import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const {
      tenant_id,
      integration_id,
      pms_payment_id,
      pms_treatment_id,
      amount,
      payment_method,
      payment_date,
      insurance_paid,
      patient_paid
    } = payload

    const supabase = createClient()

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

    // 2. Create payment record
    const { data: payment } = await supabase
      .from('treatment_payments')
      .insert({
        tenant_id,
        integration_id,
        treatment_plan_id: treatmentPlan.id,
        crm_deal_id: treatmentPlan.crm_deal_id,
        crm_contact_id: treatmentPlan.crm_contact_id,
        pms_payment_id,
        amount_cents: Math.round(amount * 100),
        payment_method: payment_method || 'other',
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        insurance_paid_cents: insurance_paid ? Math.round(insurance_paid * 100) : 0,
        patient_paid_cents: patient_paid ? Math.round(patient_paid * 100) : 0,
        payment_status: 'completed'
      })
      .select()
      .single()

    // Trigger will automatically:
    // - Update contact.lifetime_value_actual_cents
    // - Update deal.actual_revenue_cents

    // 3. Update treatment plan
    await supabase
      .from('treatment_plans')
      .update({
        actual_paid_cents: supabase
          .from('treatment_payments')
          .select('amount_cents')
          .eq('treatment_plan_id', treatmentPlan.id)
          .sum('amount_cents')
      })
      .eq('id', treatmentPlan.id)

    return NextResponse.json({
      success: true,
      message: 'Payment received and LTV updated',
      payment_id: payment.id
    })

  } catch (error: any) {
    console.error('[PMS WEBHOOK] Payment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


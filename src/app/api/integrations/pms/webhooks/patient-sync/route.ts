import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const {
      tenant_id,
      integration_id,
      pms_patient_id,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      address
    } = payload

    const supabase = createServiceClient()

    // 1. Check if patient mapping exists
    const { data: existingMapping } = await supabase
      .from('pms_patient_mappings')
      .select('crm_contact_id')
      .eq('pms_patient_id', pms_patient_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (existingMapping) {
      // Update existing contact
      await supabase
        .from('contacts')
        .update({
          full_name: `${first_name} ${last_name}`,
          primary_email: email,
          primary_phone: phone,
          pms_patient_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMapping.crm_contact_id)

      return NextResponse.json({
        success: true,
        message: 'Contact updated',
        contact_id: existingMapping.crm_contact_id,
        is_new: false
      })
    }

    // 2. Try to find existing contact by email or phone
    let existingContact = null

    if (email) {
      const { data } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('primary_email', email)
        .single()
      existingContact = data
    }

    if (!existingContact && phone) {
      const { data } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('primary_phone', phone)
        .single()
      existingContact = data
    }

    if (existingContact) {
      // Link existing contact to PMS patient
      await supabase
        .from('contacts')
        .update({
          pms_patient_id,
          pms_provider: 'generic'
        })
        .eq('id', existingContact.id)

      await supabase
        .from('pms_patient_mappings')
        .insert({
          tenant_id,
          integration_id,
          crm_contact_id: existingContact.id,
          pms_patient_id,
          pms_provider: 'generic'
        })

      return NextResponse.json({
        success: true,
        message: 'Existing contact linked to PMS patient',
        contact_id: existingContact.id,
        is_new: false
      })
    }

    // 3. Create new contact
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        tenant_id,
        full_name: `${first_name} ${last_name}`,
        primary_email: email,
        primary_phone: phone,
        source: 'PMS',
        pms_patient_id,
        pms_provider: 'generic'
      })
      .select()
      .single()

    // 4. Create mapping
    await supabase
      .from('pms_patient_mappings')
      .insert({
        tenant_id,
        integration_id,
        crm_contact_id: newContact.id,
        pms_patient_id,
        pms_provider: 'generic'
      })

    return NextResponse.json({
      success: true,
      message: 'New contact created from PMS patient',
      contact_id: newContact.id,
      is_new: true
    })

  } catch (error: any) {
    console.error('[PMS WEBHOOK] Patient sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


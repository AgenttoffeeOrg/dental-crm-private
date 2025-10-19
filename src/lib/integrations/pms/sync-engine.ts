// =====================================================
// PMS SYNC ENGINE
// =====================================================
// Bidirectional synchronization between CRM and PMS
// With Universal Treatment Tag Routing Integration
// =====================================================

import { createClient } from '@/lib/supabase-client'
import { PMSPatient, PMSTreatmentPlan, PMSPayment, SyncResult } from './types'
import { quickRouteDeal } from '@/lib/treatment-routing'
import { extractTagsFromDealText } from '@/lib/treatment-routing/ai-extractor'

export class PMSSyncEngine {
  private tenantId: string
  private integrationId: string

  constructor(tenantId: string, integrationId: string) {
    this.tenantId = tenantId
    this.integrationId = integrationId
  }

  // =====================================================
  // PATIENT SYNC (PMS → CRM)
  // =====================================================

  async syncPatientToCRM(pmsPatient: PMSPatient): Promise<{
    contactId: string
    isNew: boolean
  }> {
    const supabase = createClient()

    // 1. Try to find existing contact
    const existingContact = await this.findMatchingContact(pmsPatient)

    if (existingContact) {
      // Update existing contact
      await supabase
        .from('contacts')
        .update({
          full_name: `${pmsPatient.firstName} ${pmsPatient.lastName}`,
          primary_email: pmsPatient.email || existingContact.primary_email,
          primary_phone: pmsPatient.phone || existingContact.primary_phone,
          pms_patient_id: pmsPatient.id,
          pms_provider: 'generic',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingContact.id)

      // Update mapping
      await supabase
        .from('pms_patient_mappings')
        .upsert({
          tenant_id: this.tenantId,
          integration_id: this.integrationId,
          crm_contact_id: existingContact.id,
          pms_patient_id: pmsPatient.id,
          pms_provider: 'generic',
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced'
        })

      return { contactId: existingContact.id, isNew: false }
    } else {
      // Create new contact
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          tenant_id: this.tenantId,
          full_name: `${pmsPatient.firstName} ${pmsPatient.lastName}`,
          primary_email: pmsPatient.email,
          primary_phone: pmsPatient.phone,
          source: 'PMS',
          pms_patient_id: pmsPatient.id,
          pms_provider: 'generic'
        })
        .select()
        .single()

      if (!newContact) {
        throw new Error('Failed to create contact')
      }

      // Create mapping
      await supabase
        .from('pms_patient_mappings')
        .insert({
          tenant_id: this.tenantId,
          integration_id: this.integrationId,
          crm_contact_id: newContact.id,
          pms_patient_id: pmsPatient.id,
          pms_provider: 'generic',
          sync_status: 'synced'
        })

      return { contactId: newContact.id, isNew: true }
    }
  }

  // =====================================================
  // TREATMENT PLAN SYNC (PMS → CRM)
  // =====================================================

  async syncTreatmentPlanToCRM(
    pmsTreatment: PMSTreatmentPlan,
    autoCreateDeal: boolean = true
  ): Promise<{
    treatmentPlanId: string
    dealId?: string
    dealCreated: boolean
  }> {
    const supabase = createClient()

    // 1. Find or create contact
    const { data: patient } = await supabase
      .from('pms_patient_mappings')
      .select('crm_contact_id')
      .eq('pms_patient_id', pmsTreatment.patientId)
      .eq('integration_id', this.integrationId)
      .single()

    if (!patient) {
      throw new Error(`Patient ${pmsTreatment.patientId} not found in CRM`)
    }

    // 2. Create treatment plan record
    const { data: treatmentPlan } = await supabase
      .from('treatment_plans')
      .upsert({
        tenant_id: this.tenantId,
        integration_id: this.integrationId,
        pms_treatment_id: pmsTreatment.id,
        pms_patient_id: pmsTreatment.patientId,
        crm_contact_id: patient.crm_contact_id,
        treatment_type: pmsTreatment.treatmentType,
        treatment_description: pmsTreatment.description,
        procedure_codes: pmsTreatment.procedureCodes,
        tooth_numbers: pmsTreatment.toothNumbers,
        provider_name: pmsTreatment.providerName,
        estimated_cost_cents: pmsTreatment.estimatedCost,
        status: pmsTreatment.status,
        proposed_at: pmsTreatment.proposedAt.toISOString(),
        accepted_at: pmsTreatment.acceptedAt?.toISOString(),
        declined_at: pmsTreatment.declinedAt?.toISOString(),
        decline_reason: pmsTreatment.declineReason,
        completed_at: pmsTreatment.completedAt?.toISOString()
      }, {
        onConflict: 'pms_treatment_id,integration_id,tenant_id'
      })
      .select()
      .single()

    if (!treatmentPlan) {
      throw new Error('Failed to create treatment plan')
    }

    // 3. Auto-create deal if enabled and meets criteria
    let dealId: string | undefined
    let dealCreated = false

    if (autoCreateDeal && pmsTreatment.status === 'proposed') {
      const dealResult = await this.createDealFromTreatment(treatmentPlan.id, patient.crm_contact_id, pmsTreatment)
      dealId = dealResult.dealId
      dealCreated = dealResult.created
    }

    return {
      treatmentPlanId: treatmentPlan.id,
      dealId,
      dealCreated
    }
  }

  // =====================================================
  // PAYMENT SYNC (PMS → CRM)
  // =====================================================

  async syncPaymentToCRM(pmsPayment: PMSPayment): Promise<string> {
    const supabase = createClient()

    // Find treatment plan
    const { data: treatmentPlan } = await supabase
      .from('treatment_plans')
      .select('id, crm_deal_id, crm_contact_id')
      .eq('pms_treatment_id', pmsPayment.treatmentPlanId)
      .eq('integration_id', this.integrationId)
      .single()

    // Create payment record
    const { data: payment } = await supabase
      .from('treatment_payments')
      .insert({
        tenant_id: this.tenantId,
        integration_id: this.integrationId,
        treatment_plan_id: treatmentPlan?.id,
        crm_deal_id: treatmentPlan?.crm_deal_id,
        crm_contact_id: treatmentPlan?.crm_contact_id,
        pms_payment_id: pmsPayment.id,
        amount_cents: pmsPayment.amount,
        payment_method: pmsPayment.paymentMethod,
        payment_date: pmsPayment.paymentDate,
        insurance_paid_cents: pmsPayment.insurancePaid || 0,
        patient_paid_cents: pmsPayment.patientPaid || 0,
        payment_status: 'completed'
      })
      .select()
      .single()

    // Trigger will auto-update contact LTV and deal actual revenue
    return payment.id
  }

  // =====================================================
  // HELPER: CREATE DEAL FROM TREATMENT
  // =====================================================

  private async createDealFromTreatment(
    treatmentPlanId: string,
    contactId: string,
    pmsTreatment: PMSTreatmentPlan
  ): Promise<{ dealId: string; created: boolean }> {
    const supabase = createClient()

    // Get integration settings
    const { data: integration } = await supabase
      .from('pms_integrations')
      .select('min_deal_value_cents, excluded_procedure_codes, auto_create_deals')
      .eq('id', this.integrationId)
      .single()

    if (!integration?.auto_create_deals) {
      return { dealId: '', created: false }
    }

    // Check if meets minimum value
    if (pmsTreatment.estimatedCost < (integration.min_deal_value_cents || 0)) {
      return { dealId: '', created: false }
    }

    // Check if procedure is excluded
    const hasExcludedCode = pmsTreatment.procedureCodes?.some(code =>
      integration.excluded_procedure_codes?.includes(code)
    )
    if (hasExcludedCode) {
      return { dealId: '', created: false }
    }

    // ===== PHASE 11: UNIVERSAL ROUTING FOR PMS SYNC ENGINE =====
    console.log(`[PMS SYNC ENGINE] Extracting treatment tags for: ${pmsTreatment.treatmentType}`)
    
    let treatmentTags: string[] = []
    
    // Strategy 1: Check for procedure code → tag mappings
    if (pmsTreatment.procedureCodes && pmsTreatment.procedureCodes.length > 0) {
      try {
        const { data: pmsMappings } = await supabase
          .from('pms_procedure_tag_mappings')
          .select('treatment_tag_name')
          .eq('tenant_id', this.tenantId)
          .in('procedure_code', pmsTreatment.procedureCodes)
        
        if (pmsMappings && pmsMappings.length > 0) {
          treatmentTags = [...new Set(pmsMappings.map(m => m.treatment_tag_name))]
          console.log(`[PMS SYNC ENGINE] Mapped ${pmsTreatment.procedureCodes} to tags:`, treatmentTags)
        }
      } catch (error) {
        console.warn('[PMS SYNC ENGINE] Failed to lookup procedure mappings:', error)
      }
    }
    
    // Strategy 2: AI extraction from treatment type + description
    if (treatmentTags.length === 0) {
      try {
        const treatmentText = [
          pmsTreatment.treatmentType,
          pmsTreatment.description,
          pmsTreatment.procedureCodes?.join(' '),
        ].filter(Boolean).join(' ')
        
        const extractionResult = await extractTagsFromDealText(treatmentText, this.tenantId)
        treatmentTags = extractionResult.extractedTags.map(t => t.tagName)
        console.log(`[PMS SYNC ENGINE] AI extracted ${treatmentTags.length} tags:`, treatmentTags)
      } catch (error) {
        console.error('[PMS SYNC ENGINE] AI tag extraction failed:', error)
        // Continue with empty tags - will route to unsorted
      }
    }

    // Use universal routing engine
    let pipelineId: string
    let stageId: string
    let routingMethod: string
    let routingLogId: string | undefined
    
    try {
      const routingResult = await quickRouteDeal({
        dealTitle: `${pmsTreatment.treatmentType} - Treatment`,
        dealDescription: pmsTreatment.description || '',
        contactId,
        orgId: this.tenantId,
        treatmentTags,
        userOverridePipeline: undefined,
        source: 'pms_sync',
      })
      
      pipelineId = routingResult.pipelineId
      stageId = routingResult.stageId
      routingMethod = routingResult.routingMethod
      routingLogId = routingResult.routingLogId
      
      console.log(`[PMS SYNC ENGINE] ✅ Routed to pipeline ${pipelineId} via ${routingMethod}`)
    } catch (routingError) {
      console.error('[PMS SYNC ENGINE] Routing failed, using fallback:', routingError)
      
      // Fallback: Get default pipeline
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id, pipeline_stages(id, name)')
        .eq('tenant_id', this.tenantId)
        .eq('is_default', true)
        .single()

      if (!pipeline) {
        throw new Error('No default pipeline found')
      }

      // Find "Proposal" stage or first stage
      const proposalStage = (pipeline.pipeline_stages as any[])?.find(s => 
        s.name.toLowerCase().includes('proposal')
      ) || (pipeline.pipeline_stages as any[])?.[0]

      pipelineId = pipeline.id
      stageId = proposalStage.id
      routingMethod = 'fallback_error'
    }

    // Create deal with routing
    const { data: deal } = await supabase
      .from('deals')
      .insert({
        tenant_id: this.tenantId,
        contact_id: contactId,
        pipeline_id: pipelineId,
        stage_id: stageId,
        title: `${pmsTreatment.treatmentType} - Treatment`,
        value_estimate_cents: pmsTreatment.estimatedCost,
        source: 'PMS',
        pms_treatment_id: pmsTreatment.id,
        treatment_type: pmsTreatment.treatmentType,
        procedure_codes: pmsTreatment.procedureCodes,
        treatment_tags: treatmentTags,
        custom_fields: {
          routing_log_id: routingLogId,
          routing_method: routingMethod,
          pms_integration_id: this.integrationId,
          pms_provider_name: pmsTreatment.providerName,
        },
      })
      .select()
      .single()

    if (!deal) {
      throw new Error('Failed to create deal')
    }

    // Link treatment plan to deal
    await supabase
      .from('treatment_plans')
      .update({ crm_deal_id: deal.id })
      .eq('id', treatmentPlanId)

    return { dealId: deal.id, created: true }
  }

  // =====================================================
  // HELPER: FIND MATCHING CONTACT
  // =====================================================

  private async findMatchingContact(pmsPatient: PMSPatient): Promise<any | null> {
    const supabase = createClient()

    // 1. Try exact PMS patient ID match
    if (pmsPatient.id) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('pms_patient_id', pmsPatient.id)
        .single()

      if (data) return data
    }

    // 2. Try email match
    if (pmsPatient.email) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('primary_email', pmsPatient.email)
        .single()

      if (data) return data
    }

    // 3. Try phone match
    if (pmsPatient.phone) {
      const normalizedPhone = this.normalizePhone(pmsPatient.phone)
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .ilike('primary_phone', `%${normalizedPhone.slice(-10)}%`)
        .single()

      if (data) return data
    }

    // 4. Try name match (fuzzy)
    const fullName = `${pmsPatient.firstName} ${pmsPatient.lastName}`.toLowerCase()
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .ilike('full_name', `%${fullName}%`)
      .limit(1)
      .single()

    return data || null
  }

  // =====================================================
  // PLACEHOLDERS (Implement when needed)
  // =====================================================

  async getPatient(patientId: string): Promise<PMSPatient> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getAllPatients(since?: Date): Promise<PMSPatient[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async createPatient(patient: Partial<PMSPatient>): Promise<string> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async updatePatient(patientId: string, data: Partial<PMSPatient>): Promise<void> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async searchPatients(query: any): Promise<PMSPatient[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getTreatmentPlans(patientId: string): Promise<PMSTreatmentPlan[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getTreatmentPlan(treatmentId: string): Promise<PMSTreatmentPlan> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getRecentTreatmentPlans(since: Date): Promise<PMSTreatmentPlan[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getPayments(patientId: string): Promise<PMSPayment[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getTreatmentPayments(treatmentId: string): Promise<PMSPayment[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getRecentPayments(since: Date): Promise<PMSPayment[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getAppointments(patientId: string): Promise<any[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async getRecentAppointments(since: Date): Promise<any[]> {
    throw new Error('Not implemented - override in specific adapter')
  }

  async createAppointment(appointment: any): Promise<string> {
    throw new Error('Not implemented - override in specific adapter')
  }
}



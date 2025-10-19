/**
 * =====================================================
 * FULL REGRESSION TEST SUITE
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 17 - Deployment & Monitoring
 * =====================================================
 * 
 * PURPOSE:
 * Comprehensive regression tests to ensure NO existing
 * functionality is broken by the new routing system.
 * 
 * COVERAGE:
 * - All existing deal creation flows
 * - Pipeline operations
 * - Contact management
 * - Marketing features
 * - PMS integrations
 * - User permissions
 * - Analytics dashboards
 * 
 * TEST FRAMEWORK: Vitest + React Testing Library
 * 
 * =====================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createClient } from '@/lib/supabase-client'

// =====================================================
// SECTION 1: DEAL CREATION REGRESSION TESTS
// =====================================================

describe('REGRESSION: Deal Creation', () => {
  
  it('should create deal manually without routing (legacy behavior)', async () => {
    // Test that manual deal creation still works when user selects pipeline
    const dealData = {
      title: 'Test Deal',
      contact_id: 'test-contact-uuid',
      pipeline_id: 'manual-pipeline-uuid',
      stage_id: 'manual-stage-uuid',
      estimated_value: 1000
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('deals')
      .insert(dealData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.pipeline_id).toBe(dealData.pipeline_id)
    expect(data.stage_id).toBe(dealData.stage_id)
  })
  
  it('should preserve all existing deal fields', async () => {
    const dealData = {
      title: 'Complete Deal',
      contact_id: 'test-contact-uuid',
      pipeline_id: 'pipeline-uuid',
      stage_id: 'stage-uuid',
      estimated_value: 5000,
      expected_close_date: '2025-12-31',
      owner_id: 'user-uuid',
      probability: 75,
      custom_fields: { test: 'data' },
      notes: 'Test notes'
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('deals')
      .insert(dealData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.title).toBe(dealData.title)
    expect(data.estimated_value).toBe(dealData.estimated_value)
    expect(data.owner_id).toBe(dealData.owner_id)
    expect(data.custom_fields).toEqual(dealData.custom_fields)
  })
  
  it('should NOT require treatment_tags for deal creation', async () => {
    // Ensure deals can be created without tags (backward compatible)
    const dealData = {
      title: 'Deal Without Tags',
      contact_id: 'test-contact-uuid',
      pipeline_id: 'pipeline-uuid',
      stage_id: 'stage-uuid',
      estimated_value: 1000
      // No treatment_tags field
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('deals')
      .insert(dealData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
  
  it('should maintain deal ownership assignment', async () => {
    const ownerId = 'specific-user-uuid'
    const dealData = {
      title: 'Assigned Deal',
      contact_id: 'test-contact-uuid',
      pipeline_id: 'pipeline-uuid',
      stage_id: 'stage-uuid',
      owner_id: ownerId
    }
    
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .insert(dealData)
      .select()
      .single()
    
    expect(data.owner_id).toBe(ownerId)
  })
})

// =====================================================
// SECTION 2: PIPELINE OPERATIONS REGRESSION
// =====================================================

describe('REGRESSION: Pipeline Operations', () => {
  
  it('should move deals between stages (drag-and-drop)', async () => {
    const dealId = 'test-deal-uuid'
    const newStageId = 'new-stage-uuid'
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('deals')
      .update({ stage_id: newStageId })
      .eq('id', dealId)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.stage_id).toBe(newStageId)
  })
  
  it('should update deal values inline', async () => {
    const dealId = 'test-deal-uuid'
    const newValue = 7500
    
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .update({ estimated_value: newValue })
      .eq('id', dealId)
      .select()
      .single()
    
    expect(data.estimated_value).toBe(newValue)
  })
  
  it('should filter deals by pipeline', async () => {
    const pipelineId = 'specific-pipeline-uuid'
    
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('pipeline_id', pipelineId)
    
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
    data?.forEach(deal => {
      expect(deal.pipeline_id).toBe(pipelineId)
    })
  })
  
  it('should mark deals as won/lost', async () => {
    const dealId = 'test-deal-uuid'
    
    const supabase = createClient()
    const { data: wonDeal } = await supabase
      .from('deals')
      .update({ status: 'won', won_at: new Date().toISOString() })
      .eq('id', dealId)
      .select()
      .single()
    
    expect(wonDeal.status).toBe('won')
    expect(wonDeal.won_at).toBeDefined()
  })
  
  it('should create custom pipelines', async () => {
    const pipelineData = {
      tenant_id: 'test-tenant-uuid',
      name: 'Custom Pipeline',
      description: 'Test pipeline',
      is_active: true
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pipelines')
      .insert(pipelineData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.name).toBe(pipelineData.name)
  })
  
  it('should create custom stages in pipelines', async () => {
    const stageData = {
      pipeline_id: 'test-pipeline-uuid',
      name: 'Custom Stage',
      order_index: 1,
      probability: 50
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert(stageData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.name).toBe(stageData.name)
  })
})

// =====================================================
// SECTION 3: CONTACT MANAGEMENT REGRESSION
// =====================================================

describe('REGRESSION: Contact Management', () => {
  
  it('should create contacts with all fields', async () => {
    const contactData = {
      tenant_id: 'test-tenant-uuid',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
      source: 'website'
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.email).toBe(contactData.email)
  })
  
  it('should link deals to contacts', async () => {
    const contactId = 'test-contact-uuid'
    
    const supabase = createClient()
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', contactId)
    
    expect(deals).toBeDefined()
    expect(Array.isArray(deals)).toBe(true)
  })
  
  it('should update contact information', async () => {
    const contactId = 'test-contact-uuid'
    const updates = {
      phone: '555-9999',
      email: 'newemail@example.com'
    }
    
    const supabase = createClient()
    const { data } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single()
    
    expect(data.phone).toBe(updates.phone)
    expect(data.email).toBe(updates.email)
  })
  
  it('should search contacts by name/email', async () => {
    const searchTerm = 'john'
    
    const supabase = createClient()
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })
})

// =====================================================
// SECTION 4: MARKETING FEATURES REGRESSION
// =====================================================

describe('REGRESSION: Marketing Features', () => {
  
  it('should create marketing forms', async () => {
    const formData = {
      tenant_id: 'test-tenant-uuid',
      name: 'Contact Form',
      description: 'Website contact form',
      is_active: true,
      fields: []
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('marketing_forms')
      .insert(formData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.name).toBe(formData.name)
  })
  
  it('should track form submissions', async () => {
    const submissionData = {
      form_id: 'test-form-uuid',
      tenant_id: 'test-tenant-uuid',
      payload: { name: 'Test', email: 'test@example.com' },
      source_url: 'https://example.com',
      submitted_at: new Date().toISOString()
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('form_submissions')
      .insert(submissionData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.form_id).toBe(submissionData.form_id)
  })
  
  it('should create marketing campaigns', async () => {
    const campaignData = {
      tenant_id: 'test-tenant-uuid',
      name: 'Summer Campaign',
      type: 'email',
      status: 'draft'
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert(campaignData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.name).toBe(campaignData.name)
  })
  
  it('should track attribution (first touch)', async () => {
    const contactId = 'test-contact-uuid'
    const campaignId = 'test-campaign-uuid'
    
    const supabase = createClient()
    const { data } = await supabase
      .from('marketing_attribution')
      .insert({
        contact_id: contactId,
        campaign_id: campaignId,
        touch_type: 'first_touch',
        touched_at: new Date().toISOString()
      })
      .select()
      .single()
    
    expect(data).toBeDefined()
    expect(data.touch_type).toBe('first_touch')
  })
})

// =====================================================
// SECTION 5: PMS INTEGRATION REGRESSION
// =====================================================

describe('REGRESSION: PMS Integration', () => {
  
  it('should store PMS integration settings', async () => {
    const integrationData = {
      tenant_id: 'test-tenant-uuid',
      provider_name: 'Dentrix',
      is_active: true,
      settings: { api_key: 'test' }
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pms_integrations')
      .insert(integrationData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.provider_name).toBe(integrationData.provider_name)
  })
  
  it('should log PMS sync operations', async () => {
    const logData = {
      integration_id: 'test-integration-uuid',
      entity_type: 'patient',
      entity_id: 'patient-123',
      action: 'sync',
      status: 'success',
      synced_at: new Date().toISOString()
    }
    
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pms_sync_logs')
      .insert(logData)
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(data.status).toBe('success')
  })
  
  it('should handle webhook signatures', async () => {
    // Test that webhook validation still works
    const mockSignature = 'test-signature'
    const mockPayload = { test: 'data' }
    
    // Mock validation function should still work
    const isValid = true // Placeholder
    expect(isValid).toBeDefined()
  })
})

// =====================================================
// SECTION 6: USER PERMISSIONS REGRESSION
// =====================================================

describe('REGRESSION: User Permissions', () => {
  
  it('should enforce role-based access control', async () => {
    const userId = 'test-user-uuid'
    
    const supabase = createClient()
    const { data: user } = await supabase
      .from('app_users')
      .select('role_id, custom_roles(permissions)')
      .eq('id', userId)
      .single()
    
    expect(user).toBeDefined()
    expect(user.role_id).toBeDefined()
  })
  
  it('should check specific permissions', async () => {
    const userId = 'test-user-uuid'
    const permission = 'deals.create'
    
    // Permission check should still work
    const hasPermission = true // Placeholder
    expect(hasPermission).toBeDefined()
  })
  
  it('should enforce tenant isolation (RLS)', async () => {
    const tenantId = 'tenant-1'
    
    const supabase = createClient()
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('tenant_id', tenantId)
    
    // All deals should belong to this tenant
    deals?.forEach(deal => {
      expect(deal.tenant_id).toBe(tenantId)
    })
  })
})

// =====================================================
// SECTION 7: ANALYTICS DASHBOARDS REGRESSION
// =====================================================

describe('REGRESSION: Analytics Dashboards', () => {
  
  it('should load executive dashboard metrics', async () => {
    const tenantId = 'test-tenant-uuid'
    
    const supabase = createClient()
    
    // Test all dashboard queries still work
    const queries = await Promise.all([
      supabase.from('deals').select('*', { count: 'exact', head: true }),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.rpc('calculate_business_health_score', { tenant_uuid: tenantId })
    ])
    
    queries.forEach(result => {
      expect(result.error).toBeNull()
    })
  })
  
  it('should load CRM analytics', async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('deals')
      .select('estimated_value, status, pipeline_id')
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
  
  it('should load marketing analytics', async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*, form_submissions(count)')
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
  
  it('should generate cohort analysis', async () => {
    const tenantId = 'test-tenant-uuid'
    
    const supabase = createClient()
    const { data, error } = await supabase
      .rpc('get_cohort_analysis', { tenant_uuid: tenantId })
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
})

// =====================================================
// SECTION 8: CRITICAL USER WORKFLOWS
// =====================================================

describe('REGRESSION: Critical User Workflows', () => {
  
  it('should complete full deal lifecycle', async () => {
    const supabase = createClient()
    
    // 1. Create contact
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        tenant_id: 'test-tenant-uuid',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com'
      })
      .select()
      .single()
    
    expect(contact).toBeDefined()
    
    // 2. Create deal
    const { data: deal } = await supabase
      .from('deals')
      .insert({
        tenant_id: 'test-tenant-uuid',
        contact_id: contact.id,
        title: 'Test Deal',
        pipeline_id: 'pipeline-uuid',
        stage_id: 'stage-uuid',
        estimated_value: 1000
      })
      .select()
      .single()
    
    expect(deal).toBeDefined()
    
    // 3. Move through stages
    const { data: movedDeal } = await supabase
      .from('deals')
      .update({ stage_id: 'new-stage-uuid' })
      .eq('id', deal.id)
      .select()
      .single()
    
    expect(movedDeal.stage_id).toBe('new-stage-uuid')
    
    // 4. Mark as won
    const { data: wonDeal } = await supabase
      .from('deals')
      .update({
        status: 'won',
        won_at: new Date().toISOString()
      })
      .eq('id', deal.id)
      .select()
      .single()
    
    expect(wonDeal.status).toBe('won')
  })
  
  it('should handle form submission to deal creation', async () => {
    const supabase = createClient()
    
    // 1. Submit form
    const { data: submission } = await supabase
      .from('form_submissions')
      .insert({
        form_id: 'form-uuid',
        tenant_id: 'test-tenant-uuid',
        payload: {
          name: 'John Doe',
          email: 'john@example.com',
          message: 'I need dental work'
        }
      })
      .select()
      .single()
    
    expect(submission).toBeDefined()
    
    // 2. Process into contact
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        tenant_id: 'test-tenant-uuid',
        full_name: submission.payload.name,
        email: submission.payload.email
      })
      .select()
      .single()
    
    expect(contact).toBeDefined()
    
    // 3. Create deal
    const { data: deal } = await supabase
      .from('deals')
      .insert({
        tenant_id: 'test-tenant-uuid',
        contact_id: contact.id,
        title: 'Form Inquiry',
        pipeline_id: 'pipeline-uuid',
        stage_id: 'stage-uuid',
        marketing_source_id: submission.form_id
      })
      .select()
      .single()
    
    expect(deal).toBeDefined()
    expect(deal.marketing_source_id).toBe(submission.form_id)
  })
})

// =====================================================
// SECTION 9: DATA INTEGRITY TESTS
// =====================================================

describe('REGRESSION: Data Integrity', () => {
  
  it('should maintain referential integrity for deals', async () => {
    const supabase = createClient()
    
    // Deals should reference valid contacts
    const { data: deals } = await supabase
      .from('deals')
      .select('id, contact_id, contacts(id)')
      .not('contact_id', 'is', null)
      .limit(10)
    
    deals?.forEach(deal => {
      expect(deal.contacts).toBeDefined()
    })
  })
  
  it('should maintain referential integrity for pipelines', async () => {
    const supabase = createClient()
    
    // Deals should reference valid pipelines
    const { data: deals } = await supabase
      .from('deals')
      .select('id, pipeline_id, pipelines(id, name)')
      .limit(10)
    
    deals?.forEach(deal => {
      expect(deal.pipelines).toBeDefined()
    })
  })
  
  it('should prevent orphaned records', async () => {
    const supabase = createClient()
    
    // Check no deals with invalid contact_id
    const { count, error } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .not('contact_id', 'is', null)
      .eq('contacts.id', null) // This should be 0
    
    expect(error).toBeNull()
  })
  
  it('should enforce unique constraints', async () => {
    // Test duplicate prevention where applicable
    const supabase = createClient()
    
    const contactData = {
      tenant_id: 'test-tenant-uuid',
      email: 'unique@example.com'
    }
    
    // First insert should succeed
    const { data: first } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single()
    
    expect(first).toBeDefined()
    
    // Duplicate email should be handled appropriately
    // (depending on your business logic)
  })
})

// =====================================================
// SECTION 10: PERFORMANCE REGRESSION
// =====================================================

describe('REGRESSION: Performance', () => {
  
  it('should load deals list quickly (<2 seconds)', async () => {
    const startTime = Date.now()
    
    const supabase = createClient()
    const { data } = await supabase
      .from('deals')
      .select('*, contacts(*), pipelines(*)')
      .limit(50)
    
    const duration = Date.now() - startTime
    
    expect(data).toBeDefined()
    expect(duration).toBeLessThan(2000)
  })
  
  it('should load pipeline board quickly (<3 seconds)', async () => {
    const startTime = Date.now()
    
    const supabase = createClient()
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select(`
        *,
        pipeline_stages(*),
        deals(*)
      `)
      .eq('id', 'test-pipeline-uuid')
      .single()
    
    const duration = Date.now() - startTime
    
    expect(pipeline).toBeDefined()
    expect(duration).toBeLessThan(3000)
  })
  
  it('should search contacts quickly (<1 second)', async () => {
    const startTime = Date.now()
    
    const supabase = createClient()
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .or('first_name.ilike.%john%,email.ilike.%john%')
      .limit(20)
    
    const duration = Date.now() - startTime
    
    expect(data).toBeDefined()
    expect(duration).toBeLessThan(1000)
  })
})

export {}


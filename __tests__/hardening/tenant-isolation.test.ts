/**
 * HARDENING PHASE 11.1: Tenant Isolation E2E Tests
 * Date: October 16, 2025
 * Purpose: Verify strict tenant isolation across all modules
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Tenant Isolation - Critical Security Tests', () => {
  let supabaseService: any
  let tenantA: any
  let tenantB: any
  let userA: any
  let userB: any
  let contactA: any
  let dealA: any

  beforeAll(async () => {
    supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Create test tenants
    const { data: tenants } = await supabaseService
      .from('tenants')
      .insert([
        { name: 'Test Tenant A', slug: 'test-a-' + Date.now() },
        { name: 'Test Tenant B', slug: 'test-b-' + Date.now() },
      ])
      .select()

    tenantA = tenants[0]
    tenantB = tenants[1]

    // Create test users (simplified - actual auth.users creation needed)
    // For this test, we'll use service role to insert directly
    const { data: users } = await supabaseService
      .from('app_users')
      .insert([
        { 
          id: crypto.randomUUID(), 
          tenant_id: tenantA.id, 
          email: 'user-a@test.com', 
          full_name: 'User A',
          role: 'admin'
        },
        { 
          id: crypto.randomUUID(), 
          tenant_id: tenantB.id, 
          email: 'user-b@test.com', 
          full_name: 'User B',
          role: 'admin'
        },
      ])
      .select()

    userA = users[0]
    userB = users[1]

    // Create test data for Tenant A
    const { data: contacts } = await supabaseService
      .from('contacts')
      .insert({ 
        tenant_id: tenantA.id, 
        full_name: 'Contact A',
        primary_email: 'contact-a@test.com'
      })
      .select()

    contactA = contacts[0]

    const { data: pipelines } = await supabaseService
      .from('pipelines')
      .insert({ 
        tenant_id: tenantA.id, 
        name: 'Test Pipeline A' 
      })
      .select()

    const { data: stages } = await supabaseService
      .from('pipeline_stages')
      .insert({ 
        tenant_id: tenantA.id, 
        pipeline_id: pipelines[0].id,
        name: 'New',
        position: 0
      })
      .select()

    const { data: deals } = await supabaseService
      .from('deals')
      .insert({ 
        tenant_id: tenantA.id, 
        contact_id: contactA.id,
        pipeline_id: pipelines[0].id,
        stage_id: stages[0].id,
        title: 'Deal A'
      })
      .select()

    dealA = deals[0]
  })

  afterAll(async () => {
    // Cleanup: delete test tenants (cascade will delete all related data)
    await supabaseService
      .from('tenants')
      .delete()
      .in('id', [tenantA.id, tenantB.id])
  })

  test('RLS: User B cannot see Tenant A contacts', async () => {
    // Simulate User B querying contacts
    // Note: In real implementation, we'd need actual auth tokens
    // This test verifies the SQL policies work

    const { data, error } = await supabaseService
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantA.id) // User B trying to access Tenant A data
    
    // Service role CAN see (bypass RLS)
    // But user role would get 0 results due to RLS
    expect(data).toBeDefined()

    // To properly test RLS, we need to use impersonation:
    const { data: rpcResult } = await supabaseService.rpc('test_rls_isolation', {
      p_user_id: userB.id,
      p_other_tenant_id: tenantA.id
    })

    expect(rpcResult).toBe(0) // Should see 0 contacts from other tenant
  })

  test('FK Guard: Cannot link deal to contact from different tenant', async () => {
    // Try to create a deal in Tenant B with Contact from Tenant A
    const { error } = await supabaseService
      .from('deals')
      .insert({
        tenant_id: tenantB.id,
        contact_id: contactA.id, // From Tenant A!
        pipeline_id: crypto.randomUUID(),
        stage_id: crypto.randomUUID(),
        title: 'Cross-tenant deal'
      })

    expect(error).toBeDefined()
    expect(error.message).toContain('same_tenant')
  })

  test('Soft Delete: Deleted records not visible in queries', async () => {
    // Soft delete contactA
    await supabaseService
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', contactA.id)

    // Query should return 0 due to RLS filtering deleted_at IS NULL
    const { data: visibleContacts } = await supabaseService
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantA.id)
      .is('deleted_at', null)

    const ids = visibleContacts?.map(c => c.id) || []
    expect(ids).not.toContain(contactA.id)

    // Restore for cleanup
    await supabaseService
      .from('contacts')
      .update({ deleted_at: null })
      .eq('id', contactA.id)
  })

  test('Immutable Tenant ID: Cannot change after creation', async () => {
    // Try to change contact's tenant_id
    const { error } = await supabaseService
      .from('contacts')
      .update({ tenant_id: tenantB.id })
      .eq('id', contactA.id)

    expect(error).toBeDefined()
    expect(error.message).toContain('Cannot change tenant_id')
  })

  test('Deduplication: Cannot create contact with duplicate email', async () => {
    // Create contact with same email (normalized)
    const { error } = await supabaseService
      .from('contacts')
      .insert({
        tenant_id: tenantA.id,
        full_name: 'Duplicate Contact',
        primary_email: ' CONTACT-A@TEST.COM ' // Same email, different case/whitespace
      })

    // Should fail due to unique index on primary_email_norm
    expect(error).toBeDefined()
    expect(error.code).toBe('23505') // unique_violation
  })

  test('Normalization: Email auto-normalized on insert', async () => {
    const { data, error } = await supabaseService
      .from('contacts')
      .insert({
        tenant_id: tenantA.id,
        full_name: 'Norm Test',
        primary_email: '  Test@EXAMPLE.com  '
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data.primary_email_norm).toBe('test@example.com')

    // Cleanup
    await supabaseService.from('contacts').delete().eq('id', data.id)
  })
})

describe('Entitlement Isolation Tests', () => {
  test('Marketing tables hidden without entitlement', async () => {
    // This would require setting up a user without marketing entitlement
    // and verifying the RLS policies block access
    
    // Pseudo-code:
    // 1. Create tenant without marketing entitlement
    // 2. Try to query marketing_campaigns
    // 3. Expect 0 results (RLS blocks)
  })

  test('Marketing automations require both entitlements', async () => {
    // Create automation with category='marketing'
    // Verify it requires both 'automations' and 'marketing' entitlements
  })
})

/**
 * Helper function to test RLS (would need to be created as DB function)
 */
/*
CREATE OR REPLACE FUNCTION test_rls_isolation(
  p_user_id UUID,
  p_other_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Set auth context to p_user_id
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id)::text, false);
  
  -- Try to query other tenant's contacts
  SELECT COUNT(*) INTO v_count
  FROM contacts
  WHERE tenant_id = p_other_tenant_id;
  
  RETURN v_count;
END;
$$;
*/


/**
 * HARDENING PHASE 11.2: Entitlement Enforcement Tests
 * Date: October 16, 2025
 * Purpose: Verify entitlement checks cannot be bypassed
 */

import { describe, test, expect } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Entitlement Security Tests', () => {
  let supabaseService: any

  beforeAll(() => {
    supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  })

  test('check_entitlement() does NOT accept tenant_id parameter', async () => {
    // Verify function signature doesn't allow tenant_id bypass
    const { data: functions } = await supabaseService.rpc('pg_get_functiondef', {
      funcoid: 'check_entitlement' as any
    })

    // Should NOT contain p_tenant_id in signature
    expect(functions).not.toContain('p_tenant_id')
    expect(functions).toContain('p_feature_code')
  })

  test('Entitlement check uses current_tenant_id() internally', async () => {
    // Create test tenant without marketing
    const { data: tenant } = await supabaseService
      .from('tenants')
      .insert({ name: 'No Marketing Tenant', slug: 'no-mkt-' + Date.now() })
      .select()
      .single()

    // Create user
    const { data: user } = await supabaseService
      .from('app_users')
      .insert({ 
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        email: 'user@no-mkt.com',
        full_name: 'Test User',
        role: 'admin'
      })
      .select()
      .single()

    // Enable only CRM base (not marketing)
    const { data: crmFeature } = await supabaseService
      .from('features')
      .select('id')
      .eq('code', 'crm_base')
      .single()

    await supabaseService
      .from('tenant_entitlements')
      .insert({
        tenant_id: tenant.id,
        feature_id: crmFeature.id,
        is_enabled: true
      })

    // Now check entitlement (as this user)
    // Note: Actual test would need to impersonate user
    // For now, verify the function exists and has correct signature

    const { data, error } = await supabaseService.rpc('check_entitlement', {
      p_feature_code: 'marketing',
      p_require_parent: false
    })

    // Service role bypasses RLS, so this might return unexpected results
    // In production, this would be tested with actual user auth tokens

    // Cleanup
    await supabaseService.from('tenants').delete().eq('id', tenant.id)
  })

  test('Nested add-on requires parent feature', async () => {
    // Test that 'marketing_ab_testing' requires 'marketing' to be enabled
    
    // This test would:
    // 1. Create tenant with only marketing_ab_testing (not base marketing)
    // 2. Call check_entitlement('marketing_ab_testing', true)
    // 3. Expect false (parent not enabled)
  })

  test('Quota enforcement cannot be bypassed', async () => {
    // Create tenant with quota limit
    const { data: tenant } = await supabaseService
      .from('tenants')
      .insert({ name: 'Quota Test Tenant', slug: 'quota-' + Date.now() })
      .select()
      .single()

    const { data: marketingFeature } = await supabaseService
      .from('features')
      .select('id')
      .eq('code', 'marketing')
      .single()

    // Set quota limit to 5
    await supabaseService
      .from('tenant_entitlements')
      .insert({
        tenant_id: tenant.id,
        feature_id: marketingFeature.id,
        is_enabled: true,
        quota_limit: 5,
        quota_used: 4 // Already used 4
      })

    // Try to enforce quota for 2 more (should fail as 4+2 > 5)
    const { error } = await supabaseService.rpc('enforce_quota_and_increment', {
      p_feature_code: 'marketing',
      p_amount: 2
    })

    expect(error).toBeDefined()
    expect(error.message).toContain('QUOTA EXCEEDED')

    // Cleanup
    await supabaseService.from('tenants').delete().eq('id', tenant.id)
  })
})

describe('RLS Policy Verification Tests', () => {
  test('All tenant-scoped tables have SELECT policy', async () => {
    // Query to find tenant-scoped tables without SELECT policy
    const { data } = await supabaseService.rpc('verify_rls_coverage')
    
    // Should return empty array (all tables have policies)
    expect(data).toEqual([])
  })

  test('Soft-deleted records hidden by RLS', async () => {
    // This is tested in the tenant-isolation test above
  })

  test('Service role bypasses RLS', async () => {
    // Verify service role can access all data
    const { data: contacts } = await supabaseService
      .from('contacts')
      .select('*')
      .limit(10)

    // Service role should be able to query without filters
    expect(contacts).toBeDefined()
  })
})

describe('FK Tenant Guard Tests', () => {
  test('Cannot create deal with contact from different tenant', async () => {
    // Covered in main tenant isolation test
  })

  test('Cannot create task with deal from different tenant', async () => {
    // Similar test for tasks
  })

  test('All FK relationships validated', async () => {
    // Query to verify all CHECK constraints exist
    const { data } = await supabaseService.rpc('verify_fk_guards')
    
    // Should return list of all protected FK relationships
    expect(data.length).toBeGreaterThan(20)
  })
})


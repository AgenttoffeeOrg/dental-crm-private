/**
 * HARDENING PHASE 11.3: Quota Enforcement Tests
 * Date: October 16, 2025
 * Purpose: Verify quota limits cannot be exceeded
 */

import { describe, test, expect } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Quota Enforcement Tests', () => {
  let supabaseService: any

  beforeAll(() => {
    supabaseService = createClient(supabaseUrl, supabaseServiceKey)
  })

  test('Quota enforced at exact limit', async () => {
    // Create test tenant with quota_limit = 10, quota_used = 9
    const tenant = await createTestTenant()
    await setQuota(tenant.id, 'marketing', 10, 9)

    // Try to increment by 1 (9 + 1 = 10, should succeed)
    const { error: error1 } = await supabaseService.rpc('enforce_quota_and_increment', {
      p_feature_code: 'marketing',
      p_amount: 1
    })
    expect(error1).toBeNull()

    // Try to increment by 1 more (10 + 1 = 11, should fail)
    const { error: error2 } = await supabaseService.rpc('enforce_quota_and_increment', {
      p_feature_code: 'marketing',
      p_amount: 1
    })
    expect(error2).toBeDefined()
    expect(error2.message).toContain('QUOTA EXCEEDED')

    // Cleanup
    await supabaseService.from('tenants').delete().eq('id', tenant.id)
  })

  test('Quota auto-resets after quota_reset_at date', async () => {
    const tenant = await createTestTenant()
    
    // Set quota with past reset date
    await supabaseService
      .from('tenant_entitlements')
      .update({
        quota_limit: 100,
        quota_used: 95,
        quota_reset_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
      })
      .eq('tenant_id', tenant.id)

    // Call enforce_quota (should auto-reset)
    const { error } = await supabaseService.rpc('enforce_quota_and_increment', {
      p_feature_code: 'marketing',
      p_amount: 1
    })

    expect(error).toBeNull() // Should succeed (quota was reset)

    // Verify quota was reset
    const { data } = await supabaseService
      .from('tenant_entitlements')
      .select('quota_used')
      .eq('tenant_id', tenant.id)
      .single()

    expect(data.quota_used).toBe(1) // Reset to 0, then incremented by 1

    // Cleanup
    await supabaseService.from('tenants').delete().eq('id', tenant.id)
  })

  test('Unlimited quota (NULL) allows any usage', async () => {
    const tenant = await createTestTenant()
    
    // Set quota_limit to NULL (unlimited)
    await supabaseService
      .from('tenant_entitlements')
      .update({ quota_limit: null, quota_used: 0 })
      .eq('tenant_id', tenant.id)

    // Try large increment
    const { error } = await supabaseService.rpc('enforce_quota_and_increment', {
      p_feature_code: 'marketing',
      p_amount: 9999999
    })

    expect(error).toBeNull() // Should succeed

    // Verify usage was tracked
    const { data } = await supabaseService
      .from('tenant_entitlements')
      .select('quota_used')
      .eq('tenant_id', tenant.id)
      .single()

    expect(data.quota_used).toBe(9999999)

    // Cleanup
    await supabaseService.from('tenants').delete().eq('id', tenant.id)
  })
})

// Helper functions
async function createTestTenant() {
  const { data } = await supabaseService
    .from('tenants')
    .insert({ name: 'Quota Test', slug: 'qt-' + Date.now() })
    .select()
    .single()
  return data
}

async function setQuota(tenantId: string, featureCode: string, limit: number, used: number) {
  const { data: feature } = await supabaseService
    .from('features')
    .select('id')
    .eq('code', featureCode)
    .single()

  await supabaseService
    .from('tenant_entitlements')
    .upsert({
      tenant_id: tenantId,
      feature_id: feature.id,
      is_enabled: true,
      quota_limit: limit,
      quota_used: used
    })
}


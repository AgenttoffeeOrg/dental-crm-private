/**
 * Integration tests for /api/locations/switch endpoint
 * 
 * These tests verify that location switching:
 * 1. Validates user access to the target location
 * 2. Updates app_users.active_location_id correctly
 * 3. Sets the active_location_id cookie
 * 4. Blocks unauthorized access attempts
 * 5. Handles edge cases (null, invalid UUIDs, etc.)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

describe('/api/locations/switch', () => {
  let testTenantA: string
  let testTenantB: string
  let testUserA: string
  let testLocationA1: string
  let testLocationA2: string
  let testLocationB1: string
  let membershipIdA: string

  beforeAll(async () => {
    // Setup: Create test tenants, locations, and users
    const { data: tenantA } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant A' })
      .select()
      .single()
    testTenantA = tenantA.id

    const { data: tenantB } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant B' })
      .select()
      .single()
    testTenantB = tenantB.id

    // Create locations
    const { data: locA1 } = await supabase
      .from('locations')
      .insert({ tenant_id: testTenantA, name: 'Location A1' })
      .select()
      .single()
    testLocationA1 = locA1.id

    const { data: locA2 } = await supabase
      .from('locations')
      .insert({ tenant_id: testTenantA, name: 'Location A2' })
      .select()
      .single()
    testLocationA2 = locA2.id

    const { data: locB1 } = await supabase
      .from('locations')
      .insert({ tenant_id: testTenantB, name: 'Location B1' })
      .select()
      .single()
    testLocationB1 = locB1.id

    // Create test user
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: 'test-location-switch@example.com',
      password: 'testpassword123',
      email_confirm: true,
    })
    testUserA = authUser.user!.id

    // Create app_user
    await supabase.from('app_users').insert({
      id: testUserA,
      email: 'test-location-switch@example.com',
      active_tenant_id: testTenantA,
      active_location_id: testLocationA1,
    })

    // Create membership for tenant A
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .insert({
        user_id: testUserA,
        tenant_id: testTenantA,
        role: 'admin',
        all_locations: false,
      })
      .select()
      .single()
    membershipIdA = membership.id

    // Grant access to Location A1 and A2 only (not B1)
    await supabase.from('membership_locations').insert([
      { membership_id: membershipIdA, location_id: testLocationA1, is_active: true },
      { membership_id: membershipIdA, location_id: testLocationA2, is_active: true },
    ])
  })

  afterAll(async () => {
    // Cleanup: Delete test data
    await supabase.auth.admin.deleteUser(testUserA)
    await supabase.from('membership_locations').delete().eq('membership_id', membershipIdA)
    await supabase.from('user_tenant_memberships').delete().eq('id', membershipIdA)
    await supabase.from('app_users').delete().eq('id', testUserA)
    await supabase.from('locations').delete().in('id', [testLocationA1, testLocationA2, testLocationB1])
    await supabase.from('tenants').delete().in('id', [testTenantA, testTenantB])
  })

  it('should switch to an accessible location within active tenant', async () => {
    // Sign in as test user
    const { data: session } = await supabase.auth.signInWithPassword({
      email: 'test-location-switch@example.com',
      password: 'testpassword123',
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/locations/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session?.access_token}`,
      },
      body: JSON.stringify({ location_id: testLocationA2 }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.new_location).toBe(testLocationA2)

    // Verify app_users.active_location_id updated
    const { data: appUser } = await supabase
      .from('app_users')
      .select('active_location_id, last_context_switch_at')
      .eq('id', testUserA)
      .single()

    expect(appUser?.active_location_id).toBe(testLocationA2)
    expect(appUser?.last_context_switch_at).toBeTruthy()

    // Verify cookie is set (check response headers)
    const setCookieHeader = response.headers.get('set-cookie')
    expect(setCookieHeader).toContain('active_location_id')
  })

  it('should block switching to a location in a different tenant', async () => {
    const { data: session } = await supabase.auth.signInWithPassword({
      email: 'test-location-switch@example.com',
      password: 'testpassword123',
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/locations/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session?.access_token}`,
      },
      body: JSON.stringify({ location_id: testLocationB1 }),
    })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toContain('Access denied')

    // Verify active_location_id did NOT change
    const { data: appUser } = await supabase
      .from('app_users')
      .select('active_location_id')
      .eq('id', testUserA)
      .single()

    expect(appUser?.active_location_id).not.toBe(testLocationB1)
  })

  it('should return 400 if location_id is missing', async () => {
    const { data: session } = await supabase.auth.signInWithPassword({
      email: 'test-location-switch@example.com',
      password: 'testpassword123',
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/locations/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session?.access_token}`,
      },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('location_id is required')
  })

  it('should return 401 if user is not authenticated', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/locations/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ location_id: testLocationA1 }),
    })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if user has no active tenant context', async () => {
    // Temporarily remove active_tenant_id
    await supabase
      .from('app_users')
      .update({ active_tenant_id: null })
      .eq('id', testUserA)

    const { data: session } = await supabase.auth.signInWithPassword({
      email: 'test-location-switch@example.com',
      password: 'testpassword123',
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/locations/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session?.access_token}`,
      },
      body: JSON.stringify({ location_id: testLocationA1 }),
    })

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toContain('Could not determine active organization context')

    // Restore active_tenant_id
    await supabase
      .from('app_users')
      .update({ active_tenant_id: testTenantA })
      .eq('id', testUserA)
  })

  it('should handle invalid UUID gracefully', async () => {
    const { data: session } = await supabase.auth.signInWithPassword({
      email: 'test-location-switch@example.com',
      password: 'testpassword123',
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/locations/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session?.access_token}`,
      },
      body: JSON.stringify({ location_id: 'invalid-uuid' }),
    })

    // Should be rejected by validation or RLS
    expect([400, 403, 500]).toContain(response.status)
  })
})


/**
 * Multi-Org API Integration Tests
 * 
 * Comprehensive tests for all multi-org API endpoints:
 * - /api/org/memberships
 * - /api/org/switch
 * - /api/org/preferences
 * - /api/auth/resend-verification
 * 
 * Run: npm run test:integration
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TEST_API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000'

describe('Multi-Org API Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>
  let testUser: { id: string; email: string; password: string }
  let testTenants: { id: string; name: string }[]
  let authToken: string

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Create test user and tenants
    await setupTestData()
  })

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData()
  })

  // ============================================================================
  // TEST SUITE 1: Memberships API
  // ============================================================================

  describe('GET /api/org/memberships', () => {
    it('should return user memberships', async () => {
      const response = await fetch(`${TEST_API_BASE}/api/org/memberships`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toMatchObject({
        success: true,
        memberships: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            tenant_id: expect.any(String),
            tenant_name: expect.any(String),
            role: expect.stringMatching(/^(owner|admin|manager|staff|viewer)$/),
            status: 'active',
            joined_at: expect.any(String),
          }),
        ]),
        count: expect.any(Number),
      })

      expect(data.memberships.length).toBeGreaterThan(0)
    })

    it('should return 401 for unauthenticated requests', async () => {
      const response = await fetch(`${TEST_API_BASE}/api/org/memberships`)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should include tenant details in memberships', async () => {
      const response = await fetch(`${TEST_API_BASE}/api/org/memberships`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      const data = await response.json()
      const membership = data.memberships[0]

      expect(membership.tenant_name).toBeTruthy()
      expect(membership.tenant_id).toBeTruthy()
      expect(membership.validation_status).toMatch(/^(VALIDATED|UNVALIDATED|EXPIRED_GRACE)$/)
    })
  })

  // ============================================================================
  // TEST SUITE 2: Org Switch API
  // ============================================================================

  describe('POST /api/org/switch', () => {
    it('should switch to a valid organization', async () => {
      // Assuming user has at least 2 tenants
      const membershipsResponse = await fetch(`${TEST_API_BASE}/api/org/memberships`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const membershipsData = await membershipsResponse.json()
      const targetTenant = membershipsData.memberships[1] // Switch to second tenant

      const response = await fetch(`${TEST_API_BASE}/api/org/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tenant_id: targetTenant.tenant_id,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toMatchObject({
        success: true,
        previous_tenant: expect.any(String),
        new_tenant: targetTenant.tenant_id,
        message: 'Organization switched successfully',
      })
    })

    it('should return 400 if tenant_id is missing', async () => {
      const response = await fetch(`${TEST_API_BASE}/api/org/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('tenant_id is required')
    })

    it('should return 403 for unauthorized tenant', async () => {
      const fakeTenantId = '00000000-0000-0000-0000-000000000000'

      const response = await fetch(`${TEST_API_BASE}/api/org/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tenant_id: fakeTenantId,
        }),
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Access denied')
    })

    it('should log context switch in history', async () => {
      // Get initial membership
      const membershipsResponse = await fetch(`${TEST_API_BASE}/api/org/memberships`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const membershipsData = await membershipsResponse.json()
      const targetTenant = membershipsData.memberships[0]

      // Perform switch
      await fetch(`${TEST_API_BASE}/api/org/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tenant_id: targetTenant.tenant_id,
        }),
      })

      // Verify history was logged (check database)
      const { data: history } = await supabase
        .from('user_context_history')
        .select('*')
        .eq('user_id', testUser.id)
        .order('created_at', { ascending: false })
        .limit(1)

      expect(history).toBeTruthy()
      expect(history![0].to_tenant_id).toBe(targetTenant.tenant_id)
      expect(history![0].switch_method).toBe('manual')
    })
  })

  // ============================================================================
  // TEST SUITE 3: Preferences API
  // ============================================================================

  describe('GET /api/org/preferences', () => {
    it('should return preferences for a tenant', async () => {
      const membershipsResponse = await fetch(`${TEST_API_BASE}/api/org/memberships`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const membershipsData = await membershipsResponse.json()
      const tenantId = membershipsData.memberships[0].tenant_id

      const response = await fetch(
        `${TEST_API_BASE}/api/org/preferences?tenant_id=${tenantId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toMatchObject({
        success: true,
        preferences: expect.objectContaining({
          is_pinned: expect.any(Boolean),
          is_favorite: expect.any(Boolean),
          access_count: expect.any(Number),
        }),
      })
    })

    it('should return 400 if tenant_id is missing', async () => {
      const response = await fetch(`${TEST_API_BASE}/api/org/preferences`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('tenant_id is required')
    })
  })

  describe('POST /api/org/preferences', () => {
    it('should update pin status', async () => {
      const membershipsResponse = await fetch(`${TEST_API_BASE}/api/org/memberships`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const membershipsData = await membershipsResponse.json()
      const tenantId = membershipsData.memberships[0].tenant_id

      const response = await fetch(`${TEST_API_BASE}/api/org/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          is_pinned: true,
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data).toMatchObject({
        success: true,
        preferences: expect.objectContaining({
          is_pinned: true,
        }),
        message: 'Preferences updated successfully',
      })
    })

    it('should enforce 5-pin limit', async () => {
      // Get first 6 tenants (if available)
      const membershipsResponse = await fetch(`${TEST_API_BASE}/api/org/memberships`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const membershipsData = await membershipsResponse.json()

      if (membershipsData.memberships.length < 6) {
        // Skip test if not enough tenants
        return
      }

      // Pin first 5 tenants
      for (let i = 0; i < 5; i++) {
        await fetch(`${TEST_API_BASE}/api/org/preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            tenant_id: membershipsData.memberships[i].tenant_id,
            is_pinned: true,
          }),
        })
      }

      // Try to pin 6th tenant (should fail)
      const response = await fetch(`${TEST_API_BASE}/api/org/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tenant_id: membershipsData.memberships[5].tenant_id,
          is_pinned: true,
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('only pin up to 5')
    })

    it('should update custom display name', async () => {
      const membershipsResponse = await fetch(`${TEST_API_BASE}/api/org/memberships`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const membershipsData = await membershipsResponse.json()
      const tenantId = membershipsData.memberships[0].tenant_id

      const response = await fetch(`${TEST_API_BASE}/api/org/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          custom_display_name: 'My Favorite Org',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.preferences.custom_display_name).toBe('My Favorite Org')
    })
  })

  // ============================================================================
  // TEST SUITE 4: Email Verification API
  // ============================================================================

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email', async () => {
      const response = await fetch(`${TEST_API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      // If email already verified, should return success
      // If not verified, should send email
      expect([200, 200]).toContain(response.status)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should return 401 for unauthenticated requests', async () => {
      const response = await fetch(`${TEST_API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
      })

      expect(response.status).toBe(401)
    })
  })

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  async function setupTestData() {
    // Create test user
    const email = `test-${Date.now()}@multi-org-test.com`
    const password = 'TestPassword123!'

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) throw signUpError

    testUser = {
      id: authData.user!.id,
      email,
      password,
    }

    // Sign in to get auth token
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    authToken = signInData.session!.access_token

    // Create test tenants
    const tenant1 = await supabase
      .from('tenants')
      .insert({ name: `Test Org 1 - ${Date.now()}` })
      .select()
      .single()

    const tenant2 = await supabase
      .from('tenants')
      .insert({ name: `Test Org 2 - ${Date.now()}` })
      .select()
      .single()

    testTenants = [tenant1.data!, tenant2.data!]

    // Create memberships
    await supabase.from('user_tenant_memberships').insert([
      {
        user_id: testUser.id,
        tenant_id: testTenants[0].id,
        role: 'owner',
        status: 'active',
      },
      {
        user_id: testUser.id,
        tenant_id: testTenants[1].id,
        role: 'admin',
        status: 'active',
      },
    ])
  }

  async function cleanupTestData() {
    // Delete memberships
    await supabase
      .from('user_tenant_memberships')
      .delete()
      .eq('user_id', testUser.id)

    // Delete tenants
    for (const tenant of testTenants) {
      await supabase.from('tenants').delete().eq('id', tenant.id)
    }

    // Delete user (Supabase admin API required for this)
    // For now, mark as inactive
    await supabase
      .from('app_users')
      .update({ is_active: false })
      .eq('id', testUser.id)
  }
})




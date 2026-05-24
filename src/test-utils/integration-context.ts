/**
 * Phase 2b.86 — Integration test helpers.
 *
 * Mocks ONLY `@/lib/api/context` so the route handlers think a real
 * user is logged in. Lets `@/lib/supabase-server`, `@/lib/auto-audit`,
 * and everything else run for real against the test Supabase project.
 *
 * Per CLAUDE.md: "Tests must SELECT the real audit_trail row. Never
 * mock logAudit*." — these tests honour that by using the real
 * logAuditServer path and SELECTing the resulting row.
 *
 * Usage in a test:
 *
 *   import { buildTestContext, getServiceClient } from '@/test-utils/integration-context'
 *
 *   jest.mock('@/lib/api/context', () => ({
 *     ApiContextError: jest.requireActual('@/lib/api/context').ApiContextError,
 *     getApiRequestContext: jest.fn(async () => buildTestContext()),
 *   }))
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const TEST_TENANT_ID =
  process.env.INTEGRATION_TEST_TENANT_ID ?? '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
export const TEST_USER_ID =
  process.env.INTEGRATION_TEST_USER_ID ?? '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

export function buildTestContext() {
  return {
    supabase: getServiceClient() as unknown,
    user: { id: TEST_USER_ID, email: 'deepakshegde@gmail.com' },
    tenantId: TEST_TENANT_ID,
    activeLocationId: null,
    membership: {
      id: 'integration-test-membership',
      role: 'owner',
      status: 'active',
      all_locations: true,
    },
    accessibleLocationIds: null,
  }
}

let cached: SupabaseClient | null = null
export function getServiceClient(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'integration-context: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.test'
    )
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

/**
 * Skip a test suite when the integration env isn't configured. Use as
 * the describe.* alternative:
 *
 *   describeIntegration('something', () => { ... })
 */
export const describeIntegration =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? describe
    : describe.skip

/**
 * Fetch the most-recent audit_trail row matching the filter. Convenience
 * wrapper for tests that want to assert the row landed.
 */
export async function fetchLatestAudit(filter: {
  entity_type: string
  entity_id: string
}): Promise<Record<string, any> | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('audit_trail')
    .select('*')
    .eq('entity_type', filter.entity_type)
    .eq('entity_id', filter.entity_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Delete every audit_trail row matching the filter. Used by afterEach
 * to keep the test tenant clean.
 */
export async function deleteAuditRows(filter: {
  entity_type: string
  entity_id: string
}): Promise<void> {
  const supabase = getServiceClient()
  await supabase
    .from('audit_trail')
    .delete()
    .eq('entity_type', filter.entity_type)
    .eq('entity_id', filter.entity_id)
}

/**
 * Phase 2b.86 — Integration test setup.
 *
 * Source of truth for Supabase connection: .claude/test-credentials.json
 * (gitignored). We deliberately do NOT fall back to .env.test because
 * .env.test points at the local supabase stack which integration tests
 * cannot use (the asserts SELECT from the real remote audit_trail).
 *
 * Skips the whole suite (via describeIntegration) if creds are missing
 * or look like placeholders.
 */
const fs = require('fs')
const path = require('path')

function isUsableHttpsUrl(value) {
  // Real Supabase project URLs are https://*.supabase.co. Local URLs
  // (http://localhost:54321) intentionally don't qualify — see file
  // header comment.
  return typeof value === 'string' && /^https:\/\/.+\.supabase\.co/.test(value)
}

function isUsableKey(value) {
  // Real Supabase service-role keys are JWTs >=100 chars. Placeholders
  // like "REPLACE_ME" are short and won't match.
  return typeof value === 'string' && value.length >= 100
}

try {
  const credsPath = path.join(__dirname, '.claude', 'test-credentials.json')
  const raw = fs.readFileSync(credsPath, 'utf8')
  const creds = JSON.parse(raw)
  if (isUsableHttpsUrl(creds.supabase?.project_url) && isUsableKey(creds.supabase?.service_role_key)) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = creds.supabase.project_url
    process.env.SUPABASE_SERVICE_ROLE_KEY = creds.supabase.service_role_key
  }
  if (creds.test_tenant_id) {
    process.env.INTEGRATION_TEST_TENANT_ID = creds.test_tenant_id
  }
} catch {
  /* missing or unreadable — handled by the guard below */
}

if (!isUsableHttpsUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) || !isUsableKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  // Unset so `describeIntegration` in integration-context.ts treats the
  // suite as skip-eligible.
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  console.warn('\n[integration-tests] Skipping — fill .claude/test-credentials.json:')
  console.warn('  supabase.project_url     (https://*.supabase.co)')
  console.warn('  supabase.service_role_key (long JWT)')
  console.warn('Run `npm test` for the standard unit suite (no creds needed).\n')
}

process.env.INTEGRATION_TEST_TENANT_ID =
  process.env.INTEGRATION_TEST_TENANT_ID || '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
process.env.INTEGRATION_TEST_USER_ID =
  process.env.INTEGRATION_TEST_USER_ID || '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = require('node-fetch')
}

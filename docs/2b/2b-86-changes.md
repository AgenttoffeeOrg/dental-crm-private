# Phase 2b.86 — Orphan recurring-rule cleanup + integration test harness

**Feature**: Close the last two deferred items from the 2b.85 summary.

**Branch**: `phase-1-attribution-foundation`
**Window**: 2026-05-24
**Commits**: `2456b89..HEAD`

## What landed

### 1. Orphan recurring-rule cleanup
- New endpoint `DELETE /api/task-recurring-rules/[id]` with the standard audit-first pattern. Idempotent on a missing id (returns 200 + `already_absent:true`).
- `CreateTaskSlideOver` now wraps `createTask` in try/catch when a rule was created. On task-insert failure, it fires the new DELETE endpoint to drop the orphan rule. Failure of the cleanup itself is logged but doesn't block the surfacing of the original task error.

### 2. Integration test harness
Real-Supabase integration tests for the audit-writing routes that the unit suite couldn't cover without violating CLAUDE.md "never mock logAudit*".

- **`jest.config.integration.js`** — separate config, `testMatch: ['**/*.integration.test.ts']`, `testEnvironment: 'node'`, 30s timeout. Doesn't share the default jest mocks.
- **`jest.integration.setup.js`** — loads creds from `.claude/test-credentials.json` (gitignored). Requires `supabase.project_url` to be `https://*.supabase.co` and `supabase.service_role_key` to be at least 100 chars (real JWT). Anything that looks like a placeholder or points at localhost is treated as "no creds" and the suite skips gracefully via `describeIntegration`.
- **`src/test-utils/integration-context.ts`** — `buildTestContext()` (fake `getApiRequestContext` payload pointing at the test tenant + operator user), `getServiceClient()` (real Supabase service client), `describeIntegration` (skip-if-no-creds), `fetchLatestAudit()`, `deleteAuditRows()`.
- **`npm run test:integration`** script wired into `package.json`.

Test files (4):
- `src/app/api/practice-groups/__tests__/route.integration.test.ts` — POST happy path SELECTs the real audit_trail row; rejects empty name; rejects duplicates with 409.
- `src/app/api/tenant-routing-settings/default-assignee-policy/__tests__/route.integration.test.ts` — PATCH happy path + Zod refinement test. Snapshots prior policy in `beforeAll`, restores in `afterAll`.
- `src/app/api/task-recurring-rules/__tests__/route.integration.test.ts` — POST + DELETE happy paths + idempotent DELETE on missing id.
- `src/app/api/users/__tests__/users-patch.integration.test.ts` — PATCH happy path + self-as-manager rejection + manager-not-in-tenant rejection. Snapshots prior `full_name`, restores in `afterAll`.

11 tests total. They run end-to-end against the real test tenant and SELECT the actual `audit_trail` row to verify the audit-first contract.

### Operator action required to enable integration tests

Fill `.claude/test-credentials.json`:
```json
{
  "supabase": {
    "project_url": "https://<project>.supabase.co",
    "service_role_key": "<long JWT>"
  },
  "test_tenant_id": "5aadca14-9786-4aef-bc53-e9287cdd0bbf"
}
```

Then `npm run test:integration`. Without these creds, the suite skips with a clear console message — `npm test` still runs the standard unit suite (51/51 passing).

### Why a separate config

- **Default `npm test` stays fast.** Unit suite runs in <1s; integration would push it past 10s and require creds for every CI run.
- **Mock isolation.** The default `jest.setup.js` mocks `@/lib/supabase-client` aggressively; integration tests need the unmocked path for `@/lib/supabase-server`.
- **Opt-in safety.** Integration tests mutate the test tenant. Keeping them behind a separate script reduces surprise.

## Validation

- `npx jest`: 51/51 unit tests passing.
- `npx jest --config=jest.config.integration.js`: 11 tests skip cleanly without creds; ready to run when creds are added.
- `npm run build`: clean.
- `npx tsc --noEmit`: clean across all touched files (pre-existing FeatureFlags errors in `users/invite/route.ts` are unrelated).

/**
 * Phase 2b.86 — Integration test config.
 *
 * Hits a real Supabase test instance via createServiceClient (no
 * mocks of supabase-server or auto-audit). Tests that touch
 * audit_trail SELECT the real row per CLAUDE.md "Tests must SELECT
 * the real audit_trail row. Never mock logAudit*."
 *
 * Match pattern is *.integration.test.ts so they're opt-in via
 * `npm run test:integration` and not part of the default `npm test`
 * run (which is unit-only and fast).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/*.integration.test.ts'],
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/schemas/(.*)$': '<rootDir>/src/schemas/$1',
    '^@/test-utils/(.*)$': '<rootDir>/src/test-utils/$1',
  },
  // Integration tests are slow (real network round-trips). Bump the
  // default timeout to 30s.
  testTimeout: 30000,
}

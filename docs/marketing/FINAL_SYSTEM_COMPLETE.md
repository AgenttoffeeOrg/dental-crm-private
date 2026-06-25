/**
 * Jest Configuration for Marketing Audit Tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src/lib/marketing-audit'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/lib/marketing-audit/**/*.{ts,tsx}',
    '!src/lib/marketing-audit/**/*.test.{ts,tsx}',
    '!src/lib/marketing-audit/**/__tests__/**',
    '!src/lib/marketing-audit/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};


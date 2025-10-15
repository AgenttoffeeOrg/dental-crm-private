/**
 * Complete Unit Test Suite
 * Execute all unit tests for Marketing Audit module
 */

// Import all test suites
import '../src/lib/marketing-audit/__tests__/technical-scorer.test';
import '../src/lib/marketing-audit/__tests__/local-scorer.test';
import '../src/lib/marketing-audit/__tests__/percentile-ranker.test';
import '../src/lib/marketing-audit/__tests__/validation.test';
import '../src/lib/marketing-audit/__tests__/attribution-engine.test';
import '../src/lib/marketing-audit/__tests__/performance/query-optimizer.test';
import '../src/lib/marketing-audit/__tests__/connectors/psi-connector.test';
import '../src/lib/marketing-audit/__tests__/api/run-audit.test';

describe('Marketing Audit - Complete Unit Test Suite', () => {
  it('should have all test suites loaded', () => {
    expect(true).toBe(true);
  });
});


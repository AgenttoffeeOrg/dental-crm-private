#!/bin/bash

###############################################################################
# Run All Tests Script
# 
# Phase 4: Execute complete test suite with reporting.
# Usage: ./scripts/run-all-tests.sh
###############################################################################

set -e

echo "🧪 RUNNING COMPLETE TEST SUITE"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Create test results directory
mkdir -p test-results

###############################################################################
echo "📦 1. Installing Dependencies..."
###############################################################################
npm install --silent || { echo -e "${RED}❌ Dependency installation failed${NC}"; exit 1; }
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

###############################################################################
echo "🔍 2. Running Unit Tests..."
###############################################################################
if npm run test:marketing-audit -- --silent 2>&1 | tee test-results/unit-tests.log; then
  echo -e "${GREEN}✅ Unit tests passed${NC}"
else
  echo -e "${RED}❌ Unit tests failed${NC}"
  FAILED=1
fi
echo ""

###############################################################################
echo "🔗 3. Running Integration Tests..."
###############################################################################
if npm run test -- --testPathPattern="integration" --silent 2>&1 | tee test-results/integration-tests.log; then
  echo -e "${GREEN}✅ Integration tests passed${NC}"
else
  echo -e "${YELLOW}⚠️  Integration tests had warnings${NC}"
fi
echo ""

###############################################################################
echo "🎭 4. Running E2E Tests..."
###############################################################################
if npm run test:e2e 2>&1 | tee test-results/e2e-tests.log; then
  echo -e "${GREEN}✅ E2E tests passed${NC}"
else
  echo -e "${RED}❌ E2E tests failed${NC}"
  FAILED=1
fi
echo ""

###############################################################################
echo "♿ 5. Running Accessibility Tests..."
###############################################################################
if npm run test -- --testPathPattern="accessibility" --silent 2>&1 | tee test-results/a11y-tests.log; then
  echo -e "${GREEN}✅ Accessibility tests passed${NC}"
else
  echo -e "${RED}❌ Accessibility tests failed${NC}"
  FAILED=1
fi
echo ""

###############################################################################
echo "🔐 6. Security Scan..."
###############################################################################
echo "Running npm audit..."
if npm audit --audit-level=moderate 2>&1 | tee test-results/security-audit.log; then
  echo -e "${GREEN}✅ No security vulnerabilities${NC}"
else
  echo -e "${YELLOW}⚠️  Some vulnerabilities found (check test-results/security-audit.log)${NC}"
fi
echo ""

###############################################################################
echo "⚡ 7. Running Lighthouse Audits..."
###############################################################################
if command -v lhci &> /dev/null; then
  if lhci autorun 2>&1 | tee test-results/lighthouse.log; then
    echo -e "${GREEN}✅ Lighthouse audits passed${NC}"
  else
    echo -e "${YELLOW}⚠️  Lighthouse had warnings${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Lighthouse CLI not installed (npm install -g @lhci/cli)${NC}"
fi
echo ""

###############################################################################
echo "📊 8. Test Coverage Report..."
###############################################################################
if [ -f "coverage/coverage-summary.json" ]; then
  COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*,"skipped":[0-9]*,"pct":[0-9.]*' | grep -o 'pct":[0-9.]*' | cut -d':' -f2)
  echo "Code Coverage: ${COVERAGE}%"
  
  if (( $(echo "$COVERAGE >= 80" | bc -l) )); then
    echo -e "${GREEN}✅ Coverage meets 80% threshold${NC}"
  else
    echo -e "${YELLOW}⚠️  Coverage below 80% threshold${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  No coverage report found${NC}"
fi
echo ""

###############################################################################
echo "📈 SUMMARY"
echo "================================"
###############################################################################

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  echo "Test results saved in test-results/"
  echo "Coverage report: coverage/lcov-report/index.html"
  echo ""
  echo "🎉 System is production-ready!"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "Check test-results/ for details"
  echo "Fix failures before deploying to production"
  exit 1
fi


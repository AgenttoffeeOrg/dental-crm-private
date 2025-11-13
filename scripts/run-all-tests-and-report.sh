#!/bin/bash

# Run All Tests and Generate Comprehensive Report
# This script runs all available tests and generates a detailed report

set -e

REPORT_DIR="test-reports-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Running All Tests and Generating Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Report directory: $REPORT_DIR"
echo ""

# 1. Unit Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Running Unit Tests (Jest)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npm run test > "$REPORT_DIR/unit-tests.txt" 2>&1; then
  echo "✅ Unit tests completed"
else
  echo "❌ Unit tests failed (check $REPORT_DIR/unit-tests.txt)"
fi
echo ""

# 2. Unit Tests with Coverage
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Running Unit Tests with Coverage..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npm run test:coverage > "$REPORT_DIR/coverage.txt" 2>&1; then
  echo "✅ Coverage report generated"
  if [ -f "coverage/coverage-summary.json" ]; then
    echo "📊 Coverage Summary:"
    node -e "
      const cov = require('./coverage/coverage-summary.json');
      const total = cov.total;
      console.log('  Statements: ' + total.statements.pct + '%');
      console.log('  Branches: ' + total.branches.pct + '%');
      console.log('  Functions: ' + total.functions.pct + '%');
      console.log('  Lines: ' + total.lines.pct + '%');
    "
  fi
else
  echo "⚠️  Coverage generation had issues (check $REPORT_DIR/coverage.txt)"
fi
echo ""

# 3. Type Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Running TypeScript Type Check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npm run type-check > "$REPORT_DIR/type-check.txt" 2>&1; then
  echo "✅ Type check passed"
else
  echo "❌ Type check failed (check $REPORT_DIR/type-check.txt)"
fi
echo ""

# 4. Lint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Running ESLint..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npm run lint > "$REPORT_DIR/lint.txt" 2>&1; then
  echo "✅ Lint passed"
else
  echo "⚠️  Lint found issues (check $REPORT_DIR/lint.txt)"
fi
echo ""

# 5. Build Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Running Production Build Check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if NEXT_DISABLE_SWC_WASM=1 npm run build > "$REPORT_DIR/build.txt" 2>&1; then
  echo "✅ Build successful"
else
  echo "❌ Build failed (check $REPORT_DIR/build.txt)"
fi
echo ""

# Generate summary
cat > "$REPORT_DIR/SUMMARY.md" << EOF
# Test Run Summary

Generated: $(date)

## Test Results

1. **Unit Tests**: $(grep -q "PASS\|FAIL" "$REPORT_DIR/unit-tests.txt" && echo "See unit-tests.txt" || echo "Not run")
2. **Coverage**: $(test -f coverage/coverage-summary.json && echo "See coverage.txt" || echo "Not generated")
3. **Type Check**: $(grep -q "error TS" "$REPORT_DIR/type-check.txt" && echo "Failed" || echo "Passed")
4. **Lint**: $(grep -q "error\|warning" "$REPORT_DIR/lint.txt" && echo "Issues found" || echo "Passed")
5. **Build**: $(grep -q "error\|Error" "$REPORT_DIR/build.txt" && echo "Failed" || echo "Success")

## Files Generated

- \`unit-tests.txt\` - Unit test results
- \`coverage.txt\` - Coverage report
- \`type-check.txt\` - TypeScript type check results
- \`lint.txt\` - ESLint results
- \`build.txt\` - Build output

## Next Steps

1. Review each report file
2. Fix any failing tests
3. Address type errors
4. Fix linting issues
5. Resolve build errors

## E2E Tests

To run E2E tests separately:
\`\`\`bash
npm run test:e2e
\`\`\`

## Load Tests

To run load tests separately:
\`\`\`bash
npm run test:load
\`\`\`

## Performance Tests

To run Lighthouse tests:
\`\`\`bash
npm run lighthouse
\`\`\`
EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test Run Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Reports saved to: $REPORT_DIR/"
echo ""
echo "View summary:"
echo "  cat $REPORT_DIR/SUMMARY.md"
echo ""
echo "View individual reports:"
echo "  cat $REPORT_DIR/unit-tests.txt"
echo "  cat $REPORT_DIR/coverage.txt"
echo "  cat $REPORT_DIR/type-check.txt"
echo "  cat $REPORT_DIR/lint.txt"
echo "  cat $REPORT_DIR/build.txt"
echo ""


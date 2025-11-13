#!/usr/bin/env node

/**
 * Test Results Analyzer
 * Analyzes test results from various sources and generates a comprehensive report
 */

const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '..', 'test-results');
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');

function analyzeTestResults() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Results Analyzer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Check for test files
  console.log('🔍 Analyzing Test Coverage...');
  console.log('');

  const testFiles = findTestFiles('src');
  const testCount = testFiles.length;
  
  console.log(`  📝 Test Files Found: ${testCount}`);
  if (testCount > 0) {
    console.log('  Test Files:');
    testFiles.slice(0, 10).forEach(file => {
      console.log(`    - ${file}`);
    });
    if (testCount > 10) {
      console.log(`    ... and ${testCount - 10} more`);
    }
  }
  console.log('');

  // Check coverage
  if (fs.existsSync(COVERAGE_DIR)) {
    console.log('  ✅ Coverage report exists');
    const coverageSummary = path.join(COVERAGE_DIR, 'coverage-summary.json');
    if (fs.existsSync(coverageSummary)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coverageSummary, 'utf8'));
        const total = coverage.total;
        console.log('  Coverage Summary:');
        console.log(`    Statements: ${total.statements.pct}%`);
        console.log(`    Branches: ${total.branches.pct}%`);
        console.log(`    Functions: ${total.functions.pct}%`);
        console.log(`    Lines: ${total.lines.pct}%`);
      } catch (e) {
        console.log('  ⚠️  Could not parse coverage summary');
      }
    }
  } else {
    console.log('  ⚠️  No coverage report found. Run: npm run test:coverage');
  }
  console.log('');

  // Check Playwright results
  const playwrightReport = path.join(__dirname, '..', 'playwright-report');
  if (fs.existsSync(playwrightReport)) {
    console.log('  ✅ Playwright report exists');
    console.log(`    View: file://${playwrightReport}/index.html`);
  } else {
    console.log('  ⚠️  No Playwright report. Run: npm run test:e2e');
  }
  console.log('');

  // Check k6 results
  const k6Results = path.join(__dirname, '..', 'k6-summary.json');
  if (fs.existsSync(k6Results)) {
    console.log('  ✅ k6 load test results exist');
    try {
      const k6 = JSON.parse(fs.readFileSync(k6Results, 'utf8'));
      console.log('  k6 Summary:');
      if (k6.metrics) {
        Object.keys(k6.metrics).forEach(metric => {
          const m = k6.metrics[metric];
          if (m.values) {
            console.log(`    ${metric}: ${m.values.avg || 'N/A'}`);
          }
        });
      }
    } catch (e) {
      console.log('  ⚠️  Could not parse k6 results');
    }
  } else {
    console.log('  ⚠️  No k6 results. Run: npm run test:load');
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 What Each Test Does:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('1. Unit Tests (Jest):');
  console.log('   - Tests individual functions and components');
  console.log('   - Run: npm run test');
  console.log('   - Coverage: npm run test:coverage');
  console.log('');
  console.log('2. E2E Tests (Playwright):');
  console.log('   - Tests full user flows (login, create contact, etc.)');
  console.log('   - Run: npm run test:e2e');
  console.log('   - Reports: playwright-report/index.html');
  console.log('');
  console.log('3. Visual Tests (Percy):');
  console.log('   - Tests visual regressions');
  console.log('   - Run: npm run test:visual');
  console.log('   - View: Percy dashboard');
  console.log('');
  console.log('4. Load Tests (k6):');
  console.log('   - Tests performance under load');
  console.log('   - Run: npm run test:load');
  console.log('   - Reports: k6-summary.json');
  console.log('');
  console.log('5. Lighthouse CI:');
  console.log('   - Tests performance, accessibility, SEO');
  console.log('   - Run: npm run lighthouse');
  console.log('   - Reports: lhci-reports/');
  console.log('');
  console.log('6. SonarCloud:');
  console.log('   - Code quality and security analysis');
  console.log('   - View: https://sonarcloud.io/project/overview?id=AgenttoffeeOrg_dental-crm-private');
  console.log('');
  console.log('7. CodeQL:');
  console.log('   - Security vulnerability scanning');
  console.log('   - View: GitHub Security tab');
  console.log('');
}

function findTestFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        files.push(...findTestFiles(fullPath));
      } else if (entry.isFile() && (entry.name.includes('.test.') || entry.name.includes('.spec.'))) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return files;
}

analyzeTestResults();


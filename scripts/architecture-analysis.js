#!/usr/bin/env node

/**
 * Comprehensive Architecture Analysis Script
 *
 * Runs multiple analysis tools and generates a combined report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '../architecture-reports');
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const reports = {
  timestamp,
  summary: {},
  details: {},
};

console.log('🔍 Starting Comprehensive Architecture Analysis...\n');

// 1. TypeScript Type Check
console.log('1️⃣  Running TypeScript type check...');
try {
  const typeCheckOutput = execSync('npm run type-check 2>&1', { encoding: 'utf-8' });
  reports.details.typescript = {
    status: 'success',
    output: typeCheckOutput,
  };
  reports.summary.typescript = '✅ No type errors';
  console.log('   ✅ TypeScript check passed\n');
} catch (error) {
  reports.details.typescript = {
    status: 'errors',
    output: error.stdout || error.message,
  };
  reports.summary.typescript = `❌ Type errors found: ${error.stdout?.split('\n').length || 0} issues`;
  console.log('   ⚠️  Type errors found\n');
}

// 2. ESLint
console.log('2️⃣  Running ESLint...');
try {
  const eslintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
  reports.details.eslint = {
    status: 'success',
    output: eslintOutput,
  };
  reports.summary.eslint = '✅ No linting errors';
  console.log('   ✅ ESLint passed\n');
} catch (error) {
  const eslintJson = execSync('npx eslint src/ --format json 2>&1', { encoding: 'utf-8' });
  const eslintData = JSON.parse(eslintJson);
  const errorCount = eslintData.reduce((sum, file) => sum + (file.errorCount || 0), 0);

  reports.details.eslint = {
    status: 'errors',
    output: eslintJson,
    errorCount,
  };
  reports.summary.eslint = `❌ ${errorCount} linting errors`;
  console.log(`   ⚠️  Found ${errorCount} linting issues\n`);
}

// 3. npm audit
console.log('3️⃣  Running npm audit...');
try {
  const auditOutput = execSync('npm audit --json 2>&1', { encoding: 'utf-8' });
  const auditData = JSON.parse(auditOutput);

  const vulnerabilities = auditData.vulnerabilities || {};
  const vulnCount = Object.keys(vulnerabilities).length;

  reports.details.npmAudit = {
    vulnerabilities: vulnCount,
    data: auditData,
  };
  reports.summary.npmAudit =
    vulnCount > 0 ? `⚠️  ${vulnCount} vulnerabilities found` : '✅ No vulnerabilities';
  console.log(`   ${vulnCount > 0 ? '⚠️' : '✅'} ${vulnCount} vulnerabilities\n`);
} catch (error) {
  reports.details.npmAudit = {
    status: 'error',
    message: error.message,
  };
  reports.summary.npmAudit = '❌ Audit failed';
  console.log('   ❌ npm audit failed\n');
}

// 4. Test Coverage
console.log('4️⃣  Running test coverage...');
try {
  const coverageOutput = execSync('npm run test:coverage 2>&1', { encoding: 'utf-8' });

  // Extract coverage percentages
  const coverageMatch = coverageOutput.match(
    /All files\s+\|\s+(\d+\.\d+)%\s+\|\s+(\d+\.\d+)%\s+\|\s+(\d+\.\d+)%\s+\|\s+(\d+\.\d+)%/
  );

  if (coverageMatch) {
    reports.details.coverage = {
      statements: parseFloat(coverageMatch[1]),
      branches: parseFloat(coverageMatch[2]),
      functions: parseFloat(coverageMatch[3]),
      lines: parseFloat(coverageMatch[4]),
    };
    reports.summary.coverage = `📊 Coverage: ${coverageMatch[4]}% lines`;
  } else {
    reports.details.coverage = { output: coverageOutput };
    reports.summary.coverage = '📊 Coverage report generated';
  }
  console.log('   ✅ Coverage report generated\n');
} catch (error) {
  reports.details.coverage = {
    status: 'error',
    message: error.message,
  };
  reports.summary.coverage = '❌ Coverage check failed';
  console.log('   ⚠️  Coverage check had issues\n');
}

// 5. Bundle Analysis (if Next.js build works)
console.log('5️⃣  Analyzing bundle size...');
try {
  const buildOutput = execSync('npm run build 2>&1', { encoding: 'utf-8' });

  // Extract bundle sizes
  const bundleMatch = buildOutput.match(
    /Route\s+\(app\)\s+Size\s+First Load JS[\s\S]*?(\d+\s+\w+)/
  );

  reports.details.bundle = {
    buildOutput: buildOutput.substring(0, 1000), // First 1000 chars
  };
  reports.summary.bundle = '✅ Build successful';
  console.log('   ✅ Build analysis complete\n');
} catch (error) {
  reports.details.bundle = {
    status: 'error',
    message: error.message.substring(0, 500),
  };
  reports.summary.bundle = '❌ Build failed';
  console.log('   ⚠️  Build analysis skipped\n');
}

// 6. File Structure Analysis
console.log('6️⃣  Analyzing file structure...');
try {
  const srcDir = path.join(__dirname, '../src');
  const files = getAllFiles(srcDir);

  const stats = {
    totalFiles: files.length,
    byExtension: {},
    byDirectory: {},
    totalLines: 0,
  };

  files.forEach((file) => {
    const ext = path.extname(file);
    const dir = path.relative(srcDir, path.dirname(file));
    const rootDir = dir.split(path.sep)[0] || 'root';

    stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
    stats.byDirectory[rootDir] = (stats.byDirectory[rootDir] || 0) + 1;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      stats.totalLines += content.split('\n').length;
    } catch (e) {
      // Skip if can't read
    }
  });

  reports.details.fileStructure = stats;
  reports.summary.fileStructure = `📁 ${stats.totalFiles} files, ${stats.totalLines.toLocaleString()} lines`;
  console.log(`   ✅ Analyzed ${stats.totalFiles} files\n`);
} catch (error) {
  reports.details.fileStructure = {
    status: 'error',
    message: error.message,
  };
  console.log('   ⚠️  File structure analysis failed\n');
}

// Generate report
const reportFile = path.join(REPORT_DIR, `architecture-analysis-${timestamp}.json`);
fs.writeFileSync(reportFile, JSON.stringify(reports, null, 2));

// Generate markdown summary
const summaryFile = path.join(REPORT_DIR, `summary-${timestamp}.md`);
const summaryMarkdown = generateMarkdownSummary(reports);
fs.writeFileSync(summaryFile, summaryMarkdown);

console.log('✅ Analysis complete!\n');
console.log(`📄 Full report: ${reportFile}`);
console.log(`📋 Summary: ${summaryFile}\n`);

// Print summary
console.log('='.repeat(60));
console.log('ARCHITECTURE ANALYSIS SUMMARY');
console.log('='.repeat(60));
Object.entries(reports.summary).forEach(([key, value]) => {
  console.log(`${key.padEnd(20)} ${value}`);
});
console.log('='.repeat(60));

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!['node_modules', '.next', 'dist', 'build'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      // Only include source files
      if (/\.(ts|tsx|js|jsx|json)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function generateMarkdownSummary(reports) {
  return `# Architecture Analysis Report

**Generated:** ${new Date(reports.timestamp).toLocaleString()}

## Summary

${Object.entries(reports.summary)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join('\n')}

## Details

### TypeScript
\`\`\`
${reports.details.typescript?.output?.substring(0, 500) || 'No output'}
\`\`\`

### ESLint
${reports.details.eslint?.errorCount ? `**Errors:** ${reports.details.eslint.errorCount}` : 'No errors'}

### npm Audit
${reports.details.npmAudit?.vulnerabilities ? `**Vulnerabilities:** ${reports.details.npmAudit.vulnerabilities}` : 'No vulnerabilities'}

### Test Coverage
${reports.details.coverage?.lines ? `**Lines:** ${reports.details.coverage.lines}%` : 'Not available'}

### File Structure
${
  reports.details.fileStructure
    ? `
- **Total Files:** ${reports.details.fileStructure.totalFiles}
- **Total Lines:** ${reports.details.fileStructure.totalLines?.toLocaleString()}
- **By Extension:** ${JSON.stringify(reports.details.fileStructure.byExtension, null, 2)}
`
    : 'Not available'
}

## Next Steps

1. Review SonarCloud dashboard: https://sonarcloud.io
2. Fix critical issues first
3. Address security vulnerabilities
4. Improve test coverage
5. Review bundle size optimizations
`;
}

# Quick Start: Architecture Analysis

## 🚀 Run Comprehensive Analysis

```bash
# Run all analysis tools and generate report
npm run analyze:architecture
```

This will:
- ✅ Check TypeScript types
- ✅ Run ESLint
- ✅ Check npm vulnerabilities
- ✅ Generate test coverage
- ✅ Analyze bundle size
- ✅ Analyze file structure
- ✅ Generate combined report

**Output:** `architecture-reports/architecture-analysis-[timestamp].json` and summary markdown

---

## 📊 Individual Tools

### 1. SonarCloud (Already Configured!)

**Best for:** Comprehensive code quality, security, maintainability

```bash
# Install SonarScanner
npm install -g sonarqube-scanner

# Run analysis
sonar-scanner
```

**View results:** https://sonarcloud.io

**What you get:**
- Code quality score
- Security vulnerabilities
- Code smells
- Technical debt
- Test coverage
- Duplication analysis

---

### 2. Dependency Analysis

**Best for:** Understanding dependencies, finding circular deps

```bash
# Generate dependency graph
npm run analyze:dependencies

# Or manually:
depcruise --output-type dot src/ | dot -T svg > dependency-graph.svg
depcruise --validate .dependency-cruiser.js src/
```

**Output:** `architecture-reports/dependency-graph.svg`

**What you get:**
- Visual dependency graph
- Circular dependency warnings
- Orphaned modules
- Architecture violations

---

### 3. Security Scanning

```bash
# npm vulnerabilities
npm audit
npm audit --json > architecture-reports/security-audit.json

# Install Semgrep for deeper security analysis
pip install semgrep
semgrep --config=auto src/ > architecture-reports/semgrep-security.txt
```

---

### 4. Type Analysis

```bash
npm run type-check
```

**What you get:**
- All TypeScript errors across codebase
- Type coverage insights

---

### 5. Code Quality

```bash
# ESLint
npm run lint

# With JSON output
npx eslint src/ --format json > architecture-reports/eslint-report.json
```

---

### 6. Test Coverage

```bash
npm run test:coverage
```

**What you get:**
- Coverage percentages
- Uncovered lines
- Coverage report HTML

---

### 7. Bundle Analysis

```bash
# Build with bundle analyzer
ANALYZE=true npm run build
```

**What you get:**
- Bundle size breakdown
- Dependency impact
- Code splitting opportunities

---

## 📋 Recommended Workflow

1. **Run comprehensive analysis:**
   ```bash
   npm run analyze:architecture
   ```

2. **Check SonarCloud dashboard:**
   - Go to https://sonarcloud.io
   - Review quality gate status
   - Fix critical issues first

3. **Analyze dependencies:**
   ```bash
   npm run analyze:dependencies
   ```
   - Review dependency graph
   - Fix circular dependencies
   - Remove orphaned modules

4. **Security audit:**
   ```bash
   npm audit
   npm audit fix
   ```

5. **Review reports:**
   - Check `architecture-reports/` folder
   - Review summary markdown
   - Address issues by priority

---

## 🎯 What Each Tool Catches

| Tool | Code Quality | Security | Dependencies | Performance | Architecture |
|------|-------------|----------|--------------|-------------|--------------|
| **SonarCloud** | ✅✅✅ | ✅✅✅ | ✅ | ✅ | ✅✅ |
| **Dependency-Cruiser** | ✅ | ❌ | ✅✅✅ | ✅ | ✅✅✅ |
| **npm audit** | ❌ | ✅✅✅ | ✅✅ | ❌ | ❌ |
| **TypeScript** | ✅✅ | ✅ | ❌ | ❌ | ✅ |
| **ESLint** | ✅✅ | ✅ | ❌ | ✅ | ❌ |
| **Semgrep** | ✅ | ✅✅✅ | ❌ | ❌ | ❌ |

---

## 📁 Report Structure

After running analysis:

```
architecture-reports/
├── architecture-analysis-[timestamp].json  # Full report
├── summary-[timestamp].md                   # Markdown summary
├── dependency-graph.svg                     # Dependency visualization
├── eslint-report.json                      # ESLint results
└── security-audit.json                     # npm audit results
```

---

## 🔄 Continuous Analysis

### GitHub Actions (Recommended)

Create `.github/workflows/architecture-analysis.yml`:

```yaml
name: Architecture Analysis

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run analyze:architecture
      - uses: actions/upload-artifact@v3
        with:
          name: architecture-reports
          path: architecture-reports/
```

---

## 💡 Tips

1. **Start with SonarCloud** - It's the most comprehensive
2. **Fix security issues first** - Use `npm audit fix`
3. **Address circular dependencies** - They cause runtime issues
4. **Improve test coverage** - Aim for >80%
5. **Review dependency graph** - Remove unused dependencies

---

## 🆘 Need Help?

- **SonarCloud:** https://sonarcloud.io/docs
- **Dependency-Cruiser:** https://github.com/sverweij/dependency-cruiser
- **Semgrep:** https://semgrep.dev/docs


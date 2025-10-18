# Semgrep SAST Integration

## Overview

**Semgrep** is a fast, open-source static analysis tool that finds bugs and enforces code standards. It's integrated with this repository to automatically scan for security vulnerabilities, code quality issues, and anti-patterns.

🔗 **Semgrep Cloud Dashboard**: https://semgrep.dev/orgs/-/findings

---

## What Semgrep Scans

Semgrep analyzes code using **rule-based pattern matching** across multiple dimensions:

### 1. 🔒 **Security Vulnerabilities**
- SQL injection
- Cross-site scripting (XSS)
- Command injection
- Path traversal
- Insecure deserialization
- Hardcoded secrets (additional layer)
- Crypto weaknesses

### 2. 🐛 **Bug Detection**
- Null pointer dereferences
- Type mismatches
- Logic errors
- Race conditions
- Resource leaks

### 3. 🏗️ **Code Quality & Anti-patterns**
- Dead code
- Unused variables
- Overly complex functions
- Bad practices
- Framework-specific issues

---

## Active Rulesets

The workflow uses the following Semgrep rule packs:

| Ruleset | Description | Rules |
|---------|-------------|-------|
| **p/ci** | Core CI ruleset - high-confidence rules for blocking PRs | ~200 |
| **p/javascript** | JavaScript security rules | ~150 |
| **p/typescript** | TypeScript-specific security & quality rules | ~100 |
| **p/react** | React framework security (XSS, unsafe props, etc.) | ~50 |
| **p/nextjs** | Next.js specific security rules | ~30 |
| **p/security-audit** | Comprehensive security audit rules | ~500 |

**Total active rules**: ~1,000+ security and quality checks

---

## 🎯 Baseline Scanning (Only NEW Findings Block PRs)

### How It Works

Semgrep uses **baseline scanning** to ensure only NEW security issues block PRs:

1. **For Pull Requests**:
   - Finds the **merge-base** (common ancestor) between your PR branch and `main`
   - Only scans the **diff** (changes you made)
   - **Existing issues in main are ignored** ✅
   - **New issues in your changes will block the PR** ❌

2. **For Main Branch Pushes**:
   - Scans the entire codebase
   - Reports all findings to Semgrep Cloud
   - Updates the baseline for future PRs

### Why Baseline Scanning?

Without baseline scanning, you'd get blocked by:
- ✅ Legacy security issues in old code (not your problem right now)
- ✅ Technical debt from years ago
- ✅ Issues in code you didn't touch

With baseline scanning, you only fix:
- ❌ **New security issues you're introducing**
- ✅ Old code is tracked separately and can be fixed incrementally

---

## Severity & Blocking Policy

### 🚫 **Blocks PR Merge**

Semgrep will **fail the check** and block merge on:

- **ERROR** severity findings (High/Critical security issues)
  - SQL injection vulnerabilities
  - XSS vulnerabilities
  - Command injection
  - Hardcoded secrets
  - Insecure crypto usage

### ⚠️ **Warnings (Does Not Block)**

The following appear as warnings but **allow merge**:

- **WARNING** severity findings (Medium issues)
- **INFO** severity findings (Low priority / informational)
- Code quality suggestions
- Style improvements

### ✅ **Ignored**

- Findings below INFO severity
- Suppressed findings (via `nosemgrep` comments)
- Files in `.semgrepignore`

---

## Running Semgrep Locally

### Install Semgrep

```bash
# Using pipx (recommended)
pipx install semgrep

# Or using pip
pip install semgrep

# Or using Homebrew (macOS)
brew install semgrep
```

### Run the Same Scan as CI

```bash
# Full scan with all rulesets (same as CI)
semgrep ci \
  --config p/ci \
  --config p/javascript \
  --config p/typescript \
  --config p/react \
  --config p/nextjs \
  --config p/security-audit

# Quick scan (just p/ci ruleset)
semgrep scan --config p/ci --error

# Scan specific file
semgrep --config p/security-audit src/components/auth/login.tsx

# Scan specific directory
semgrep --config p/react src/components/
```

### Run with Baseline (Simulate PR Scan)

```bash
# Compare against main branch baseline
git fetch origin main
semgrep ci \
  --config p/ci \
  --baseline-commit origin/main
```

---

## Suppressing Findings

### When to Suppress

✅ **Good reasons to suppress**:
- False positive (Semgrep is wrong)
- Intentional behavior (e.g., admin debug endpoint)
- Already mitigated by other controls
- Not applicable in your context

❌ **Bad reasons to suppress**:
- "I'll fix it later" (create an issue instead)
- "It's just a warning" (warnings exist for a reason)
- "This code works fine" (security != functionality)

### How to Suppress

#### Inline Suppression (Single Line)

```typescript
// nosemgrep: typescript.lang.security.audit.unsafe-innerhtml
dangerouslySetInnerHTML={{ __html: sanitizedContent }}
```

#### Block Suppression (Multiple Lines)

```typescript
// nosemgrep
function legacyAuthFlow() {
  // This entire function is intentionally exempt
  const token = localStorage.getItem('token'); // Would normally flag
  return token;
}
```

#### Suppress Specific Rule

```typescript
// nosemgrep: javascript.express.security.audit.express-cookie-session-no-secret
app.use(session({
  secret: process.env.SESSION_SECRET  // Secret comes from env, but Semgrep can't detect that
}));
```

#### Suppress with Explanation (Recommended)

```typescript
// nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml
// JUSTIFICATION: Content is sanitized by DOMPurify before rendering
// See: src/lib/sanitize.ts - sanitizeHtml()
<div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
```

### Suppress at File Level

Add to `.semgrepignore`:

```
# Test files (not production code)
**/*.test.ts
**/*.test.tsx
**/*.spec.ts

# Generated code
src/generated/
dist/
build/

# Third-party vendored code
vendor/
```

---

## Re-baselining

### When to Re-baseline

You may need to update the baseline when:
- Merging a large refactor to `main`
- Upgrading Semgrep (new rules might find old issues)
- Fixing a batch of legacy security issues

### How to Re-baseline

The baseline automatically updates when you push to `main`. Each merge to `main` sets the new baseline for future PRs.

**Manual re-baseline** (if needed):
```bash
# Push to main branch
git checkout main
git pull origin main
git push origin main

# This triggers a full scan and updates the baseline
```

After this, future PRs will compare against the new baseline.

---

## Workflow Automation

Semgrep scans run **automatically** on:

### 1. Every Pull Request to `main`
- **Baseline scan**: Only new findings block
- Posts findings as PR comments (if configured)
- Uploads results to GitHub Security tab
- Fails the check on ERROR severity findings

### 2. Every Push to `main` Branch
- **Full scan**: Scans entire codebase
- Updates baseline for future PRs
- Uploads results to Semgrep Cloud
- Reports to GitHub Security

### 3. Manual Trigger
```bash
# Trigger via GitHub CLI
gh workflow run "Semgrep SAST" --ref ci/semgrep

# Or via GitHub UI: Actions → Semgrep SAST → Run workflow
```

---

## Viewing Results

### In GitHub (PR Checks)

1. Open any pull request
2. Scroll to checks section
3. Look for **"Semgrep Scan"** status
4. Click **"Details"** for full findings

### In GitHub Security Tab

1. Go to **Security** → **Code scanning alerts**
2. Filter by tool: **Semgrep**
3. View all findings with severity, location, and remediation

### In Semgrep Cloud Dashboard

1. Go to https://semgrep.dev/login
2. Navigate to **Findings**
3. Filter by repository: `dental-crm-private`
4. View detailed analysis, trends, and metrics

---

## Integration Details

### GitHub Repository
- **Repository**: `AgenttoffeeOrg/dental-crm-private`
- **GitHub App**: Semgrep App (installed org-wide)
- **Installation**: https://github.com/organizations/AgenttoffeeOrg/settings/installations

### GitHub Actions
- **Workflow**: `.github/workflows/semgrep.yml`
- **Triggers**: PR to main, push to main, manual dispatch
- **Container**: `returntocorp/semgrep`

### Secrets & Variables
- **Secret**: `SEMGREP_APP_TOKEN` (for publishing to Semgrep Cloud)

### Branch Protection
- Required check: **"Semgrep Scan"**
- Must pass before merging to `main`

---

## Rule Customization

### Adding Custom Rules

Create `.semgrep.yml` in repository root:

```yaml
rules:
  - id: no-console-log-in-production
    pattern: console.log(...)
    languages: [javascript, typescript]
    severity: WARNING
    message: |
      console.log() should not be used in production code.
      Use a proper logging library instead.
```

Run with custom rules:
```bash
semgrep --config .semgrep.yml
```

### Disabling Specific Rules

Add to `.semgrep.yml`:

```yaml
# Disable specific rules globally
exclude:
  - javascript.express.security.audit.express-session-no-name
  - typescript.react.best-practice.react-props-spreading
```

---

## Performance

- **Scan time**: ~2-5 minutes (for this codebase)
- **Languages scanned**: TypeScript, JavaScript, PLpgSQL (if rules exist)
- **Lines of code**: ~6M bytes of TypeScript
- **Rules evaluated**: 1,000+ active rules
- **Baseline scan**: Much faster (only scans diff)

---

## Troubleshooting

### Issue: "Semgrep check not appearing on PR"

**Solutions:**
1. Verify GitHub App installed: https://github.com/organizations/AgenttoffeeOrg/settings/installations
2. Check workflow file exists: `.github/workflows/semgrep.yml`
3. Ensure SEMGREP_APP_TOKEN secret is set
4. Wait 1-2 minutes for workflow to start

### Issue: "False positive blocking my PR"

**Solutions:**
1. Verify it's truly a false positive (review the finding carefully)
2. Suppress with `nosemgrep` comment + justification
3. Re-push to trigger new scan
4. If urgent, contact admin for review

### Issue: "Scan failing with 'unknown error'"

**Solutions:**
1. Check Semgrep status: https://status.semgrep.dev
2. Re-run the workflow
3. Check workflow logs for specific error
4. Verify SEMGREP_APP_TOKEN is valid

### Issue: "Too many warnings, hard to review"

**Solutions:**
1. Focus on ERROR severity first (these block)
2. Ignore INFO severity initially
3. Create issues for WARNING severity
4. Fix incrementally over time

---

## Best Practices

### 1. **Run Locally Before Pushing**
```bash
semgrep scan --config p/ci --error
```
Catch issues before opening PR.

### 2. **Fix, Don't Suppress**
Only suppress when truly necessary. Most findings are real issues.

### 3. **Use Justification Comments**
When suppressing, always explain WHY:
```typescript
// nosemgrep: rule-id
// JUSTIFICATION: This is safe because [reason]
```

### 4. **Keep Rules Updated**
Semgrep rules are constantly improved. Baseline scanning means new rules won't block old code.

### 5. **Review Warnings**
Even if warnings don't block, they often indicate real problems. Create issues to track them.

### 6. **Test Fixes**
After fixing a security issue, verify the fix works AND that Semgrep stops flagging it.

---

## Security Policy Integration

Semgrep works alongside other security tools:

| Tool | Purpose | Blocks PRs On |
|------|---------|---------------|
| **Semgrep** | SAST (code security) | High/Critical code vulnerabilities |
| **CodeQL** | SAST (GitHub native) | Security vulnerabilities |
| **SonarCloud** | Code quality gate | Quality & security issues |
| **Aikido** | Dependencies, secrets, IaC | Critical vulnerabilities |
| **Dependabot** | Dependency updates | N/A (creates PRs) |

Together, these provide **defense in depth** for code security.

---

## Support & Resources

- **Semgrep Docs**: https://semgrep.dev/docs
- **Semgrep Cloud**: https://semgrep.dev
- **Semgrep Playground**: https://semgrep.dev/playground (test rules)
- **Semgrep Registry**: https://semgrep.dev/r (browse rules)
- **Semgrep Slack**: https://go.semgrep.dev/slack
- **GitHub Actions Docs**: https://semgrep.dev/docs/semgrep-ci/running-semgrep-ci-with-github-actions/

- **Repository Docs**: `docs/security-semgrep.md` (this file)
- **Workflow**: `.github/workflows/semgrep.yml`
- **Branch Protection**: https://github.com/AgenttoffeeOrg/dental-crm-private/settings/branches

---

*Last updated: October 17, 2025*



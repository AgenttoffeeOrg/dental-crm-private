# Aikido Security Integration

## Overview

**Aikido Security** is integrated with this repository to automatically scan for security vulnerabilities, hardcoded secrets, and infrastructure misconfigurations.

🔗 **Dashboard**: https://app.aikido.dev/workspace/AgenttoffeeOrg

---

## What Aikido Checks

Aikido performs comprehensive security scanning across multiple areas:

### 1. 🔍 **Dependency Vulnerabilities (SCA)**
- Scans `package.json`, `package-lock.json`, and other dependency files
- Identifies known vulnerabilities in npm packages
- Provides CVE details, CVSS scores, and remediation advice
- Checks both direct and transitive dependencies

### 2. 🔐 **Hardcoded Secrets & Credentials**
- Detects API keys, tokens, passwords in code
- Scans commit history for exposed secrets
- Identifies AWS keys, database credentials, private keys, etc.
- Prevents credentials from being committed

### 3. ☁️ **Infrastructure-as-Code (IaC) Security**
- Scans Terraform, CloudFormation, Kubernetes manifests
- Identifies security misconfigurations
- Checks for overly permissive policies
- Validates encryption and access controls

### 4. 🐳 **Container Vulnerabilities**
- Analyzes Docker images and Dockerfiles
- Detects vulnerabilities in base images
- Checks for insecure container configurations

---

## Security Policy & Blocking Rules

### 🚫 **Blocking Criteria (PR cannot merge)**

Pull requests are **automatically blocked** if Aikido detects:

- **CRITICAL severity** vulnerabilities
- **HIGH severity** vulnerabilities with known exploits
- **Hardcoded secrets or credentials** in code
- **Critical IaC misconfigurations** (e.g., public S3 buckets, open security groups)

### ⚠️ **Warning (PR can merge with review)**

Pull requests receive **warnings** for:

- **MEDIUM severity** vulnerabilities
- **LOW severity** issues
- Minor IaC configuration improvements
- Non-critical code quality issues

### ✅ **Ignored**

The following are typically ignored:

- **Development-only dependencies** (if configured)
- **False positives** (after manual review and suppression)
- Issues in test files or documentation (if configured)

---

## Workflow Automation

Aikido scans run **automatically** on:

1. **Every Pull Request** to `main`
   - Scans the PR changes
   - Posts status check on the PR
   - Blocks merge if Critical/High issues found

2. **Every Push to `main` branch**
   - Scans the latest code
   - Updates the Aikido dashboard
   - Sends notifications for new issues

3. **Manual Trigger**
   - Can be triggered via GitHub Actions workflow
   - Useful for on-demand rescans

---

## Viewing Scan Results

### In GitHub (PR Checks)

1. Open any pull request
2. Scroll to the checks section at the bottom
3. Look for **"Aikido Security"** status check
4. Click "Details" to view findings in Aikido dashboard

### In Aikido Dashboard

1. Go to https://app.aikido.dev
2. Select workspace: **AgenttoffeeOrg**
3. Navigate to **Repositories** → **dental-crm-private**
4. View:
   - All detected issues
   - Severity breakdown
   - Historical trends
   - Remediation guidance

---

## Re-running Scans

### Automatic Re-scan

Aikido automatically rescans when:
- New commits are pushed to a PR
- PR is synchronized
- Scheduled (daily for main branch)

### Manual Re-scan

**Option 1: Via GitHub Actions**
```bash
gh workflow run "Aikido Security" --ref ci/aikido
```

**Option 2: Via Aikido Dashboard**
1. Go to https://app.aikido.dev
2. Open the repository
3. Click **"Scan Now"** button

**Option 3: Push an empty commit**
```bash
git commit --allow-empty -m "chore: trigger Aikido scan"
git push
```

---

## Branch Protection

The `main` branch is protected with the following rules:

- ✅ **Require status checks to pass before merging**
- ✅ **"Aikido Security" check is required**
- ✅ **Include administrators** (admins must also pass checks)
- ✅ **Require branches to be up to date before merging**

---

## Overriding Blocks (Emergency Only)

### ⚠️ When to Override

Only override Aikido blocks in true emergencies:
- Critical production bug fix needed immediately
- Security fix for a different critical issue
- False positive confirmed after thorough review

### How to Override

**Option 1: Suppress in Aikido (Recommended)**
1. Go to Aikido dashboard
2. Find the specific issue
3. Click **"Suppress"** or **"Mark as False Positive"**
4. Add justification
5. Wait for PR check to refresh (~1 minute)

**Option 2: Admin Force Merge (Discouraged)**
1. Contact repository admin
2. Provide justification
3. Admin can bypass checks (if enabled)
4. **Must create follow-up issue to address the vulnerability**

**Option 3: Temporary Branch Protection Adjustment**
1. Go to **Settings** → **Branches** → **main protection rule**
2. Temporarily uncheck "Aikido Security" requirement
3. Merge the PR
4. **Immediately re-enable the requirement**
5. Create issue to fix the vulnerability

---

## Best Practices

### 1. **Fix Issues Early**
- Run scans on feature branches before opening PR
- Address findings before requesting review
- Don't wait until PR is blocked

### 2. **Regular Dependency Updates**
- Use Dependabot for automated updates
- Review and merge security updates promptly
- Keep dependencies up to date

### 3. **Never Commit Secrets**
- Use environment variables (`.env.local`)
- Store secrets in GitHub Secrets
- Use secret management services (AWS Secrets Manager, etc.)
- Add sensitive files to `.gitignore`

### 4. **Review Aikido Findings**
- Don't ignore warnings
- Understand the risk before suppressing
- Document suppression reasons
- Set reminders to revisit suppressed issues

### 5. **Stay Informed**
- Enable Aikido Slack/email notifications
- Review weekly security reports
- Monitor the security dashboard regularly

---

## Integration Details

### GitHub Repository
- **Repository**: `AgenttoffeeOrg/dental-crm-private`
- **Aikido Workspace**: `AgenttoffeeOrg`
- **GitHub App**: Aikido Security (installed org-wide)

### GitHub Actions
- **Workflow**: `.github/workflows/aikido.yml`
- **Triggers**: PR, push to main, manual dispatch
- **Purpose**: Visibility and documentation (actual scans via GitHub App)

### Secrets & Variables
- **Secret**: `AIKIDO_TOKEN` (for API access if needed)
- **Variable**: `AIKIDO_WORKSPACE` (workspace identifier)

---

## Troubleshooting

### Issue: "Aikido Security check not appearing on PR"

**Solutions:**
1. Verify GitHub App is installed: https://github.com/organizations/AgenttoffeeOrg/settings/installations
2. Check repository is enabled in Aikido workspace
3. Ensure PR is targeting `main` branch
4. Wait 1-2 minutes for initial scan to start

### Issue: "Scan stuck in pending state"

**Solutions:**
1. Check Aikido service status: https://status.aikido.dev
2. Re-trigger by pushing empty commit
3. Contact Aikido support if persists

### Issue: "False positive blocking PR"

**Solutions:**
1. Verify it's truly a false positive (not a real issue)
2. Suppress in Aikido dashboard with justification
3. Wait for check to refresh
4. If urgent, use emergency override process

### Issue: "Branch protection not enforcing Aikido"

**Solutions:**
1. Go to **Settings** → **Branches** → **main**
2. Edit branch protection rule
3. Ensure **"Require status checks to pass"** is checked
4. Add **"Aikido Security"** to required checks list
5. Save changes

---

## Support & Resources

- **Aikido Documentation**: https://docs.aikido.dev
- **Aikido Dashboard**: https://app.aikido.dev
- **Aikido Support**: support@aikido.dev
- **GitHub App**: https://github.com/apps/aikido-security
- **Status Page**: https://status.aikido.dev

---

*Last updated: October 17, 2025*


# GitHub Actions Workflow Status Guide

## 📋 All Workflows Overview

This document tracks the status of all CI/CD workflows and testing tools.

### ✅ Active Workflows

| Workflow | Status | Trigger | Purpose |
|----------|--------|---------|---------|
| **SonarCloud Analysis** | ✅ Active | Push/PR | Code quality & security analysis |
| **CodeQL Advanced Security** | ✅ Active | Push/PR/Schedule | Security vulnerability scanning |
| **E2E Tests** | ✅ Active | Push/PR | End-to-end Playwright tests |
| **Lighthouse CI** | ✅ Active | Push/PR | Performance & accessibility audits |
| **k6 Load Tests** | ✅ Active | PR/Schedule | Load & stress testing |
| **Pre-Deploy Gate** | ✅ Active | PR | Pre-deployment validation |
| **Semgrep SAST** | ✅ Active | Push/PR/Schedule | Security static analysis |
| **SQLFluff** | ✅ Active | Push/PR | SQL code quality |
| **Percy Visual Tests** | ✅ Active | PR | Visual regression testing |
| **Demo Reset** | ✅ Active | Manual | Reset demo environment |
| **Verify Demo Data** | ✅ Active | Manual | Verify demo seed data |
| **Dependabot Auto-Merge** | ✅ Active | PR | Auto-merge dependency updates |

## 🔍 How to Check Workflow Status

### 1. GitHub Actions Dashboard
Visit: https://github.com/AgenttoffeeOrg/dental-crm-private/actions

### 2. Run Status Checker Script
```bash
./scripts/check-workflow-status.sh
```

### 3. Check Individual Workflows

#### SonarCloud
- Dashboard: https://sonarcloud.io/project/overview?id=AgenttoffeeOrg_dental-crm-private
- Current Issues: 150 critical, 50 accessibility

#### CodeQL
- Security Tab: https://github.com/AgenttoffeeOrg/dental-crm-private/security/code-scanning

#### E2E Tests
- Artifacts: Check workflow runs for `playwright-report`
- Local: `npm run test:e2e`

#### Lighthouse CI
- Artifacts: Check workflow runs for `lighthouse-reports`
- Local: `npm run lighthouse`

#### k6 Load Tests
- Artifacts: Check workflow runs for `k6-results`
- Local: `npm run test:load`

## 🚀 Manual Workflow Triggers

### Via GitHub UI
1. Go to Actions tab
2. Select workflow from sidebar
3. Click "Run workflow"
4. Select branch and click "Run workflow"

### Via Command Line
```bash
# Trigger SonarCloud scan
gh workflow run "SonarCloud Analysis"

# Trigger E2E tests
gh workflow run "E2E Tests"

# Trigger Lighthouse CI
gh workflow run "Lighthouse CI"
```

## 🔧 Required Secrets & Variables

### GitHub Secrets (Repository Settings → Secrets)
- `SONAR_TOKEN` - SonarCloud authentication
- `PERCY_TOKEN` - Percy visual testing (optional)
- `TEST_EMAIL` - Test account email
- `TEST_PASSWORD` - Test account password
- `DEMO_RESET_TOKEN` - Demo reset API token
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### GitHub Variables (Repository Settings → Variables)
- `BASE_URL` - Application base URL for testing
- `SUPABASE_URL` - Supabase project URL
- `SEED_PACK_ID` - Demo seed pack identifier

## 📊 Workflow Health Checklist

- [ ] All workflows have valid YAML syntax
- [ ] Required secrets are configured
- [ ] Required variables are set
- [ ] Test files exist in `tests/` directory
- [ ] k6 scripts exist in `k6/` directory
- [ ] Lighthouse config exists (`lighthouserc.json`)
- [ ] Playwright config exists (`playwright.config.ts`)
- [ ] Jest config exists (`jest.config.js`)

## 🐛 Troubleshooting

### Workflow Not Running
1. Check if workflow file exists in `.github/workflows/`
2. Verify YAML syntax is valid
3. Check if trigger conditions are met
4. Verify branch protection rules allow workflow

### Workflow Failing
1. Check workflow logs in Actions tab
2. Verify all required secrets/variables are set
3. Check if dependencies are installed correctly
4. Verify test files exist and are valid

### Tests Failing
1. Run tests locally: `npm run test:e2e`
2. Check test files in `tests/` directory
3. Verify environment variables are set
4. Check application is accessible at BASE_URL

## 📈 Status Monitoring

### Daily Checks
- SonarCloud: Automatic on push
- CodeQL: Weekly schedule (Sunday 1:30 AM UTC)
- k6: Daily schedule (1 AM UTC)

### PR Checks
- All workflows run automatically on PR
- Check PR comments for results
- Review artifacts for detailed reports

## 🎯 Next Steps

1. **Verify all secrets are configured**
   - Go to Settings → Secrets and variables → Actions
   - Add any missing secrets/variables

2. **Test workflows manually**
   - Trigger each workflow via GitHub UI
   - Verify they complete successfully

3. **Monitor workflow health**
   - Check Actions tab regularly
   - Review failed workflows
   - Fix any configuration issues

4. **Update documentation**
   - Keep this file updated with workflow changes
   - Document any custom configurations

## 📞 Support

If workflows continue to fail:
1. Check workflow logs for specific errors
2. Verify all dependencies are up to date
3. Review workflow YAML files for syntax errors
4. Check GitHub Actions status page for outages


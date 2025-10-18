# Checkly Synthetic Monitoring Setup

## Overview

This project uses [Checkly](https://www.checklyhq.com/) for synthetic monitoring to ensure the dental-crm application is available and functioning correctly 24/7.

## What's Being Monitored

### 1. Browser Checks (Playwright-based)

**Homepage Check** (`home.check.ts`)
- Verifies homepage loads correctly
- Checks for main content visibility
- Captures screenshots
- Runs every 5 minutes from 3 regions

**Login Flow Check** (`login.check.ts`)
- Tests complete user authentication flow
- Fills login form with test credentials
- Verifies redirect to dashboard
- Captures before/after screenshots
- Runs every 5 minutes from 3 regions

### 2. API Health Check

**Health Check** (`health.api.ts`)
- Pings application root endpoint
- Expects 200 OK response
- Monitors response times
- Alerts if > 10s or unavailable
- Runs every 5 minutes from 3 regions

## Monitoring Regions

Checks run from multiple global locations:
- 🇪🇺 **eu-west-1** (Ireland) - Europe
- 🇺🇸 **us-east-1** (N. Virginia) - North America
- 🇮🇳 **ap-south-1** (Mumbai) - Asia

## Alert Configuration

**Double-Check Enabled:**
- Alerts only trigger after **2 consecutive failures**
- Reduces false positives from transient issues

**Default Schedule:**
- Checks run every **5 minutes**
- 288 checks per day per region
- 864 total checks per day (3 regions)

## GitHub Integration

### CI Workflow (`checkly-ci.yml`)

Runs on **every PR to main**:
- Executes all Checkly tests against staging/production URL
- Blocks PR merge if checks fail
- Uploads test results as artifacts

### Deploy Workflow (`checkly-deploy.yml`)

Runs on **push to main**:
- Deploys/updates all monitors in Checkly account
- Creates or updates checks automatically
- Synchronizes configuration changes

## Configuration

### Environment Variables

**Required:**
```bash
CHECKLY_API_KEY=cu_xxx          # Your Checkly API key
BASE_URL=https://your-app.com   # Application URL to monitor
```

**Optional:**
```bash
CHECKLY_ACCOUNT_ID=xxx          # Auto-detected if not provided
CHECKLY_REGION_LIST=eu-west-1,us-east-1,ap-south-1
TEST_EMAIL=test@example.com     # For login flow check
TEST_PASSWORD=password123       # For login flow check
```

### GitHub Secrets & Variables

**Secrets** (Settings → Secrets → Actions):
- `CHECKLY_API_KEY` - Your Checkly API key
- `TEST_EMAIL` - Test account email (optional)
- `TEST_PASSWORD` - Test account password (optional)

**Variables** (Settings → Variables → Actions):
- `BASE_URL` - Application URL (already exists)
- `CHECKLY_REGION_LIST` - Monitoring regions (optional, has default)
- `CHECKLY_ACCOUNT_ID` - Your Checkly account ID (optional)

## Setting Up Alerts

### Email Alerts

1. Go to https://app.checklyhq.com/alert-settings
2. Click **"Add Alert Channel"**
3. Select **"Email"**
4. Enter your email address
5. Verify email
6. Assign to checks via tags (e.g., `critical`)

### Slack Alerts

1. Go to https://app.checklyhq.com/alert-settings
2. Click **"Add Alert Channel"**
3. Select **"Slack"**
4. Authorize Slack workspace
5. Choose channel (e.g., `#alerts`, `#monitoring`)
6. Assign to checks via tags

### PagerDuty / Opsgenie

1. Go to https://app.checklyhq.com/alert-settings
2. Click **"Add Alert Channel"**
3. Select your incident management tool
4. Follow integration steps
5. Assign to critical checks

## Running Checks Locally

### Test Checks (Dry Run)

```bash
cd checkly
npm install
npx checkly test
```

This runs all checks against your `BASE_URL` without deploying.

### Deploy to Checkly

```bash
cd checkly
npm install
npx checkly deploy --force
```

This creates/updates monitors in your Checkly account.

### List Existing Checks

```bash
cd checkly
npx checkly list
```

## Troubleshooting

### Login Check Not Working

**Issue:** Login flow fails or times out

**Solutions:**
1. Verify `TEST_EMAIL` and `TEST_PASSWORD` are correct
2. Check if selectors in `login.spec.ts` match your login form
3. Increase timeouts if app is slow
4. Test locally: `npx checkly test`

### Checks Not Deploying

**Issue:** `checkly deploy` fails

**Solutions:**
1. Verify `CHECKLY_API_KEY` is set correctly
2. Check you have correct permissions in Checkly
3. Ensure `checkly.config.ts` is valid
4. Run `npx checkly test` first to validate

### High False Positive Rate

**Issue:** Alerts triggering too often

**Solutions:**
1. Increase check frequency (from 5 to 10 minutes)
2. Adjust timeout values in check files
3. Enable triple-check instead of double-check
4. Review recent incidents in Checkly dashboard

## Monitoring Dashboard

View all checks and incidents:
- **Dashboard:** https://app.checklyhq.com/
- **Checks:** https://app.checklyhq.com/checks
- **Alerts:** https://app.checklyhq.com/alert-settings
- **Reports:** https://app.checklyhq.com/reports

## Cost Estimation

Checkly pricing (as of 2024):
- **Free Tier:** 5,000 check runs/month
- **Startup:** $7/month for 50,000 runs
- **Growth:** $80/month for 500,000 runs

Current usage estimate:
- 3 checks × 288 runs/day × 30 days = **25,920 runs/month**
- Fits in **Startup plan** ($7/month)

## Modifying Checks

### Change Check Frequency

Edit `checkly.config.ts`:
```typescript
checks: {
  frequency: 10, // Change from 5 to 10 minutes
}
```

### Add More Regions

Edit `checkly.config.ts`:
```typescript
locations: ['eu-west-1', 'us-east-1', 'ap-south-1', 'ap-northeast-1'],
```

Available regions: https://www.checklyhq.com/docs/monitoring/global-locations/

### Add Custom Checks

Create a new file in `checkly/`:
```typescript
// my-custom.check.ts
import { BrowserCheck } from 'checkly/constructs'

new BrowserCheck('dtcrm-custom-check', {
  name: 'My Custom Check',
  frequency: 5,
  locations: ['eu-west-1'],
  code: { entrypoint: './my-custom.spec.ts' },
})
```

Then create the corresponding spec file:
```typescript
// my-custom.spec.ts
import { test, expect } from '@playwright/test'

test('My custom test', async ({ page }) => {
  // Your test code
})
```

## Support

- **Checkly Docs:** https://www.checklyhq.com/docs/
- **Playwright Docs:** https://playwright.dev/
- **Support:** https://www.checklyhq.com/support/

## Next Steps

1. ✅ Add `CHECKLY_API_KEY` to GitHub secrets
2. ✅ Verify `BASE_URL` is correct
3. ✅ Set up email/Slack alerts in Checkly UI
4. ✅ Merge PR to enable monitoring
5. ✅ Watch dashboard for first results

---

**Monitoring is now active!** 🎉 Your app is being checked every 5 minutes from 3 global regions.


# E2E Testing Setup Guide

## ✅ Your Credentials

```bash
BASE_URL: https://dental-crm-private-production.up.railway.app/
TEST_EMAIL: deepakshegde@gmail.com
TEST_PASSWORD: Admin@123
PERCY_TOKEN: MXUiKUBtgjwbigg6mS3y
```

## 🚀 Local Testing (Ready Now!)

```bash
# Run all E2E tests
npm run test:e2e

# Interactive UI mode (recommended)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Run specific test
npx playwright test e2e/auth.spec.ts --headed

# Run Percy visual tests
npm run test:visual
```

## 🔐 GitHub Setup

### Step 1: Add Repository Variable
Go to: https://github.com/AgenttoffeeOrg/dental-crm-private/settings/variables/actions

Click **"New repository variable"**:
- **Name:** `BASE_URL`
- **Value:** `https://dental-crm-private-production.up.railway.app/`

### Step 2: Add Repository Secrets
Go to: https://github.com/AgenttoffeeOrg/dental-crm-private/settings/secrets/actions

Click **"New repository secret"** for each:

**Secret 1:**
- **Name:** `TEST_EMAIL`
- **Value:** `deepakshegde@gmail.com`

**Secret 2:**
- **Name:** `TEST_PASSWORD`
- **Value:** `Admin@123`

**Secret 3:**
- **Name:** `PERCY_TOKEN`
- **Value:** `MXUiKUBtgjwbigg6mS3y`

## 📸 Percy Dashboard

View visual regression results at: https://percy.io/

Your project will appear after the first test run.

## ⚠️ Security Note

You're using your admin credentials for testing. Consider creating a dedicated test account with limited permissions for better security.

## 🎯 What Happens Next

1. **Local:** Tests work immediately with your credentials
2. **GitHub:** Once you add secrets, CI will run tests on every PR
3. **Percy:** Visual snapshots will be captured automatically
4. **Blocking:** Failed tests will prevent PR merges

## 📚 Resources

- Playwright Docs: https://playwright.dev/
- Percy Docs: https://docs.percy.io/
- Test IDs Guide: See `testing-ids.md`

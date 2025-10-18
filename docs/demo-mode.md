# Demo Mode System

**Purpose:** Sandboxed demonstration environment with full features enabled.  
**Safety:** Complete tenant isolation, never affects production data.

---

## Environment Variables

```env
# Enable demo mode (required)
DEMO_MODE=false

# Demo tenant ID (isolated from production)
DEMO_TENANT_ID=demo-tenant

# Reset token (keep secret!)
DEMO_RESET_TOKEN=generate_random_32_char_string

# Email domain for demo users
DEMO_SAFE_EMAIL_DOMAIN=demo.example.com

# Enable all paid features for demo
DEMO_FEATURES_ALL_ENABLED=true

# Minimal data volume
DEMO_MINIMAL=true
```

**Descriptions:**
- `DEMO_MODE`: Master toggle for all demo functionality
- `DEMO_TENANT_ID`: Tenant ID for complete data isolation
- `DEMO_RESET_TOKEN`: Secret token to trigger resets (keep secure!)
- `DEMO_SAFE_EMAIL_DOMAIN`: Email suffix for demo user accounts
- `DEMO_FEATURES_ALL_ENABLED`: Unlock all paid features for demonstrations
- `DEMO_MINIMAL`: Controls data volume (true = lightweight, false = comprehensive)

---

## How to Reset Demo

### Via GitHub Actions (Recommended)

1. Go to: Actions → Demo Reset
2. Click: "Run workflow"
3. Enter: Your demo/staging URL
4. Click: "Run workflow"
5. Wait: ~30 seconds
6. Done: Demo environment reset

### Via API

```bash
curl -X POST https://your-demo-url.com/api/admin/demo-reset \
  -H "x-demo-reset-token: YOUR_TOKEN"
```

### Via CLI

```bash
npm run demo:reset
```

---

## What Gets Reset

**Cleared:**
- All contacts for demo tenant
- All deals and pipeline data
- All tasks and activities
- All entitlements

**Re-seeded:**
- Demo organization
- 5-20 demo contacts (based on DEMO_MINIMAL)
- Demo pipeline with stages
- All feature entitlements (if DEMO_FEATURES_ALL_ENABLED)

---

## Safety Measures

1. **Tenant Isolation:** Only data with `tenant_id = DEMO_TENANT_ID` is affected
2. **Mode Check:** Scripts refuse to run if `DEMO_MODE=false`
3. **Token Protection:** Reset endpoint requires secret token
4. **Production Guard:** Disabled in production environment
5. **Separate Database:** Demo should use staging database

---

## Setup Instructions

### Staging Environment

```env
DEMO_MODE=true
DEMO_TENANT_ID=demo-tenant
DEMO_RESET_TOKEN=<generate: openssl rand -hex 32>
DEMO_SAFE_EMAIL_DOMAIN=demo.yourapp.com
DEMO_FEATURES_ALL_ENABLED=true
DEMO_MINIMAL=true
```

### Production Environment

```env
DEMO_MODE=false
# (omit other demo variables)
```

### GitHub Secrets

Add `DEMO_RESET_TOKEN` secret to repository.

---

## Demo Tenant Setup

1. **Seed demo data:**
   ```bash
   npm run demo:seed
   ```

2. **Create demo users** via Supabase Auth Dashboard:
   - `owner@demo.yourapp.com`
   - `manager@demo.yourapp.com`
   - `staff@demo.yourapp.com`

3. **Verify features enabled:**
   - Check tenant_entitlements table
   - All features should show `is_enabled: true`

---

## Troubleshooting

**Issue:** Reset fails with 403
- Check `DEMO_MODE=true` in environment
- Verify `DEMO_RESET_TOKEN` matches

**Issue:** No data after seed
- Check database connection
- Verify `DEMO_TENANT_ID` exists in tenants table
- Check script logs for errors

**Issue:** Production data affected
- IMPOSSIBLE if `DEMO_TENANT_ID` is unique
- All operations filter by tenant_id
- Scripts exit if DEMO_MODE=false

---

**Safety First:** Demo mode is completely isolated and cannot affect production data.

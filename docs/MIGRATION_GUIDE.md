# Migration Guide - Multi-Location & Billing System

Complete step-by-step guide for migrating to the multi-location and seat-based billing system.

---

## Pre-Migration Checklist

### 1. **Backup Database**
```bash
# Create full database backup
pg_dump -h your-db-host -U postgres dental_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
pg_restore --list backup_*.sql
```

### 2. **Environment Setup**
```bash
# Copy environment variables
cp env.example .env.local

# Configure feature flags (start with everything OFF)
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=false
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=false
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=false
ENABLE_SEAT_ENFORCEMENT=false
ENABLE_BILLING=false
ENABLE_EMAIL_SENDING=false
```

### 3. **Test Environment**
- Create staging environment
- Test migrations on copy of production data
- Verify zero impact on existing functionality

---

## Migration Phases

### Phase 0: Preparation (30 minutes)

#### 1. Install Dependencies
```bash
cd /path/to/dental-crm

# Install any new dependencies
npm install

# Build project
npm run build

# Run type checks
npm run type-check
```

#### 2. Review Migrations
```bash
ls -la supabase/migrations/20251018_*.sql

# Expected migrations:
001_extend_tenants.sql
002_create_dental_groups.sql
003_create_user_location_access.sql
004_create_join_requests.sql
005_create_billing_schema.sql
006_seed_plans.sql
007_update_rls_dual_path.sql
008_backfill_existing_data.sql
009_seat_management_functions.sql
```

### Phase 1: Database Migrations (1 hour)

#### Run Migrations Sequentially

```bash
# Set connection string
export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:[port]/postgres"

# Run migrations one by one with verification
psql $SUPABASE_DB_URL -f supabase/migrations/20251018_001_extend_tenants.sql
# ✅ Verify: Check new columns added to tenants table

psql $SUPABASE_DB_URL -f supabase/migrations/20251018_002_create_dental_groups.sql
# ✅ Verify: dental_groups table created

psql $SUPABASE_DB_URL -f supabase/migrations/20251018_003_create_user_location_access.sql
# ✅ Verify: user_location_access table created
# ✅ Verify: auth.get_accessible_tenants() function exists

psql $SUPABASE_DB_URL -f supabase/migrations/20251018_004_create_join_requests.sql
# ✅ Verify: organization_join_requests table created

psql $SUPABASE_DB_URL -f supabase/migrations/20251018_005_create_billing_schema.sql
# ✅ Verify: plans, subscriptions, invoices tables created

psql $SUPABASE_DB_URL -f supabase/migrations/20251018_006_seed_plans.sql
# ✅ Verify: Plans inserted (8 plans total)

psql $SUPABASE_DB_URL -f supabase/migrations/20251018_007_update_rls_dual_path.sql
# ✅ Verify: RLS policies updated
# ✅ Verify: verify_rls_dual_path() function shows tables with dual-path

psql $SUPABASE_DB_URL -f supabase/migrations/20251018_008_backfill_existing_data.sql
# ✅ Verify: Existing tenants marked as single-location
# ✅ Verify: Trial subscriptions created
# ✅ Verify: Super admins created for owners

psql $SUPABASE_DB_URL -f supabase/migrations/20251018_009_seat_management_functions.sql
# ✅ Verify: Seat management functions created
```

#### Verification Queries

```sql
-- 1. Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'dental_groups',
    'user_location_access',
    'organization_join_requests',
    'plans',
    'subscriptions',
    'invoices',
    'usage_events',
    'plan_entitlements'
  );
-- Expected: 8 rows

-- 2. Verify RLS enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%';
-- All should have rowsecurity = true

-- 3. Check dual-path function
SELECT * FROM verify_rls_dual_path();
-- Should show tables using auth.get_accessible_tenants()

-- 4. Verify backfill
SELECT 
  COUNT(*) FILTER (WHERE is_multi_location = FALSE) AS single_location,
  COUNT(*) FILTER (WHERE is_multi_location = TRUE) AS multi_location
FROM tenants;
-- All existing should be single_location

-- 5. Check subscriptions created
SELECT COUNT(*) FROM subscriptions WHERE status = 'trialing';
-- Should match tenant count

-- 6. Verify plans
SELECT name, tier, default_seat_limit, price_amount FROM plans ORDER BY default_seat_limit;
-- Should show 8 plans (4 monthly, 4 yearly)

-- 7. Check Super Admins
SELECT COUNT(*) FROM super_admins WHERE is_active = TRUE;
-- Should match count of owners from app_users
```

### Phase 2: Application Deployment (30 minutes)

#### 1. Deploy Code
```bash
# Build production bundle
npm run build

# Deploy to hosting (example: Vercel)
vercel --prod

# OR deploy to your infrastructure
git push production main
```

#### 2. Smoke Tests

Test critical paths:

```bash
# 1. Signup flow (should work as before)
# → Create account
# → Verify tenant created
# → Verify subscription created

# 2. User invitation (with seat check)
# → Invite user
# → Verify seat reservation
# → Accept invitation
# → Verify user added

# 3. Existing user login
# → Login with existing account
# → Verify data accessible
# → Verify no performance issues

# 4. API endpoints
curl https://your-app.com/api/billing/plans
# → Should return plans

curl -X POST https://your-app.com/api/organizations/discover \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# → Should return discovery results
```

### Phase 3: Feature Flag Activation (Gradual)

#### Week 1: Enable Core Features
```bash
# Enable domain discovery (prevents duplicates)
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=true

# Enable join requests (employee onboarding)
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=true

# Enable seat enforcement (billing critical)
ENABLE_SEAT_ENFORCEMENT=true
```

**Monitor:**
- Error rates
- API response times
- User feedback

#### Week 2: Enable Email
```bash
# Configure email provider
EMAIL_PROVIDER=resend  # or sendgrid
RESEND_API_KEY=re_your_actual_key

# Enable email sending
ENABLE_EMAIL_SENDING=true
```

**Test:**
- Invitation emails
- Join request notifications
- Approval/rejection emails

#### Week 3: Enable Billing UI
```bash
# Enable billing features
ENABLE_BILLING=true
```

**Test:**
- Plan comparison page
- Seat usage display
- Upgrade flows

#### Week 4: Multi-Location (Selective)
```bash
# Enable for specific organizations first
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=true
```

**Criteria for multi-location:**
- Organization requests feature
- Has 2+ physical locations
- Active subscription
- Super Admin trained

---

## Data Migration Scenarios

### Scenario 1: Organization Already Has Multiple Locations

**Current State:** Multiple `tenant` records with same name

**Migration:**
1. Create `dental_group` record
2. Link all tenant records via `dental_group_id`
3. Mark tenants as `is_multi_location = TRUE`
4. Set `location_name` for each tenant
5. Update subscription to `dental_group_id`

```sql
-- Example migration
BEGIN;

-- Create dental group
INSERT INTO dental_groups (id, name, primary_email, billing_email, created_by_user_id)
VALUES (
  gen_random_uuid(),
  'Smith Dental Group',
  'admin@smithdental.com',
  'billing@smithdental.com',
  (SELECT id FROM app_users WHERE email = 'admin@smithdental.com' LIMIT 1)
)
RETURNING id INTO v_group_id;

-- Update tenants
UPDATE tenants
SET 
  is_multi_location = TRUE,
  dental_group_id = v_group_id,
  location_name = CASE 
    WHEN id = 'downtown-id' THEN 'Downtown'
    WHEN id = 'uptown-id' THEN 'Uptown'
  END
WHERE id IN ('downtown-id', 'uptown-id');

-- Move subscription to group
UPDATE subscriptions
SET 
  dental_group_id = v_group_id,
  tenant_id = NULL
WHERE tenant_id IN ('downtown-id', 'uptown-id');

COMMIT;
```

### Scenario 2: Merging Duplicate Organizations

**Problem:** Same practice created multiple times with different spellings

**Solution:**
1. Identify duplicates via domain matching
2. Choose canonical organization
3. Migrate users to canonical org
4. Merge data (contacts, deals, etc.)
5. Soft-delete duplicate orgs

```sql
-- Identify duplicates
SELECT website_host, COUNT(*) as count, ARRAY_AGG(id) as tenant_ids
FROM tenants
WHERE website_host IS NOT NULL
GROUP BY website_host
HAVING COUNT(*) > 1;

-- Manual merge (use admin tool)
-- See scripts/merge_organizations.sql
```

---

## Rollback Procedures

### Emergency Rollback

If critical issues discovered:

```bash
# 1. Disable new features immediately
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=false
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=false
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=false
ENABLE_SEAT_ENFORCEMENT=false

# 2. Revert code deployment
vercel rollback

# 3. Restore database if needed (LAST RESORT)
psql $SUPABASE_DB_URL < backup_YYYYMMDD_HHMMSS.sql
```

### Partial Rollback

Rollback specific migrations:

```sql
-- Rollback RLS changes (Migration 007)
-- Restore original RLS policies
DROP POLICY IF EXISTS contacts_tenant_isolation ON contacts;
CREATE POLICY contacts_tenant_isolation ON contacts
  FOR ALL
  USING (tenant_id = auth.get_user_tenant_id());

-- Remove new tables (if necessary)
DROP TABLE IF EXISTS user_location_access CASCADE;
DROP TABLE IF EXISTS dental_groups CASCADE;
-- etc.
```

---

## Post-Migration Tasks

### 1. Performance Monitoring

```sql
-- Monitor query performance
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%tenant_id%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check for slow queries
SELECT * FROM analyze_rls_performance('user@example.com');
```

### 2. Data Validation

```sql
-- Verify all tenants have subscriptions
SELECT t.id, t.name
FROM tenants t
LEFT JOIN subscriptions s ON s.tenant_id = t.id OR s.dental_group_id = t.dental_group_id
WHERE s.id IS NULL;
-- Should return 0 rows

-- Check seat counts match
SELECT 
  s.id,
  s.active_seats AS recorded,
  (SELECT COUNT(*) FROM app_users WHERE tenant_id = s.tenant_id) AS actual,
  s.active_seats - (SELECT COUNT(*) FROM app_users WHERE tenant_id = s.tenant_id) AS diff
FROM subscriptions s
WHERE s.tenant_id IS NOT NULL;
-- diff should be 0 for all
```

### 3. User Communication

**Email Template:**
```
Subject: New Features: Multi-Location Support & Team Management

Hi [Name],

We're excited to announce new features in Dental CRM:

✨ What's New:
- Multi-location support for dental groups
- Enhanced team management with seat tracking
- Streamlined employee onboarding
- Flexible subscription plans

📋 What This Means For You:
- No changes to your current workflow
- Better visibility into team usage
- Easy employee onboarding via join requests

Need help? Contact support@dentalcrm.com

Best regards,
Dental CRM Team
```

---

## Troubleshooting

### Issue: Users Can't See Data After Migration

**Diagnosis:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'contacts';

-- Verify user tenant access
SELECT * FROM auth.get_accessible_tenants();
```

**Solution:**
```sql
-- Reset user session
-- User must log out and log back in
```

### Issue: Seat Counts Don't Match

**Diagnosis:**
```sql
SELECT * FROM sync_subscription_seat_count('tenant-id');
```

**Solution:**
```sql
-- Sync all seats
SELECT * FROM sync_all_subscription_seat_counts();
```

### Issue: Performance Degradation

**Diagnosis:**
```sql
EXPLAIN ANALYZE 
SELECT * FROM contacts WHERE tenant_id = ANY(auth.get_accessible_tenants());
```

**Solution:**
- Check indexes exist
- Run `ANALYZE` on tables
- Verify RLS function not executing for single-location users

---

## Success Criteria

Migration is successful when:

- ✅ All existing users can login and access their data
- ✅ No performance degradation for single-location users
- ✅ All tests pass (unit, integration, E2E)
- ✅ Zero data loss
- ✅ New features work as expected
- ✅ No increase in error rates
- ✅ Customer support tickets remain stable

---

## Support

For migration support:
- **Email:** support@dentalcrm.com
- **Slack:** #migrations channel
- **Emergency:** +44 XXX XXX XXXX

---

**Migration completed successfully?** Proceed to [ROLLOUT_PLAYBOOK.md](./ROLLOUT_PLAYBOOK.md)


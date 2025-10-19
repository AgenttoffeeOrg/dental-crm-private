# 🚀 RAILWAY DEPLOYMENT GUIDE

**Date:** October 19, 2025  
**Phase:** 17 - Deployment & Monitoring  
**Status:** READY FOR DEPLOYMENT (Awaiting User Approval)  

---

## ⚠️ IMPORTANT: DO NOT DEPLOY YET

**This guide prepares everything for Railway deployment but DOES NOT execute it.**  
**User must give explicit approval before pushing to Railway.**

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before deploying to Railway, ensure ALL of the following are complete:

### Code Readiness
- [ ] All code committed to local Git repository
- [ ] All linter errors resolved
- [ ] All tests passing (unit + integration)
- [ ] Pre-deployment checklist 100% complete
- [ ] No breaking changes verified

### Database Readiness
- [ ] Database migrations tested on localhost
- [ ] Database migrations tested on staging
- [ ] Rollback scripts prepared and tested
- [ ] Backup of production database taken

### Feature Flags
- [ ] All feature flags set to OFF by default
- [ ] Feature flag system tested
- [ ] Gradual rollout plan documented

### Documentation
- [ ] All user guides complete
- [ ] All developer guides complete
- [ ] Troubleshooting guide ready
- [ ] Deployment runbook prepared

### Monitoring
- [ ] Monitoring dashboards configured
- [ ] Alerts set up for errors
- [ ] Performance baselines established
- [ ] Logging configured

---

## 🔧 DEPLOYMENT STEPS (To be executed after approval)

### Step 1: Push to GitHub

```bash
# 1. Check current status
git status

# 2. Stage all changes
git add .

# 3. Commit with descriptive message
git commit -m "feat: Universal Treatment Tag Routing System (Phases 0-16 complete)

- Added treatment tags management UI
- Implemented pipeline mapping system
- Created routing engine with 4 methods
- Added routing analytics dashboard
- Integrated with forms, PMS, marketing
- Added AI tag extraction
- Implemented bulk operations
- Comprehensive documentation
- Full test suite
- Feature flags (ALL OFF by default)

BREAKING CHANGES: None
REQUIRES: Database migrations (45, 46, 47)
STATUS: Ready for production deployment"

# 4. Push to private GitHub repo
git push origin main

# 5. Verify push succeeded
git log -1
```

### Step 2: Deploy Database Migrations

```bash
# 1. Test migrations on staging first
./deploy-migrations.sh staging

# 2. Verify staging database
psql -h STAGING_DB_HOST -U postgres -d DATABASE_NAME -c "SELECT COUNT(*) FROM treatment_tags;"

# 3. If staging successful, deploy to production
./deploy-migrations.sh production

# 4. Verify production database
psql -h PRODUCTION_DB_HOST -U postgres -d DATABASE_NAME -c "SELECT COUNT(*) FROM treatment_tags;"

# 5. Confirm all tables created
psql -h PRODUCTION_DB_HOST -U postgres -d DATABASE_NAME -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_name LIKE 'treatment_%' 
    OR table_name = 'pms_procedure_tag_mappings';
"

# Expected output:
# - treatment_tags
# - treatment_tag_pipeline_mappings
# - treatment_routing_logs
# - treatment_routing_settings
# - pms_procedure_tag_mappings
```

### Step 3: Configure Railway Environment Variables

**In Railway Dashboard:**

1. Go to your project → Settings → Variables
2. Add/verify the following:

```bash
# Feature Flags (ALL OFF initially)
NEXT_PUBLIC_ENABLE_TREATMENT_ROUTING=false
NEXT_PUBLIC_ENABLE_ROUTING_UI=false
NEXT_PUBLIC_ENABLE_ROUTING_ANALYTICS=false
ENABLE_AUTO_TAG_EXTRACTION=false
ENABLE_BULK_REROUTING=false
ENABLE_FORM_ROUTING=false
ENABLE_PMS_ROUTING=false
ENABLE_WEBHOOK_ROUTING=false
ENABLE_AI_SUGGESTIONS=false
ENABLE_ROUTING_EVENTS=false

# Database (already configured)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=your-database-url

# Node Environment
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Other existing variables
# ... (keep all existing variables)
```

### Step 4: Deploy Code to Railway

```bash
# Railway will auto-deploy from GitHub main branch
# Or manually trigger deployment:

# Option A: Railway CLI
railway up

# Option B: Railway Dashboard
# Go to Deployments → Deploy → main branch

# Wait for deployment to complete
# Monitor deployment logs for errors
```

### Step 5: Verify Deployment

```bash
# 1. Check deployment status
railway status

# 2. View deployment logs
railway logs

# 3. Test production URL
curl https://your-app.railway.app/api/health

# 4. Verify database connection
curl https://your-app.railway.app/api/tenant/context

# 5. Check for JavaScript errors in browser console
# Open https://your-app.railway.app in browser
# Open DevTools → Console
# Look for any errors
```

### Step 6: Smoke Test Production

**Critical Paths to Test:**

1. **Login**
   - Visit production URL
   - Log in with test account
   - Verify dashboard loads

2. **Deal Creation (Legacy)**
   - Create a deal manually
   - Select pipeline manually
   - Verify it saves correctly
   - **Should work exactly as before**

3. **Pipeline Board**
   - View pipeline board
   - Drag deal to different stage
   - Verify it moves correctly

4. **Contact Management**
   - View contacts
   - Create new contact
   - Verify it saves

5. **Analytics**
   - Load analytics dashboards
   - Verify all charts display
   - No errors in console

### Step 7: Enable Feature Flags (Gradual Rollout)

**ONLY after smoke tests pass:**

#### Phase 1: Internal Testing (Day 1)

Enable for ONE test tenant only:

```sql
-- In production database
INSERT INTO feature_flags (
  tenant_id,
  feature_category,
  enabled,
  show_ui,
  show_analytics,
  enabled_at,
  enabled_by
) VALUES (
  'YOUR-TEST-TENANT-UUID',
  'treatment_routing',
  true,  -- Master switch
  true,  -- Show UI
  true,  -- Show analytics
  NOW(),
  'admin-user-uuid'
);
```

**Monitor for 24 hours:**
- Check for errors in logs
- Verify routing works correctly
- Gather feedback from test user
- Monitor performance metrics

#### Phase 2: Beta Testing (Day 2-7)

If Phase 1 successful, enable for 5 beta customers:

```sql
-- Add 5 beta tenants
INSERT INTO feature_flags (
  tenant_id, feature_category, enabled, show_ui, show_analytics
) VALUES
  ('beta-tenant-1-uuid', 'treatment_routing', true, true, true),
  ('beta-tenant-2-uuid', 'treatment_routing', true, true, true),
  ('beta-tenant-3-uuid', 'treatment_routing', true, true, true),
  ('beta-tenant-4-uuid', 'treatment_routing', true, true, true),
  ('beta-tenant-5-uuid', 'treatment_routing', true, true, true);
```

**Monitor for 1 week:**
- Daily check of routing logs
- Gather user feedback
- Fix any issues discovered
- Iterate on UX improvements

#### Phase 3: Limited Release (Week 2-4)

If Phase 2 successful, enable for 10% of customers:

```sql
-- Enable for 10% of tenants (randomized)
UPDATE feature_flags
SET 
  enabled = true,
  show_ui = true,
  show_analytics = true,
  auto_extraction = true,
  form_routing = true
WHERE tenant_id IN (
  SELECT id 
  FROM tenants 
  WHERE random() < 0.1  -- 10% sample
    AND is_active = true
);
```

**Monitor for 2-4 weeks:**
- Weekly routing accuracy reports
- User satisfaction surveys
- Performance monitoring
- Bug fixes and improvements

#### Phase 4: General Availability (After successful rollout)

If all phases successful, enable for everyone:

```sql
-- Enable for all active tenants
INSERT INTO feature_flags (tenant_id, feature_category, enabled, show_ui, show_analytics)
SELECT 
  id,
  'treatment_routing',
  true,
  true,
  true
FROM tenants
WHERE is_active = true
ON CONFLICT (tenant_id, feature_category) 
DO UPDATE SET 
  enabled = true,
  show_ui = true,
  show_analytics = true;
```

---

## 📊 MONITORING & ALERTS

### Key Metrics to Monitor

**Application Health:**
- Response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- CPU usage
- Memory usage
- Database connection pool

**Routing System:**
- Routing success rate (target: >95%)
- Average routing time (target: <100ms)
- Unsorted pipeline percentage (target: <10%)
- Tag extraction accuracy
- User overrides rate

**User Experience:**
- Page load times
- Deal creation time
- Pipeline board render time
- Search performance

### Alert Thresholds

```yaml
# Railway monitoring alerts
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    duration: "5 minutes"
    action: "Send Slack notification"
  
  - name: "Slow Response Time"
    condition: "p95_response_time > 3000ms"
    duration: "10 minutes"
    action: "Send Slack notification"
  
  - name: "High CPU Usage"
    condition: "cpu_usage > 80%"
    duration: "5 minutes"
    action: "Send Slack notification"
  
  - name: "Database Connection Issues"
    condition: "db_connection_errors > 0"
    duration: "1 minute"
    action: "Send Slack notification + Email"
  
  - name: "Routing Failures"
    condition: "routing_error_rate > 10%"
    duration: "5 minutes"
    action: "Send Slack notification"
```

### Monitoring Dashboards

**1. Application Dashboard:**
- Request volume
- Response times
- Error rates
- Active users

**2. Routing System Dashboard:**
- Routing methods breakdown
- Success rate over time
- Top tags used
- Pipeline distribution

**3. Database Dashboard:**
- Query performance
- Connection pool usage
- Slow queries
- Table sizes

---

## 🔄 ROLLBACK PLAN

If critical issues discovered after deployment:

### Immediate Rollback (< 5 minutes)

**Option 1: Disable Feature Flags**
```sql
-- Turn off for all tenants
UPDATE feature_flags
SET enabled = false
WHERE feature_category = 'treatment_routing';
```

**Option 2: Environment Variable**
```bash
# In Railway Dashboard
NEXT_PUBLIC_ENABLE_TREATMENT_ROUTING=false

# Redeploy (automatic)
```

### Full Rollback (< 30 minutes)

**1. Revert Code**
```bash
# Rollback to previous commit
git revert HEAD
git push origin main

# Railway auto-deploys reverted code
```

**2. Rollback Database**
```bash
# Run rollback scripts
./deploy-migrations.sh production rollback

# Verify rollback
psql -h PRODUCTION_DB_HOST -U postgres -d DATABASE_NAME -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_name LIKE 'treatment_%';
"
# Should return empty or pre-migration state
```

**3. Restore from Backup (if needed)**
```bash
# Restore from backup created before migration
pg_restore -h PRODUCTION_DB_HOST -U postgres -d DATABASE_NAME backups/TIMESTAMP/data_backup.sql
```

---

## 📞 INCIDENT RESPONSE

### Severity Levels

**P0 (Critical) - Production Down**
- Response time: Immediate
- All hands on deck
- User-facing downtime

**P1 (Major) - Feature Broken**
- Response time: < 1 hour
- Major functionality impaired
- Workaround available

**P2 (Minor) - Bug**
- Response time: < 4 hours
- Limited impact
- Scheduled fix

### Contact Information

**On-Call Engineer:** [Your phone]  
**Backup:** [Backup contact]  
**Slack Channel:** #incidents  
**Email:** incidents@yourcompany.com  

---

## ✅ POST-DEPLOYMENT CHECKLIST

After deployment completes:

- [ ] Smoke tests passed
- [ ] No errors in production logs
- [ ] Performance metrics within normal range
- [ ] Feature flags confirmed OFF
- [ ] Monitoring dashboards updated
- [ ] Team notified of deployment
- [ ] Documentation updated with production URLs
- [ ] Rollback plan verified and ready
- [ ] User announcement prepared (for when features enabled)

---

## 📝 DEPLOYMENT LOG

| Date | Action | Status | Notes |
|------|--------|--------|-------|
| YYYY-MM-DD | Code pushed to GitHub | ☐ Pending | |
| YYYY-MM-DD | DB migration (staging) | ☐ Pending | |
| YYYY-MM-DD | DB migration (production) | ☐ Pending | |
| YYYY-MM-DD | Railway deployment | ☐ Pending | |
| YYYY-MM-DD | Smoke tests | ☐ Pending | |
| YYYY-MM-DD | Phase 1 (internal) enabled | ☐ Pending | |
| YYYY-MM-DD | Phase 2 (beta) enabled | ☐ Pending | |
| YYYY-MM-DD | Phase 3 (10%) enabled | ☐ Pending | |
| YYYY-MM-DD | Phase 4 (100%) enabled | ☐ Pending | |

---

## 🎊 SUCCESS CRITERIA

Deployment considered successful when:

✅ All smoke tests pass  
✅ Zero critical errors in first 24 hours  
✅ Performance metrics within baseline ±10%  
✅ Routing accuracy >90% for beta users  
✅ User feedback positive (NPS >8)  
✅ Zero data loss or corruption  
✅ Zero breaking changes to existing features  

---

**⚠️ REMINDER: DO NOT DEPLOY TO RAILWAY WITHOUT USER APPROVAL ⚠️**

**Once approved, follow this guide step-by-step with utmost precision.**

---

*Last Updated: October 19, 2025*  
*Version: 1.0.0*  
*© 2025 Dental CRM. All rights reserved.*


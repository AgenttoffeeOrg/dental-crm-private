# Railway Deployment Guide - Dental CRM Enterprise

**Version:** 6.0 - Multi-Location Enterprise Edition  
**Last Updated:** October 18, 2025  
**Production URL:** https://dental-crm-private-production.up.railway.app

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Railway Configuration](#railway-configuration)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Health Checks & Monitoring](#health-checks--monitoring)
6. [Deployment Process](#deployment-process)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)

---

## 🎯 Pre-Deployment Checklist

### Code Verification
- [ ] All code committed to `main` branch
- [ ] Build passes locally: `npm run build`
- [ ] Health endpoint works: `curl http://localhost:3000/api/health`
- [ ] All 57 database migrations present in `supabase/migrations/`
- [ ] Multi-location architecture code verified
- [ ] All tests passing (unit, integration, E2E)

### Infrastructure Ready
- [ ] Supabase database online and accessible
- [ ] Stripe account configured (for billing)
- [ ] Email provider configured (Resend)
- [ ] SMS provider configured (Twilio)
- [ ] Sentry project created
- [ ] Railway project created and linked

---

## ⚙️ Railway Configuration

### 1. Start Command

**Location:** Railway → Service → Settings → Deploy → Start Command

```bash
npm run start
```

**Why:** This uses our production-optimized start script that binds to `$PORT` automatically.

---

### 2. Build Command

**Location:** Railway → Service → Settings → Deploy → Build Command

```bash
npm install && npm run build
```

**Why:** Ensures dependencies are installed and Next.js is built for production.

---

### 3. Health Check Configuration

**Location:** Railway → Service → Settings → Health Check

| Setting | Value | Reason |
|---------|-------|--------|
| **Enable Health Checks** | ✓ Enabled | Monitor application health |
| **Health Check Path** | `/api/health` | Custom health endpoint |
| **Health Check Timeout** | `5 seconds` | Fast response expected |
| **Health Check Interval** | `30 seconds` | Check every 30s |
| **Success Status Code** | `200` | Standard HTTP OK |
| **Failure Threshold** | `3` | Allow 3 failures before restart |

**Expected Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "uptime": 1234,
  "timestamp": "2025-10-18T...",
  "environment": "production",
  "version": "1.0.0"
}
```

---

### 4. Auto-Restart Configuration

**Location:** Railway → Service → Settings → Deploy

| Setting | Value | Reason |
|---------|-------|--------|
| **Restart on Crash** | ✓ Enabled | Auto-recovery from crashes |
| **Max Restarts** | `10` | Prevent restart loops |
| **Restart Window** | `10 minutes` | Time window for restart counting |

---

### 5. Resource Allocation

**Location:** Railway → Service → Settings → Resources

**Recommended for Production:**
- **Memory:** 2 GB minimum (4 GB recommended)
- **CPU:** 2 vCPUs minimum
- **Disk:** 10 GB

**Why:** Next.js 15 with enterprise features requires adequate resources for:
- Image optimization
- Server-side rendering
- API routes
- Analytics processing
- Real-time features

---

### 6. Custom Domain (Optional)

**Location:** Railway → Service → Settings → Networking

**Steps:**
1. Add your custom domain (e.g., `crm.yourdomain.com`)
2. Railway provides CNAME/A record
3. Add DNS records at your domain provider
4. Railway auto-provisions SSL certificate
5. Update `NEXTAUTH_URL` and `BASE_URL` environment variables

---

## 🔐 Environment Variables

**Location:** Railway → Service → Variables

### Core Application Variables

```env
# ============================================================================
# NODE ENVIRONMENT
# ============================================================================
NODE_ENV=production

# ============================================================================
# DATABASE (Supabase)
# ============================================================================
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# ============================================================================
# AUTHENTICATION
# ============================================================================
JWT_SECRET=[generate-with: openssl rand -base64 32]
NEXTAUTH_URL=https://dental-crm-private-production.up.railway.app
NEXTAUTH_SECRET=[generate-with: openssl rand -base64 32]

# ============================================================================
# APPLICATION
# ============================================================================
BASE_URL=https://dental-crm-private-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://dental-crm-private-production.up.railway.app

# ============================================================================
# SENTRY (Error Tracking & Performance Monitoring)
# ============================================================================
NEXT_PUBLIC_SENTRY_DSN=https://9f500122e319dce965baba25e330cf07@o4510207888392192.ingest.de.sentry.io/4510207920701520
SENTRY_AUTH_TOKEN=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
SENTRY_ORG=agenttoffeeorg
SENTRY_PROJECT=dental-crm
SENTRY_DEV=false

# ============================================================================
# STRIPE (Billing & Payments)
# ============================================================================
STRIPE_SECRET_KEY=[your-stripe-secret-key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your-stripe-publishable-key]
STRIPE_WEBHOOK_SECRET=[your-stripe-webhook-secret]

# ============================================================================
# EMAIL (Resend)
# ============================================================================
RESEND_API_KEY=[your-resend-api-key]
FROM_EMAIL=noreply@yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com

# ============================================================================
# SMS (Twilio)
# ============================================================================
TWILIO_ACCOUNT_SID=[your-twilio-account-sid]
TWILIO_AUTH_TOKEN=[your-twilio-auth-token]
TWILIO_PHONE_NUMBER=[your-twilio-phone-number]

# ============================================================================
# OPENAI (AI Features - Deal Intelligence, Predictions)
# ============================================================================
OPENAI_API_KEY=[your-openai-api-key]
OPENAI_ORG_ID=[your-openai-org-id]

# ============================================================================
# GOOGLE (Calendar, Analytics, OAuth)
# ============================================================================
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
GOOGLE_REDIRECT_URI=https://dental-crm-private-production.up.railway.app/api/auth/callback/google

# ============================================================================
# FEATURE FLAGS
# ============================================================================
ENABLE_MULTI_LOCATION=true
ENABLE_BILLING=true
ENABLE_MARKETING=true
ENABLE_ANALYTICS=true
ENABLE_AI_FEATURES=true

# ============================================================================
# PERFORMANCE & OPTIMIZATION
# ============================================================================
NEXT_TELEMETRY_DISABLED=1
```

### How to Generate Secrets

```bash
# JWT_SECRET
openssl rand -base64 32

# NEXTAUTH_SECRET
openssl rand -base64 32

# Stripe Webhook Secret
# Get from: Stripe Dashboard → Developers → Webhooks → Add endpoint
# Endpoint URL: https://your-domain.railway.app/api/webhooks/stripe
```

---

## 🗄️ Database Setup

### 1. Verify Supabase Connection

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"
```

### 2. Run Migrations

**Option A: Supabase CLI (Recommended)**
```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref [your-project-ref]

# Push migrations
supabase db push
```

**Option B: Manual Migration**
```bash
# Run each migration in order
for file in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$file"
done
```

### 3. Verify Schema

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected: 50+ tables including:
-- tenants, users, contacts, deals, pipelines, stages
-- dental_groups, user_location_access, join_requests
-- billing.plans, billing.subscriptions
-- forms, form_submissions, campaigns, etc.

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Expected: 50+ RLS policies for multi-tenant isolation
```

### 4. Seed Data (Optional)

```bash
# Run seed scripts if needed
psql "$DATABASE_URL" -f scripts/seed_production.sql
```

---

## 📊 Health Checks & Monitoring

### Health Endpoint

**URL:** `https://your-domain.railway.app/api/health`

**Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "uptime": 1234,
  "timestamp": "2025-10-18T12:00:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### Sentry Monitoring

**Dashboard:** https://agenttoffeeorg.sentry.io/

**What's Monitored:**
- Error tracking (client & server)
- Performance monitoring
- Session replay
- API route performance
- Database query performance
- User interactions

**Alert Thresholds:**
- Errors: Alert on 10+ in 5 minutes
- Performance: Alert if p95 > 3s
- Availability: Alert on 3 consecutive failures

### Railway Logs

**View Logs:**
```bash
railway logs --tail 100

# Or in Railway dashboard:
Service → Deployments → [Latest] → Logs
```

**What to Monitor:**
- Application startup logs
- Health check responses
- Error messages
- Performance warnings
- Database connection status

---

## 🚀 Deployment Process

### Automatic Deployment (Recommended)

Railway auto-deploys when code is pushed to `main`:

```bash
# 1. Commit changes
git add .
git commit -m "feat: add new feature"

# 2. Push to main
git push origin main

# 3. Railway automatically:
#    - Detects push
#    - Runs build
#    - Runs health checks
#    - Switches traffic to new version
```

### Manual Deployment

**Via Railway Dashboard:**
1. Go to: Railway → Service → Deployments
2. Click: "Deploy"
3. Select branch: `main`
4. Click: "Deploy now"

**Via Railway CLI:**
```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Deployment Stages

**1. Build Phase (3-5 minutes)**
```
✓ Installing dependencies
✓ Running npm run build
✓ Generating static pages
✓ Optimizing images
✓ Creating production build
```

**2. Deploy Phase (1-2 minutes)**
```
✓ Uploading build artifacts
✓ Starting application
✓ Health check: /api/health
✓ Ready to serve traffic
```

**3. Verification Phase (1 minute)**
```
✓ Smoke test passed
✓ All features accessible
✓ Monitoring active
```

---

## ✅ Post-Deployment Verification

### Automated Checks

**1. Health Endpoint**
```bash
curl https://dental-crm-private-production.up.railway.app/api/health
# Expected: {"ok":true,"status":"healthy"...}
```

**2. Homepage**
```bash
curl -I https://dental-crm-private-production.up.railway.app/
# Expected: HTTP/2 200
```

**3. Authentication**
- Visit: `/login`
- Login with test credentials
- Verify redirect to dashboard

### Manual Feature Testing

**Core CRM (5 minutes)**
- [ ] Dashboard loads with metrics
- [ ] Contacts list displays
- [ ] Create new contact
- [ ] Deals pipeline visible
- [ ] Create new deal
- [ ] Calendar loads events

**Multi-Location (3 minutes)**
- [ ] Organizations menu visible
- [ ] Location selector works
- [ ] Create new location
- [ ] Assign user to location
- [ ] Verify location-based data filtering

**Analytics Dashboard (5 minutes)**
- [ ] Executive dashboard loads
- [ ] Business health score displays
- [ ] CRM analytics charts render
- [ ] Marketing analytics accessible
- [ ] Cohort analysis working
- [ ] Export to CSV/Excel functions

**Forms & Marketing (3 minutes)**
- [ ] Form builder opens
- [ ] Create new form
- [ ] Form preview works
- [ ] Campaign manager accessible
- [ ] Email campaign creation

**Billing (2 minutes)**
- [ ] Subscription plans visible
- [ ] Payment method update
- [ ] Invoice history displays
- [ ] Usage metrics showing

**Integrations (2 minutes)**
- [ ] Google Calendar sync
- [ ] Email integration status
- [ ] SMS integration status
- [ ] Webhook configurations

### Performance Verification

**1. Response Times**
```bash
# Test homepage
time curl -I https://dental-crm-private-production.up.railway.app/

# Target: < 500ms
```

**2. Lighthouse Score**
```bash
lighthouse https://dental-crm-private-production.up.railway.app/ \
  --only-categories=performance \
  --output=json

# Target: > 80
```

**3. Core Web Vitals**
- LCP (Largest Contentful Paint): < 2.5s ✓
- FID (First Input Delay): < 100ms ✓
- CLS (Cumulative Layout Shift): < 0.1 ✓

### Security Verification

**1. HTTPS Enabled**
```bash
curl -I https://dental-crm-private-production.up.railway.app/ | grep -i strict-transport
# Expected: Strict-Transport-Security header
```

**2. Security Headers**
```bash
curl -I https://dental-crm-private-production.up.railway.app/
# Check for:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
```

**3. Database RLS Policies**
```sql
-- Connect to database
psql "$DATABASE_URL"

-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- Expected: Empty result (all tables have RLS enabled)
```

---

## 🔧 Troubleshooting

### Issue: Build Fails

**Symptoms:**
- Deployment stuck at "Building..."
- Error: "Build failed"

**Solutions:**
1. Check build logs in Railway dashboard
2. Verify all dependencies in `package.json`
3. Test build locally: `npm run build`
4. Check for TypeScript errors: `npm run type-check`
5. Verify environment variables are set

**Common Causes:**
- Missing environment variables
- Dependency version conflicts
- TypeScript errors
- Out of memory during build

**Fix:**
```bash
# Increase Railway memory allocation
# Settings → Resources → Memory: 4 GB

# Or optimize build
# next.config.ts → productionBrowserSourceMaps: false
```

---

### Issue: Health Check Failing

**Symptoms:**
- Railway shows "Unhealthy"
- Deployment keeps restarting

**Solutions:**
1. Check if `/api/health` endpoint exists
2. Verify port binding: `process.env.PORT`
3. Check application logs for startup errors
4. Test health endpoint locally

**Debug:**
```bash
# Check Railway logs
railway logs --tail 100

# Test health endpoint
curl https://your-domain.railway.app/api/health -v

# Expected: HTTP 200 with JSON response
```

**Fix:**
```bash
# Verify health endpoint code
cat src/app/api/health/route.ts

# Ensure it returns 200 status
# Ensure no database calls (must be fast)
```

---

### Issue: Application Crashes on Startup

**Symptoms:**
- "Application exited with code 1"
- Continuous restart loop

**Solutions:**
1. Check for missing environment variables
2. Verify database connection
3. Check for port conflicts
4. Review application logs

**Debug:**
```bash
# View detailed logs
railway logs --filter error

# Check for:
# - "ECONNREFUSED" → Database connection issue
# - "EADDRINUSE" → Port already in use
# - "MODULE_NOT_FOUND" → Missing dependency
```

**Fix:**
```bash
# Verify DATABASE_URL is set correctly
railway variables

# Test database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Verify port configuration
# package.json → "start": "next start -p ${PORT:-3000}"
```

---

### Issue: Database Connection Timeout

**Symptoms:**
- "connection timeout"
- "too many connections"

**Solutions:**
1. Use connection pooling
2. Verify DATABASE_URL format
3. Check Supabase connection limits
4. Use Supabase pooler URL

**Fix:**
```env
# Use pooler URL (port 6543) instead of direct connection (port 5432)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Not recommended for production:
# DATABASE_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

---

### Issue: Slow Performance

**Symptoms:**
- Pages load slowly (> 3s)
- High response times

**Solutions:**
1. Check Railway metrics (CPU, Memory)
2. Optimize database queries
3. Enable caching
4. Upgrade Railway plan

**Debug:**
```bash
# Check Railway metrics
railway metrics

# Check database performance
# Supabase Dashboard → Database → Query Performance

# Check Sentry performance monitoring
# https://agenttoffeeorg.sentry.io/ → Performance
```

**Optimize:**
```typescript
// Add database indexes
// Add React.memo for components
// Enable Next.js caching
// Optimize images
// Use CDN for static assets
```

---

### Issue: Environment Variables Not Loading

**Symptoms:**
- "undefined" values in application
- Features not working

**Solutions:**
1. Verify variables are set in Railway
2. Check variable names (case-sensitive)
3. Restart deployment after setting variables

**Fix:**
```bash
# List all variables
railway variables

# Add missing variable
railway variables set KEY=value

# Redeploy
railway up
```

---

## ↩️ Rollback Procedures

### Immediate Rollback (1 minute)

**Via Railway Dashboard:**
1. Go to: Railway → Service → Deployments
2. Find: Previous successful deployment
3. Click: Three dots (⋮) → "Redeploy"
4. Confirm: "Redeploy this version"

**Via Railway CLI:**
```bash
# List recent deployments
railway deployments list

# Redeploy specific version
railway deployments redeploy [deployment-id]
```

---

### Git Revert (2 minutes)

```bash
# 1. Revert last commit
git revert HEAD

# 2. Push to main
git push origin main

# 3. Railway auto-deploys reverted version
```

---

### Restore from Tag (3 minutes)

```bash
# 1. List available tags
git tag -l

# 2. Checkout tag
git checkout v5-enterprise-analytics

# 3. Force push to main (USE WITH CAUTION)
git push origin main --force

# 4. Railway auto-deploys tagged version
```

---

### Database Rollback (Advanced)

**For schema changes:**

```bash
# 1. Create backup first
pg_dump "$DATABASE_URL" > backup.sql

# 2. Revert migrations
supabase db reset

# 3. Re-apply migrations up to desired version
# Remove unwanted migration files temporarily
supabase db push

# 4. Restore data if needed
psql "$DATABASE_URL" < backup.sql
```

---

## 📊 Monitoring Dashboard URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Railway** | https://railway.app/project/[id] | Deployment logs, metrics, config |
| **Sentry** | https://agenttoffeeorg.sentry.io/ | Error tracking, performance |
| **Checkly** | https://app.checklyhq.com/ | Uptime monitoring, synthetic checks |
| **Supabase** | https://supabase.com/dashboard/project/[id] | Database monitoring, logs |
| **Application** | https://dental-crm-private-production.up.railway.app | Live application |

---

## 📞 Support & Escalation

### Railway Support
- Documentation: https://docs.railway.app/
- Discord: https://discord.gg/railway
- Status: https://status.railway.app/

### Supabase Support
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com/
- Status: https://status.supabase.com/

### Emergency Contacts
- Platform Issues: Railway Support
- Database Issues: Supabase Support
- Application Bugs: development@yourdomain.com

---

## ✅ Deployment Checklist Summary

### Pre-Deployment
- [ ] Code merged to `main`
- [ ] Build passes locally
- [ ] All tests passing
- [ ] Environment variables verified
- [ ] Database migrations ready

### Railway Configuration
- [ ] Start command set
- [ ] Build command set
- [ ] Health check configured
- [ ] Auto-restart enabled
- [ ] Resources allocated

### Deployment
- [ ] Push to `main` OR manually deploy
- [ ] Monitor build logs
- [ ] Verify health check passes
- [ ] Traffic switched to new version

### Post-Deployment
- [ ] Health endpoint responding
- [ ] Core features tested
- [ ] Performance verified
- [ ] Monitoring active
- [ ] Team notified

---

## 🎉 Success Criteria

Deployment is successful when:

✅ Health check returns 200 OK  
✅ All pages load without errors  
✅ Authentication works  
✅ Multi-location features functional  
✅ Analytics dashboards loading  
✅ Forms and marketing accessible  
✅ Billing system operational  
✅ Integrations working  
✅ Sentry receiving events  
✅ Response times < 1s  
✅ No critical errors in logs  
✅ Uptime 100%  

---

**Deployment Guide Version:** 1.0  
**Last Verified:** October 18, 2025  
**Next Review:** November 18, 2025


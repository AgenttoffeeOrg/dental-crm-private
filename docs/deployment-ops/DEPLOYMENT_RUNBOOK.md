# 🚀 Marketing Audit Module - Deployment Runbook

## Quick Deploy Guide

**Time Required:** 15-20 minutes  
**Difficulty:** Intermediate  
**Prerequisites:** Supabase project, Google Cloud project

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables ✅

Create/update `.env.local`:

```bash
# Feature Flag
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true

# Google APIs (REQUIRED)
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here

# Redis for Rate Limiting (REQUIRED)
REDIS_URL=redis://default:password@host:6379

# Cron Secret (REQUIRED)
CRON_SECRET=generate_secure_random_string_here

# Optional: Phase 2 Features
BRIGHTLOCAL_API_KEY=your_brightlocal_key
BRIGHTLOCAL_ACCOUNT_ID=your_account_id

# Optional: Phase 3 Features
SEMRUSH_API_KEY=your_semrush_key

# Optional: Email Delivery
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=audits@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Database Migrations ✅

Run in Supabase SQL Editor (in order):

```sql
-- 1. Core tables
\i supabase/migrations/20250116_marketing_audit_tables.sql

-- 2. Share links
\i supabase/migrations/20250116_audit_shares.sql

-- 3. Webhooks
\i supabase/migrations/20250116_webhooks.sql

-- 4. Branding
\i supabase/migrations/20250116_practice_branding.sql

-- 5. Spatial function
\i supabase/functions/find_nearby_competitors.sql
```

Verify:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'marketing%';
-- Should return 9 tables
```

### 3. Google Cloud Setup ✅

**Enable APIs:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - PageSpeed Insights API
   - Google Search Console API
   - Google Analytics Data API
   - Google My Business API
   - Places API (New)

**Create OAuth Credentials:**
1. APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs:
   - `https://yourdomain.com/api/marketing-audit/oauth/google/callback`
   - `http://localhost:3000/api/marketing-audit/oauth/google/callback` (dev)
5. Save Client ID and Secret

**Configure OAuth Consent Screen:**
1. OAuth consent screen → External
2. Add scopes:
   - `https://www.googleapis.com/auth/analytics.readonly`
   - `https://www.googleapis.com/auth/webmasters.readonly`
   - `https://www.googleapis.com/auth/business.manage`
3. Add test users (for testing)
4. Publish when ready for production

### 4. Redis Setup ✅

**Option A: Upstash (Recommended)**
1. Sign up at [upstash.com](https://upstash.com/)
2. Create Redis database
3. Copy `REDIS_URL` from dashboard
4. Paste in `.env.local`

**Option B: Railway/Render**
1. Add Redis service
2. Copy connection URL
3. Update `.env.local`

---

## 🚀 Deployment Steps

### Step 1: Build Locally

```bash
# Install dependencies
npm install

# Build
npm run build

# Test build
npm start
```

Visit `http://localhost:3000/marketing-audit`  
Verify it loads correctly.

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to staging
vercel

# Add environment variables in Vercel dashboard
# Project Settings → Environment Variables

# Deploy to production
vercel --prod
```

### Step 3: Configure Cron

**Vercel:**
- Already configured in `vercel.json`
- Runs automatically hourly

**Manual verification:**
```bash
curl -X GET https://yourdomain.com/api/cron/scheduled-audits \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Step 4: Smoke Test

**Test these immediately:**

1. ✅ Visit `/marketing-audit`
2. ✅ Click "Run First Audit"
3. ✅ Wait 2-3 minutes for completion
4. ✅ Verify score displays correctly
5. ✅ Check recommendations appear
6. ✅ Click "Create Task" - verify task created
7. ✅ Test on mobile device
8. ✅ Test dark mode toggle
9. ✅ Test CSV export
10. ✅ Test OAuth connection (if API keys configured)

---

## 🔍 Post-Deployment Verification

### Monitoring Setup

**1. Uptime Monitor:**
```bash
# Add to UptimeRobot or similar
URL: https://yourdomain.com/marketing-audit
Interval: 5 minutes
Alert: Email if down >2 minutes
```

**2. Error Tracking:**
```bash
# Sentry (recommended)
npm install @sentry/nextjs
# Configure in sentry.client.config.js
```

**3. Performance:**
```bash
# Run Lighthouse
npx lighthouse https://yourdomain.com/marketing-audit --view

# Target scores:
# Performance: 90+
# Accessibility: 90+
# Best Practices: 90+
# SEO: 90+
```

### Health Checks

**Day 1:**
- [ ] No 500 errors in logs
- [ ] At least 1 successful audit run
- [ ] Email delivery working (if configured)
- [ ] OAuth flow working

**Week 1:**
- [ ] 100% uptime
- [ ] <2s average response time
- [ ] >95% audit success rate
- [ ] 0 security incidents

---

## 🔄 Rollback Procedure

**Quick Disable (1 minute):**

Update environment variable:
```bash
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=false
```

Redeploy or restart.

**Full Rollback (5 minutes):**

```bash
# Vercel
vercel rollback https://your-deployment-url

# Railway
railway rollback

# Or revert Git commit
git revert HEAD
git push
```

---

## 🐛 Troubleshooting

**Issue: Audits fail to run**

Check:
1. Google API key is valid
2. Redis connection working
3. Practice has domain configured
4. No rate limit exceeded

**Issue: OAuth doesn't work**

Check:
1. Client ID/Secret correct
2. Redirect URI matches exactly
3. OAuth consent screen published
4. Scopes are correct

**Issue: Slow performance**

Check:
1. Database indexes present
2. Redis caching working
3. No API rate limiting
4. Optimize images

**Issue: Emails not sending**

Check:
1. RESEND_API_KEY configured
2. From email verified
3. Check spam folder
4. Review Resend dashboard logs

---

## 📊 Monitoring Metrics

**Track these KPIs:**

**Technical:**
- Uptime percentage (target: 99.9%)
- Average audit completion time (target: <3 min)
- API error rate (target: <1%)
- P95 latency (target: <2s)

**Business:**
- Audits run per day
- Unique practices using feature
- Recommendations generated
- Tasks created from recommendations
- Scheduled audits success rate

**User Engagement:**
- Return rate to dashboard
- Time spent viewing results
- Actions taken per visit
- Feature adoption rate

---

## 🔐 Security Checklist

**Before Public Launch:**

- [ ] Run `npm audit` - fix all high/critical
- [ ] Verify all API keys in env vars (not code)
- [ ] Test RLS policies prevent cross-tenant access
- [ ] Verify OAuth tokens encrypted
- [ ] Test rate limiting works
- [ ] Check HTTPS enforced
- [ ] Verify security headers present
- [ ] Test CSP policy
- [ ] Review audit logs working
- [ ] Backup database

---

## 📈 Scaling Considerations

**For 100+ Practices:**
- Current setup handles easily
- Monitor Redis memory usage
- Watch Google API quotas

**For 1000+ Practices:**
- Consider dedicated Redis instance
- Upgrade Google API quotas
- Add database read replicas
- Implement queue system for audits

**For 10,000+ Practices:**
- Dedicated infrastructure
- Multiple Redis instances
- Database sharding by tenant
- CDN for static assets
- Load balancer

---

## 🎯 Success Criteria

**After 1 Week:**
- ✅ 100% uptime
- ✅ 0 critical errors
- ✅ >10 audits run successfully
- ✅ >5 tasks created from recommendations
- ✅ Positive user feedback

**After 1 Month:**
- ✅ 99.9% uptime
- ✅ <1% error rate
- ✅ >100 audits run
- ✅ >80% scheduled audit success rate
- ✅ Measurable user satisfaction

---

## 📞 Support Escalation

**Level 1:** Documentation + troubleshooting guide  
**Level 2:** Email support@dentalcrm.com  
**Level 3:** On-call engineer (for critical issues)  
**Level 4:** CTO escalation

---

## ✅ Deployment Complete!

**You now have a world-class marketing intelligence system live in production!** 🎉

**Next Steps:**
1. Monitor for first 24 hours
2. Gather user feedback
3. Iterate based on usage
4. Scale as needed

---

**Questions?** See [Troubleshooting Guide](docs/troubleshooting.md)


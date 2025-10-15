# Production Deployment Checklist

## Pre-Deployment

### 1. Environment Variables

Ensure all required environment variables are set in production:

```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Marketing Audit
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true
GOOGLE_API_KEY=your_google_api_key
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret

# Optional APIs
BRIGHTLOCAL_API_KEY=your_brightlocal_key (Phase 2)
BRIGHTLOCAL_ACCOUNT_ID=your_account_id (Phase 2)
SEMRUSH_API_KEY=your_semrush_key (Phase 3)

# Cron
CRON_SECRET=your_secure_random_secret

# Redis (for rate limiting)
REDIS_URL=your_redis_url
```

### 2. Database Migrations

Run all marketing audit migrations in Supabase:

```bash
# Run migrations in order
psql $DATABASE_URL < supabase/migrations/20250116_marketing_audit_tables.sql
psql $DATABASE_URL < supabase/migrations/20250116_audit_shares.sql
```

Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'marketing_audit%';
```

### 3. RLS Policies

Verify Row Level Security is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'marketing_audit%';
```

All should show `rowsecurity = true`.

### 4. API Credentials

#### Google APIs:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable APIs:
   - PageSpeed Insights API
   - Google Search Console API
   - Google Analytics Data API (GA4)
   - Google My Business API
   - Google Places API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `https://yourdomain.com/api/marketing-audit/oauth/google/callback`

#### BrightLocal (Phase 2):
1. Sign up at [BrightLocal](https://www.brightlocal.com/)
2. Get API key from dashboard
3. Note your account ID

#### Semrush (Phase 3):
1. Sign up at [Semrush](https://www.semrush.com/)
2. Get API key from Settings → API

### 5. Redis Setup

For rate limiting (required for production):

**Option A: Upstash Redis (Recommended)**
```bash
# Free tier available
1. Sign up at upstash.com
2. Create database
3. Copy REDIS_URL
```

**Option B: Self-hosted**
```bash
# Railway, Fly.io, or your own server
docker run -p 6379:6379 redis:latest
```

### 6. Cron Jobs

Setup scheduled audit runner:

**Vercel:**
- Already configured in `vercel.json`
- Runs automatically once deployed

**Railway:**
```bash
# Add to railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}

# Setup cron via Railway dashboard or external cron service
curl -X GET https://yourdomain.com/api/cron/scheduled-audits \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**External Cron (EasyCron, Cron-job.org):**
```
URL: https://yourdomain.com/api/cron/scheduled-audits
Method: GET
Header: Authorization: Bearer YOUR_CRON_SECRET
Schedule: 0 * * * * (every hour)
```

---

## Deployment Steps

### 1. Build Test

Run locally first:

```bash
npm run build
npm start
```

Verify no build errors.

### 2. Deploy to Staging

```bash
# Vercel
vercel --env staging

# Railway
railway up
```

Test all features in staging:
- [ ] Run manual audit
- [ ] View audit results
- [ ] Create task from recommendation
- [ ] Schedule audit
- [ ] OAuth connection works
- [ ] Mobile responsive
- [ ] Dark mode works

### 3. Deploy to Production

```bash
# Vercel
vercel --prod

# Railway
railway up --environment production
```

### 4. Smoke Test

Immediately after deployment:

1. **Homepage loads:** ✅
2. **Login works:** ✅
3. **Marketing Audit tab visible:** ✅
4. **Run audit button works:** ✅
5. **Audit completes successfully:** ✅
6. **Recommendations display:** ✅
7. **Create task works:** ✅

### 5. Monitor

Watch for errors in first 24 hours:

**Vercel:**
- Dashboard → Project → Logs
- Monitor function duration
- Check for 500 errors

**Railway:**
- Dashboard → Service → Logs
- Monitor memory usage
- Check for crashes

**Supabase:**
- Dashboard → Logs → API
- Monitor RLS policy violations
- Check for slow queries

---

## Post-Deployment

### 1. Performance Check

Run Lighthouse audit on main pages:
- Dashboard: Target 90+ performance
- Marketing Audit: Target 85+ performance
- Mobile: Target 90+ performance

### 2. Security Scan

- [ ] No API keys exposed in client code
- [ ] All secrets in environment variables
- [ ] RLS policies enforced
- [ ] OAuth tokens encrypted
- [ ] Rate limiting active
- [ ] CORS configured correctly

### 3. Load Test

Use Artillery or k6:

```bash
# Test audit endpoint
artillery quick --count 10 --num 5 \
  https://yourdomain.com/api/marketing-audit/latest
```

Ensure:
- 95% requests < 2s
- 0% error rate
- No memory leaks

### 4. Documentation

Update for your team:
- [ ] Add production URLs to docs
- [ ] Share API credentials securely
- [ ] Document any custom configurations
- [ ] Create runbook for common issues

### 5. Backup Strategy

Setup automated backups:

**Supabase:**
- Daily automated backups (included)
- Weekly manual snapshots
- Export to S3 for long-term storage

**Code:**
- All code in Git
- Tags for production releases
- Maintain staging branch

---

## Rollback Plan

If issues arise:

### Vercel:
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Railway:
```bash
# Redeploy previous version
railway rollback
```

### Database:
```sql
-- Disable feature flag
UPDATE tenants SET settings = settings || '{"marketing_audit_enabled": false}'::jsonb;
```

---

## Monitoring Alerts

Setup alerts for:

**Uptime:**
- Use UptimeRobot or Pingdom
- Alert if down > 2 minutes
- Check every 5 minutes

**Errors:**
- Sentry for error tracking
- Alert on >10 errors/hour
- Group by error type

**Performance:**
- Alert if P95 latency > 3s
- Alert if memory > 90%
- Alert if API error rate > 5%

**Business Metrics:**
- Alert if 0 audits run in 24h
- Alert if audit failure rate > 20%
- Monitor scheduled audit success rate

---

## Cost Monitoring

Track API costs:

**Google APIs:** Free quotas usually sufficient
- PageSpeed: 25K requests/day
- GSC: 2M queries/day
- GA4: 1M API calls/day
- Places: $17/1000 requests

**BrightLocal:** ~$30/month
**Semrush:** ~$120/month
**Redis:** Free (Upstash) or $5/month
**Hosting:** Varies by platform

Set billing alerts at 80% of expected monthly cost.

---

## Success Metrics

Track after 1 week:

- [ ] 100% uptime
- [ ] 0 critical errors
- [ ] <2s average audit time
- [ ] >95% scheduled audit success rate
- [ ] >80% user satisfaction (if surveyed)

---

**You're ready to launch!** 🚀


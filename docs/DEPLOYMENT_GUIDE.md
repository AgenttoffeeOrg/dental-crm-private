# Marketing Audit Module - Production Deployment Guide

## 🚀 Overview

This guide walks you through deploying the Marketing Audit & Benchmarking module to production.

## Prerequisites

### Required Accounts
- [ ] Supabase account (database, auth, storage)
- [ ] Railway.app or Vercel account (hosting)
- [ ] Google Cloud Platform account (APIs)
- [ ] Redis Cloud account (rate limiting)
- [ ] Resend account (email notifications)

### Optional Accounts (for full features)
- [ ] BrightLocal (citations, GBP)
- [ ] Semrush or Ahrefs (keywords, backlinks)
- [ ] Sentry (error tracking)
- [ ] LogRocket (user monitoring)

### Local Setup
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] PostgreSQL client (optional, for local testing)

## Step 1: Environment Setup

### 1.1 Clone Repository
```bash
git clone <repository-url>
cd dental-crm
npm install
```

### 1.2 Configure Environment Variables

Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Feature Flags
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true

# Google APIs
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_API_KEY=your_google_api_key

# Redis
REDIS_URL=redis://default:password@host:port

# Resend (Email)
RESEND_API_KEY=your_resend_api_key

# Optional: Paid APIs
BRIGHTLOCAL_API_KEY=your_brightlocal_key
SEMRUSH_API_KEY=your_semrush_key
AHREFS_API_KEY=your_ahrefs_key

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_LOGROCKET_ID=your_logrocket_id

# App Config
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Step 2: Database Setup

### 2.1 Run Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:

```bash
# 1. Marketing Audit Tables
supabase/migrations/20250116_marketing_audit_tables.sql

# 2. Audit Shares
supabase/migrations/20250116_audit_shares.sql

# 3. Practice Branding
supabase/migrations/20250116_practice_branding.sql

# 4. Webhooks
supabase/migrations/20250116_webhooks.sql

# 5. Web Vitals Tracking
CREATE TABLE IF NOT EXISTS public.web_vitals_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  rating text NOT NULL,
  delta numeric,
  metric_id text,
  page_url text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.web_vitals_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics" 
ON public.web_vitals_metrics FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own metrics" 
ON public.web_vitals_metrics FOR INSERT 
WITH CHECK (user_id = auth.uid());
```

### 2.2 Seed Demo Data (Optional)

Run `supabase/seed/marketing_audit_demo_data.sql` if you want demo data for testing.

## Step 3: Google Cloud Setup

### 3.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Dental CRM Marketing Audit"
3. Enable APIs:
   - PageSpeed Insights API
   - Google Search Console API
   - Google Analytics Data API (GA4)
   - Google My Business API
   - Places API
   - Mobile-Friendly Test API

### 3.2 Create OAuth Credentials

1. Go to APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs:
   ```
   http://localhost:3000/api/marketing-audit/oauth/google/callback (dev)
   https://your-domain.com/api/marketing-audit/oauth/google/callback (prod)
   ```
5. Copy Client ID and Client Secret to `.env.local`

### 3.3 Create API Key

1. Go to APIs & Services → Credentials
2. Create API Key
3. Restrict key to:
   - PageSpeed Insights API
   - Places API
4. Copy to `.env.local`

## Step 4: Redis Setup

### 4.1 Redis Cloud

1. Sign up at [Redis Cloud](https://redis.com/cloud/)
2. Create free database
3. Copy connection URL
4. Add to `.env.local` as `REDIS_URL`

### 4.2 Test Connection

```bash
npm run test:redis
```

## Step 5: Email Setup (Resend)

### 5.1 Create Account

1. Sign up at [Resend](https://resend.com)
2. Verify domain (or use test domain)
3. Create API key
4. Add to `.env.local`

### 5.2 Test Email

```bash
npm run test:email
```

## Step 6: Build & Test Locally

### 6.1 Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 6.2 Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/marketing-audit`

### 6.3 Run Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### 6.4 Build Production

```bash
npm run build
npm run start
```

## Step 7: Deploy to Production

### Option A: Railway.app

1. Push code to GitHub
2. Connect Railway to repository
3. Add environment variables in Railway dashboard
4. Deploy automatically on push

### Option B: Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Add environment variables in Vercel dashboard

### Option C: Self-Hosted

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "dental-crm" -- start

# Or with Docker
docker build -t dental-crm .
docker run -p 3000:3000 --env-file .env.local dental-crm
```

## Step 8: Post-Deployment Verification

### 8.1 Health Checks

```bash
# Check app is running
curl https://your-domain.com/api/health

# Check database connection
curl https://your-domain.com/api/health/database

# Check Redis connection
curl https://your-domain.com/api/health/redis
```

### 8.2 Feature Verification

- [ ] Marketing Audit tab visible in sidebar
- [ ] OAuth flow works for Google
- [ ] Can run audit successfully
- [ ] Recommendations display correctly
- [ ] Can create task from recommendation
- [ ] PDF export works
- [ ] Email notifications work
- [ ] Scheduled audits run
- [ ] Alerts trigger correctly

### 8.3 Performance Checks

```bash
# Run Lighthouse
npm run lighthouse

# Check Core Web Vitals
npm run check:vitals

# Load test
npm run test:load
```

### 8.4 Security Checks

```bash
# Run security audit
npm audit

# Check security headers
npm run check:security

# Verify HTTPS
curl -I https://your-domain.com
```

## Step 9: Monitoring Setup

### 9.1 Sentry (Error Tracking)

1. Create project at [Sentry.io](https://sentry.io)
2. Add DSN to `.env.local`
3. Test: Trigger an error and check Sentry

### 9.2 LogRocket (User Monitoring)

1. Create account at [LogRocket](https://logrocket.com)
2. Add app ID to `.env.local`
3. Verify session recording

### 9.3 Uptime Monitoring

Use Railway/Vercel built-in monitoring or:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://www.pingdom.com)
- [StatusCake](https://www.statuscake.com)

## Step 10: Configure Cron Jobs

### 10.1 Scheduled Audits

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/scheduled-audits",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Or use Railway Cron:
```bash
railway run npm run cron:scheduled-audits
```

## Step 11: User Onboarding

### 11.1 Create Admin Account

1. Sign up at `https://your-domain.com/signup`
2. Verify email
3. Set as admin in Supabase dashboard

### 11.2 Connect First Practice

1. Go to Marketing Audit
2. Click "Connect Google Analytics"
3. Authorize with Google
4. Run first audit
5. Verify results

### 11.3 Setup Notifications

1. Go to Settings → Notifications
2. Configure email preferences
3. Set alert thresholds
4. Test notification

## Troubleshooting

### Common Issues

**Issue: OAuth redirect URI mismatch**
- Solution: Verify redirect URI in Google Cloud Console matches exactly

**Issue: Database connection fails**
- Solution: Check Supabase URL and keys, verify RLS policies

**Issue: Redis connection timeout**
- Solution: Verify Redis URL, check firewall rules

**Issue: API rate limit exceeded**
- Solution: Check API quotas, implement backoff

**Issue: Build fails on deployment**
- Solution: Check Node version, use `--legacy-peer-deps`

### Support

- Documentation: `/docs`
- Email: support@dentalcrm.com
- Slack: #dental-crm-support
- GitHub Issues: Create issue with logs

## Rollback Procedure

If deployment fails:

```bash
# Vercel
vercel rollback

# Railway
railway rollback

# Manual
git revert HEAD
git push origin main
```

## Maintenance

### Weekly
- [ ] Review error logs
- [ ] Check API quotas
- [ ] Monitor performance metrics
- [ ] Review security alerts

### Monthly
- [ ] Update dependencies
- [ ] Rotate API keys
- [ ] Review access logs
- [ ] Backup database

### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] User feedback review
- [ ] Feature planning

## Success Metrics

Post-deployment, monitor:

- **Uptime**: 99.9%+
- **Page Load**: < 2.5s
- **API Response**: < 500ms
- **Error Rate**: < 0.1%
- **Test Coverage**: > 80%
- **Security Score**: > 90

## Conclusion

Your Marketing Audit module is now live! 🎉

Next steps:
1. Train users
2. Monitor metrics
3. Gather feedback
4. Iterate and improve

---

**Questions?** Reach out to the team or consult `/docs`

**Last Updated**: January 16, 2025


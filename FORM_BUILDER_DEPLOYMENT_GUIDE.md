# 🚀 FORM BUILDER - DEPLOYMENT GUIDE

**Version:** 1.0  
**Status:** Production-Ready  
**Date:** October 15, 2025

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Database Setup
- [ ] Run migration: `20250116_marketing_forms_rls.sql`
- [ ] Run migration: `20250116_form_versioning.sql`
- [ ] Run function: `increment_form_views.sql`
- [ ] Run function: `increment_form_submissions.sql`
- [ ] Verify RLS policies enabled
- [ ] Verify indexes created

### Environment Variables
- [ ] `NEXT_PUBLIC_APP_URL` - Your production URL
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key

### Optional (for full features)
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - reCAPTCHA site key
- [ ] `RECAPTCHA_SECRET_KEY` - reCAPTCHA secret
- [ ] `RESEND_API_KEY` - Email sending
- [ ] `STRIPE_SECRET_KEY` - Payments (if using)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Payments
- [ ] `META_APP_SECRET` - Meta Lead Ads
- [ ] `TIKTOK_APP_SECRET` - TikTok Lead Gen
- [ ] `NEXT_PUBLIC_GA4_MEASUREMENT_ID` - Google Analytics

---

## 🗄️ DATABASE MIGRATIONS

### Step 1: Run Migrations in Supabase SQL Editor

```sql
-- 1. Marketing Forms RLS
-- Copy and run: supabase/migrations/20250116_marketing_forms_rls.sql

-- 2. Form Versioning
-- Copy and run: supabase/migrations/20250116_form_versioning.sql

-- 3. Increment Views Function
-- Copy and run: supabase/functions/increment_form_views.sql

-- 4. Increment Submissions Function
-- Copy and run: supabase/functions/increment_form_submissions.sql
```

### Step 2: Verify Tables Exist

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('marketing_forms', 'marketing_form_submissions', 'form_versions');

-- Should return 3 rows
```

### Step 3: Verify RLS Enabled

```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('marketing_forms', 'marketing_form_submissions');

-- rowsecurity should be 't' (true) for all
```

---

## 🔐 GOOGLE RECAPTCHA SETUP

### Step 1: Get reCAPTCHA Keys

1. Go to: https://www.google.com/recaptcha/admin/create
2. Choose reCAPTCHA v3
3. Add your domain
4. Get Site Key and Secret Key

### Step 2: Add to Environment

```bash
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key-here
RECAPTCHA_SECRET_KEY=your-secret-key-here
```

### Step 3: Test

```bash
# Submit a form and check logs for:
# [reCAPTCHA] Score: 0.9 (should be 0.0-1.0)
```

---

## 📧 EMAIL NOTIFICATIONS SETUP

### Step 1: Sign Up for Resend

1. Go to: https://resend.com
2. Create account
3. Verify domain (optional)
4. Get API key

### Step 2: Add to Environment

```bash
RESEND_API_KEY=re_your_api_key_here
```

### Step 3: Test

```bash
# Submit a form with email field
# Check inbox for confirmation email
```

---

## 💳 STRIPE PAYMENTS SETUP (Optional)

### Step 1: Get Stripe Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. Get Publishable Key and Secret Key

### Step 2: Add to Environment

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
```

### Step 3: Create Webhook (for payment confirmations)

```bash
# Stripe Dashboard → Webhooks → Add endpoint
# URL: https://yourdomain.com/api/webhooks/stripe
# Events: payment_intent.succeeded, payment_intent.failed
```

---

## 📱 META LEAD ADS SETUP (Optional)

### Step 1: Create Meta App

1. Go to: https://developers.facebook.com/apps/create
2. Choose "Business" type
3. Add Lead Ads product
4. Get App ID and App Secret

### Step 2: Set Up Webhook

1. In App Dashboard → Webhooks
2. Subscribe to `leadgen` events
3. Callback URL: `https://yourdomain.com/api/webhooks/meta-lead-ads`
4. Verify Token: `dental-crm-meta-webhook-2025`

### Step 3: Add to Environment

```bash
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_WEBHOOK_VERIFY_TOKEN=dental-crm-meta-webhook-2025
```

### Step 4: Test

```bash
# Run a Meta Lead Ad campaign
# Check logs for: [Meta Webhook] Received payload
# Verify contact created in CRM
```

---

## 🎵 TIKTOK LEAD GEN SETUP (Optional)

### Step 1: TikTok Business Account

1. Create account: https://ads.tiktok.com
2. Set up Lead Generation
3. Get API credentials

### Step 2: Configure Webhook

```bash
# Webhook URL: https://yourdomain.com/api/webhooks/tiktok-lead-gen
```

### Step 3: Add to Environment

```bash
TIKTOK_APP_ID=your_app_id
TIKTOK_APP_SECRET=your_app_secret
```

---

## 📊 GOOGLE ANALYTICS 4 SETUP (Optional)

### Step 1: Create GA4 Property

1. Go to: https://analytics.google.com
2. Create new GA4 property
3. Get Measurement ID (G-XXXXXXXXXX)

### Step 2: Add to Environment

```bash
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 3: Verify Events

1. Go to GA4 → Reports → Realtime
2. Submit a test form
3. Check for events: `form_view`, `form_start`, `form_submit`

---

## 🧪 TESTING BEFORE DEPLOYMENT

### 1. Unit Tests
```bash
npm test
```

### 2. E2E Tests
```bash
npx playwright test tests/forms/e2e-form-flow.test.ts
```

### 3. Load Test
```bash
npx artillery run tests/forms/load-test.yml
```

### 4. Manual Testing Checklist

- [ ] Create a form in the UI
- [ ] Add fields by dragging
- [ ] Reorder fields
- [ ] Add conditional logic
- [ ] Create multi-step form
- [ ] Save form
- [ ] Click "Share" button
- [ ] Copy embed code
- [ ] Test embed in separate page
- [ ] Submit form
- [ ] Verify contact created in CRM
- [ ] Check analytics dashboard
- [ ] Export CSV
- [ ] Test template creation
- [ ] Duplicate a form
- [ ] View version history
- [ ] Rollback to previous version
- [ ] Test offline mode (disable WiFi)
- [ ] Verify spam blocked (fill honeypot)
- [ ] Test rate limiting (submit 11 times)

---

## 🚀 DEPLOYMENT STEPS

### Railway Deployment

```bash
# 1. Commit all changes
git add -A
git commit -m "Form Builder: Production Ready"
git push origin main

# 2. Railway will auto-deploy

# 3. Add environment variables in Railway dashboard

# 4. Verify deployment succeeded
```

### Vercel Deployment

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Add environment variables
vercel env add NEXT_PUBLIC_RECAPTCHA_SITE_KEY
vercel env add RECAPTCHA_SECRET_KEY
# ... add all other env vars

# 4. Deploy to production
vercel --prod
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Health Checks

```bash
# Check form pages load
curl https://yourdomain.com/forms

# Check API endpoints
curl https://yourdomain.com/api/webhooks/meta-lead-ads
curl https://yourdomain.com/api/webhooks/tiktok-lead-gen
curl https://yourdomain.com/api/webhooks/universal
```

### 2. Test Form Submission

1. Go to `/forms`
2. Create test form
3. Click "Share"
4. Open hosted link
5. Submit form
6. Verify contact appears in `/contacts`

### 3. Test Analytics

1. Go to form analytics page
2. Verify metrics display
3. Export CSV
4. Check data accuracy

### 4. Test Integrations

**Meta Lead Ads:**
```bash
# Test webhook with Meta's test tool
# Verify payload received in logs
```

**TikTok Lead Gen:**
```bash
# Run test campaign
# Check webhook logs
```

---

## 🔧 TROUBLESHOOTING

### Forms Not Saving

**Issue:** Forms don't appear after creation

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'marketing_forms';

-- If empty, re-run RLS migration
```

### Spam Not Blocking

**Issue:** Spam submissions getting through

**Solution:**
1. Verify reCAPTCHA keys are correct
2. Check honeypot field is hidden (inspect element)
3. Verify rate limiter is active (check logs)

### Emails Not Sending

**Issue:** No confirmation emails

**Solution:**
1. Verify `RESEND_API_KEY` is set
2. Check Resend dashboard for errors
3. Verify email template is valid

### Analytics Not Updating

**Issue:** View/submission counts not increasing

**Solution:**
```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'increment_form%';

-- Should return 2 functions

-- If missing, re-run function SQL files
```

---

## 📊 MONITORING

### Key Metrics to Monitor

1. **Form Performance**
   - Total views
   - Total submissions
   - Conversion rate
   - Spam block rate

2. **System Health**
   - API response times
   - Error rates
   - Rate limit triggers
   - Database query times

3. **User Experience**
   - Time to Interactive
   - Form load time
   - Submission success rate
   - Drop-off points

### Set Up Alerts

```
Alert if:
- Conversion rate drops below 20%
- Error rate exceeds 1%
- Response time > 2s
- Spam rate > 10%
- Rate limit triggers > 100/hour
```

---

## 🎯 SUCCESS CRITERIA

Form Builder is considered successfully deployed if:

- [x] Forms can be created and saved
- [x] Forms can be published and embedded
- [x] Submissions create contacts in CRM
- [x] Spam is blocked (>95% effectiveness)
- [x] Analytics display correctly
- [x] Email notifications work
- [x] Templates are accessible
- [x] Version history functions
- [x] No critical errors in logs
- [x] Performance meets targets (< 1s load time)

---

## 🎊 CONGRATULATIONS!

If all checks pass, your Form Builder is live and ready to capture leads!

**What to do next:**
1. Create your first production form
2. Share with your team
3. Embed on your website
4. Start collecting leads
5. Monitor analytics
6. Optimize based on data

---

## 📞 SUPPORT

**Common Issues:** See Troubleshooting section above  
**Database Issues:** Check Supabase dashboard logs  
**API Issues:** Check server logs (Railway/Vercel)  
**Integration Issues:** Verify webhook signatures

---

**Deployment Status:** ✅ Ready to Deploy  
**Estimated Deploy Time:** 30 minutes  
**Difficulty:** Easy (well-documented)


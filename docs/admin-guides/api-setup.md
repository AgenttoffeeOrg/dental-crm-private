# Setting Up API Credentials for Marketing Audit

## Complete Administrator Guide

This guide walks you through setting up all required API credentials for the Marketing Audit module.

---

## Phase 1: Google APIs (Free - Required)

### Step 1: Create Google Cloud Project

1. **Go to:** https://console.cloud.google.com
2. **Click:** "Create Project"
3. **Name:** "Dental-CRM-Audit" (or your choice)
4. **Click:** "Create"
5. **Wait:** 30 seconds for project creation

### Step 2: Enable Required APIs

In your new project:

1. **Go to:** APIs & Services → Library
2. **Search and Enable** each of these:
   - ✅ PageSpeed Insights API
   - ✅ Google Search Console API
   - ✅ Google Analytics Data API v1
   - ✅ Google Places API (in Maps Platform)
   - ✅ Mobile-Friendly Test API

**Time:** ~5 minutes

### Step 3: Create API Key

1. **Go to:** APIs & Services → Credentials
2. **Click:** "+ CREATE CREDENTIALS" → "API key"
3. **Copy** the API key
4. **Click:** "Restrict Key" (recommended)
5. **API Restrictions:**
   - Select "Restrict key"
   - Check: PageSpeed Insights API, Places API, Mobile-Friendly Test
6. **Application Restrictions:**
   - HTTP referrers
   - Add: `yourdomain.com/*`, `localhost:3000/*`
7. **Save**

**Keep this API key safe!**

### Step 4: Create OAuth 2.0 Credentials

1. **Configure OAuth Consent Screen:**
   - Go to: APIs & Services → OAuth consent screen
   - User Type: Internal (if G Suite) or External
   - App name: "Dental CRM Marketing Audit"
   - User support email: your email
   - Developer email: your email
   - Scopes: Add `.../auth/webmasters.readonly` and `.../auth/analytics.readonly`
   - Save

2. **Create OAuth Client ID:**
   - Go to: APIs & Services → Credentials
   - Click: "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: Web application
   - Name: "Dental CRM Marketing Audit"
   - Authorized redirect URIs:
     - `https://yourdomain.com/api/marketing-audit/oauth/google/callback`
     - `http://localhost:3000/api/marketing-audit/oauth/google/callback` (for development)
   - Click: "Create"
   - **Copy** Client ID and Client Secret

**Time:** ~10 minutes

### Step 5: Add Credentials to Environment

1. **Open:** `.env.local` in your project
2. **Add:**
```env
# Google APIs
GOOGLE_API_KEY=your_api_key_here
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
```

3. **Save** the file
4. **Restart** your development server: `npm run dev`

**Time:** 2 minutes

---

## Phase 2: BrightLocal API (Paid - Optional)

**Cost:** $199-499/month depending on number of locations

### When You Need This:
- Full Google Business Profile analysis
- NAP consistency checking
- Citation tracking across 50+ directories
- Local pack rankings

### Setup:

1. **Sign up:** https://www.brightlocal.com/
2. **Choose plan:** Start with "Pro" ($199/mo for 10 locations)
3. **Get API key:**
   - Go to: Account → API Access
   - Click: "Generate New API Key"
   - Copy: API Key and User ID
4. **Add to .env.local:**
```env
# BrightLocal
BRIGHTLOCAL_API_KEY=your_api_key_here
BRIGHTLOCAL_USER_ID=your_user_id_here
```

5. **Set phase:** `MARKETING_AUDIT_PHASE=2`

**Time:** 15 minutes + account setup

---

## Phase 3: Semrush API (Paid - Optional)

**Cost:** $429/month (Guru plan + API add-on)

### When You Need This:
- Complete backlink analysis
- Domain authority scores
- Organic keyword rankings
- Competitor keyword gap analysis
- Toxic backlink detection

### Setup:

1. **Sign up:** https://www.semrush.com/
2. **Choose plan:** Guru ($229/mo) + API add-on ($200/mo) = $429/mo
3. **Get API key:**
   - Go to: Profile → API
   - Click: "Get API Key"
   - Copy: API Key
4. **Add to .env.local:**
```env
# Semrush
SEMRUSH_API_KEY=your_api_key_here
```

5. **Set phase:** `MARKETING_AUDIT_PHASE=3`

**Time:** 15 minutes + account setup

---

## Connecting Google Accounts (Per Practice)

### In-App OAuth Flow:

1. **Go to:** Marketing Audit → Settings
2. **Click:** "Connect Google Account"
3. **Authorize** the following:
   - Google Search Console (read-only)
   - Google Analytics (read-only)
4. **Grant access** when prompted
5. **Confirm** connection successful

### What Happens:
- OAuth tokens stored securely (encrypted)
- Auto-refreshed when expired
- Can revoke anytime
- Separate per practice (multi-tenant)

---

## Testing Your Setup

### Test Google API Key:

```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://google.com&key=YOUR_API_KEY"
```

Should return JSON with Lighthouse data.

### Test OAuth Flow:
1. Go to Marketing Audit
2. Click "Run New Audit"
3. If you get OAuth prompt → setup correct
4. If you get errors → check client ID/secret

### Test BrightLocal (Phase 2):
```bash
curl "https://api.brightlocal.com/v4/lsrc/get?api-key=YOUR_KEY&sig=YOUR_SIG&location-id=123"
```

Should return location data.

---

## API Usage Limits & Costs

### Google APIs (Phase 1):

| API | Free Quota | Paid Pricing | Typical Usage |
|-----|------------|--------------|---------------|
| PageSpeed Insights | 25,000/day | $5 per 1,000 after | 2 per audit |
| Search Console | 1,200/min | Free | 4 per audit |
| GA4 Data API | 25,000/day | Free | 3 per audit |
| Places API | — | $17 per 1,000 | 1-20 per audit |
| Mobile-Friendly | 10,000/day | Free | 1 per audit |

**Monthly cost for 100 audits:** ~$50-100 (mostly Places API)

### BrightLocal (Phase 2):

**Pricing Tiers:**
- Single ($39/mo): 1 location
- Pro ($199/mo): 10 locations
- Premium ($499/mo): 100 locations

**Usage:** 1 API call per audit per practice

### Semrush (Phase 3):

**Pricing:** $429/month (shared across all customers)

**Quota:** 10,000 units/day (enough for 100+ audits/day)

---

## Security Best Practices

### API Keys:
- ✅ Never commit to git (use .env.local)
- ✅ Restrict by HTTP referrer
- ✅ Restrict to specific APIs only
- ✅ Rotate keys every 90 days
- ✅ Monitor usage in Google Cloud Console

### OAuth Tokens:
- ✅ Stored encrypted in database
- ✅ Auto-refreshed before expiry
- ✅ Scoped to minimum required permissions
- ✅ Can be revoked by user anytime
- ✅ Separate per practice (multi-tenant)

### Monitoring:
- ✅ Set up billing alerts in Google Cloud
- ✅ Monitor API usage daily
- ✅ Get notified if quotas exceeded
- ✅ Track costs per customer

---

## Troubleshooting

### "API key not valid"
- ✅ Check key is correct in .env.local
- ✅ Verify API is enabled in Google Cloud
- ✅ Check API restrictions match your domain
- ✅ Restart dev server after changing .env

### "Insufficient permissions"
- ✅ Verify OAuth scopes include webmasters.readonly and analytics.readonly
- ✅ Re-authorize the connection
- ✅ Check OAuth consent screen is approved (if external)

### "Rate limit exceeded"
- ✅ Wait for quota reset (shown in error message)
- ✅ Reduce audit frequency
- ✅ Upgrade to paid tier if needed
- ✅ Contact support if persistent

### "OAuth callback failed"
- ✅ Verify redirect URI matches exactly (including http/https)
- ✅ Check client ID and secret are correct
- ✅ Ensure OAuth consent screen is configured
- ✅ Try incognito window to rule out browser issues

---

## Cost Optimization Tips

### Phase 1 (Free Tier):
- Run audits monthly (not daily) to stay under quotas
- Cache competitor data (don't re-fetch every audit)
- Use demo data for testing (not real API calls)

### Phase 2/3 (Paid):
- Share BrightLocal/Semrush across all customers
- Only upgrade when 5+ customers request features
- Consider usage-based pricing for customers

### Scaling:
- At 50 customers: ~$930/mo API costs
- Charge $149/mo per customer = $7,450/mo revenue
- Profit: $6,520/mo (87% margin!)

---

## Support

**Issues with setup?**
- 📧 Email: support@dentalcrm.com
- 💬 In-app chat
- 📚 Check other admin guides

---

**Once set up, APIs work automatically.** Users just click "Run Audit" and magic happens! ✨


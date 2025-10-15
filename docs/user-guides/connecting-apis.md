# Connecting Your Google APIs - Step-by-Step Guide

## Overview

To get the most comprehensive audit, connect your Google accounts (Analytics, Search Console, Business Profile). This unlocks deeper insights and more accurate recommendations.

**Time Required:** 10-15 minutes  
**Benefit:** 10x more detailed audit data

---

## What You'll Connect

✅ **Google Analytics 4** - Traffic, conversions, user behavior  
✅ **Google Search Console** - Rankings, queries, indexation  
✅ **Google Business Profile** - Reviews, local presence, engagement  

---

## Step 1: Google Analytics 4 (GA4)

### Prerequisites
- You have a Google Analytics account
- Your website is tracked with GA4

### Connect Steps

1. Go to **Marketing Audit** → Click **Connect Google Account**
2. Select **Google Analytics**
3. Sign in with your Google account
4. Allow access to "Read-only Analytics data"
5. Select your GA4 Property from dropdown
6. Click **Save**

✅ **Done!** Your audit will now include:
- Traffic sources
- User behavior
- Conversion tracking
- Event analytics
- Bounce rates
- Session duration

### Troubleshooting

**Problem:** "No properties found"  
**Solution:** Ensure you're using GA4 (not Universal Analytics). Check that you're logged in with the correct Google account.

**Problem:** "Access denied"  
**Solution:** You need at least "Viewer" permissions on the GA4 property.

---

## Step 2: Google Search Console (GSC)

### Prerequisites
- Your website is verified in Search Console
- You have access to the property

### Connect Steps

1. Go to **Marketing Audit** → **Connect Google Account**
2. Select **Search Console**
3. Sign in with your Google account
4. Allow access to "Read-only Search Console data"
5. Select your website property
6. Click **Save**

✅ **Done!** Your audit will now include:
- Search queries
- Click-through rates
- Average position
- Index coverage
- Mobile usability issues
- Page experience metrics

### Troubleshooting

**Problem:** "Property not verified"  
**Solution:** Verify your website in [Google Search Console](https://search.google.com/search-console) first.

**Problem:** "Multiple properties found"  
**Solution:** Choose the property with the most data (usually the domain-level property).

---

## Step 3: Google Business Profile (GBP)

### Prerequisites
- You have a claimed Google Business Profile
- You're a manager or owner

### Connect Steps

1. Go to **Marketing Audit** → **Connect Google Account**
2. Select **Google Business Profile**
3. Sign in with your Google account
4. Allow access to "Read-only Business Profile data"
5. Select your business location
6. Click **Save**

✅ **Done!** Your audit will now include:
- Reviews count & ratings
- Review response rates
- Post engagement
- Photo views
- Local Pack presence
- Q&A interactions

### Troubleshooting

**Problem:** "No locations found"  
**Solution:** Claim your business at [business.google.com](https://business.google.com).

**Problem:** "Access denied"  
**Solution:** You must be a manager or owner of the GBP listing.

---

## What If I Don't Connect?

**No problem!** The audit will still run and provide valuable insights. You'll get:

✅ Technical SEO analysis  
✅ PageSpeed metrics  
✅ Mobile-friendliness  
✅ Public review data  
✅ Competitor comparison  

But you'll miss:
- ❌ Detailed traffic analysis
- ❌ Search query insights
- ❌ Conversion tracking
- ❌ GBP engagement metrics

---

## Security & Privacy

### How We Use Your Data

- **Read-Only Access:** We never modify your Analytics, Search Console, or GBP data
- **Secure Storage:** API tokens encrypted at rest
- **No Sharing:** Your data is never shared with third parties
- **Easy Revoke:** Disconnect anytime in settings

### What We Store

- OAuth tokens (encrypted)
- Aggregated metrics (scores, counts)
- Audit snapshots

### What We Don't Store

- Individual user data
- Personal information
- Raw API responses
- Email addresses from Analytics

---

## Advanced: Custom Scopes

By default, we request minimal scopes:

```
analytics.readonly
webmasters.readonly
business.profilemanagement.readonly
```

**Enterprise users** can customize scopes in Settings → API Connections.

---

## Disconnect Anytime

### How to Disconnect

1. Go to **Settings** → **API Connections**
2. Find the service you want to disconnect
3. Click **Disconnect**
4. Confirm

**Result:** Immediately revoked. Future audits won't include this data.

You can also revoke access directly in your [Google Account Settings](https://myaccount.google.com/permissions).

---

## Connection Status Indicators

🟢 **Connected** - Data flowing normally  
🟡 **Token Expiring** - Refresh required soon  
🔴 **Disconnected** - Needs reconnection  
⚪ **Not Connected** - Never connected  

---

## Best Practices

### 1. **Connect All Three**
For the most comprehensive audit, connect GA4, GSC, and GBP.

### 2. **Use Practice Owner Account**
Connect with the Google account that owns these properties to avoid permission issues.

### 3. **Verify Before Connecting**
Ensure your properties are set up correctly in Google first.

### 4. **Refresh Tokens Annually**
Google tokens can expire. Reconnect if you see a warning.

### 5. **Test After Connecting**
Run a new audit immediately to confirm data is flowing.

---

## FAQ

### Q: Do I need to reconnect after each audit?
**A:** No! Once connected, tokens are stored securely and used automatically.

### Q: Can I connect multiple GA4 properties?
**A:** Currently one property per practice. Enterprise users can switch properties in settings.

### Q: What if I change my Google password?
**A:** OAuth tokens remain valid. No need to reconnect unless you explicitly revoke access.

### Q: Can team members connect their own accounts?
**A:** Yes, but they'll only see data they have access to. Best to use a shared practice account.

### Q: Is my data safe?
**A:** Yes. We use industry-standard OAuth 2.0, encrypt tokens at rest, and never store raw API responses.

### Q: Can you modify my Analytics/GSC/GBP?
**A:** No. We only request read-only access. We cannot make changes to your accounts.

---

**Need help?** Contact support or see [Troubleshooting Guide](/docs/troubleshooting)


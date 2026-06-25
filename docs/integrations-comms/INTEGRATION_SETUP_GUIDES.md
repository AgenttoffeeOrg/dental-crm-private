# 📚 INTEGRATION SETUP GUIDES

**Complete step-by-step setup instructions for all integrations**

---

## 🔵 **TWILIO (SMS, WhatsApp, Voice)**

### Prerequisites
- Twilio account: https://www.twilio.com/try-twilio
- Free tier: $15 credit
- Paid: Pay-as-you-go ($0.0075/SMS, $0.0119/WhatsApp)

### Step 1: Get Credentials

1. **Login to Twilio Console**: https://console.twilio.com/
2. **Account SID**: Copy from dashboard
3. **Auth Token**: Click "Show" and copy
4. **Phone Number**: Buy a number ($1/month) or use trial number

### Step 2: Configure Webhooks

**SMS Webhook:**
- URL: `https://your-domain.com/api/webhooks/sms`
- Go to: Phone Numbers → Active Numbers → Select your number
- Under "Messaging":
  - A MESSAGE COMES IN: `https://your-domain.com/api/webhooks/sms`
  - HTTP POST

**WhatsApp Webhook:**
- URL: `https://your-domain.com/api/webhooks/whatsapp`
- Go to: Messaging → WhatsApp Senders → Select sender
- Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`

**Voice Webhook:**
- URL: `https://your-domain.com/api/webhooks/voice`
- Go to: Phone Numbers → Active Numbers → Select number
- Under "Voice & Fax":
  - STATUS CALLBACK URL: `https://your-domain.com/api/webhooks/voice`

### Step 3: Add to Environment Variables

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15555555555
```

### Step 4: Test Integration

```bash
# Send test SMS
curl -X POST http://localhost:3000/api/communications/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15555555555",
    "message": "Test SMS from Dental CRM"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message_sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "sent"
}
```

---

## 🔵 **META (Facebook & Instagram Lead Ads)**

### Prerequisites
- Meta Business account: https://business.facebook.com/
- Facebook Page with admin access
- Instagram Business account (optional)

### Step 1: Create Meta App

1. **Go to**: https://developers.facebook.com/apps/create/
2. **Select**: "Business" type
3. **App Name**: "Dental CRM Lead Integration"
4. **Contact Email**: your@email.com
5. **Create App**

### Step 2: Get App Credentials

1. **App Dashboard** → Settings → Basic
2. **Copy**:
   - App ID
   - App Secret (click "Show")

### Step 3: Configure Webhooks

1. **Dashboard** → Add Product → Webhooks
2. **Subscribe to**: `Page` object
3. **Callback URL**: `https://your-domain.com/api/webhooks/meta-lead-ads`
4. **Verify Token**: Create a random string (e.g., `verify_12345_dental_crm`)
5. **Subscribe to fields**: `leadgen`

### Step 4: Get Page Access Token

1. **Go to**: https://developers.facebook.com/tools/explorer/
2. **Select your app**
3. **Get Token** → Get Page Access Token
4. **Select your page**
5. **Grant permissions**: `pages_manage_metadata`, `leads_retrieval`, `pages_read_engagement`
6. **Generate Token**
7. **Exchange for long-lived token**:

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=YOUR_APP_ID&\
client_secret=YOUR_APP_SECRET&\
fb_exchange_token=SHORT_LIVED_TOKEN"
```

### Step 5: Add to Environment Variables

```env
META_APP_ID=123456789012345
META_APP_SECRET=abc123def456...
META_WEBHOOK_VERIFY_TOKEN=verify_12345_dental_crm
META_PAGE_ACCESS_TOKEN=long_lived_token_here
META_PAGE_ID=123456789012345
```

### Step 6: Test Webhook

```bash
# Meta will send test webhook
# Go to App Dashboard → Webhooks → Test
# Or create a test lead form and submit
```

---

## 🔵 **GOOGLE ADS**

### Prerequisites
- Google Ads account
- Developer token (apply here: https://developers.google.com/google-ads/api/docs/get-started/dev-token)
- OAuth 2.0 credentials

### Step 1: Enable Google Ads API

1. **Google Cloud Console**: https://console.cloud.google.com/
2. **Create new project**: "Dental CRM"
3. **Enable API**: Google Ads API
4. **Create OAuth credentials**:
   - Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.com/api/auth/google/callback`
   - Copy Client ID and Client Secret

### Step 2: Get Developer Token

1. **Apply**: https://developers.google.com/google-ads/api/docs/get-started/dev-token
2. **Wait**: 24-48 hours for approval
3. **Copy**: Developer token when approved

### Step 3: OAuth Flow

1. **Initiate OAuth**:
```
https://accounts.google.com/o/oauth2/v2/auth?\
client_id=YOUR_CLIENT_ID&\
redirect_uri=https://your-domain.com/api/auth/google/callback&\
scope=https://www.googleapis.com/auth/adwords&\
access_type=offline&\
response_type=code
```

2. **Exchange code for tokens** (handled by your app)

3. **Save refresh token** to `integration_connections` table

### Step 4: Environment Variables

```env
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=123456789012-abc.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
```

---

## 🔵 **GOOGLE ANALYTICS 4**

### Prerequisites
- GA4 property set up
- Google Cloud project with Analytics API enabled

### Step 1: Enable Analytics Data API

1. **Cloud Console**: https://console.cloud.google.com/
2. **APIs & Services** → Enable APIs
3. **Search**: "Google Analytics Data API"
4. **Enable**

### Step 2: OAuth Setup (Same as Google Ads)

**Scopes needed:**
```
https://www.googleapis.com/auth/analytics.readonly
```

### Step 3: Get Property ID

1. **GA4**: https://analytics.google.com/
2. **Admin** → Property Settings
3. **Copy**: Property ID (format: 12345678)

### Step 4: Environment Variables

```env
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
# OAuth credentials same as Google Ads
```

---

## 🔵 **GOOGLE SEARCH CONSOLE**

### Step 1: Enable Search Console API

1. **Cloud Console** → APIs & Services
2. **Search**: "Google Search Console API"
3. **Enable**

### Step 2: OAuth Setup (Same as above)

**Scopes needed:**
```
https://www.googleapis.com/auth/webmasters.readonly
```

### Step 3: Verify Site Ownership

1. **Search Console**: https://search.google.com/search-console/
2. **Add Property**: your-website.com
3. **Verify**: HTML tag or DNS method

---

## 🔵 **GOOGLE BUSINESS PROFILE (GBP)**

### Step 1: Enable My Business API

1. **Cloud Console** → APIs & Services
2. **Search**: "Google My Business API"
3. **Enable**

### Step 2: OAuth Setup

**Scopes needed:**
```
https://www.googleapis.com/auth/business.manage
```

### Step 3: Get Location ID

1. **Business Profile**: https://business.google.com/
2. **Your locations** → Select location
3. **URL contains**: accounts/{accountId}/locations/{locationId}
4. **Copy**: accountId and locationId

### Step 4: Environment Variables

```env
GOOGLE_BUSINESS_ACCOUNT_ID=123456789
GOOGLE_BUSINESS_LOCATION_ID=987654321
```

---

## 🔵 **TIKTOK ADS**

### Prerequisites
- TikTok Ads account
- TikTok Business account

### Step 1: Create TikTok App

1. **TikTok for Business**: https://business-api.tiktok.com/portal/
2. **Create App**
3. **Copy**: App ID, App Secret

### Step 2: Configure Webhook

1. **App Dashboard** → Webhooks
2. **URL**: `https://your-domain.com/api/webhooks/tiktok-lead-gen`
3. **Events**: `lead.create`

### Step 3: Get Access Token

1. **OAuth flow** (similar to Meta)
2. **Scopes**: `leads.read`, `ads.read`

### Step 4: Environment Variables

```env
TIKTOK_APP_ID=your_app_id
TIKTOK_APP_SECRET=your_app_secret
TIKTOK_ADVERTISER_ID=your_advertiser_id
```

---

## 🔧 **TROUBLESHOOTING**

### Common Issues

#### "Signature Verification Failed"
**Cause**: Auth token doesn't match or URL mismatch
**Fix**:
1. Verify `TWILIO_AUTH_TOKEN` matches Twilio console
2. Ensure webhook URL is EXACTLY the same (no trailing slash differences)
3. Check that request is coming from Twilio IP addresses

#### "Token Expired"
**Cause**: OAuth token expired and auto-refresh failed
**Fix**:
1. Check Integration Health Dashboard
2. Click "Reconnect" to re-authorize
3. Verify refresh token is still valid
4. Check `integration_logs` for refresh errors

#### "Rate Limit Exceeded"
**Cause**: Too many requests in time window
**Fix**:
1. Check `integration_rate_limits` table for current usage
2. Wait for window reset (shown in error message)
3. Implement request queuing if sustained high volume
4. Consider upgrading vendor tier

#### "Duplicate Webhook"
**Cause**: Vendor sent same webhook twice (normal)
**Fix**:
- This is expected! Idempotency automatically handles it
- Check `integration_webhooks_log` for `status='processed'`
- Second webhook returns cached result

---

## ✅ **VERIFICATION CHECKLIST**

After setting up each integration, verify:

- [ ] Credentials saved in `integration_connections` table
- [ ] Status shows "connected" (green badge)
- [ ] Test API call succeeds
- [ ] Webhook URL configured in vendor console
- [ ] Webhook signature verified (check logs)
- [ ] Test webhook processed successfully
- [ ] Activity created in CRM
- [ ] Contact/Deal linked correctly
- [ ] Integration Health Dashboard shows metrics
- [ ] No errors in `integration_logs`

---

## 🆘 **SUPPORT**

If you encounter issues:

1. **Check Logs**:
   - `integration_logs` table
   - Filter by `integration_type` and `status='error'`
   - Look for `correlation_id` to trace request

2. **Check DLQ**:
   - `integration_dlq` table
   - See failed operations with full payload

3. **Health Dashboard**:
   - View real-time status
   - See error rates
   - Check token expiry

4. **Runbooks**:
   - See INTEGRATION_RUNBOOKS.md for detailed fixes

---

**All integrations follow this pattern:**
1. Get credentials from vendor
2. Store in `integration_connections`
3. Configure webhooks (if applicable)
4. Test end-to-end
5. Monitor via Health Dashboard

**Need help?** Check the runbooks or review `integration_logs` for detailed error traces.


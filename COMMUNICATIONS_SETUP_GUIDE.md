# 📡 Communications Integrations Setup Guide

## 🎉 What's Been Built

Your CRM now has **complete infrastructure** for enterprise-grade communications integrations!

### ✅ Infrastructure Ready:
1. **Database Schema** - All tables & fields for integrations
2. **Settings UI** - Professional configuration interface
3. **Send API Endpoints** - Email, SMS, WhatsApp, Voice
4. **Receive Webhooks** - Auto-log incoming messages & calls
5. **Activity Logging** - Every communication tracked automatically
6. **Integration Logs** - Debug & monitor all API calls

---

## 📋 STEP 1: Run Database Migration

### Option A: Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `/dental-crm/supabase/sql/19_activity_integrations.sql`
4. Copy the entire contents
5. Paste into SQL Editor and click **RUN**
6. Wait for ✅ "Success. No rows returned"

### Option B: Command Line

```bash
cd /Users/deepak/auth-app/dental-crm
supabase db push
```

---

## 🛠️ STEP 2: Configure Integrations

### Navigate to Settings

1. Open your CRM: `http://localhost:3000`
2. Go to **Settings** (top navigation)
3. Click the **📡 Integrations** tab

You'll see 4 integration types:
- **📧 Email** (SendGrid, Gmail, Outlook, SES)
- **📱 SMS** (Twilio)
- **💬 WhatsApp** (Twilio WhatsApp Business)
- **📞 Voice** (Twilio Voice/Calls)

---

## 📧 EMAIL INTEGRATION

### Option 1: SendGrid (Easiest)

1. **Sign up**: https://sendgrid.com/pricing/
   - Free tier: 100 emails/day
   - Paid: Starting at $20/month for 40k emails

2. **Get API Key**:
   - Login → Settings → API Keys → Create API Key
   - Name it "Dental CRM"
   - Copy the key (starts with `SG.`)

3. **Configure in CRM**:
   - Email Provider: `SendGrid`
   - API Key: Paste your key
   - From Email: `noreply@yourpractice.com`
   - From Name: `Your Practice Name`
   - Click **Save Email Settings**

4. **Set Up Inbound (Receiving Emails)**:
   - SendGrid → Settings → Inbound Parse
   - Add webhook URL: `https://your-domain.com/api/webhooks/email`
   - Forward emails to parse@yourapp.com

### Option 2: Gmail API

1. **Enable Gmail API**: https://console.cloud.google.com/
2. **Create OAuth credentials**
3. **Implement OAuth flow** (requires additional development)

---

## 📱 SMS INTEGRATION (Twilio)

### Setup Steps:

1. **Create Twilio Account**: https://www.twilio.com/try-twilio
   - Sign up (free trial with $15 credit)

2. **Get Credentials**:
   - Dashboard → Account Info
   - Copy **Account SID** (starts with `AC`)
   - Copy **Auth Token** (click eye icon to reveal)

3. **Get Phone Number**:
   - Twilio Console → Phone Numbers → Buy a Number
   - Select a number with SMS capability
   - Cost: ~$1-15/month depending on country
   - Note: You'll need to verify your practice identity for production

4. **Configure in CRM**:
   - Go to Settings → Integrations → SMS tab
   - Twilio Account SID: Paste your SID
   - Twilio Auth Token: Paste your token
   - Twilio Phone Number: Your purchased number (e.g., `+1234567890`)
   - Click **Save SMS Settings**

5. **Set Up Webhook (for receiving SMS)**:
   - Twilio Console → Phone Numbers → Manage → Active Numbers
   - Click your number
   - Under "Messaging", find "A MESSAGE COMES IN"
   - Webhook URL: `https://your-domain.com/api/webhooks/sms`
   - HTTP Method: `POST`
   - Click **Save**

### Cost:
- Outbound SMS: ~$0.0075 per message
- Inbound SMS: ~$0.0075 per message
- Example: 1000 messages/month = ~$15

---

## 💬 WHATSAPP INTEGRATION (Twilio WhatsApp Business)

### Requirements:
- Twilio account (same as SMS)
- WhatsApp Business profile
- Business verification (takes 1-3 days)

### Setup Steps:

1. **Request WhatsApp Access**:
   - Contact Twilio Support or use https://www.twilio.com/console/sms/whatsapp/learn
   - They'll guide you through WhatsApp Business API approval

2. **Get WhatsApp Sender**:
   - Once approved, you'll get a WhatsApp-enabled number
   - Format: `whatsapp:+1234567890`

3. **Configure in CRM**:
   - Settings → Integrations → WhatsApp tab
   - Use same Twilio Account SID & Auth Token
   - WhatsApp Number: Your approved WhatsApp sender
   - Click **Save WhatsApp Settings**

4. **Set Up Webhook**:
   - Twilio Console → Messaging → WhatsApp Senders
   - Select your sender
   - Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
   - Click **Save**

### Cost:
- First 1000 conversations/month: **FREE**
- After: $0.005-0.09 per message (varies by country)

---

## 📞 VOICE/CALL INTEGRATION (Twilio Voice)

### Setup Steps:

1. **Use Same Twilio Account** (from SMS setup)

2. **Verify Phone Number Has Voice**:
   - Twilio Console → Phone Numbers
   - Your number should show "Voice" capability
   - If not, buy a voice-enabled number

3. **Configure in CRM**:
   - Settings → Integrations → Voice tab
   - Same Account SID & Auth Token
   - Voice Phone Number: Your Twilio number
   - Click **Save Voice Settings**

4. **Set Up Webhooks**:
   - Twilio Console → Phone Numbers → Your Number
   - Under "Voice & Fax":
     - "A CALL COMES IN": `https://your-domain.com/api/webhooks/voice`
     - "STATUS CALLBACK URL": `https://your-domain.com/api/webhooks/voice`
   - Click **Save**

### Cost:
- Outbound calls: ~$0.013/minute
- Inbound calls: ~$0.0085/minute
- Recording storage: Free for 90 days
- Example: 500 minutes/month = ~$6.50

---

## 🧪 STEP 3: Test Your Integrations

### Test Email:

```bash
curl -X POST https://your-domain.com/api/communications/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["test@example.com"],
    "subject": "Test Email from CRM",
    "body": "<p>This is a test!</p>",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_id": "your-contact-id"
  }'
```

### Test SMS:

```bash
curl -X POST https://your-domain.com/api/communications/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Test SMS from CRM!",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_id": "your-contact-id"
  }'
```

### Test WhatsApp:

```bash
curl -X POST https://your-domain.com/api/communications/send-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Test WhatsApp from CRM!",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_id": "your-contact-id"
  }'
```

### Test Call:

```bash
curl -X POST https://your-domain.com/api/communications/initiate-call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_id": "your-contact-id",
    "record": true
  }'
```

---

## 📊 STEP 4: Monitor Integration Logs

### View Logs in Database:

```sql
-- Recent integration activity
SELECT * FROM integration_logs
ORDER BY created_at DESC
LIMIT 50;

-- Failed integrations
SELECT * FROM integration_logs
WHERE status = 'error'
ORDER BY created_at DESC;

-- Activity by type
SELECT integration_type, COUNT(*), AVG(CASE WHEN status='success' THEN 1 ELSE 0 END) as success_rate
FROM integration_logs
GROUP BY integration_type;
```

---

## 🎯 WHAT'S READY TO USE RIGHT NOW

### ✅ Fully Functional (Without Real APIs):
- Settings UI (configure all integrations)
- Send endpoints (log activities, ready for real APIs)
- Webhook endpoints (receive & log communications)
- Database schema (tracks everything)
- Integration logs (debug & monitor)

### ⏳ Needs Real API Keys to Actually Send:
- Email sending (add SendGrid/Gmail API key)
- SMS sending (add Twilio credentials)
- WhatsApp sending (add Twilio WhatsApp credentials)
- Call initiation (add Twilio Voice credentials)

### 🔧 Next Steps for Full Production Use:
1. Deploy your app (so webhooks work)
2. Add real API keys in Settings → Integrations
3. Test each integration
4. (Optional) Build UI composers for easier sending
5. (Optional) Enhance activity cards with deal context

---

## 💰 TOTAL MONTHLY COST ESTIMATE

| Service | Usage (5-10 person team) | Monthly Cost |
|---------|--------------------------|--------------|
| **Email** (SendGrid) | 5,000 emails | $20 |
| **SMS** (Twilio) | 1,000 messages | $15 |
| **WhatsApp** (Twilio) | 2,000 messages | $20 |
| **Voice** (Twilio) | 500 minutes | $7 |
| **Phone Numbers** (Twilio) | 2 numbers | $20 |
| **TOTAL** | | **~$82/month** |

Plus one-time Twilio setup: $15 credit included free

---

## 🚨 IMPORTANT NOTES

### Security:
- ✅ API keys stored in database (encrypted by Supabase)
- ✅ Webhook verification (Twilio validates requests)
- ✅ Integration logs (track all API calls)
- ⚠️ Add rate limiting for production
- ⚠️ Implement proper tenant isolation

### Webhooks Require Public URL:
- Local development: Use **ngrok** or **Cloudflare Tunnel**
- Production: Deploy to Vercel/Netlify/your server

### For Production:
1. **Verify business identity** with Twilio (required for SMS/WhatsApp at scale)
2. **Set up proper error handling** (retry failed messages)
3. **Implement queueing** (for bulk sends)
4. **Add compliance** (GDPR, CAN-SPAM, TCPA)

---

## 📞 SUPPORT & DOCUMENTATION

### Twilio Docs:
- SMS: https://www.twilio.com/docs/sms
- WhatsApp: https://www.twilio.com/docs/whatsapp
- Voice: https://www.twilio.com/docs/voice

### SendGrid Docs:
- API: https://docs.sendgrid.com/api-reference/
- Inbound Parse: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook

---

## ✅ CHECKLIST

- [ ] Run database migration (19_activity_integrations.sql)
- [ ] Configure at least 1 integration (Email or SMS)
- [ ] Test sending via API endpoint
- [ ] Set up webhook URL (requires public domain)
- [ ] Test receiving messages
- [ ] Check integration_logs table
- [ ] (Optional) Add real API keys for production
- [ ] (Optional) Request UI composers from developer

---

**You're ready to integrate!** 🚀

When you're ready to add the UI (compose email/SMS buttons in the CRM), just let me know!


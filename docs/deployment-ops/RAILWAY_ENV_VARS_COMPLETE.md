# Complete Railway Environment Variables

**For:** spirited-growth service  
**Copy these to:** Railway → spirited-growth → Variables

---

## ✅ REQUIRED (Must Set - App Won't Work Without These)

```env
# Node Environment
NODE_ENV=production

# Database (Supabase) - CRITICAL
DATABASE_URL=<your-supabase-connection-pooler-url>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Authentication - CRITICAL
JWT_SECRET=<generate: openssl rand -base64 32>
NEXTAUTH_URL=<will-be-your-railway-url>
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>

# Application
BASE_URL=<will-be-your-railway-url>
NEXT_PUBLIC_APP_URL=<will-be-your-railway-url>
```

---

## ⚠️  RECOMMENDED (App works but features limited without)

```env
# Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=https://9f500122e319dce965baba25e330cf07@o4510207888392192.ingest.de.sentry.io/4510207920701520
SENTRY_AUTH_TOKEN=<your-sentry-token>
SENTRY_ORG=agenttoffeeorg
SENTRY_PROJECT=dental-crm
SENTRY_DEV=false

# OpenAI (AI Features)
OPENAI_API_KEY=<your-openai-key>

# Email (Resend)
RESEND_API_KEY=<your-resend-key>
FROM_EMAIL=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_PHONE_NUMBER=<your-twilio-number>
```

---

## 💰 OPTIONAL (Specific Features)

```env
# Stripe (Billing)
STRIPE_SECRET_KEY=<your-stripe-key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-pub-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>

# Google (Calendar, OAuth)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

---

## 🎯 STEP-BY-STEP: How to Add Variables

### Step 1: Get Supabase Credentials

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: Settings → API
4. Copy these values:
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - anon/public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_ROLE_KEY

5. Go to: Settings → Database
6. Copy: Connection string (pooler) → DATABASE_URL

### Step 2: Generate Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate NEXTAUTH_SECRET  
openssl rand -base64 32
```

### Step 3: Get Railway URL

After first deployment, Railway gives you a URL like:
`spirited-growth.up.railway.app`

Use this for:
- NEXTAUTH_URL=https://spirited-growth.up.railway.app
- BASE_URL=https://spirited-growth.up.railway.app
- NEXT_PUBLIC_APP_URL=https://spirited-growth.up.railway.app

### Step 4: Add to Railway

1. Railway → spirited-growth → Variables
2. Click "+ New Variable"
3. Add each one:
   - Name: NODE_ENV
   - Value: production
   - Save
4. Repeat for ALL required variables

---

## 🚨 MINIMUM TO GET WORKING

If you want to get it working FAST, add AT MINIMUM:

```env
NODE_ENV=production
DATABASE_URL=<supabase>
NEXT_PUBLIC_SUPABASE_URL=<supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase>
SUPABASE_SERVICE_ROLE_KEY=<supabase>
JWT_SECRET=<generate>
NEXTAUTH_URL=https://spirited-growth.up.railway.app
NEXTAUTH_SECRET=<generate>
BASE_URL=https://spirited-growth.up.railway.app
```

Then deploy. AI features won't work yet, but core app will!

---

**Want me to help you get the Supabase values?**


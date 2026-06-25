# Environment Variables Setup Guide

## Required Environment Variables

Create a `.env.local` file in the root directory:

### 1. Supabase (REQUIRED)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**How to get these:**
1. Go to https://supabase.com
2. Select your project
3. Go to Settings → API
4. Copy Project URL and keys

### 2. App URL (REQUIRED)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Change to your production URL when deploying.

### 3. Email - Resend (REQUIRED for invitations)
```bash
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourapp.com
```

**How to get:**
1. Go to https://resend.com
2. Sign up for free account
3. Get API key from dashboard
4. Verify your domain for production

### 4. SMS - Twilio (Optional)
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

**How to get:**
1. Go to https://twilio.com
2. Sign up ($15 free credit)
3. Get Account SID and Auth Token
4. Buy a phone number

### 5. WhatsApp - Twilio (Optional)
```bash
TWILIO_WHATSAPP_NUMBER=+15551234567
```

**How to get:**
1. Same Twilio account
2. Request WhatsApp Business API access
3. Get approved phone number

### 6. OpenAI (Optional - for AI features)
```bash
OPENAI_API_KEY=sk-your_openai_key
```

**How to get:**
1. Go to https://platform.openai.com
2. Create API key
3. Add billing method

## Development vs Production

### Development (.env.local)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Vercel Environment Variables)
```bash
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

## Testing Email/SMS

### Email Testing (Free)
Use Mailtrap for development:
```bash
# .env.local
EMAIL_TESTING_MODE=true
MAILTRAP_API_KEY=your_mailtrap_key
```

### SMS Testing
Twilio trial account sends to verified numbers only.

## Security Notes

- ✅ `.env.local` is in `.gitignore` - NEVER commit!
- ✅ Use different keys for dev/staging/prod
- ✅ Rotate keys regularly
- ✅ Never expose service role key to frontend

## Checklist

- [ ] Created `.env.local` file
- [ ] Added Supabase credentials
- [ ] Added Resend API key
- [ ] Added app URL
- [ ] Configured Twilio (optional)
- [ ] Tested email sending
- [ ] Tested SMS sending (optional)
- [ ] Verified all keys work



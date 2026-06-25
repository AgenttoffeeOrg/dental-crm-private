# 🚀 Quick Start: Deploy to Railway

## Super Fast Deployment (5 Minutes)

### Method 1: Automated Script (Recommended)
```bash
cd /Users/deepak/auth-app/dental-crm
./deploy-to-railway.sh
```

This script will:
1. ✅ Install Railway CLI (if needed)
2. ✅ Login to Railway
3. ✅ Link/create Railway project
4. ✅ Configure environment variables
5. ✅ Deploy your app

---

### Method 2: Manual Steps

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. Login
```bash
railway login
```

#### 3. Initialize Project
```bash
# For new project:
railway init

# For existing project:
railway link
```

#### 4. Set Environment Variables
```bash
railway variables set NEXT_PUBLIC_SUPABASE_URL="your-url"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-key"
railway variables set NODE_ENV="production"
```

#### 5. Deploy
```bash
railway up
```

#### 6. View Your App
```bash
railway open
```

---

## What You Need

### Required Information:
- Supabase Project URL (from Supabase Dashboard → Settings → API)
- Supabase Anon Key (from Supabase Dashboard → Settings → API)
- Supabase Service Role Key (from Supabase Dashboard → Settings → API)

### Railway Account:
- Sign up at: https://railway.app
- Free tier available (no credit card required)

---

## Verify Deployment

Once deployed, test these URLs:

1. **Homepage:** `https://your-app.railway.app`
2. **Dashboard:** `https://your-app.railway.app/dashboard`
3. **API:** `https://your-app.railway.app/api/tenant/context`

---

## Common Issues

### Build Fails
```bash
# Check logs
railway logs --build

# Common fix: Verify Node version
# Should be 20+ (configured in package.json)
```

### App Won't Start
```bash
# Check runtime logs
railway logs

# Verify environment variables
railway variables
```

### Database Connection Issues
- Double-check Supabase URL
- Verify Supabase keys are correct
- Ensure Supabase project is accessible from Railway

---

## Next Steps

After deployment:
1. Set up custom domain (optional)
2. Configure monitoring
3. Set up auto-deployment from Git

See `RAILWAY_DEPLOYMENT_GUIDE.md` for detailed instructions.

---

**Ready to deploy? Run:**
```bash
./deploy-to-railway.sh
```


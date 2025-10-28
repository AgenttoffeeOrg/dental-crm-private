# 🚀 Railway Deployment Guide - Dental CRM

## 📋 Prerequisites

Before deploying to Railway, ensure you have:
- ✅ Railway account (https://railway.app)
- ✅ Railway CLI installed (`npm install -g @railway/cli`)
- ✅ Git repository clean and committed
- ✅ Supabase project (already configured)
- ✅ All environment variables ready

---

## 🎯 Step 1: Install Railway CLI (if not installed)

```bash
npm install -g @railway/cli
```

**Verify installation:**
```bash
railway --version
```

---

## 🔐 Step 2: Login to Railway

```bash
cd /Users/deepak/auth-app/dental-crm
railway login
```

This will open a browser window for authentication.

---

## 📦 Step 3: Initialize Railway Project

### Option A: Link to Existing Railway Project
```bash
railway link
```
Select your existing project from the list.

### Option B: Create New Railway Project
```bash
railway init
```
Follow the prompts to create a new project.

---

## ⚙️ Step 4: Configure Environment Variables

You need to set these environment variables in Railway:

### Required Variables:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# App Configuration
NEXT_PUBLIC_APP_URL=<your-railway-url>
NODE_ENV=production
```

### Set Variables via CLI:
```bash
# Supabase URL
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"

# Supabase Anon Key
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# Supabase Service Role Key
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Node Environment
railway variables set NODE_ENV="production"
```

### Set Variables via Railway Dashboard (Recommended for sensitive data):
1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select your project
3. Go to **Variables** tab
4. Add each environment variable

---

## 📝 Step 5: Create Railway Configuration Files

### Create `railway.json` (if needed):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Create `nixpacks.toml` (for custom Nixpacks configuration):
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

---

## 🚀 Step 6: Deploy to Railway

### Method 1: Using Railway CLI
```bash
# Make sure all changes are committed
git add .
git commit -m "chore: prepare for Railway deployment"

# Deploy to Railway
railway up
```

### Method 2: Using Git Push (if Railway is connected to GitHub)
```bash
# Push to your main branch
git push origin main
```

Railway will automatically detect the push and start deploying.

---

## 🔍 Step 7: Monitor Deployment

### View Deployment Logs:
```bash
railway logs
```

### Or via Dashboard:
1. Go to Railway Dashboard
2. Select your project
3. Click on **Deployments** tab
4. View real-time logs

---

## ✅ Step 8: Verify Deployment

### 1. Check Deployment Status
```bash
railway status
```

### 2. Get Your Railway URL
```bash
railway domain
```

### 3. Open Your App
```bash
railway open
```

Or visit the URL shown in your Railway dashboard.

---

## 🧪 Step 9: Post-Deployment Verification

### Check these endpoints:
1. **Main Page:** `https://your-app.railway.app`
2. **Dashboard:** `https://your-app.railway.app/dashboard`
3. **API Health:** `https://your-app.railway.app/api/tenant/context`

### Test Core Features:
- [ ] Login works
- [ ] Dashboard loads
- [ ] Organization switcher works
- [ ] Location switcher appears
- [ ] Deals page loads with data
- [ ] Deal detail page loads (`/deals/[id]`)
- [ ] Contacts page loads
- [ ] Pipeline view loads
- [ ] Tasks page loads
- [ ] Settings page loads
- [ ] Team Invites tab loads without errors

---

## 🔧 Troubleshooting

### Build Fails:
```bash
# Check build logs
railway logs --build

# Common fixes:
# 1. Verify Node version (should be 18+)
# 2. Check package.json scripts
# 3. Ensure all dependencies are in package.json
```

### Environment Variables Not Working:
```bash
# List all variables
railway variables

# Update a variable
railway variables set VARIABLE_NAME="new-value"

# Delete and re-add if needed
railway variables delete VARIABLE_NAME
railway variables set VARIABLE_NAME="new-value"
```

### App Crashes on Start:
```bash
# Check runtime logs
railway logs

# Common issues:
# 1. Missing environment variables
# 2. Database connection issues (check Supabase URL/keys)
# 3. Port configuration (Railway auto-assigns PORT)
```

### Database Issues:
- Verify Supabase URL is correct
- Check Supabase service role key is valid
- Ensure all migrations are applied in Supabase

---

## 📊 Railway Dashboard Features

### Access Your Dashboard:
https://railway.app/dashboard

### Key Features:
1. **Deployments** - View deployment history and logs
2. **Variables** - Manage environment variables
3. **Metrics** - Monitor CPU, memory, network usage
4. **Domains** - Configure custom domains
5. **Settings** - Adjust deployment settings

---

## 🌐 Custom Domain Setup (Optional)

### Add Custom Domain:
1. Go to Railway Dashboard
2. Select your project
3. Go to **Settings** > **Domains**
4. Click **Add Domain**
5. Enter your domain (e.g., `app.yourdomain.com`)
6. Add CNAME record in your DNS provider:
   ```
   CNAME app railway-production.up.railway.app
   ```

---

## 🔄 Continuous Deployment

### Auto-Deploy on Git Push:
Railway automatically deploys when you push to your connected branch.

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Railway will automatically:
# 1. Detect the push
# 2. Run build
# 3. Deploy new version
# 4. Switch traffic to new deployment
```

### Rollback to Previous Deployment:
1. Go to Railway Dashboard
2. Click **Deployments**
3. Find the deployment you want to restore
4. Click **Redeploy**

---

## 📈 Monitoring & Scaling

### View Metrics:
```bash
railway status
```

### Scale Your App:
1. Go to Railway Dashboard
2. Select your project
3. Go to **Settings** > **Resources**
4. Adjust memory/CPU limits

---

## 🆘 Quick Commands Reference

```bash
# Login
railway login

# Link project
railway link

# Set environment variable
railway variables set NAME="value"

# Deploy
railway up

# View logs
railway logs

# Get app URL
railway domain

# Open app in browser
railway open

# Check status
railway status

# SSH into running app
railway shell
```

---

## ✅ Deployment Checklist

Before deploying, verify:
- [x] All code is committed to Git
- [x] `.env.local` is in `.gitignore` (never commit secrets!)
- [x] All environment variables are set in Railway
- [x] Supabase database is accessible from Railway
- [x] All database migrations are applied in Supabase
- [ ] Railway project is created/linked
- [ ] Build completes successfully
- [ ] App starts without errors
- [ ] All features work on Railway URL

---

## 📚 Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Next.js on Railway:** https://docs.railway.app/guides/nextjs
- **Supabase Docs:** https://supabase.com/docs

---

## 🎉 Success!

Once deployed, your app will be available at:
```
https://your-project.railway.app
```

Share this URL with your team or stakeholders!

---

**Need Help?**
- Railway Support: https://railway.app/help
- Community Discord: https://discord.gg/railway

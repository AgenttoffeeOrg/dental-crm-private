# 🚀 Deploy to Railway via GitHub (Easiest Method)

Since Railway CLI requires interactive browser login, the **easiest way** is to deploy via GitHub:

## 📋 Quick Steps (5 minutes)

### Step 1: Push Your Code to GitHub
```bash
cd /Users/deepak/auth-app/dental-crm

# Push to your GitHub repository
git push origin main
```

### Step 2: Deploy on Railway Dashboard

1. **Go to Railway:** https://railway.app/dashboard

2. **Click "New Project"**

3. **Select "Deploy from GitHub repo"**

4. **Choose your repository:** `dental-crm-private` (or `dental-crm-friend`)

5. **Railway will auto-detect Next.js** ✅

### Step 3: Add Environment Variables

In Railway Dashboard, go to **Variables** tab and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NODE_ENV=production
```

### Step 4: Deploy!

Railway will automatically:
- Build your app (`npm run build`)
- Start your app (`npm start`)
- Assign a URL

**First deployment:** ~5-7 minutes  
**Your app will be live at:** `https://your-project.railway.app`

---

## 🎯 Get Your Supabase Credentials

Go to: https://supabase.com/dashboard

1. Select your project
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## ✅ After Deployment

Test these URLs:
- Homepage: `https://your-app.railway.app`
- Dashboard: `https://your-app.railway.app/dashboard`
- API: `https://your-app.railway.app/api/tenant/context`

---

## 🔄 Auto-Deploy on Every Git Push

Once connected to GitHub, every `git push` will auto-deploy! 🎉

```bash
git add .
git commit -m "your changes"
git push origin main
# Railway automatically builds and deploys!
```

---

## Alternative: Railway CLI (Manual Terminal Steps)

If you want to use CLI instead, run these commands in your **local terminal** (not through me):

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login (opens browser)
railway login

# Link project
cd /Users/deepak/auth-app/dental-crm
railway init

# Set environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL="your-url"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-key"
railway variables set NODE_ENV="production"

# Deploy
railway up
```

---

**Recommended:** Use **GitHub method** - it's easier and enables auto-deploy! 🚀


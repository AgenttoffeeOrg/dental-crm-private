# 🚀 Railway Deployment - Next Steps

## ✅ Current Status
- **Railway CLI:** Installed ✅
- **Project:** `spirited-growth` linked ✅
- **Git:** Code pushed to GitHub ✅

---

## 📋 What You Need to Do Now

### Step 1: Get Your Supabase Credentials

Go to: **https://supabase.com/dashboard**

1. Select your Dental CRM project
2. Click **Settings** (left sidebar)
3. Click **API**
4. Copy these 3 values:

```
Project URL → Example: https://abcdefghijk.supabase.co
anon public key → Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role secret key → Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Step 2: Set Environment Variables

Run these commands **one by one** in your terminal:

```bash
# 1. Set Supabase URL (replace with your actual URL)
railway variables set NEXT_PUBLIC_SUPABASE_URL='https://your-project-id.supabase.co'

# 2. Set Anon Key (replace with your actual key)
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key-here'

# 3. Set Service Role Key (replace with your actual key)
railway variables set SUPABASE_SERVICE_ROLE_KEY='your-service-role-key-here'

# 4. Set Node Environment
railway variables set NODE_ENV='production'
```

**⚠️ Important:** Replace `'your-...'` with your actual values from Step 1!

---

### Step 3: Deploy to Railway

Once all environment variables are set, deploy:

```bash
railway up
```

This will:
- ✅ Upload your code to Railway
- ✅ Build your Next.js app (~5-7 minutes)
- ✅ Deploy to production
- ✅ Give you a live URL!

---

### Step 4: Monitor Deployment

Watch the build logs in real-time:

```bash
railway logs
```

Check deployment status:

```bash
railway status
```

Get your live URL:

```bash
railway domain
```

---

## 🎯 Quick Copy-Paste Template

For convenience, here's a template you can copy and fill in:

```bash
# Replace these values with your actual Supabase credentials:

railway variables set NEXT_PUBLIC_SUPABASE_URL='PASTE_YOUR_SUPABASE_URL_HERE'

railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY='PASTE_YOUR_ANON_KEY_HERE'

railway variables set SUPABASE_SERVICE_ROLE_KEY='PASTE_YOUR_SERVICE_ROLE_KEY_HERE'

railway variables set NODE_ENV='production'

# After all variables are set:
railway up
```

---

## ✅ Verification Checklist

After deployment completes:

### 1. Get Your App URL
```bash
railway domain
```

### 2. Test These Pages
- [ ] Homepage: `https://your-app.railway.app`
- [ ] Login: `https://your-app.railway.app/sign-in`
- [ ] Dashboard: `https://your-app.railway.app/dashboard`
- [ ] Deals: `https://your-app.railway.app/deals`
- [ ] Contacts: `https://your-app.railway.app/contacts`

### 3. Test Core Features
- [ ] Login with your email
- [ ] Organization switcher works
- [ ] Location switcher appears
- [ ] Deals load with data
- [ ] Contacts load
- [ ] Pipeline view works
- [ ] Settings page accessible

---

## 🆘 Troubleshooting

### View Build Logs
```bash
railway logs --follow
```

### View Environment Variables
```bash
railway variables
```

### Restart Deployment
```bash
railway redeploy
```

### Check Service Status
```bash
railway status
```

---

## 🎉 Once Deployed

Your app will be live at: `https://spirited-growth.railway.app` (or similar)

**Auto-Deploy Enabled:** Every `git push` will automatically deploy! 🚀

```bash
git add .
git commit -m "new feature"
git push origin main
# → Railway automatically builds & deploys!
```

---

## 📚 Helpful Railway Commands

```bash
railway logs              # View logs
railway logs --follow     # Follow logs in real-time
railway status           # Check deployment status
railway domain           # Get your app URL
railway variables        # List all environment variables
railway open             # Open Railway dashboard in browser
railway redeploy         # Trigger new deployment
railway restart          # Restart your service
```

---

**Ready to deploy?** Run the commands in **Step 2** above! 🚀


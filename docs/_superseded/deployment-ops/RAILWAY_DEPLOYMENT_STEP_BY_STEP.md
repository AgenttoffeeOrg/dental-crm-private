# 🚂 Railway Deployment - Step by Step Guide

**Your Dental CRM → Live in 10 Minutes!**

---

## 🎯 **STEP 1: Push to GitHub** (Do This First!)

Since you're logged into Railway, we need your code on GitHub first.

**In your terminal, run these commands:**

```bash
# Initialize git (if not already)
cd /Users/deepak/auth-app/dental-crm
git init

# Add all files
git add .

# Commit
git commit -m "Production ready - Dental CRM v1.0.0"

# Create GitHub repo (you'll need to create it on GitHub.com first)
# Then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/dental-crm.git
git branch -M main
git push -u origin main
```

**OR if you already have a GitHub repo:**
```bash
cd /Users/deepak/auth-app/dental-crm
git add .
git commit -m "Production ready - Dental CRM v1.0.0"
git push origin main
```

---

## 🚂 **STEP 2: Create New Project on Railway**

**In Railway dashboard:**

1. Click **"New Project"** (purple button)
2. Select **"Deploy from GitHub repo"**
3. If asked, **authorize Railway** to access your GitHub
4. Select your repository: **dental-crm** (or whatever you named it)
5. Click **"Deploy Now"**

Railway will start deploying automatically!

---

## ⚙️ **STEP 3: Add Environment Variables**

**In Railway dashboard:**

1. Click on your deployed project
2. Click **"Variables"** tab (left sidebar)
3. Click **"+ New Variable"**
4. Add these **ONE BY ONE:**

### **Required Variables (Copy & Paste):**

```
NEXT_PUBLIC_SUPABASE_URL
https://xcsgleuoxzrllimywlct.supabase.co
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjc2dsZXVveHpybGxpbXl3bGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTMyMTQsImV4cCI6MjA3NTY4OTIxNH0.BPzfRRHzeGuGutqQ4Av3gGhUihI5y_1FYHrRjAy14pc
```

```
SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjc2dsZXVveHpybGxpbXl3bGN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDExMzIxNCwiZXhwIjoyMDc1Njg5MjE0fQ.QDFZ8zrGQk9rFzBUZ310dfTS-MMWd__6JJMVPfGU5Vo
```

```
RESEND_API_KEY
re_bkKi3dVt_JirMpKcUSWhcif29GWZNqhzz
```

```
EMAIL_FROM
onboarding@resend.dev
```

```
OPENAI_API_KEY
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
```

```
NODE_ENV
production
```

**WAIT! Don't add `NEXT_PUBLIC_APP_URL` yet - we'll get it after deployment!**

---

## 🔄 **STEP 4: Redeploy with Variables**

**After adding all variables:**

1. Click **"Deployments"** tab
2. Click **"Deploy"** button (top right) OR
3. Railway will auto-redeploy

**Wait 2-3 minutes for build to complete...**

---

## 🌐 **STEP 5: Get Your Railway URL**

**Once deployment is complete:**

1. Click **"Settings"** tab
2. Scroll down to **"Domains"** section
3. Click **"Generate Domain"**
4. You'll get: `https://dental-crm-production-XXXX.up.railway.app`

**Copy this URL!**

---

## 🔧 **STEP 6: Update App URL Variable**

**Back in "Variables" tab:**

1. Click **"+ New Variable"**
2. Name: `NEXT_PUBLIC_APP_URL`
3. Value: `https://your-railway-url.up.railway.app` (the URL you just got)
4. Click **"Add"**

Railway will auto-redeploy again (1-2 minutes)

---

## 🎯 **STEP 7: Update Supabase Redirect URLs**

**In Supabase Dashboard:**

1. Go to **Authentication** → **URL Configuration**
2. Add to **"Redirect URLs"**:
   - `https://your-railway-url.up.railway.app/auth/callback`
   - `https://your-railway-url.up.railway.app/**`
3. Add to **"Site URL"**:
   - `https://your-railway-url.up.railway.app`
4. Click **"Save"**

---

## 🎉 **STEP 8: Test Your Live App!**

**Visit:** `https://your-railway-url.up.railway.app`

You should see:
- ✅ Sign-in page loads
- ✅ Sign up works
- ✅ Dashboard accessible
- ✅ All features working!

**Congratulations! Your Dental CRM is LIVE!** 🚀

---

## 📝 **Quick Checklist:**

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] All 7 environment variables added
- [ ] Railway domain generated
- [ ] NEXT_PUBLIC_APP_URL updated
- [ ] Supabase redirect URLs configured
- [ ] App tested and working!

---

## 🔄 **Dev vs Production Setup:**

### **Local Development (Your Machine):**
- URL: `http://localhost:3000`
- Purpose: Make changes, test features
- Command: `npm run dev`

### **Production (Railway):**
- URL: `https://your-app.up.railway.app`
- Purpose: Real users
- Auto-deploys when you push to GitHub!

**To make changes:**
1. Work locally (`npm run dev`)
2. Test everything
3. When happy: `git push`
4. Railway auto-deploys! ✨

---

## 🚨 **Need Help?**

**Common Issues:**

**Build Failed?**
- Check all environment variables are added
- Check Railway logs for specific error

**Can't Access App?**
- Check deployment status (should be "Active")
- Check domain is generated
- Try hard refresh (Cmd+Shift+R)

**Auth Not Working?**
- Check Supabase redirect URLs configured
- Check environment variables correct

---

**Let me know when you complete STEP 1 (push to GitHub) and I'll help with the rest!** 🚀


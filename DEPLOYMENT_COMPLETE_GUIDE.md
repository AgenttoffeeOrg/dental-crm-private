# 🚀 Complete Deployment Guide

## Overview

You'll deploy TWO applications:
1. **Main CRM** - For dental practices (yourcrm.vercel.app)
2. **Super Admin** - For you to monitor everything (admin-yourcrm.vercel.app)

---

## STEP 1: Run Super Admin SQL Migration (5 min)

### In Supabase SQL Editor:
```sql
-- Paste the contents of:
dental-crm/supabase/sql/46_super_admin_system.sql
```

This creates:
- `super_admins` table
- `analytics_events` table
- `user_sessions` table
- `feature_usage_stats` table
- `system_error_logs` table
- Analytics views
- Helper functions

---

## STEP 2: Deploy Main CRM to Vercel (10 min)

### A. Install Vercel CLI
```bash
npm install -g vercel
```

### B. Deploy Main App
```bash
cd /Users/deepak/auth-app/dental-crm
vercel

# Follow prompts:
# - Setup and deploy? Y
# - Which scope? Your account
# - Link to existing project? N
# - Project name? dental-crm
# - Directory? ./
# - Override settings? N
```

### C. Add Environment Variables in Vercel
1. Go to https://vercel.com/dashboard
2. Select `dental-crm` project
3. Go to Settings → Environment Variables
4. Add these:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://dental-crm.vercel.app
RESEND_API_KEY=your_resend_key
```

### D. Redeploy
```bash
vercel --prod
```

🎉 **Main app is now LIVE!**

---

## STEP 3: Deploy Super Admin to Vercel (10 min)

### A. Deploy Admin App
```bash
cd /Users/deepak/auth-app/dental-crm-admin
vercel

# Follow prompts
# Project name? dental-crm-admin
```

### B. Add Environment Variables
Same Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### C. Deploy to Production
```bash
vercel --prod
```

🎉 **Admin dashboard is LIVE!**

---

## STEP 4: Create Super Admin Account (2 min)

### In Supabase SQL Editor:
```sql
-- Create YOUR super admin account
INSERT INTO super_admins (email, full_name, password_hash, role)
VALUES (
  'your-email@gmail.com',
  'Your Name',
  -- Generate hash at: https://bcrypt-generator.com/
  '$2a$10$YourBcryptHashHere',
  'super_admin'
);
```

---

## STEP 5: Configure Supabase for Production URLs

### In Supabase Dashboard:
1. Go to Authentication → URL Configuration
2. Add Site URL: `https://dental-crm.vercel.app`
3. Add Redirect URLs:
   - `https://dental-crm.vercel.app/auth/callback`
   - `https://dental-crm.vercel.app/reset-password`
   - `http://localhost:3000/**` (for dev)

---

## STEP 6: Get Resend API Key (5 min)

1. Go to https://resend.com
2. Sign up (free tier - 100 emails/day)
3. Create API key
4. Add domain (or use resend.dev for testing)
5. Add to Vercel env vars

---

## 📊 YOUR URLS

After deployment:

**Main CRM (for practices):**
- Production: `https://dental-crm.vercel.app`
- Share this signup link!

**Super Admin (for YOU):**
- Admin: `https://dental-crm-admin.vercel.app`
- Only you can access

**Development:**
- Local: `http://localhost:3000`

---

## 🔄 WORKFLOW FOR EDITING

### Making Changes:
```bash
# Edit code in dental-crm/
cd /Users/deepak/auth-app/dental-crm

# Test locally
npm run dev

# When ready, deploy
git add .
git commit -m "Your changes"
git push

# Vercel auto-deploys!
# OR manually:
vercel --prod
```

### Staging Environment (Optional):
```bash
# Deploy to preview URL (not production)
vercel

# Test at preview URL
# If good, promote to production:
vercel --prod
```

---

## ✅ DEPLOYMENT CHECKLIST

**Before First Deploy:**
- [ ] SQL migrations run in Supabase
- [ ] Resend API key obtained
- [ ] Supabase configured for production URLs
- [ ] Environment variables ready
- [ ] Tested locally

**Deploy Main App:**
- [ ] `vercel` from dental-crm/
- [ ] Add environment variables
- [ ] `vercel --prod`
- [ ] Test signup flow
- [ ] Verify emails send

**Deploy Admin App:**
- [ ] `vercel` from dental-crm-admin/
- [ ] Add environment variables
- [ ] `vercel --prod`
- [ ] Create super admin account
- [ ] Test admin login

**Post-Deployment:**
- [ ] Test complete signup flow
- [ ] Invite test user
- [ ] Verify invitation email
- [ ] Check super admin dashboard
- [ ] Monitor for errors
- [ ] Share signup link!

---

## 🎉 YOU'RE LIVE!

After deployment you can:
- ✅ Share signup link with anyone
- ✅ They create accounts and use the CRM
- ✅ You monitor everything in super admin
- ✅ Edit locally, redeploy when ready
- ✅ Zero downtime updates

**Ready to deploy? I'll help you through each step!** 🚀


# 🚀 Deployment Guide

## Quick Deploy to Vercel

### 1. Prerequisites
- GitHub account
- Vercel account
- Supabase project

### 2. Supabase Setup
```bash
# Run all SQL migrations in order
1. 01_initial_schema.sql
2. 02_seed_data.sql
... (all files in supabase/sql/)
```

### 3. Environment Variables
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod
```

### 5. Configure Vercel
1. Add environment variables in Vercel dashboard
2. Set up custom domain (optional)
3. Enable Edge functions

## Production Checklist
- [ ] All SQL migrations run
- [ ] Environment variables set
- [ ] Authentication configured
- [ ] Custom domain (if applicable)
- [ ] Analytics setup
- [ ] Error tracking (Sentry)
- [ ] Backup strategy

## Post-Deployment
- Test all features
- Monitor performance
- Set up alerts
- Create admin user

## Troubleshooting
**Build fails:** Check Node version (18+)
**Auth issues:** Verify Supabase keys
**Database errors:** Check migrations ran

## Support
Contact: support@dentalcrm.com


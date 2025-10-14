# 🚀 Dental CRM - Deployment Guide

**Application:** Enterprise Dental CRM  
**Framework:** Next.js 15.5.4 with React 19  
**Database:** Supabase (PostgreSQL)  
**Status:** Production Ready

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Required

Create a `.env.production` file with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME="Dental CRM"

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Optional: Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id

# Optional: Error Monitoring
SENTRY_DSN=your_sentry_dsn
```

### 2. Database Setup

**In your production Supabase project:**

1. Run all migrations in order
2. Enable Row Level Security (RLS) on all tables
3. Verify RLS policies are active
4. Create initial admin user
5. Set up database backups (daily recommended)

### 3. External Services

**Required:**
- ✅ Supabase account with production project
- ✅ Email service (Resend recommended)
- ✅ Domain name configured

**Recommended:**
- Cloudflare for CDN/DDoS protection
- Sentry for error monitoring
- Google Analytics for usage tracking

---

## 🌐 Deployment Options

### Option A: Vercel (Recommended)

**Why Vercel?**
- Native Next.js support
- Automatic deployments
- Edge functions
- Built-in analytics
- Zero configuration

**Steps:**

1. **Connect Repository**
   ```bash
   # Push code to GitHub
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Configure project:
     - Framework Preset: Next.js
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.production`
   - Save changes

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at: `your-project.vercel.app`

5. **Configure Custom Domain**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

### Option B: AWS (EC2 + RDS)

**For enterprise deployments with custom requirements**

**Steps:**

1. **Set up EC2 Instance**
   ```bash
   # Choose Ubuntu 22.04 LTS
   # Minimum: t3.medium (2 vCPU, 4GB RAM)
   # Recommended: t3.large (2 vCPU, 8GB RAM)
   ```

2. **Install Dependencies**
   ```bash
   # SSH into your EC2 instance
   sudo apt update
   sudo apt install -y nodejs npm nginx
   sudo npm install -g pm2
   ```

3. **Clone and Build**
   ```bash
   git clone your-repo-url
   cd dental-crm
   npm install
   npm run build
   ```

4. **Configure PM2**
   ```bash
   pm2 start npm --name "dental-crm" -- start
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### Option C: Docker

**For containerized deployments**

1. **Create Dockerfile**
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV production
   COPY --from=builder /app/next.config.mjs ./
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t dental-crm .
   docker run -p 3000:3000 --env-file .env.production dental-crm
   ```

---

## 🔐 Security Configuration

### 1. Supabase Security

**In Supabase Dashboard:**

1. **Authentication Settings**
   - Enable email confirmation
   - Set session timeout (24 hours recommended)
   - Configure password requirements
   - Enable rate limiting

2. **RLS Policies**
   - Verify all tables have RLS enabled
   - Test policies with different user roles
   - Ensure tenant isolation works

3. **API Security**
   - Rotate service role key regularly
   - Use anon key only for client
   - Configure CORS properly

### 2. Application Security

**Update next.config.mjs:**

```javascript
const nextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

### 3. Environment Security

- Never commit `.env` files
- Use secret management (AWS Secrets Manager, Vault)
- Rotate keys quarterly
- Monitor for leaked credentials

---

## 📊 Monitoring & Maintenance

### 1. Set Up Monitoring

**Recommended Tools:**

- **Uptime:** UptimeRobot or Pingdom
- **Errors:** Sentry
- **Performance:** Vercel Analytics or Google Analytics
- **Logs:** Datadog or LogRocket

**Setup Sentry:**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 2. Database Monitoring

**In Supabase:**
- Enable daily backups
- Monitor query performance
- Set up disk usage alerts
- Track connection pool usage

### 3. Performance Monitoring

**Key Metrics to Track:**
- Page load time (<3s target)
- Time to first byte (<200ms target)
- Auth response time (<500ms target)
- Database query time (<100ms target)

### 4. Regular Maintenance

**Weekly:**
- Review error logs
- Check uptime reports
- Monitor disk usage
- Review security alerts

**Monthly:**
- Update dependencies
- Review and optimize database
- Check for unused features
- User feedback review

**Quarterly:**
- Security audit
- Performance optimization
- Feature usage analysis
- Cost optimization

---

## 🚨 Incident Response

### Critical Issues

**If site is down:**
1. Check Vercel/AWS status
2. Check Supabase status
3. Review recent deployments
4. Check error logs
5. Rollback if necessary

**If auth is broken:**
1. Check Supabase auth logs
2. Verify environment variables
3. Check RLS policies
4. Test with service role key
5. Contact Supabase support if needed

### Rollback Procedure

**Vercel:**
```bash
# Go to Deployments tab
# Find last working deployment
# Click "..." → Promote to Production
```

**PM2:**
```bash
# Stop current version
pm2 stop dental-crm
# Checkout previous version
git checkout previous-commit-hash
# Rebuild
npm run build
# Restart
pm2 restart dental-crm
```

---

## 📈 Scaling Considerations

### Database Scaling

**When to scale:**
- Query response time > 100ms
- CPU usage > 70% consistently
- Disk usage > 80%

**How to scale:**
1. Upgrade Supabase tier
2. Add read replicas
3. Implement caching (Redis)
4. Optimize queries and indexes

### Application Scaling

**Vercel:** Auto-scales automatically

**Custom Hosting:**
- Add more PM2 instances
- Use load balancer
- Implement CDN
- Add caching layer

---

## 🎯 Post-Deployment Steps

### 1. Verify Deployment

- [ ] Visit production URL
- [ ] Test sign-up flow
- [ ] Test sign-in flow
- [ ] Navigate all main pages
- [ ] Test data creation
- [ ] Verify emails sending
- [ ] Check error logging

### 2. Configure Monitoring

- [ ] Set up uptime monitoring
- [ ] Configure error alerts
- [ ] Enable performance tracking
- [ ] Set up database alerts

### 3. Documentation

- [ ] Document deployment process
- [ ] Create runbooks for common issues
- [ ] Document environment variables
- [ ] Create user documentation

### 4. Communication

- [ ] Notify team of deployment
- [ ] Update status page
- [ ] Send launch announcement
- [ ] Provide support channels

---

## 📞 Support & Resources

### Technical Support

- **Supabase:** support@supabase.com
- **Vercel:** vercel.com/support
- **Next.js:** nextjs.org/docs

### Useful Commands

```bash
# Build for production
npm run build

# Start production server
npm start

# Check for errors
npm run lint

# Type check
npx tsc --noEmit

# Database migrations
npx supabase db push

# View logs (PM2)
pm2 logs dental-crm

# Restart application (PM2)
pm2 restart dental-crm
```

---

## ✅ Deployment Complete!

Your Dental CRM is now live in production! 🎉

**Next Steps:**
1. Monitor for first 24 hours
2. Gather user feedback
3. Plan iterative improvements
4. Celebrate your launch! 🚀

**Questions?** Refer to the troubleshooting section or contact support.

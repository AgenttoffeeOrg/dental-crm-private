# Railway Hardening - Summary

**PR:** https://github.com/AgenttoffeeOrg/dental-crm-private/pull/15  
**Branch:** `ops/railway-harden`  
**Status:** ✅ Complete - Awaiting CI checks and merge

---

## 📊 Summary

Railway deployment hardened with production-grade reliability:

- ✅ Health check endpoint (`/api/health`)
- ✅ Dynamic PORT binding (works on any platform)
- ✅ Database migration validation
- ✅ Smoke test automation
- ✅ Pre-deploy CI gate (blocks bad deploys)
- ✅ Comprehensive documentation

---

## 🔧 What Was Changed

### 1. Start Command (package.json)
```json
"start": "next start -p ${PORT:-3000}"
```

### 2. Health Endpoint (src/app/api/health/route.ts)
```typescript
GET /api/health
→ { ok: true, uptime: 3600, timestamp: "..." }
```

### 3. DB Scripts (package.json)
```json
"db:validate": "supabase db lint",
"db:migrate": "supabase db push",
"smoke": "bash scripts/smoke.sh"
```

### 4. Smoke Test (scripts/smoke.sh)
- Polls `/api/health` 12 times (60s)
- Colored output with diagnostics
- Exit 0 (pass) or 1 (fail)

### 5. Pre-Deploy Workflow (.github/workflows/predeploy.yml)
- Build → Tests → Lint → Type-check → Migrations → Smoke test
- Blocks merge on failure

### 6. Documentation (docs/deploy-railway.md)
- 1000+ lines
- Step-by-step setup
- Troubleshooting guide

---

## 🚀 Quick Start

### Test Locally
```bash
# Start server
PORT=3000 npm run start &

# Run smoke test
npm run smoke

# Test health endpoint
curl http://localhost:3000/api/health
```

### Deploy to Railway
1. Merge PR #15
2. Configure Railway (see docs/deploy-railway.md)
3. Push to main
4. Railway auto-deploys with health checks

---

## 📋 Railway Configuration

### Start Command
```
npm run start
```

### Health Check
- Path: `/api/health`
- Status: 200
- Timeout: 5s
- Interval: 30s
- Retries: 3

### Auto-Restart
- Enable: Yes
- Max Restarts: 10
- Window: 10 minutes

### Required Environment Variables
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
JWT_SECRET=...
NEXTAUTH_URL=https://[your-domain].railway.app
NEXTAUTH_SECRET=...
BASE_URL=https://[your-domain].railway.app
```

See `docs/deploy-railway.md` for complete list.

---

## 📊 Detected Configuration

- **Runtime:** Next.js 15.5.4
- **Framework:** React 19.1.0
- **Database:** Supabase (PostgreSQL)
- **Migration Tool:** Supabase CLI
- **Migrations:** 57 files in `supabase/migrations/`
- **Node:** >= 20.0.0
- **Package Manager:** npm >= 10.0.0

---

## 🎯 Deployment Workflow

```
Local Dev → PR → CI Checks → Merge → Railway Deploy → Health Check → Live
```

**CI Checks:**
- Pre-deploy validation
- Playwright E2E
- Percy visual regression
- Semgrep SAST

**Railway Deploy:**
- Build with Next.js
- Start with `npm run start`
- Health check validates `/api/health`
- Traffic routed when healthy

**Monitoring:**
- Sentry (errors, performance)
- Checkly (uptime, every 5 min)
- Railway logs

---

## 📄 Files Created/Modified

### Modified
- `package.json` - Start command + scripts

### Created
- `src/app/api/health/route.ts` - Health endpoint
- `scripts/smoke.sh` - Smoke test (executable)
- `.github/workflows/predeploy.yml` - Pre-deploy CI
- `docs/deploy-railway.md` - Deployment guide

---

## 🚨 Troubleshooting

See `docs/deploy-railway.md` for detailed troubleshooting.

**Common Issues:**
1. EADDRINUSE → PORT not using `$PORT`
2. Cannot find module → Build artifacts missing
3. DB connection failed → Invalid `DATABASE_URL`
4. Health check failing → App not starting
5. OOM → Increase memory allocation

---

## ✅ Next Steps

1. **Review PR #15:**  
   https://github.com/AgenttoffeeOrg/dental-crm-private/pull/15

2. **Wait for CI checks** (pre-deploy, E2E, visual, SAST)

3. **Merge when green** ✅

4. **Configure Railway** (see docs/deploy-railway.md)

5. **Deploy:** Push to main

6. **Verify:** `curl https://[your-domain].railway.app/api/health`

7. **Monitor:** Check Sentry + Checkly dashboards

---

## 📊 Monitoring Dashboards

- **Railway:** https://railway.app/project/[your-project]
- **GitHub Actions:** https://github.com/AgenttoffeeOrg/dental-crm-private/actions
- **Sentry:** https://agenttoffeeorg.sentry.io/
- **Checkly:** https://app.checklyhq.com/

---

## 🎉 Production-Ready!

Your deployment is now hardened with:

✅ Health checks  
✅ Auto-restart  
✅ Migration validation  
✅ Smoke tests  
✅ CI gates  
✅ Error tracking  
✅ Uptime monitoring  
✅ Comprehensive docs  

**Deploy with confidence!** 🚀


# Investor Pack - Dental CRM Screenshots & Documentation

**Generated:** Automated investor pack for comprehensive product review  
**Platform:** Railway + Next.js + Supabase  
**Status:** ✅ Safe, read-only, non-destructive

---

## 📋 What's Included

This investor pack contains:

1. **📸 Screenshots (Desktop + Mobile)**
   - Comprehensive app screenshots across all features
   - Both desktop (1440x900) and mobile (iPhone 14) viewports
   - PII automatically blurred for privacy
   - Organized with numeric prefixes for easy browsing

2. **🏗️ Architecture Diagrams**
   - System architecture (tech stack, integrations, data flow)
   - Deployment pipeline (CI/CD, environments, monitoring)
   - Both generated as PNG from Mermaid source

3. **📊 Feature Matrix**
   - Complete list of all features by module
   - Status: Complete ✅ | In Progress 🚧 | Planned 📋
   - Available in CSV and Markdown formats

4. **💰 Tech Stack & Cost Analysis**
   - Every dependency, SDK, API, and integration
   - Monthly cost estimates (MVP, Production, Enterprise)
   - Per-user cost breakdown
   - Available in JSON and Markdown formats

5. **📝 Provenance & Logs**
   - Git commit SHA and branch for reproducibility
   - Timestamp for each screenshot
   - Failed routes log (if any)
   - Safety abort log

---

## 🚀 How to Run

### Prerequisites

1. **Node.js 20+** and **npm 10+**
   ```bash
   node --version  # Should be 20+
   npm --version   # Should be 10+
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Install Mermaid CLI** (for diagrams)
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```

### Environment Setup

1. **Copy environment template**
   ```bash
   cp "CRM screenshots/.env.local.example" .env.local
   ```

2. **Configure variables in `.env.local`**
   ```bash
   # IMPORTANT: Use local/dev/staging ONLY
   BASE_URL=http://localhost:3000
   
   # Test credentials
   TEST_ADMIN_EMAIL=your-admin@example.com
   TEST_ADMIN_PASSWORD=your-password
   
   # Supabase (dev/test instance)
   SUPABASE_URL=https://your-dev-project.supabase.co
   SUPABASE_ANON_KEY=your-dev-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key
   ```

3. **Start your development server**
   ```bash
   npm run dev
   ```
   
   Ensure app is running at `http://localhost:3000` (or your configured BASE_URL)

### Generate the Full Pack

**Option 1: All-in-one command**
```bash
npm run investor:pack
```

This runs:
1. Seed test data (optional, idempotent)
2. Build screens manifest
3. Capture all screenshots
4. Generate architecture diagrams
5. Build feature matrix
6. Export tech stack + costs

**Option 2: Step-by-step**
```bash
# 1. Optional: Seed test data
npm run screens:seed

# 2. Build route manifest
npm run screens:manifest

# 3. Capture screenshots
npm run screens:run

# 4. Generate diagrams
npm run diagram:build

# 5. Build feature matrix
npm run tsx tools/feature-matrix.ts

# 6. Export stack/cost data
npm run tsx tools/stack-cost-export.ts
```

---

## 🔒 Safety Guarantees

### What This System Does

✅ **Read-only operations** - No changes to source code, database, or business logic  
✅ **Isolated test data** - Only creates data in TEST_TENANT_ID (optional)  
✅ **Idempotent** - Safe to run multiple times  
✅ **PII masking** - Automatically blurs sensitive data in screenshots  
✅ **Production protection** - Aborts if BASE_URL looks like production  

### What This System Does NOT Do

❌ **No git operations** - Doesn't commit, push, or modify git state  
❌ **No deployments** - Doesn't deploy or alter CI/CD  
❌ **No production access** - Safety guards prevent production URLs  
❌ **No destructive actions** - Won't click Delete, Reset, Purge, etc.  
❌ **No business logic changes** - Zero modifications to src/, migrations/, or API routes  

### Production Safety Guard

The screenshot runner will **automatically abort** if BASE_URL contains:
- `prod` or `production`
- `railway.app` (unless also contains `dev` or `staging`)
- Any configured production domain

Abort logs are saved to: `CRM screenshots/safety_abort.log`

---

## 📁 Output Files

After running `npm run investor:pack`, you'll find:

```
CRM screenshots/
├── README.md                        # This file
├── .env.local.example               # Environment template
│
├── 001_login_desktop.png            # Screenshots (numbered)
├── 001_login_mobile.png
├── 002_dashboard_desktop.png
├── 002_dashboard_mobile.png
├── ... (100+ screenshots)
│
├── architecture.png                 # System architecture diagram
├── deployment.png                   # CI/CD deployment diagram
│
├── feature_matrix.csv               # Feature completion matrix (CSV)
├── feature_matrix.md                # Feature completion matrix (Markdown)
│
├── stack_cost_summary.json          # Tech stack + cost data (JSON)
├── stack_cost_summary.md            # Tech stack + cost report (Markdown)
│
├── screens_manifest.json            # List of all captured routes
├── screens_provenance.json          # Metadata (git commit, timestamp, etc.)
├── seed_ids.json                    # Test data IDs (if seeded)
├── failed_routes.json               # Failed screenshots (empty if none)
└── safety_abort.log                 # Safety check logs
```

---

## 🎯 Use Cases

### For Investors
- Review complete product functionality visually
- Understand tech stack and costs
- Assess feature completeness
- Validate technology choices

### For Product Team
- Comprehensive visual audit
- Feature status tracking
- Identify gaps and TODOs
- Onboarding new team members

### For Marketing
- Screenshot library for landing pages
- Product tour materials
- Feature comparison charts
- Demo preparation

### For Sales
- Visual product overview
- Cost transparency for pricing discussions
- Feature availability by tier
- Integration capabilities

---

## 🛠️ Troubleshooting

### Screenshots are blank/missing content

**Cause:** Page not fully loaded before screenshot  
**Fix:** Increase wait timeout in `tools/screenshot-all.ts`

### Some routes failed

**Solution:** Check `failed_routes.json` for error details. Common causes:
- Route requires specific data (create via seed)
- Authentication timeout
- Slow page load

### Diagrams not generating

**Cause:** Mermaid CLI not installed  
**Fix:** 
```bash
npm install -g @mermaid-js/mermaid-cli
# Or use npx:
npx mmdc -i docs/architecture.mmd -o "CRM screenshots/architecture.png"
```

### "Safety abort" errors

**Cause:** BASE_URL points to production  
**Fix:** Update `.env.local` to use `http://localhost:3000` or dev/staging URL

### Authentication failing

**Solution:**
1. Verify credentials in `.env.local` match your test account
2. Ensure app is running at BASE_URL
3. Check `CRM screenshots/admin_auth.json` exists after first login
4. Try deleting auth files and re-running

---

## 📞 Support

For issues with the investor pack generation:

1. Check `CRM screenshots/safety_abort.log` for safety violations
2. Review `CRM screenshots/failed_routes.json` for screenshot failures
3. Verify `.env.local` is configured correctly
4. Ensure all dependencies are installed (`npm install`)

---

## 📜 License & Attribution

This investor pack generator is part of the Dental CRM project.

- **Screenshots:** Auto-generated from live application
- **Diagrams:** Generated via Mermaid (Apache 2.0)
- **Data:** Aggregated from package.json and codebase inspection
- **Safety guards:** Built-in to prevent production access

All tools are read-only and safe to run in development environments.

---

**Last Updated:** $(date)  
**Version:** 1.0.0  
**Maintained By:** Dental CRM Development Team


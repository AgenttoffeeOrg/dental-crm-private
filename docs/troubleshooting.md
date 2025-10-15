# Marketing Audit Module - Troubleshooting Guide

## Common Issues and Solutions

---

## 🔴 Audit Fails to Run

### Symptom:
Click "Run Audit" but get an error or audit never completes.

### Solutions:

**1. Check Practice Domain**
- Go to Settings → Practice Information
- Ensure website URL is filled in
- Format: `yourpractice.com` (no https://)

**2. Check API Keys**
- Verify `.env.local` has `GOOGLE_API_KEY`
- Test key: `curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://google.com&key=YOUR_KEY"`
- If error: regenerate key in Google Cloud Console

**3. Check Database**
- Run: `SELECT * FROM marketing_audit_runs WHERE status = 'failed'`
- Check `error_message` column for details

**4. Check Logs**
- Open browser console (F12)
- Look for [Orchestrator] errors
- Check Network tab for failed API calls

---

## 🔴 Scores Show as 0 or Null

### Symptom:
Audit completes but all scores are 0 or null.

### Solutions:

**1. Check API Responses**
- Verify Google APIs are returning data
- Test PageSpeed Insights manually
- Ensure domain is accessible (not behind firewall/password)

**2. OAuth Not Connected**
- Some metrics require GA4/GSC connection
- Go to Marketing Audit → Connect Google Account
- Authorize access
- Re-run audit

**3. Practice Info Missing**
- Add practice latitude/longitude (for competitor discovery)
- Add Google Place ID (Settings → Practice)
- Add GA4 Property ID (if you have Analytics)

---

## 🔴 OAuth Flow Fails

### Symptom:
"Connect Google Account" button doesn't work or returns error.

### Solutions:

**1. Check OAuth Credentials**
```env
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

**2. Check Redirect URI**
- Must match exactly in Google Cloud Console
- Include: `http://localhost:3000/api/marketing-audit/oauth/google/callback`
- Include: `https://yourdomain.com/api/marketing-audit/oauth/google/callback`

**3. OAuth Consent Screen**
- Ensure it's configured in Google Cloud
- Add required scopes (webmasters.readonly, analytics.readonly)
- Publish if using "External" type

**4. Clear Browser Cache**
- Try in incognito window
- Clear cookies for accounts.google.com
- Try different browser

---

## 🔴 No Competitors Found

### Symptom:
Competitor section shows 0 competitors.

### Solutions:

**1. Add Practice Location**
- Go to Settings → Practice Information
- Add full address
- System will geocode to get lat/lng

**2. Add Google Place ID**
- Find your practice on Google Maps
- Extract Place ID from URL or use Place ID Finder
- Add to practice settings

**3. Check Category**
- Ensure practice category is set correctly
- Should be: "dentist", "orthodontist", etc.
- Matches Google Places categories

---

## 🔴 Recommendations Don't Create Tasks

### Symptom:
Click "Create Task" but nothing happens.

### Solutions:

**1. Check Permissions**
- User must have task creation permissions
- Verify in Settings → Users → Permissions

**2. Check Console**
- Look for JavaScript errors
- Check API response in Network tab

**3. Verify Tasks Module**
- Go to Tasks page
- Verify it loads correctly
- Test creating a task manually

---

## 🔴 Sidebar Doesn't Show "Marketing Audit"

### Symptom:
Marketing Audit tab not visible in navigation.

### Solutions:

**1. Enable Feature Flag**
```env
NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true
```

**2. Restart Dev Server**
```bash
npm run dev
```

**3. Clear Browser Cache**
- Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or clear site data in DevTools

---

## 🔴 Scores Don't Update After Changes

### Symptom:
Made improvements but score stays the same.

### Solutions:

**1. Wait for Google to Re-Crawl**
- Technical changes take 7-14 days to reflect
- Force re-index in Search Console

**2. Run New Audit**
- Old audit data is cached
- Click "Run New Audit" to get fresh data

**3. Clear Cache**
- Audit results are not cached
- But API responses might be (1 hour)

---

## 🔴 Rate Limit Errors

### Symptom:
"Rate limit exceeded" error when running audit.

### Solutions:

**1. Wait for Reset**
- Error message shows reset time
- Usually 1 minute to 24 hours depending on API

**2. Reduce Audit Frequency**
- Don't run audits more than once per day
- Use scheduled audits (weekly/monthly)

**3. Upgrade API Quota**
- Go to Google Cloud Console → Quotas
- Request quota increase (usually approved within 24 hours)

---

## 🔴 Database Errors

### Symptom:
"RLS policy violation" or "Permission denied"

### Solutions:

**1. Verify RLS Policies**
```sql
SELECT * FROM marketing_audit_runs WHERE tenant_id = current_setting('app.current_tenant_id')::UUID;
```

**2. Check Tenant ID**
- Ensure user has app_user record
- Ensure practice has correct tenant_id

**3. Re-run Migration**
- Sometimes RLS policies don't apply correctly
- Drop and recreate tables (dev only!)

---

## 🔴 Slow Performance

### Symptom:
Audit takes >5 minutes or dashboard loads slowly.

### Solutions:

**1. Check API Response Times**
- PageSpeed Insights can be slow (90-120s)
- Search Console can timeout
- Use demo data for testing

**2. Optimize Database**
```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_audit_runs_completed ON marketing_audit_runs(completed_at DESC);
```

**3. Enable Caching** (Phase 2)
- Implement Redis caching
- Cache competitor data (24 hours)
- Cache API responses (1 hour)

---

## 🔴 Mobile Display Issues

### Symptom:
UI breaks or looks bad on mobile.

### Solutions:

**1. Clear Mobile Cache**
- Safari: Settings → Safari → Clear History
- Chrome: Settings → Privacy → Clear Browsing Data

**2. Test Responsive**
- Chrome DevTools → Toggle Device Toolbar
- Test on real device if possible

**3. Check Viewport**
- Ensure viewport meta tag in layout
- Test different screen sizes (iPhone SE, iPad)

---

## 🔴 Dark Mode Issues

### Symptom:
Colors look wrong in dark mode.

### Solutions:

**1. Check Theme**
- Verify dark mode is enabled system-wide
- Toggle dark mode in app settings

**2. Missing Dark Classes**
- All components should have `dark:` variants
- Report missing dark mode styles

---

## 🟡 Warning: API Costs Higher Than Expected

### Symptom:
Google Cloud billing shows high charges.

### Solutions:

**1. Check Usage**
- Go to Google Cloud → Billing → Reports
- Identify which API is expensive (usually Places)

**2. Optimize API Calls**
- Cache competitor data (don't re-fetch every audit)
- Reduce competitor count from 20 to 10
- Run audits less frequently

**3. Set Billing Alerts**
- Google Cloud → Billing → Budgets & alerts
- Set alert at $50/month
- Get notified before costs spike

---

## 🟢 Best Practices

### To Avoid Issues:

**1. Run Audits Sparingly**
- Weekly or monthly is sufficient
- Don't run multiple audits per hour

**2. Use Scheduled Audits**
- Set up weekly schedule
- Automated, consistent data

**3. Monitor Logs**
- Check logs daily for errors
- Fix issues proactively

**4. Keep APIs Updated**
- Google APIs change occasionally
- Update connectors when breaking changes happen

**5. Test in Staging First**
- Use demo data for development
- Test real APIs in staging
- Deploy to production after validation

---

## 📞 Getting Help

### Before Contacting Support:

1. Check browser console for errors
2. Check API logs for failed requests
3. Verify all environment variables are set
4. Try in incognito window
5. Test with demo data

### When Contacting Support:

Include:
- Error message (exact text)
- Audit ID (if applicable)
- Browser and version
- Steps to reproduce
- Screenshot of issue
- Console logs (F12 → Console → copy)

### Support Channels:
- 📧 Email: support@dentalcrm.com
- 💬 In-app chat
- 📚 Documentation: /docs
- 🐛 Bug reports: GitHub Issues

---

**Most issues are resolved within 24 hours!** 🎯


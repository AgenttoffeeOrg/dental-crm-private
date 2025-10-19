# 🔧 Troubleshooting Guide: Universal Treatment Tag Routing System

**Version:** 1.0.0  
**Last Updated:** October 19, 2025  
**Audience:** Administrators, Developers, Support Engineers  

---

## 🎯 Overview

This comprehensive troubleshooting guide helps you diagnose and resolve common issues with the Universal Treatment Tag Routing System. Issues are organized by category with step-by-step solutions.

---

## 📋 Quick Diagnostic Checklist

Before diving into specific issues, run through this checklist:

- [ ] Is routing enabled for the tenant? (Check Settings → Treatment Routing)
- [ ] Are there active treatment tags configured?
- [ ] Are tags mapped to pipelines?
- [ ] Is the Unsorted pipeline configured?
- [ ] Does the user have correct permissions?
- [ ] Are there any database connection errors?
- [ ] Check browser console for JavaScript errors
- [ ] Check server logs for backend errors

---

## 🚨 Common Issues & Solutions

### Issue 1: Deals Not Routing Automatically

**Symptoms:**
- All deals go to Unsorted pipeline
- Manual pipeline selection always required
- Routing appears disabled

**Possible Causes:**

#### Cause A: Routing Disabled for Tenant

**Diagnosis:**
```sql
SELECT routing_enabled 
FROM treatment_routing_settings 
WHERE tenant_id = 'YOUR-TENANT-ID';
```

**Solution:**
1. Go to **Settings → Treatment Routing**
2. Check **"Enable Automatic Routing"** toggle
3. Click **Save Changes**
4. Test with a new deal

---

#### Cause B: No Treatment Tags Configured

**Diagnosis:**
```sql
SELECT COUNT(*) 
FROM treatment_tags 
WHERE tenant_id = 'YOUR-TENANT-ID' 
  AND is_active = true;
```

If count = 0, you have no active tags.

**Solution:**
1. Go to **Settings → Treatment Routing → Treatment Tags**
2. Click **"Create New Tag"**
3. Follow [Tag Setup Guide](../user-guides/how-to-set-up-treatment-tags.md)
4. Create at least 5-10 core tags

---

#### Cause C: Tags Not Mapped to Pipelines

**Diagnosis:**
```sql
SELECT t.name as tag_name, 
       COUNT(m.id) as mapping_count
FROM treatment_tags t
LEFT JOIN treatment_tag_pipeline_mappings m ON t.id = m.treatment_tag_id
WHERE t.tenant_id = 'YOUR-TENANT-ID' 
  AND t.is_active = true
GROUP BY t.id, t.name;
```

Tags with `mapping_count = 0` are unmapped.

**Solution:**
1. Go to **Settings → Treatment Routing → Pipeline Mapping**
2. Look for red warning badges on unmapped tags
3. Click **"Create Mapping"** for each unmapped tag
4. Follow [Mapping Guide](../user-guides/how-to-map-tags-to-pipelines.md)

---

#### Cause D: Unsorted Pipeline Not Configured

**Diagnosis:**
```sql
SELECT unsorted_pipeline_id 
FROM treatment_routing_settings 
WHERE tenant_id = 'YOUR-TENANT-ID';
```

If NULL, unsorted pipeline not set.

**Solution:**
1. Go to **Settings → Treatment Routing → Pipeline Mapping**
2. Find **"Unsorted Pipeline Configuration"** section
3. Select default pipeline for unmatched deals
4. Select default stage
5. Click **Save**

---

### Issue 2: Wrong Pipeline Selected

**Symptoms:**
- Deals route to incorrect pipeline
- High-value deals in general pipeline
- General inquiries in specialist pipeline

**Possible Causes:**

#### Cause A: Keyword Matching Too Broad

**Example:**
```
Tag: dental_implant
Keywords: tooth, dental

Problem: Matches EVERYTHING with "tooth" or "dental"
```

**Solution:**
1. Go to **Treatment Tags** settings
2. Edit the problematic tag
3. Make keywords more specific:
   ```
   ❌ BAD: tooth, dental
   ✅ GOOD: dental implant, implants, tooth implant, 
            implant surgery, tooth replacement
   ```
4. Use multi-word phrases instead of single words
5. Test with sample deals

---

#### Cause B: Priority Not Set Correctly

**Example:**
```
Scenario: Patient mentions "crown for implant"
Matches: crown (Priority 5) and dental_implant (Priority 5)

Problem: First match wins (crown), not highest value (implant)
```

**Solution:**
1. Go to **Pipeline Mapping** settings
2. Adjust priorities based on value:
   ```
   dental_implant: Priority 1 (highest)
   full_arch: Priority 1
   crown: Priority 2
   whitening: Priority 3
   ```
3. Higher-value treatments should have Priority 1
4. Test with deals that match multiple tags

---

#### Cause C: Multiple Conflicting Mappings

**Diagnosis:**
```sql
SELECT tt.name, 
       m.pipeline_id, 
       p.name as pipeline_name,
       m.priority
FROM treatment_tag_pipeline_mappings m
JOIN treatment_tags tt ON m.treatment_tag_id = tt.id
JOIN pipelines p ON m.pipeline_id = p.id
WHERE tt.tenant_id = 'YOUR-TENANT-ID'
  AND tt.name = 'dental_implant'
ORDER BY m.priority;
```

If one tag has multiple mappings with same priority = conflict.

**Solution:**
1. Keep ONE mapping per tag (recommended)
2. OR ensure different priorities if multiple mappings exist
3. OR use location-specific mappings to differentiate

---

### Issue 3: Low Confidence Scores

**Symptoms:**
- Confidence scores consistently below 70%
- System unsure about routing decisions
- Many deals requiring manual review

**Possible Causes:**

#### Cause A: Keywords Don't Match Patient Language

**Example:**
```
Tag: orthodontics
Keywords: orthodontic treatment, orthodontia, ortho

Patient says: "I need braces" or "Invisalign"

Problem: Keyword mismatch = low confidence
```

**Solution:**
1. Review routing logs for low-confidence deals
2. Note common patient phrases
3. Add patient-friendly keywords:
   ```
   orthodontics keywords:
   - orthodontic treatment (technical)
   - braces (patient language)
   - invisalign (brand)
   - clear aligners (descriptive)
   - straighten teeth (goal-based)
   - crooked teeth (problem-based)
   ```
4. Test with real patient inquiries

---

#### Cause B: Too Few Keywords Per Tag

**Diagnosis:**
```sql
SELECT name, 
       array_length(keywords, 1) as keyword_count
FROM treatment_tags
WHERE tenant_id = 'YOUR-TENANT-ID'
  AND is_active = true
ORDER BY keyword_count ASC;
```

Tags with < 5 keywords likely need more.

**Solution:**
1. Aim for 8-12 keywords per tag
2. Include variations:
   - Technical terms: "dental implant"
   - Patient terms: "fake tooth", "permanent tooth"
   - Misspellings: "implent", "implannt"
   - Plural forms: "implant" AND "implants"
3. Test and iterate

---

### Issue 4: Deals Stuck in Unsorted Pipeline

**Symptoms:**
- 20%+ of deals in Unsorted pipeline
- Constant manual re-routing required
- Team overwhelmed

**Diagnostic Steps:**

**Step 1: Review Unsorted Deals**
```sql
SELECT title, description, treatment_tags
FROM deals
WHERE pipeline_id = (
  SELECT unsorted_pipeline_id 
  FROM treatment_routing_settings 
  WHERE tenant_id = 'YOUR-TENANT-ID'
)
ORDER BY created_at DESC
LIMIT 50;
```

**Step 2: Identify Patterns**
Look for common phrases or themes.

**Step 3: Check Routing Logs**
```sql
SELECT reason, COUNT(*) as count
FROM treatment_routing_logs
WHERE routing_method = 'unsorted_fallback'
  AND tenant_id = 'YOUR-TENANT-ID'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY reason
ORDER BY count DESC;
```

**Common Patterns & Solutions:**

| Pattern | Solution |
|---------|----------|
| "No treatment tags identified" | Add AI keyword extraction |
| "Tag 'X' not mapped to pipeline" | Create mapping for tag X |
| "Keywords too narrow" | Add more keyword variations |
| "New service not tagged" | Create new tag for service |

---

### Issue 5: Permission Errors

**Symptoms:**
- "Access Denied" when configuring routing
- Can't create/edit tags or mappings
- Settings not saving

**Solution:**

**Step 1: Check User Role**
```sql
SELECT r.name as role_name, r.permissions
FROM app_users u
JOIN custom_roles r ON u.role_id = r.id
WHERE u.id = 'USER-ID';
```

**Step 2: Verify Required Permissions**

User needs ALL of these permissions:
- `treatment_tags.view`
- `treatment_tags.create`
- `treatment_tags.update`
- `treatment_tag_pipeline_mappings.view`
- `treatment_tag_pipeline_mappings.create`
- `treatment_tag_pipeline_mappings.update`
- `treatment_routing_settings.view`
- `treatment_routing_settings.update`

**Step 3: Grant Permissions**
1. Go to **Settings → Team → Roles**
2. Edit user's role
3. Check all required Treatment Routing permissions
4. Save and have user log out/in

---

### Issue 6: Slow Routing Performance

**Symptoms:**
- Deal creation takes >5 seconds
- Timeout errors
- UI feels sluggish

**Possible Causes:**

#### Cause A: Too Many Tags

**Diagnosis:**
```sql
SELECT COUNT(*) FROM treatment_tags 
WHERE tenant_id = 'YOUR-TENANT-ID' AND is_active = true;
```

If count > 50, system may be slow.

**Solution:**
1. Consolidate similar tags
2. Deactivate unused tags (don't delete)
3. Aim for 15-25 active tags

---

#### Cause B: Complex Keywords

**Diagnosis:**
Check for extremely long keywords or regex patterns.

**Solution:**
1. Keep keywords under 4 words
2. Avoid special characters
3. Don't use regex in keywords (system doesn't support it)

---

#### Cause C: Database Performance

**Diagnosis:**
```sql
EXPLAIN ANALYZE
SELECT * FROM treatment_tags
WHERE tenant_id = 'YOUR-TENANT-ID'
  AND is_active = true;
```

Look for sequential scans (bad) vs index scans (good).

**Solution:**
1. Ensure indexes are created (run migration script)
2. Run `VACUUM ANALYZE` on tables
3. Contact support if issue persists

---

### Issue 7: Multi-Location Conflicts

**Symptoms:**
- Wrong location receiving deals
- Location filters not working
- Deals routing to all locations

**Solution:**

**Step 1: Verify Location Setup**
```sql
SELECT id, name, is_multi_location
FROM tenants
WHERE id = 'YOUR-TENANT-ID';
```

**Step 2: Check Tag Location Scope**
```sql
SELECT name, location_id
FROM treatment_tags
WHERE tenant_id = 'YOUR-TENANT-ID'
  AND is_active = true;
```

Tags with `location_id = NULL` are global (all locations).

**Step 3: Fix Location Mappings**
1. Go to **Treatment Tags** settings
2. Edit each tag
3. Set **Location** to specific location OR "All Locations"
4. For location-specific services:
   ```
   Tag: downtown_specialist
   Location: Downtown Office
   
   Tag: suburban_general
   Location: Suburban Office
   ```

---

### Issue 8: Marketing Form Integration

**Symptoms:**
- Form submissions not routing
- Tags not extracted from forms
- All form leads in Unsorted

**Solution:**

**Step 1: Verify Form Has Treatment Tags Field**
1. Go to **Marketing → Forms**
2. Edit form
3. Check if "Treatment Tags" field exists
4. If not, add it: Click **"Add Field" → "Treatment Tags"**

**Step 2: Check Form Processor**
```typescript
// In form processor code
const treatmentTags = submission.payload.treatment_tags || []

if (treatmentTags.length === 0) {
  // AI extraction should kick in
  const extraction = await extractTagsFromDealText(...)
  treatmentTags = extraction.extractedTags
}
```

**Step 3: Test Form Submission**
1. Submit test form with known treatment
2. Check created deal's `treatment_tags` field
3. Check `routing_logs` table for entry
4. Debug based on routing_method and reason

---

### Issue 9: PMS Integration Issues

**Symptoms:**
- PMS treatments not creating deals
- Deals created but not routed
- Procedure codes not mapping to tags

**Solution:**

**Step 1: Check PMS Procedure Mappings**
```sql
SELECT procedure_code, treatment_tag_name
FROM pms_procedure_tag_mappings
WHERE tenant_id = 'YOUR-TENANT-ID'
ORDER BY procedure_code;
```

If empty, no mappings exist.

**Step 2: Create Procedure Mappings**
1. Go to **Settings → Integrations → PMS Settings**
2. Navigate to **"Procedure Code Mappings"** tab
3. Add mappings:
   ```
   D6010 (Implant) → dental_implant
   D2740 (Crown) → crown
   D9110 (Emergency) → emergency
   ```
4. Save changes

**Step 3: Test PMS Webhook**
```bash
curl -X POST https://your-domain.com/api/integrations/pms/webhooks/treatment-proposed \
  -H "Content-Type: application/json" \
  -d '{
    "provider_name": "Dentrix",
    "patient_id": "12345",
    "treatment_type": "Dental Implant",
    "procedure_codes": ["D6010"],
    "description": "Single implant placement"
  }'
```

Check response and logs.

---

### Issue 10: Bulk Re-Routing Failures

**Symptoms:**
- Bulk re-route operation fails
- Some deals re-routed, others not
- Timeout errors

**Solution:**

**Step 1: Check Deal Count**
Bulk operations limited to 1000 deals at a time.

**Step 2: Use Dry-Run First**
```typescript
// Always test with dry-run
await fetch('/api/treatment-routing/bulk-reroute', {
  method: 'POST',
  body: JSON.stringify({
    dealIds: selectedDeals,
    dryRun: true // Preview changes
  })
})
```

**Step 3: Batch Large Operations**
```typescript
// For >1000 deals, batch in chunks
const BATCH_SIZE = 500
for (let i = 0; i < dealIds.length; i += BATCH_SIZE) {
  const batch = dealIds.slice(i, i + BATCH_SIZE)
  await rerouteBatch(batch)
  await sleep(1000) // Rate limiting
}
```

---

## 🔍 Advanced Debugging

### Enable Debug Logging

**Client-Side (Browser Console):**
```javascript
localStorage.setItem('DEBUG_ROUTING', 'true')
```

**Server-Side (Environment Variable):**
```bash
DEBUG_ROUTING=true npm run dev
```

### View Routing Logs

**Via Database:**
```sql
SELECT 
  created_at,
  deal_id,
  treatment_tags,
  routing_method,
  confidence_score,
  reason,
  metadata
FROM treatment_routing_logs
WHERE tenant_id = 'YOUR-TENANT-ID'
ORDER BY created_at DESC
LIMIT 100;
```

**Via UI:**
1. Go to **Settings → Treatment Routing → Routing Analytics**
2. Scroll to **"Routing Logs"** section
3. Filter by date, tag, pipeline, method
4. Click log entry for full details

### Test Routing Manually

```typescript
// In browser console
import { routeDealWithAdapter } from '@/lib/treatment-routing'

const result = await routeDealWithAdapter({
  tenantId: 'YOUR-TENANT-ID',
  contactId: 'CONTACT-ID',
  dealTitle: 'Patient needs dental implants',
  dealDescription: 'Full arch reconstruction',
  treatmentTags: ['dental_implant'],
  source: 'manual_test'
})

console.log(result)
```

---

## 🚑 Emergency Procedures

### System Down: Routing Completely Broken

**Immediate Workaround:**

**Option 1: Disable Routing Temporarily**
```sql
UPDATE treatment_routing_settings
SET routing_enabled = false
WHERE tenant_id = 'YOUR-TENANT-ID';
```

All deals will require manual pipeline selection.

**Option 2: Route All to Default**
```typescript
// In code, bypass routing engine
async function createDealEmergency(dealData) {
  const defaultPipeline = await getDefaultPipeline()
  
  return createDeal({
    ...dealData,
    pipeline_id: defaultPipeline.id,
    stage_id: defaultPipeline.stages[0].id
  })
}
```

**Option 3: Rollback Database Migration**
```bash
cd supabase/sql
psql -h YOUR-DB-HOST -U postgres -d YOUR-DB -f rollback_45_treatment_routing.sql
```

---

## 📊 Health Check Commands

### Quick System Check

```sql
-- 1. Check routing enabled
SELECT routing_enabled FROM treatment_routing_settings WHERE tenant_id = 'YOUR-TENANT-ID';

-- 2. Count active tags
SELECT COUNT(*) FROM treatment_tags WHERE tenant_id = 'YOUR-TENANT-ID' AND is_active = true;

-- 3. Count mappings
SELECT COUNT(*) FROM treatment_tag_pipeline_mappings WHERE tenant_id = 'YOUR-TENANT-ID' AND is_active = true;

-- 4. Check unsorted pipeline
SELECT unsorted_pipeline_id FROM treatment_routing_settings WHERE tenant_id = 'YOUR-TENANT-ID';

-- 5. Recent routing activity
SELECT COUNT(*), routing_method 
FROM treatment_routing_logs 
WHERE tenant_id = 'YOUR-TENANT-ID' 
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY routing_method;

-- 6. Routing accuracy (last 100 deals)
SELECT 
  routing_method,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) as count
FROM treatment_routing_logs
WHERE tenant_id = 'YOUR-TENANT-ID'
ORDER BY created_at DESC
LIMIT 100
GROUP BY routing_method;
```

---

## 📞 When to Contact Support

Contact support if:

- ✅ You've tried all troubleshooting steps
- ✅ Issue affects multiple tenants
- ✅ Database corruption suspected
- ✅ Performance degradation system-wide
- ✅ Security concern (permissions bypassed)
- ✅ Data loss or corruption

**What to Include:**

1. **Tenant ID**
2. **Issue description**
3. **Steps to reproduce**
4. **Screenshots/recordings**
5. **Error messages** (full stack trace)
6. **Routing logs** (affected deal IDs)
7. **Browser/environment info**

---

## 🔗 Related Resources

- [Tag Setup Guide](../user-guides/how-to-set-up-treatment-tags.md)
- [Pipeline Mapping Guide](../user-guides/how-to-map-tags-to-pipelines.md)
- [Routing Analytics Guide](../user-guides/understanding-routing-analytics.md)
- [API Documentation](./routing-engine-api.md)
- [Adapter Pattern Guide](./adapter-integration-pattern.md)

---

## Need Help?

- 📧 **Email:** support@dentalcrm.com
- 💬 **Live Chat:** Click chat icon in bottom right
- 📚 **Knowledge Base:** help.dentalcrm.com
- 📞 **Phone:** 1-800-DENTAL-CRM
- 🐛 **Bug Reports:** github.com/dentalcrm/issues

---

*Last Updated: October 19, 2025*  
*Version: 1.0.0*  
*© 2025 Dental CRM. All rights reserved.*


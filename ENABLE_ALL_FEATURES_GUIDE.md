# 🎛️ ENABLE ALL FEATURES BY DEFAULT - QUICK GUIDE

**Purpose:** Turn ON all 10 premium features automatically for easy testing

---

## 🚀 **STEP 1: RUN THE MIGRATION**

### **Copy this SQL:**

Open Supabase SQL Editor and paste:

```sql
-- 65_enable_all_features_default.sql
-- Enable ALL features by default for ALL tenants (for testing purposes)

-- Enable all features for all existing tenants
INSERT INTO tenant_feature_flags (tenant_id, feature_key, is_enabled)
SELECT 
    t.id as tenant_id,
    fd.feature_key,
    true as is_enabled
FROM tenants t
CROSS JOIN feature_definitions fd
ON CONFLICT (tenant_id, feature_key) 
DO UPDATE SET 
    is_enabled = true,
    updated_at = NOW();

-- Update the default value for future inserts
ALTER TABLE tenant_feature_flags 
ALTER COLUMN is_enabled SET DEFAULT true;

COMMENT ON TABLE tenant_feature_flags IS 'Feature flags per tenant - ALL ENABLED BY DEFAULT for testing';
```

Click **RUN**

---

## ✅ **STEP 2: VERIFY IT WORKED**

### **Check what's enabled:**

Run this query:

```sql
SELECT 
    t.name as tenant_name,
    fd.feature_name,
    fd.plan_tier_required,
    COALESCE(tff.is_enabled, false) as is_enabled
FROM tenants t
CROSS JOIN feature_definitions fd
LEFT JOIN tenant_feature_flags tff ON t.id = tff.tenant_id AND fd.feature_key = tff.feature_key
ORDER BY t.name, fd.feature_name;
```

**Expected result:**
- All features show `is_enabled = true` ✅
- Should see 10 features per tenant
- All should be ON

---

## 🎯 **STEP 3: TEST IN THE APP**

### **1. Go to Marketing Settings:**
```
http://localhost:3000/settings/marketing
```

### **2. Click "Features" tab**

### **3. What you'll see:**
- ✅ All 10 features listed
- ✅ All toggle switches showing **ON** (green/checked)
- ✅ No lock icons (everything accessible)
- ✅ You can toggle OFF if you want (but they start ON)

---

## 📋 **ALL 10 FEATURES NOW AUTO-ENABLED**

### **ENTERPRISE Features ($99/mo):**
1. ✅ Email Warmup Automation - **ON by default**
2. ✅ AI Send Time Optimization - **ON by default**

### **PRO Features ($29/mo):**
3. ✅ Click Heatmaps - **ON by default**
4. ✅ Dynamic Content Blocks - **ON by default**
5. ✅ Social Media Publishing - **ON by default**
6. ✅ Advanced Analytics - **ON by default**
7. ✅ Automation Journeys - **ON by default**
8. ✅ WhatsApp Campaigns - **ON by default**

### **STARTER Features (Free):**
9. ✅ Basic Campaigns - **ON by default**
10. ✅ A/B Testing - **ON by default**

---

## 🔄 **WHAT THIS CHANGES**

### **Before:**
- Features started OFF (disabled)
- Had to manually toggle each one ON
- Needed to enable 10 features to test everything

### **After:**
- All features start ON (enabled)
- No manual toggling needed
- Can immediately test all features
- Can still toggle OFF if you want

---

## 💡 **HOW IT WORKS**

### **For existing tenants:**
```sql
INSERT INTO tenant_feature_flags (tenant_id, feature_key, is_enabled)
SELECT t.id, fd.feature_key, true
FROM tenants t
CROSS JOIN feature_definitions fd
ON CONFLICT (tenant_id, feature_key) 
DO UPDATE SET is_enabled = true;
```
- Takes all tenants
- Crosses with all features
- Sets `is_enabled = true`
- Updates if already exists

### **For new tenants:**
```sql
ALTER TABLE tenant_feature_flags 
ALTER COLUMN is_enabled SET DEFAULT true;
```
- Changes default value to `true`
- Any new feature flag created starts ON
- Works for future tenants automatically

---

## 🧪 **TESTING SCENARIOS**

### **Test 1: All features visible**
1. Go to `/settings/marketing` → Features tab
2. Should see all 10 features
3. All toggles should be ON (green)
4. No lock icons

### **Test 2: Toggle OFF works**
1. Click any toggle switch
2. It should turn OFF (gray)
3. Refresh page
4. Should still be OFF (state saved)

### **Test 3: Toggle ON works**
1. Click the OFF toggle again
2. It should turn ON (green)
3. Refresh page
4. Should still be ON

### **Test 4: Feature Gate components**
```tsx
<FeatureGate featureKey="click_heatmaps">
  <HeatmapViewer />
</FeatureGate>
```
- Should show the component (not upgrade prompt)
- Because feature is enabled by default

---

## 🔙 **TO REVERT (If Needed)**

If you want to go back to features starting OFF:

```sql
-- Disable all features
UPDATE tenant_feature_flags 
SET is_enabled = false;

-- Change default back to false
ALTER TABLE tenant_feature_flags 
ALTER COLUMN is_enabled SET DEFAULT false;
```

---

## ⚠️ **PRODUCTION CONSIDERATIONS**

**For production deployment:**

This is **testing mode**. In production, you might want:

1. **Starter plan:** Only Basic Campaigns + A/B Testing enabled
2. **Pro plan:** Enable 8 features (all Pro + Starter)
3. **Enterprise plan:** Enable all 10 features

**To implement plan-based defaults:**
```sql
-- Example: Enable only starter features by default
INSERT INTO tenant_feature_flags (tenant_id, feature_key, is_enabled)
SELECT t.id, fd.feature_key, true
FROM tenants t
CROSS JOIN feature_definitions fd
WHERE fd.plan_tier_required = 'starter';
```

But for **now (testing)**, keeping everything ON is perfect!

---

## ✅ **SUMMARY**

**What you get:**
- ✅ All 10 features enabled by default
- ✅ All toggles show as ON
- ✅ No manual toggling needed
- ✅ Can test everything immediately
- ✅ Can still toggle OFF if you want
- ✅ Works for existing and new tenants

**Status:** Ready to test! Just run migration 65 and refresh `/settings/marketing`

---

**🎉 YOU'RE ALL SET FOR TESTING!**

Run the migration and every single feature will be turned ON by default!


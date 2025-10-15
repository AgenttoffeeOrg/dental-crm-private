# 🚀 MARKETING MODULE QUICK START GUIDE

## **1. RUN THE DATABASE MIGRATION** 

### Step 1: Open Supabase SQL Editor
Go to your Supabase project dashboard → SQL Editor

### Step 2: Run the Migration
Copy and paste the entire contents of:
```
supabase/sql/64_marketing_feature_flags.sql
```

Click **RUN** and wait for "Success. No rows returned"

This will create:
- `feature_definitions` table (10 premium features)
- `tenant_feature_flags` table (per-tenant toggles)
- Helper functions for access control
- RLS policies for security

---

## **2. ACCESS THE SETTINGS PAGE**

Navigate to:
```
http://localhost:3000/settings/marketing
```

Or click: **Settings** → **Marketing** in the sidebar

You should see **6 tabs**:
1. **General** - Overview & stats
2. **Features** - Feature flag toggles ⭐
3. **Email** - Email configuration
4. **SMS** - SMS/WhatsApp settings
5. **Integrations** - Third-party apps
6. **Compliance** - GDPR controls

---

## **3. TEST FEATURE FLAGS**

### In the Features Tab:

You'll see **10 premium features** organized by category:

**ENTERPRISE ($99/mo):**
- 👑 Email Warmup Automation ($50/mo value)
- 👑 AI Send Time Optimization ($60/mo value)

**PRO ($29/mo):**
- ⭐ Click Heatmaps ($15/mo)
- ⭐ Dynamic Content Blocks ($20/mo)
- ⭐ Social Media Publishing ($15/mo)
- ⭐ Advanced Analytics ($10/mo)
- ⭐ Automation Journeys ($25/mo)
- ⭐ WhatsApp Campaigns ($20/mo)

**STARTER (Free):**
- ✅ Basic Campaigns
- ✅ A/B Testing

### Toggle Features:
- Features within your plan have **toggle switches** (black switches as requested)
- Features above your plan show a **lock icon** and **"Upgrade"** button
- Toggle ON/OFF to enable/disable features

---

## **4. TEST FEATURE GATES IN CODE**

### Wrap any premium component:

```typescript
import { FeatureGate } from '@/components/marketing/feature-gate'

// Example 1: Click Heatmaps
<FeatureGate featureKey="click_heatmaps">
  <HeatmapViewer campaignId={campaignId} />
</FeatureGate>

// Example 2: AI Send Time
<FeatureGate featureKey="ai_send_time">
  <AITimePicker contactId={contactId} />
</FeatureGate>

// Example 3: Email Warmup
<FeatureGate featureKey="email_warmup">
  <WarmupDashboard domainId={domainId} />
</FeatureGate>
```

**What happens:**
- ✅ If feature is **enabled** → Shows the component
- 🔒 If feature is **disabled** → Shows beautiful upgrade prompt

---

## **5. USING THE HOOK**

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags'

function MyComponent() {
  const {
    isFeatureEnabled,
    canEnableFeature,
    enableFeature,
    disableFeature,
    tenantPlan,
    features,
  } = useFeatureFlags()

  // Check if feature is enabled
  if (isFeatureEnabled('click_heatmaps')) {
    return <HeatmapViewer />
  }

  // Check if user can enable a feature
  if (canEnableFeature('ai_send_time')) {
    // Show toggle switch
    return (
      <Switch
        checked={isFeatureEnabled('ai_send_time')}
        onCheckedChange={(checked) => {
          if (checked) {
            enableFeature('ai_send_time')
          } else {
            disableFeature('ai_send_time')
          }
        }}
      />
    )
  }

  // Show upgrade prompt
  return <UpgradeButton featureKey="ai_send_time" />
}
```

---

## **6. CHANGE PLAN TIER (FOR TESTING)**

To test different plans, update your tenant's plan tier in Supabase:

```sql
-- View current plan
SELECT plan_tier FROM tenants WHERE id = 'your-tenant-id';

-- Change to PRO
UPDATE tenants SET plan_tier = 'pro' WHERE id = 'your-tenant-id';

-- Change to ENTERPRISE
UPDATE tenants SET plan_tier = 'enterprise' WHERE id = 'your-tenant-id';

-- Change back to STARTER
UPDATE tenants SET plan_tier = 'starter' WHERE id = 'your-tenant-id';
```

Refresh the `/settings/marketing` page to see changes.

---

## **7. ENABLE A FEATURE**

### Option 1: Via Settings UI
1. Go to `/settings/marketing` → Features tab
2. Find the feature
3. If you have the required plan, toggle it ON

### Option 2: Via Database
```sql
-- Enable click_heatmaps
INSERT INTO tenant_feature_flags (tenant_id, feature_key, is_enabled)
VALUES ('your-tenant-id', 'click_heatmaps', true)
ON CONFLICT (tenant_id, feature_key) 
DO UPDATE SET is_enabled = true;
```

### Option 3: Via Code
```typescript
const { enableFeature } = useFeatureFlags()
await enableFeature('click_heatmaps')
```

---

## **8. START A 14-DAY TRIAL**

```sql
-- Start trial for ai_send_time
INSERT INTO tenant_feature_flags (tenant_id, feature_key, is_enabled, trial_ends_at)
VALUES (
  'your-tenant-id',
  'ai_send_time',
  true,
  NOW() + INTERVAL '14 days'
);
```

The feature will auto-disable after 14 days.

---

## **9. VIEW ACTIVE FEATURES**

```sql
-- See all enabled features for a tenant
SELECT 
  ff.feature_key,
  fd.feature_name,
  fd.plan_tier_required,
  ff.trial_ends_at
FROM tenant_feature_flags ff
JOIN feature_definitions fd ON ff.feature_key = fd.feature_key
WHERE ff.tenant_id = 'your-tenant-id'
  AND ff.is_enabled = true;
```

---

## **10. TROUBLESHOOTING**

### ❌ "No features available" message
**Fix:** Run the migration: `supabase/sql/64_marketing_feature_flags.sql`

### ❌ Toggle switches don't appear
**Fix:** Check your tenant's `plan_tier` in the `tenants` table

### ❌ Feature still shows as locked
**Fix:** 
1. Check tenant plan tier
2. Check `tenant_feature_flags` table
3. Clear browser cache

### ❌ Upgrade button doesn't work
**Note:** The upgrade flow connects to your payment system (Stripe/Paddle). For testing, manually update the plan tier in the database.

---

## **11. NEXT STEPS**

### A. Implement Premium Features
Now that the infrastructure is ready:
1. Build Email Warmup dashboard (sends gradual increase)
2. Build Click Heatmap visualizer (canvas overlay)
3. Build AI Send Time algorithm (ML model)
4. Build Dynamic Content engine (conditional rendering)

### B. Connect Payment Gateway
Integrate Stripe/Paddle to handle:
- Plan upgrades
- Trial starts
- Subscription management
- Usage-based billing

### C. Add More Features
Define new features in `feature_definitions`:
```sql
INSERT INTO feature_definitions (feature_key, feature_name, ...)
VALUES ('new_feature', 'My New Feature', ...);
```

---

## **📖 DOCUMENTATION**

**Full specs:**
- `MARKETING_PREMIUM_TRANSFORMATION_PLAN.md`
- `MARKETING_TRANSFORMATION_COMPLETE.md`

**Code:**
- Hook: `src/hooks/use-feature-flags.ts`
- Gate: `src/components/marketing/feature-gate.tsx`
- Settings: `src/app/settings/marketing/page.tsx`

---

## **✅ VERIFICATION CHECKLIST**

- [ ] Migration ran successfully
- [ ] Can access `/settings/marketing`
- [ ] See 6 tabs (General, Features, Email, SMS, Integrations, Compliance)
- [ ] See 10 features in Features tab
- [ ] Features within plan show toggle switches
- [ ] Features above plan show lock + upgrade button
- [ ] Can toggle features ON/OFF
- [ ] `FeatureGate` shows upgrade prompt when feature disabled
- [ ] All panels load without errors

---

**🎉 READY TO BUILD PREMIUM FEATURES! 🎉**

**Questions?** Review the full documentation or check the code comments.

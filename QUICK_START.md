# 🚀 MARKETING INTEGRATION - QUICK START

**3-step activation process. Takes < 5 minutes.**

---

## ⚡ STEP 1: Run Database Migration

### Option A: Supabase Dashboard (Recommended)
```
1. Go to: https://app.supabase.com/project/YOUR-PROJECT/sql
2. Open file: supabase/sql/25_marketing_crm_integration.sql
3. Copy ALL contents
4. Paste into SQL Editor
5. Click "RUN"
6. Wait for: "✅ ALL TESTS PASSED"
```

### Option B: Supabase CLI
```bash
cd /Users/deepak/auth-app/dental-crm
supabase db push
```

**Expected result:** All tests pass, no errors. Takes ~30 seconds.

---

## ⚡ STEP 2: Verify CRM Works

**Test these (should work identically):**
- [ ] Open `/contacts` - Loads correctly
- [ ] Create a contact - Works
- [ ] Open `/pipeline` - Loads correctly
- [ ] Create a deal - Works
- [ ] Move deal between stages - Works
- [ ] Log an activity - Works
- [ ] Create a task - Works

**✅ If all work, proceed to Step 3!**

**❌ If anything broke:**
```bash
cd /Users/deepak/auth-app/dental-crm
./RESTORE_BEFORE_MARKETING.sh
```

---

## ⚡ STEP 3: Enable Marketing (When Ready)

### Option A: Settings UI (Coming Soon)
```
Go to Settings > Marketing > Enable Marketing
```

### Option B: Direct Database
```sql
-- In Supabase SQL Editor
UPDATE tenants 
SET 
  marketing_enabled = TRUE,
  marketing_plan = 'pro',
  marketing_enabled_at = NOW()
WHERE id = 'your-tenant-id-here';
```

### Option C: API Call
```ts
import { enableMarketing } from '@/lib/marketing/feature-flags';

await enableMarketing('your-tenant-id', 'pro');
// Plans: 'starter', 'pro', 'enterprise'
```

---

## 🎯 WHAT HAPPENS NEXT?

**With Marketing ENABLED:**
- ✅ "Export to Audience" button appears in Contacts
- ✅ Marketing source badges appear on Deals
- ✅ "Marketing" tab appears in Contact detail
- ✅ ROI widget appears in Analytics
- ✅ Form submissions can auto-create Deals
- ✅ High-intent clicks auto-create urgent Tasks

**CRM continues working identically!**

---

## 🧪 TESTING

```bash
# Test 1: Marketing DISABLED (default)
# All CRM features should work identically
✓ Contacts work
✓ Deals work
✓ Tasks work
✓ Activities work
✓ No Marketing features visible

# Test 2: Enable Marketing
UPDATE tenants SET marketing_enabled = TRUE WHERE id = 'your-id';

# Test 3: Marketing ENABLED
✓ All CRM features still work identically
✓ Marketing features now visible
✓ Can export contacts to audiences
✓ Attribution tracking works

# Test 4: Disable Marketing
UPDATE tenants SET marketing_enabled = FALSE WHERE id = 'your-id';

# Test 5: Back to baseline
✓ All CRM features work identically
✓ Marketing features hidden
✓ No errors
```

---

## 🔄 ROLLBACK

**If anything goes wrong:**

```bash
# Level 1: Disable Marketing (keeps data)
UPDATE tenants SET marketing_enabled = FALSE WHERE id = 'your-id';

# Level 2: Revert to before integration
cd /Users/deepak/auth-app/dental-crm
./RESTORE_BEFORE_MARKETING.sh

# Level 3: Revert to Version 3
./RESTORE_VERSION_3.sh
```

---

## 📁 KEY FILES

| File | Purpose |
|------|---------|
| `25_marketing_crm_integration.sql` | Database migration (run this!) |
| `MARKETING_MIGRATION_GUIDE.md` | Detailed migration instructions |
| `MARKETING_INTEGRATION_COMPLETE.md` | Complete documentation |
| `RESTORE_BEFORE_MARKETING.sh` | Rollback script |
| `RESTORE_VERSION_4.sh` | Restore to integrated state |

---

## ✅ CHECKLIST

**Pre-flight:**
- [ ] Backed up database (optional, but recommended)
- [ ] CRM working correctly
- [ ] Ready to run migration

**Migration:**
- [ ] Ran `25_marketing_crm_integration.sql`
- [ ] Saw "✅ ALL TESTS PASSED"
- [ ] No errors in SQL output

**Verification:**
- [ ] All CRM features work
- [ ] Marketing features hidden (disabled by default)
- [ ] No console errors
- [ ] Performance unchanged

**Activation (Optional):**
- [ ] Enabled Marketing for tenant
- [ ] Marketing features now visible
- [ ] CRM still works identically
- [ ] Attribution tracking active

---

## 🎉 YOU'RE DONE!

**Marketing integration is complete and ready to use.**

**The CRM works perfectly whether Marketing is enabled or disabled.**

**You control when to activate it!**

---

**Need help?** Check `MARKETING_INTEGRATION_COMPLETE.md` for full documentation.

**Want to rollback?** Run `./RESTORE_BEFORE_MARKETING.sh`



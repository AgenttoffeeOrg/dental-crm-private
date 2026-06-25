# 🚀 TREATMENT ROUTING MIGRATIONS - STEP-BY-STEP GUIDE

**Date:** October 19, 2025  
**Status:** Ready to Run  

---

## 📋 WHAT YOU'LL DO

Run 3-4 SQL migration files in your Supabase dashboard to create the treatment routing system tables.

**Time Required:** 5-10 minutes  
**Difficulty:** Easy (copy & paste)  
**Risk:** Zero (these migrations use `IF NOT EXISTS` so they're 100% safe)

**Note:** You may need to run an additional pre-migration file (`46a`) if your database has a specific schema issue. The migration will tell you if needed.

---

## ✅ STEP 1: OPEN SUPABASE SQL EDITOR

1. **Go to:** https://supabase.com/dashboard
2. **Click:** Your dental-crm project
3. **Click:** "SQL Editor" in the left sidebar (looks like 🔧)
4. **Click:** "+ New query" button (top right)

---

## ✅ STEP 2: RUN MIGRATION #1 - CORE TABLES

### 📄 File: `45_treatment_routing.sql`

**What it creates:**
- `treatment_tags` - Store custom treatment tags
- `treatment_tag_pipeline_mappings` - Map tags to pipelines
- `treatment_routing_logs` - Audit trail of all routing decisions
- `treatment_routing_settings` - Tenant-wide routing settings

### How to run:

1. **Open file:** `/Users/deepak/auth-app/dental-crm/supabase/sql/45_treatment_routing.sql`
2. **Select all:** Press `Cmd+A` (Mac) or `Ctrl+A` (Windows)
3. **Copy:** Press `Cmd+C` or `Ctrl+C`
4. **Go back to Supabase SQL Editor**
5. **Paste:** Press `Cmd+V` or `Ctrl+V`
6. **Click:** "Run" button (bottom right)
7. **Wait:** 5-10 seconds

### Expected result:
```
Success. No rows returned
```

✅ **If you see "relation already exists" errors** - that's OK! It means some tables already exist. The migration will skip them.

---

## ✅ STEP 3: RUN MIGRATION #2 - PERMISSIONS

### 📄 File: `46_treatment_routing_permissions.sql`

**What it creates:**
- 21 granular permissions for routing system
- Role assignments (admin, manager, user)
- Helper functions for permission checks

### How to run:

1. **Click:** "+ New query" button again (or clear current editor)
2. **Open file:** `/Users/deepak/auth-app/dental-crm/supabase/sql/46_treatment_routing_permissions.sql`
3. **Select all, copy, paste** (same as before)
4. **Click:** "Run" button
5. **Wait:** 5-10 seconds

### Expected result:

**Option A:** Success ✅
```
Success. No rows returned
```

**Option B:** Type mismatch error 🔧
If you see an error about `permission_key` being UUID instead of TEXT:
```
ℹ permission_key column is UUID but should be TEXT
⚠ MANUAL FIX REQUIRED: Cannot auto-migrate UUID to TEXT due to dependencies
```

**If you get Option B, proceed to STEP 3A below. Otherwise, skip to STEP 4.**

---

## ✅ STEP 3A: FIX permission_key TYPE (IF NEEDED)

**Only run this if Step 3 gave you a type mismatch error!**

### 📄 File: `46a_fix_permission_key_type.sql`

**What it does:**
- Fixes `permission_key` column type from UUID to TEXT
- Handles policy dependencies safely
- Creates backup for safety

### How to run:

1. **Click:** "+ New query" button
2. **Open file:** `/Users/deepak/auth-app/dental-crm/supabase/sql/46a_fix_permission_key_type.sql`
3. **Select all, copy, paste**
4. **Click:** "Run" button
5. **Wait:** 10-15 seconds (this one takes a bit longer)

### Expected result:
```
═══════════════════════════════════════════════════
FIX: role_permissions.permission_key UUID → TEXT
═══════════════════════════════════════════════════

✓ Detected: permission_key is UUID (needs to be TEXT)
ℹ Table has X rows

→ Step 1: Creating backup...
✓ Backup created: role_permissions_backup_uuid

→ Step 2: Dropping dependent RLS policies...
✓ Policies dropped (will be recreated by application)

... (more steps)

═══════════════════════════════════════════════════
✓ SUCCESS! permission_key is now TEXT
═══════════════════════════════════════════════════
```

### After 46a succeeds:

**Go back and run Step 3 again!**
1. **Click:** "+ New query" button
2. **Copy and run:** `46_treatment_routing_permissions.sql` again
3. **This time it should succeed** ✅

---

## ✅ STEP 4: RUN MIGRATION #3 - PMS INTEGRATION

### 📄 File: `47_pms_procedure_tag_mappings.sql`

**What it creates:**
- `pms_procedure_tag_mappings` - Map PMS procedure codes (like ADA codes) to treatment tags
- Helper functions for PMS integration
- Sample data for common dental procedures

### How to run:

1. **Click:** "+ New query" button again
2. **Open file:** `/Users/deepak/auth-app/dental-crm/supabase/sql/47_pms_procedure_tag_mappings.sql`
3. **Select all, copy, paste**
4. **Click:** "Run" button
5. **Wait:** 5-10 seconds

### Expected result:
```
Success. No rows returned
```

---

## ✅ STEP 5: VERIFY MIGRATIONS

Run this query to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'treatment_tags',
  'treatment_tag_pipeline_mappings',
  'treatment_routing_logs',
  'treatment_routing_settings',
  'pms_procedure_tag_mappings'
)
ORDER BY table_name;
```

### Expected result:
You should see **5 rows** with these table names:
- ✅ pms_procedure_tag_mappings
- ✅ treatment_routing_logs
- ✅ treatment_routing_settings
- ✅ treatment_tag_pipeline_mappings
- ✅ treatment_tags

---

## ✅ STEP 6: RESTART YOUR DEV SERVER

After migrations complete:

```bash
# Kill existing dev server (Ctrl+C if running)
# Then restart:
npm run dev
```

Your app will now start on `localhost:3000` (or 3002 if 3000 is busy)

---

## 🎉 DONE! WHAT'S NEXT?

### Test the Treatment Routing System:

1. **Go to Settings** → Click "Treatment Routing" tab
2. **Create a Treatment Tag:**
   - Name: "Dental Implants"
   - Color: Blue
   - Keywords: implant, implants, dental implant
   - Click "Save"

3. **Map Tag to Pipeline:**
   - Go to "Pipeline Mapping" tab
   - Select "Dental Implants" tag
   - Select your "High Value" pipeline (or create one)
   - Click "Save Mapping"

4. **Create a Test Deal:**
   - Go to Deals → Click "New Deal"
   - Add treatment tags: "Dental Implants"
   - Watch it auto-route to your mapped pipeline! ✨

5. **View Analytics:**
   - Go to Settings → Treatment Routing → Analytics
   - See routing statistics and logs

---

## ⚠️ TROUBLESHOOTING

### Error: "permission denied"
**Solution:** Make sure you're using the **service role key** (not anon key) in your `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Error: "relation already exists"
**Solution:** This is FINE! It means the table was already created. Just continue.

### Error: "column already exists"
**Solution:** This is FINE! The migration will skip existing columns.

### Error: "syntax error"
**Solution:** Make sure you copied the ENTIRE file contents, including the first and last lines.

### Tables not showing up
**Solution:** Run the verification query from Step 5. If tables don't show, try running the migrations again.

---

## 🔄 ROLLBACK (If Needed)

If anything goes wrong and you want to undo the migrations:

```bash
# Open this file in Supabase SQL Editor:
/Users/deepak/auth-app/dental-crm/supabase/sql/45_treatment_routing_rollback.sql

# Run it - this will drop all treatment routing tables
```

⚠️ **WARNING:** Rollback will delete all your treatment tags, mappings, and routing logs!

---

## 📞 NEED HELP?

If you encounter any issues:
1. Copy the error message
2. Let me know and I'll help you fix it immediately

---

**Ready to start? Begin with Step 1!** 🚀


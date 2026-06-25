# 🚀 **RUN MIGRATION: Pending Invites System**

**Migration File:** `supabase/migrations/20251027_004_pending_invites_system.sql`  
**Status:** Ready to run  
**Date:** October 27, 2025

---

## **Quick Run Instructions**

### **Option 1: Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/xcsgleuoxzrllimywlct/sql/new
2. Copy the entire contents of `supabase/migrations/20251027_004_pending_invites_system.sql`
3. Paste into SQL Editor
4. Click "Run" (or press `Cmd/Ctrl + Enter`)
5. Verify success messages in output

### **Option 2: Command Line (If available)**

```bash
# If you have psql installed:
PGPASSWORD="your_password" psql \
  -h db.xcsgleuoxzrllimywlct.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase/migrations/20251027_004_pending_invites_system.sql
```

---

## **What This Migration Creates**

### **1. Database Objects:**
- ✅ `invite_status` enum (`pending`, `accepted`, `expired`, `cancelled`)
- ✅ `pending_invites` table (with 6-char alphanumeric codes)
- ✅ 5 indexes for performance
- ✅ RLS policies (4 policies for security)

### **2. Helper Functions:**
- ✅ `generate_invite_code()` - Creates unique 6-char codes
- ✅ `validate_invite_code(code, email)` - Validates codes with detailed errors
- ✅ `expire_old_invites()` - Auto-expires invites after 7 days

### **3. Security Features:**
- ✅ Role assigned BY INVITER (no default)
- ✅ 7-day expiration (configurable)
- ✅ Email validation
- ✅ Row Level Security enabled

---

## **Expected Output**

After running, you should see:

```
NOTICE:  ✅ Created invite_status enum
NOTICE:  ✅ Created pending_invites table
NOTICE:  ✅ Created indexes on pending_invites
NOTICE:  ✅ Created generate_invite_code() function
NOTICE:  ✅ Created validate_invite_code() function
NOTICE:  ✅ Created auto-expire trigger
NOTICE:  ✅ Created RLS policies for pending_invites
NOTICE:  
NOTICE:  === PENDING INVITES SYSTEM VERIFICATION ===
NOTICE:  
NOTICE:  ✅ Test invite code generated: ABCDEF (example)
NOTICE:  ✅ pending_invites table exists
NOTICE:  ✅ RLS enabled on pending_invites
NOTICE:  ✅ 4 RLS policies created
NOTICE:  
NOTICE:  🎉 PENDING INVITES SYSTEM MIGRATION COMPLETE!
```

---

## **Verification Queries**

After migration, run these to verify:

```sql
-- 1. Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pending_invites'
ORDER BY ordinal_position;

-- 2. Test code generation
SELECT generate_invite_code() AS test_code;

-- 3. Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'pending_invites';

-- 4. Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'pending_invites';
```

---

## **Next Steps After Migration**

1. ✅ **Phase 1 Complete:** Database schema created
2. ⏳ **Phase 2 Next:** Create API endpoints
   - POST `/api/invites/create`
   - POST `/api/invites/check-pending`
   - POST `/api/invites/accept`
   - POST `/api/orgs/create`

3. ⏳ **Phase 3:** Build UI components
4. ⏳ **Phase 4:** Integrate with onboarding

---

## **Rollback (If Needed)**

If you need to undo this migration:

```sql
DROP TRIGGER IF EXISTS trg_expire_old_invites ON pending_invites;
DROP FUNCTION IF EXISTS expire_old_invites();
DROP FUNCTION IF EXISTS validate_invite_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS generate_invite_code();
DROP TABLE IF EXISTS pending_invites CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;
```

---

**Ready to proceed!** Please run the migration and confirm success. 🚀


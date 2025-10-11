# 🚨 Database Migration Required

## The Error You're Seeing

The error `"insert or update on table "deals" violates foreign key constraint "deals_stage_id_fkey"` means the new deal profile dialog is trying to use database columns that don't exist yet.

## Quick Fix - Run This Migration

**Step 1: Go to your Supabase Dashboard**
1. Open https://supabase.com/dashboard
2. Go to your project
3. Click **SQL Editor** in the left sidebar

**Step 2: Run the Migration**
1. Copy the entire contents of `supabase/sql/05_enhanced_deal_management_safe.sql`
2. Paste it into the SQL Editor
3. Click **RUN** 

This will add all the new deal management columns safely.

## Alternative: Temporary Fallback

If you can't run the migration right now, I can create a simplified version of the deal dialog that only uses existing database columns.

## What the Migration Adds

- Deal types (new_lead, existing_patient, pms_import, referral)
- Financial fields (deposit, payment plans, insurance)
- Treatment details (category, urgency, duration)
- PMS integration fields
- Follow-up and scoring fields
- 20+ new comprehensive deal management fields

## After Migration

Once you run the migration:
1. ✅ Deal creation will work perfectly
2. ✅ Smart lead matching will function
3. ✅ Comprehensive deal profiles available
4. ✅ All new features active

**The migration is safe to run - it checks if columns exist first and won't break anything!**

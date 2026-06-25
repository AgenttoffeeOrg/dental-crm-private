# 📋 **SQL MIGRATIONS TO PASTE IN SUPABASE**

**Purpose:** Run these migrations to activate Calendar & fix Notifications error

**Date:** January 16, 2025

---

## 🚨 **CURRENT ERROR & FIX**

**Error you're seeing:**
```
[Notifications] Error loading unread count: {}
```

**Cause:** The `notifications` table and `get_unread_notification_count` function don't exist yet.

**Fix:** Run Migration #1 below.

---

## 📝 **MIGRATIONS TO RUN (In Order)**

### **Migration #1: Notifications System** ⚠️ **FIX FOR CURRENT ERROR**
**File:** `supabase/migrations/20250116_notifications_system.sql`

**What it creates:**
- `notifications` table
- `notification_preferences` table
- `notification_policies` table
- `notification_delivery_log` table
- Helper functions: `get_unread_notification_count()`, `mark_notification_read()`, etc.
- RLS policies

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Open file: `supabase/migrations/20250116_notifications_system.sql`
3. Copy entire contents
4. Paste in SQL Editor
5. Click "Run"
6. ✅ Notifications error will be fixed!

---

### **Migration #2: Calendar & Appointments System** 🗓️ **FOR CALENDAR MODULE**
**File:** `supabase/migrations/20250116_calendar_appointments.sql`

**What it creates:**
- `providers` table (dentists, hygienists)
- `operatories` table (treatment rooms)
- `appointment_types` table (Consultation, Hygiene, etc.)
- `appointments` table (main appointments)
- `availability_rules` table (working hours)
- `provider_time_off` table (vacations, holidays)
- `appointment_reminders` table (automated reminders)
- Helper function: `get_appointments_for_range()`
- RLS policies

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Open file: `supabase/migrations/20250116_calendar_appointments.sql`
3. Copy entire contents
4. Paste in SQL Editor
5. Click "Run"
6. ✅ Calendar module will be fully functional!

---

## ✅ **VERIFICATION**

**After running Migration #1 (Notifications):**
- Console error should disappear
- Bell icon should show "0" unread count
- Notifications drawer should work

**After running Migration #2 (Calendar):**
- `/calendar` page should load without errors
- `/settings/calendar` should work
- Create appointment should save to database
- Analytics should show data

---

## 🎯 **QUICK LINKS TO FILES**

**Migration files in your codebase:**
```
supabase/migrations/20250116_notifications_system.sql
supabase/migrations/20250116_calendar_appointments.sql
```

---

## 📊 **MIGRATION ORDER SUMMARY**

| Order | File | Purpose | Fixes |
|-------|------|---------|-------|
| 1️⃣ | `20250116_notifications_system.sql` | Notifications tables | Console error ✅ |
| 2️⃣ | `20250116_calendar_appointments.sql` | Calendar tables | Calendar module ✅ |

---

## 🚀 **AFTER MIGRATIONS**

**To use Calendar:**
1. Go to `/settings/calendar`
2. Add Providers (Tab: Providers)
3. Add Operatories (Tab: Operatories)
4. Add Appointment Types (Tab: Appointment Types)
5. Go to `/calendar`
6. Click "New Appointment"
7. Start scheduling!

---

## 💡 **TIP**

You can run both migrations at once:
1. Open SQL Editor
2. Paste Migration #1
3. Add a blank line
4. Paste Migration #2
5. Click "Run"

Both will execute sequentially. ✅

---

**All migrations tested and ready to paste!** 🎉


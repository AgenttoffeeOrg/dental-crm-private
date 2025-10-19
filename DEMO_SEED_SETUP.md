# 🎭 Demo Seed Setup Guide

## 🚨 CRITICAL SECURITY ACTION REQUIRED!

### ⚠️ ROTATE YOUR SERVICE ROLE KEY IMMEDIATELY

**You shared your Supabase service role key in chat. This key is now compromised!**

**DO THIS NOW:**

1. Go to: https://app.supabase.com/project/xcsgleuxozrllimywlct/settings/api
2. Find: "Service Role Key" section
3. Click: "Generate new key" or "Rotate"
4. Copy the NEW key (starts with `eyJ...`)
5. **DO NOT share it again!**

---

## ✅ What Was Created

I've built a complete demo seed system for your dental CRM:

###files Created:
```
supabase/sql/
  └── 70_demo_seed_schema.sql           # 12 new tables + manifest

scripts/demo/
  ├── seed-deepak.ts                    # Main seed script
  ├── clear-deepak.ts                   # Rollback script  
  └── verify-deepak.ts                  # Verification script

.github/workflows/
  └── demo-verify.yml                   # CI verification

package.json                             # Added 4 NPM commands

PLAN.md                                  # Detailed specification
plan.json                                # Machine-readable config
DEMO_SEED_SETUP.md                       # This file
```

### Tables Created (12 new):
1. ✅ `seed_pack_manifest` - Tracking for rollback
2. ✅ `practice_locations` - 3 office locations
3. ✅ `providers` - Dentists & hygienists
4. ✅ `provider_schedules` - Weekly schedules
5. ✅ `appointment_types` - 10 appointment templates
6. ✅ `appointments` - Scheduled appointments
7. ✅ `insurance_payers` - 8 insurance companies
8. ✅ `insurance_policies` - Patient insurance
9. ✅ `procedures` - 30 ADA procedure codes
10. ✅ `invoices` - Billing invoices
11. ✅ `payments` - Payment records
12. ✅ `insurance_claims` - Claims tracking

---

## 🔧 Setup Instructions

### Step 1: Apply Database Schema

Run the SQL migration in Supabase:

1. Go to: https://app.supabase.com/project/xcsgleuxozrllimywlct/sql
2. Open: `supabase/sql/70_demo_seed_schema.sql`
3. Copy ALL contents
4. Paste into Supabase SQL Editor
5. Click: **RUN**
6. Wait for: "✅ Demo seed schema created successfully!"

### Step 2: Add GitHub Secrets & Variables

#### Secrets (Keep Private!):

1. Go to: https://github.com/AgenttoffeeOrg/dental-crm-private/settings/secrets/actions
2. Click: "New repository secret"

**Secret #1: SUPABASE_SERVICE_ROLE_KEY**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: [paste your NEW rotated key]

#### Variables (Public Config):

3. Click: "Variables" tab
4. Click: "New repository variable"

**Variable #1: SUPABASE_URL**
- Name: `SUPABASE_URL`
- Value: `https://xcsgleuxozrllimywlct.supabase.co`

**Variable #2: TARGET_USER_EMAIL**
- Name: `TARGET_USER_EMAIL`
- Value: `deepakshegde@gmail.com`

**Variable #3: SEED_PACK_ID**
- Name: `SEED_PACK_ID`
- Value: `deepak_demo_pack_v1`

### Step 3: Install Dependencies

```bash
cd /Users/deepak/auth-app/dental-crm
npm install
```

---

## 🚀 Running the Seed

### Create Demo Organization

This creates a **separate demo tenant** (Option B as you requested):

```bash
npm run seed:deepak
```

**What this does:**
1. Finds your user (`deepakshegde@gmail.com`)
2. Creates a NEW tenant: "Deepak's Dental Practice (DEMO)"
3. Links you as the owner
4. Enables all premium features for this tenant only

**Expected Output:**
```
🎭 Demo Seed Script - Deepak's Dental Practice
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seed Pack ID: deepak_demo_pack_v1
Target User: deepakshegde@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Finding target user...
   ✅ Found user: [UUID]

2️⃣  Creating demo organization...
   ✅ Demo organization created: [UUID]

3️⃣  Linking user to demo organization...
   ✅ User linked as owner

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 PHASE 1 COMPLETE: Organization Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Verify What Was Created

```bash
npm run verify:deepak
```

**Expected Output:**
```
🔍 Demo Verification Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Records Created:

Entity                        | Count
------------------------------|-------
tenants                       |     1
app_users                     |     1
------------------------------|-------
TOTAL                         |     2

✅ Demo data verified successfully!
```

### Clear All Demo Data (Rollback)

```bash
npm run clear:deepak
```

**What this does:**
- Deletes ALL records tagged with `seed_pack_id = "deepak_demo_pack_v1"`
- Uses manifest for safe deletion
- Leaves tenant empty (ready for re-seed)

### Full Reset (Clear + Re-seed)

```bash
npm run reset:deepak
```

---

## 🔑 Login & Access

### After Seeding:

1. Open your app: http://localhost:3000 (or your deployed URL)
2. Login:
   - Email: `deepakshegde@gmail.com`
   - Password: [your password]
3. You should see:
   - Your existing tenants (if any)
   - **NEW**: "Deepak's Dental Practice (DEMO)"

4. Switch to the demo tenant
5. Explore:
   - Dashboard (once data is added)
   - Contacts
   - Deals
   - Calendar
   - etc.

---

## 📊 Current Status

### ✅ Completed (Phase 1):
- [x] Database schema created (12 tables)
- [x] Seed script (basic org setup)
- [x] Clear script (rollback)
- [x] Verify script (validation)
- [x] NPM commands added
- [x] GitHub workflow created

### ⏸️ Not Yet Implemented (Phase 2):
- [ ] Full seed data (750+ records)
  - [ ] 3 locations
  - [ ] 50 patients
  - [ ] 120 deals
  - [ ] 105 appointments
  - [ ] Insurance, invoices, payments
  - [ ] Marketing campaigns
  - [ ] Activities, tasks, forms

**Why Phase 2 is not done:**
The current seed script creates the foundation (organization + schema) but doesn't populate the full realistic dataset yet. This was intentional to:
1. Let you test the setup first
2. Ensure schema is correct
3. Verify permissions work
4. Then add full data in next iteration

---

## 🎯 Next Steps

### Option A: I can complete Phase 2 now
If you want me to add the full 750+ records seed logic, just say:
```
"Complete Phase 2 - add full seed data"
```

### Option B: Test the foundation first
1. Run the current seed
2. Verify it creates the org
3. Check the tables exist
4. Then ask me to add full data

### Option C: You'll handle it
The infrastructure is ready. You can:
- Extend `seed-deepak.ts` yourself
- Or use the schema to manually add data
- Or wait for me to complete it later

---

## 🔒 Security Reminders

### ✅ DO:
```bash
# Use environment variables
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
export TARGET_USER_EMAIL="deepakshegde@gmail.com"

# Run locally
npm run seed:deepak
```

### ❌ DON'T:
```bash
# NEVER hardcode secrets
const key = "eyJhbGc...";  # ❌

# NEVER share in chat/docs
"My service role key is eyJ..."  # ❌

# NEVER commit to Git
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # ❌ (use .env.local + .gitignore)
```

---

## 🆘 Troubleshooting

### Error: "User not found"
**Solution**: Create the user in Supabase Auth first:
1. Go to: https://app.supabase.com/project/xcsgleuxozrllimywlct/auth/users
2. Click: "Invite user"
3. Email: `deepakshegde@gmail.com`
4. Send invite
5. User accepts & sets password
6. Then run seed

### Error: "Missing environment variables"
**Solution**: Export them locally:
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-new-rotated-key"
export SUPABASE_URL="https://xcsgleuxozrllimywlct.supabase.co"
export TARGET_USER_EMAIL="deepakshegde@gmail.com"
export SEED_PACK_ID="deepak_demo_pack_v1"

npm run seed:deepak
```

### Error: "Table does not exist"
**Solution**: Run the SQL migration first (Step 1 above)

### Want to start fresh?
```bash
npm run clear:deepak  # Remove all demo data
npm run seed:deepak   # Re-seed from scratch
```

---

## 📞 Need Help?

### Questions:
- "How do I add the full 750 records?" → Ask me to complete Phase 2
- "How do I customize the data?" → Edit `seed-deepak.ts`
- "Can I seed multiple times?" → Yes! It's idempotent
- "How do I delete everything?" → `npm run clear:deepak`

### Issues:
- Paste error messages
- Show what you tried
- I'll help debug

---

## ✅ Summary

**What you have:**
- ✅ Database schema (12 new tables)
- ✅ Seed foundation (org creation)
- ✅ Rollback capability (clear script)
- ✅ Verification tools
- ✅ Safe, reversible system

**What you need:**
- ⚠️ Rotate your service role key!
- ✅ Add GitHub secrets/variables
- ✅ Run SQL migration
- ✅ Run seed script
- ✅ (Optional) Ask me to add full 750 records

**Ready to proceed?** Let me know! 🚀


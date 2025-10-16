# 🗄️ **PASTE THESE 7 SQL MIGRATIONS INTO SUPABASE**

**Execute in order in Supabase SQL Editor:**

---

## ✅ **ERRORS FIXED!**

**Fixed 2 syntax errors:**
1. ✅ Inline INDEX syntax → Separate CREATE INDEX statements
2. ✅ Foreign key constraint on tasks.id → Plain UUID (no constraint)

**All migrations now clean and ready!**

---

## **MIGRATION 1: Event Logging**

**File:** `supabase/migrations/20250116_automation_event_log.sql`

```sql
-- Copy entire contents of this file
```

**What it does:**
- Creates `automation_event_log` table
- Stores all events for audit + replay
- Helper functions for event retrieval and replay
- 90-day retention policy
- ✅ FIXED: Indexes now created separately

---

## **MIGRATION 2: Extended Triggers**

**File:** `supabase/migrations/20250116_extended_automation_triggers.sql`

```sql
-- Copy entire contents of this file
```

**What it does:**
- Extends `marketing_journeys` to support 45+ trigger types
- Creates `automation_trigger_metadata` table
- Seeds trigger definitions for UI
- Helper function: `get_automation_triggers_by_category()`

---

## **MIGRATION 3: Deal SLA Rules**

**File:** `supabase/migrations/20250116_deal_sla_rules.sql`

```sql
-- Copy entire contents of this file
```

**What it does:**
- Creates `deal_sla_rules` table
- Configurable SLA thresholds per pipeline/stage
- Auto-creates default rules for existing tenants
- RLS policies

---

## **MIGRATION 4: Stage Auto-Move**

**File:** `supabase/migrations/20250116_stage_auto_move_rules.sql`

```sql
-- Copy entire contents of this file
```

**What it does:**
- Creates `stage_auto_move_rules` table
- Automatic deal stage transitions
- Task completion triggers
- Time-based triggers
- Prevents circular moves

---

## **MIGRATION 5: Task Automation Rules**

**File:** `supabase/migrations/20250116_task_automation_rules.sql`

```sql
-- Copy entire contents of this file
```

**What it does:**
- Creates `task_escalation_rules` table
- Creates `task_dependencies` table (sequential workflows)
- Creates `task_reminder_settings` table
- Seeds default escalation rules (2h urgent, 4h high, 24h normal)
- Seeds default reminder settings

---

## **MIGRATION 6: Automation Testing**

**File:** `supabase/migrations/20250116_automation_testing.sql`

```sql
-- Copy entire contents of this file
```

**What it does:**
- Creates `automation_test_runs` table
- Stores simulation results
- Helper functions:
  - `get_automation_test_history(automation_id, limit)`
  - `compare_automation_test_runs(test1_id, test2_id)`

---

## **MIGRATION 7: Automation Governance**

**File:** `supabase/migrations/20250116_automation_governance.sql`

```sql
-- Copy entire contents of this file
```

**What it does:**
- Creates `automation_approvals` table (Draft → Review → Publish)
- Creates `automation_versions` table (version history + rollback)
- Creates `automation_rate_limits` table (spam prevention)
- Creates `automation_consent_audit` table (GDPR/CCPA compliance)
- Auto-triggers for version creation on publish
- Helper function: `reset_automation_rate_limits()`

---

## ✅ **AFTER RUNNING ALL MIGRATIONS**

Your database will have:
- ✅ 13 new automation tables
- ✅ 45+ trigger types
- ✅ 10+ helper functions
- ✅ Complete RLS policies
- ✅ Default data seeded

---

## 🚀 **THEN IN YOUR APP**

Initialize the automation system (one-time):

**File:** `src/components/layout/dashboard-layout.tsx` (or `_app.tsx`)

```typescript
import { initializeAutomationSystem } from '@/lib/automations/initialize'

// In your main layout component
useEffect(() => {
  initializeAutomationSystem()
}, [])
```

---

## 🎯 **READY TO USE!**

Navigate to **Automations** in the main nav and start building workflows!

**No code changes needed - everything is wired and ready.** ✨


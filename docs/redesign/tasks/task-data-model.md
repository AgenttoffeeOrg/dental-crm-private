# Tasks — data model additions

> Phase 2b.58+ — schema deltas the rebuild needs. Sits on top of the
> existing `tasks` table (status / priority / due_at / contact_id /
> deal_id / assignee fields all already there per the audit).

## Existing schema (preserved)

The `tasks` table already carries:
- `id`, `tenant_id`, `created_at`, `updated_at`, `created_by_user_id`
- `title` text
- `description` text (optional, free-form)
- `due_at` timestamptz (single field — both date + time stored
  together; UI splits into two pickers but persists one column)
- `status` enum: `open` / `in_progress` / `done` / `cancelled`
- `priority` enum: `low` / `normal` / `high` / `urgent`
- `task_type` text (call / email / sms / whatsapp / note / generic)
- `contact_id` uuid (nullable — supports free-floating tasks)
- `deal_id` uuid (nullable — supports contact-tied-no-deal tasks)
- `assigned_to_user_id` uuid (nullable — null means "everyone")
- `completed_at` timestamptz (set when status → done)

**None of these get changed.** The reshape is additive.

## Additions

### 1. Recurring tasks

New column on `tasks`:

```sql
ALTER TABLE public.tasks
  ADD COLUMN recurrence text
    CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  ADD COLUMN recurrence_origin_task_id uuid REFERENCES public.tasks(id);
```

- `recurrence` = `none` (default) / `daily` / `weekly` / `monthly`.
  No `custom` in v1 — if the practice needs custom cadence, they can
  create a separate task with each instance manually.
- `recurrence_origin_task_id` = points back to the FIRST task in the
  series so future analytics / debugging can group all instances.

**Creation rule:** when a task with `recurrence != 'none'` transitions
to `status = 'done'`, a daily cron creates the next instance with
`due_at` shifted by the cadence, copying title / assignee / linked
deal / etc., and pointing `recurrence_origin_task_id` to the same
origin.

**Cancellation rule:** when a task with `recurrence != 'none'`
transitions to `status = 'cancelled'`, NO next instance is created.
The series ends.

### 2. Assignee can be a group (not just a person)

Existing `assigned_to_user_id` stays. Add:

```sql
ALTER TABLE public.tasks
  ADD COLUMN assigned_to_group_id uuid REFERENCES public.practice_groups(id),
  ADD COLUMN assigned_to_everyone boolean NOT NULL DEFAULT false;
```

Exactly ONE of `assigned_to_user_id`, `assigned_to_group_id`,
`assigned_to_everyone` should be set (CHECK constraint).

When `assigned_to_group_id` or `assigned_to_everyone = true`, the
task is shared-inbox: it appears in every member's queue, first to
complete it removes it from everyone's queue.

### 3. `practice_groups` + `user_group_memberships` (new tables)

```sql
CREATE TABLE public.practice_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,              -- "Front Desk", "Treatment Coordinators"
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE public.user_group_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES public.practice_groups(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, group_id)
);
```

RLS pattern matches `tenant_ai_context`:
- SELECT: `tenant_id = ANY (get_accessible_tenants())`
- INSERT/UPDATE/DELETE: service-role only (UI writes via API routes
  that gate on `practice_groups.manage` permission — new code,
  matches the pattern from 2b.13).

### 4. Auto-done audit hint on tasks

When the system auto-completes a task via Path X (channel match),
we want to surface the reason so the operator can Reopen if AI got
it wrong.

```sql
ALTER TABLE public.tasks
  ADD COLUMN auto_completed_via_activity_id uuid REFERENCES public.activities(id);
```

When `status = 'done'` AND `auto_completed_via_activity_id IS NOT NULL`,
the queue + table render a small "Auto-completed because you sent
[activity_type] to [contact name]" hint with a Reopen button. Manual
operator-completed tasks have this field NULL.

### 5. Tenant default-assignee setting

The setting lives on the existing `tenant_routing_settings` table
(home for tenant-wide operator settings already). Add:

```sql
ALTER TABLE public.tenant_routing_settings
  ADD COLUMN default_task_assignee_mode text
    NOT NULL DEFAULT 'contact_owner'
    CHECK (default_task_assignee_mode IN
      ('contact_owner', 'group', 'everyone')),
  ADD COLUMN default_task_assignee_group_id uuid
    REFERENCES public.practice_groups(id);
```

When a task is auto-created (Path 2 playbook OR Path 1 AI-suggest
accepted) and no explicit assignee is specified by the trigger
rule:
- `contact_owner` mode → assign to `contacts.assigned_to_user_id`
  of the linked contact (falls back to creator if no contact).
- `group` mode → assign to the group named by
  `default_task_assignee_group_id`.
- `everyone` mode → `assigned_to_everyone = true`.

### 6. Notification preferences per user

User-level opt-in / opt-out for the urgent-task email + SMS pings.
Add to existing `app_users` table OR a new `user_notification_preferences`
table — audit will recommend.

Likely shape:

```sql
ALTER TABLE public.app_users
  ADD COLUMN task_morning_digest_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN urgent_task_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN urgent_task_sms_enabled boolean NOT NULL DEFAULT false;
```

Three booleans. Operator can toggle in `/settings/notifications`.

### 7. Indexes

```sql
-- Triage lane + queue performance: tasks due today by tenant.
CREATE INDEX tasks_tenant_due_open_idx
  ON public.tasks (tenant_id, due_at)
  WHERE status NOT IN ('completed', 'cancelled', 'done');

-- Auto-done lookup: find tasks awaiting completion by a recent
-- outbound activity.
CREATE INDEX tasks_tenant_contact_type_open_idx
  ON public.tasks (tenant_id, contact_id, task_type)
  WHERE status = 'open' AND contact_id IS NOT NULL;

-- Recurring origin lookup for analytics.
CREATE INDEX tasks_recurrence_origin_idx
  ON public.tasks (recurrence_origin_task_id)
  WHERE recurrence_origin_task_id IS NOT NULL;
```

## What's intentionally NOT added

- **No subtasks table.** Confirmed.
- **No `custom` recurrence enum.** Use case is rare; operator can
  manually create the next instance for one-off cadences.
- **No `priority_changed_at` history.** Cost > value.
- **No `due_at_original` to track snooze history.** Cost > value;
  if needed later it can be reconstructed from activity logs.
- **No claim-first model on shared tasks.** Shared-inbox only.
  Confirmed.

## Migration order

To avoid breaking the live tenant during deploy:

1. Create `practice_groups` + `user_group_memberships` tables (empty;
   nothing references them yet).
2. Add `recurrence` + `recurrence_origin_task_id` + `assigned_to_group_id`
   + `assigned_to_everyone` + `auto_completed_via_activity_id` columns
   to `tasks` (all nullable / with sensible defaults — backfill not
   needed).
3. Add `default_task_assignee_mode` + `default_task_assignee_group_id`
   to `tenant_routing_settings` (default `contact_owner` so no
   tenant's behaviour changes until they configure).
4. Add user notification preference columns to `app_users` (sensible
   defaults).
5. Add indexes.
6. Add CHECK constraint on `tasks` that exactly one of the three
   assignee fields is set (only after the new columns ship and the
   write paths are updated — otherwise legacy rows with null on all
   three break the constraint).

Single migration file: `20260524_phase_2b_58_tasks_module_additions.sql`.

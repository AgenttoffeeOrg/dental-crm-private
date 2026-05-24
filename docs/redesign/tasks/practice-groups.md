# Practice groups — new concept

> Phase 2b.58+ — net-new feature. Lets the practice define
> job-function groups (e.g. "Front Desk" / "Treatment Coordinators"
> / "Hygienists") so tasks can be assigned to the whole group at
> once.

## Why this is new

Existing membership roles (`owner` / `manager` / `member` in
`user_tenant_memberships.role`) are about PERMISSIONS — who can
edit settings, who can see all data, etc. They're orthogonal to
job function.

A receptionist and a treatment coordinator might both have `role =
member` (same permission level) but they handle different kinds of
tasks. The practice wants to say "all post-consult follow-up tasks
go to the TC group" without having to know individual user IDs.

Hence: **practice groups**. A separate concept from permission
roles. Practice-defined names. Membership is many-to-many (a user
can be in 0+ groups; "Sarah" can be in both "Front Desk" and
"Trainees").

## Schema

```sql
CREATE TABLE public.practice_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
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

RLS — matches `tenant_ai_context`:
- SELECT: `tenant_id = ANY (get_accessible_tenants())`
- INSERT/UPDATE/DELETE: service-role only. UI writes via API
  routes that gate on the new `practice_groups.manage` permission
  (matches the 2b.13 pattern for adding a permission code).

## Where the practice configures groups

`/settings/practice` — new section "Practice groups". Existing
settings page already houses tenant-wide preferences.

Layout:

```
┌─────────────────────────────────────────────────────────────┐
│  Practice groups                              [+ New group] │
│                                                             │
│  Groups let you assign tasks to a job-function (e.g. all   │
│  the receptionists at once), separate from access roles.   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Front Desk                                  [Edit][×]│ │
│  │  Members: Sarah Doe, Mike Smith, Anna Patel           │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Treatment Coordinators                       [Edit][×]│ │
│  │  Members: Tom Reece, Olivia Jones                     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Edit opens an inline picker — name + description + multi-select
of users.

## How groups appear elsewhere

### Tenant default-assignee setting (`/settings/practice`)

When the practice owner picks "Default task assignee" mode:
- **Contact's owner** — uses `contacts.assigned_to_user_id`.
- **Specific group** — opens a dropdown of groups; pick one. Stored
  in `tenant_routing_settings.default_task_assignee_group_id`.
- **Everyone** — `assigned_to_everyone = true`.

Groups option grey-disabled until at least one group is created.

### Task creation form

The Assignee field has four options:
- Specific person → search-as-you-type operator picker
- Group → dropdown of groups
- Everyone → checkbox/toggle
- (Skip — uses tenant default)

### Task table filter

The Assignee filter on /tasks (per [[tasks-page]]) lets the
operator filter by group too if she has the permission (manager
or owner role).

### Practice playbook rules

The custom rule builder's "Assignee" step on /automations
includes Group as an option (same dropdown).

## Permission considerations

- **Any operator** can SEE which groups exist.
- **Anyone in a group** can SEE tasks assigned to that group (they're
  shared-inbox tasks).
- **Only owners + managers** can create / edit / delete groups (new
  permission code: `practice_groups.manage`).
- **Group members can be added / removed at any time** — tasks already
  assigned to the group remain assigned (they just newly appear /
  disappear from individual queues based on membership at query
  time).

## Defaults shipped on tenant creation

When a tenant is created, ship with **zero groups by default**.
The practice creates their own. The Practice Setup wizard (2b.35.4)
could prompt to create the first group as part of the onboarding
flow.

Optionally: provide a "Use these starter groups" one-click button
in the wizard that creates "Front Desk" + "Treatment Coordinators"
+ "Hygienists" — most practices use these terms, easy on-ramp.

## Implementation phases

| Phase | What |
|---|---|
| 2b.58.Y | Schema — practice_groups + user_group_memberships tables + RLS + migration |
| 2b.58.Z | Permission code `practice_groups.manage` added; assigned by default to owner + manager roles |
| 2b.58.AA | /settings/practice — Practice Groups section UI |
| 2b.58.AB | Groups dropdown wired into task creation form, task table assignee filter, automation rule builder, tenant default-assignee setting |
| 2b.58.AC | Practice Setup wizard — optional "Add starter groups" step (Front Desk / TCs / Hygienists) |

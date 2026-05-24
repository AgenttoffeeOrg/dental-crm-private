# Tasks module rebuild audit

> **Audit type:** Read-only docs/code investigation — no code or schema changes.
> **Date:** 2026-05-24
> **Audited at commit:** `1b111c3` (`fix(2b.57.3): code-review MEDIUM + LOW findings — zero deferrals`)
> **Branch:** `phase-1-attribution-foundation`
> **Working-tree state:** clean apart from `supabase/.temp/cli-latest`, the gitignored `.claude/scheduled_tasks.lock`, the untracked `docs/2b/2b-23-1-fix-changes.md`, and the untracked `scripts/fill-practice-brain.mjs`. No code or schema changes were made by this audit.
> **Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf` ("Deepak's Dental Practice")
> **Scope:** Tasks table + schema, `/tasks` page, TaskQueuePanel, three task creation surfaces, AI commitment-detection pill, practice-playbook automations (task-creation rules), `/call-coaching`, `/reception` (delete confirmation), notification + push + email-digest infrastructure, tenant-level operator settings (default assignee), practice-groups (net-new), recurring tasks (net-new), and per-deal-close task-prompt hook points.
> **Reference docs read:** `docs/operational-gotchas.md`, `docs/audits/contacts_dashboard_rebuild_audit.md`, `docs/audits/automation_engine_audit.md`, `docs/audits/outbound_audit.md`, `docs/audits/deal_attachment_audit.md`, `docs/2b/2b-30-to-33-contacts-module.md`. No `D24_tasks*.md` exists on this branch.

---

## §1 — TL;DR (verdict per subsystem)

| Area | Verdict | One-line summary |
|------|---------|------------------|
| `tasks` table schema | ⚠ Partial | Live table already carries `is_recurring`, `recurring_rule_id`, `parent_task_id`, `reminder_at`, `position`, `completed_at`, `started_at`, `deleted_at`, `actual_duration_minutes`, `estimated_duration_minutes` — but **no `task_recurring_rules` table exists** to back the FK, no `due_date`/`due_at` consistency, no enum for recurrence cadence. |
| Schema drift | ❌ P0 | Engine action `create_task` writes `due_date`, `assigned_to`, `created_by`, `status: 'pending'` — **none of which match the live schema** (`due_at`, `assignee_user_id`, no `created_by` column, allowed statuses are `open/in_progress/done/cancelled`). Engine-created tasks have been silently failing or writing junk. |
| `/tasks` page (`src/app/tasks/page.tsx`, 825 LOC) | ⚠ Repurpose | Already table-first with filter tabs (`all/overdue/today/tomorrow/this_week/no_due_date`) + filter row + Start Queue + view-mode toggle (`list/calendar/analytics`). New brief = mostly trim + add tabs (multi-bucket, channel filter chips, assignee permission-aware). |
| `TaskQueuePanel` (~597 LOC) | ⚠ Rebuild major sections | Side-modal exists with prev/next + complete + skip + notes. Missing: snooze chips, reschedule UI, reassign, inline composers per channel, AI-done auto-complete hint, channel-batch awareness, end-of-queue celebration, mid-queue arrival badge, call-coaching takeover. |
| Three task creators (Slide-Over 479 LOC + Dialog 506 LOC + Panel 396 LOC) | ⚠ Consolidate | Slide-Over used by `/tasks` + dashboard. Dialog used by `contact-tasks.tsx` only. Panel used by `deal-tasks.tsx` only. Recommendation: keep Slide-Over as canonical; archive Dialog + Panel after porting their two callers. Net-new: free-floating mode (no contact, no deal). |
| AI-suggest pill (Path 3) | ❌ Net-new | No existing commitment-detector. `judgeInboundDealAttachment` + `claudeOneShot` are the precedents — same shape works. Bubble already has a CTA slot (the existing "AI unsure" pill at `activity-chat-bubble.tsx:428-525` is the layout precedent). |
| Practice playbook (Path 2) | ⚠ Partial | `/automations` page exists (537 LOC, 4 category tabs incl. **Task Automations** already wired). `workflow-wizard.tsx` (451 LOC) is the 3-step linear builder. `TASK_WORKFLOWS` in `prebuilt-workflows.ts` ships only 2 templates today; the brief wants 8 new ones. Engine triggers `deal_stage_change`, `deal_created`, `contact_created`, `deal_aging` all already mapped in `automation-event-listener.ts`. Backend `create_task` engine action is broken (see schema drift row above). |
| `/call-coaching` | ⚠ Wire as takeover | Workspace already loads a deal queue + ClickToCall + AcitivityFeed. 2b.55 added `?mode=queue` banner — the brief calls for **deleting** the banner and making the takeover seamless from the Tasks queue. ClickToCallDialer's in-page "End Call" remains fake (pre-existing P2 from outbound audit). |
| `/reception` route | ✅ Safe to delete | One-page route mounting `ReceptionWorkspace` (1203 LOC). One sidebar link in `dashboard-layout.tsx:64`. One reference in `live-coach-panel.tsx:140` (copy only). No other code depends on `ReceptionWorkspace`. |
| Notification infra | ⚠ Mostly there | `notifications` + `notification_preferences` + `notification_delivery_log` tables live. **In-app + Email + SMS adapters present**. `digest_preferences` JSONB column exists on `notification_preferences`. **No browser-push subscription storage** (`PushSubscription` / VAPID / `push_token` not present anywhere). `firebase` named as a future adapter only. **No daily-digest cron** today (cron dir has only `process-automation-waits`, `purge-automation-data`, `scheduled-audits`). |
| Default-assignee tenant setting | ❌ Net-new | `tenant_routing_settings` + `tenant_ai_context` + `integration_settings` exist but **no field for default task-assignee policy** (`owner` / `group` / `everyone`). Suggested new column on `tenant_routing_settings` (it's the natural home — already carries routing rules). |
| Practice groups | ❌ Net-new | `dental_groups` is multi-LOCATION (not job-function). `user_tenant_memberships.role` is `owner/manager/member` (permissions, not function). No `practice_groups` / `user_group_memberships` job-function table. |
| Recurring tasks | ⚠ Partial | `tasks.is_recurring` + `tasks.recurring_rule_id` columns exist but the **referenced table doesn't exist** (no `task_recurring_rules` in supabase types). Net-new: build that table + a cron worker that creates the next instance on completion. |
| Deal-close prompt | ❌ Net-new hook | Deal stage update happens in 3+ places (`deal-slide-in-panel.tsx:55`, `enterprise-deals-table.tsx:929` via DnD, `simple-deal-dialog.tsx:584`, `create-deal-slide-over.tsx`). None query for open tasks before mutating. **No single chokepoint** for the prompt. The closest is `PATCH /api/deals/[id]` — backend should refuse-without-prompt or expose a "close open tasks" companion endpoint. |

**Headline:** The tasks module already has substantial scaffolding — table, queue panel, three creators, escalation rules, dependency chains, reminder settings, notification routing, automations engine with `create_task` action, four event triggers mapped. The rebuild is **5 net-new schema items** (`task_recurring_rules`, `practice_groups`, `user_group_memberships`, `tenant_routing_settings.default_assignee_policy`, push-subscription storage) + **3 broken-then-fix items** (the engine `create_task` column-name drift, the missing recurring-rules backing table, the lack of a deal-close prompt chokepoint) + **substantial UI work** (queue panel features, 8 prebuilt templates, AI commitment-detection pill, channel-batch filter, snooze/reschedule chips). The walk-through queue and the per-channel inline composer already exist as separate concepts; the rebuild fuses them.

---

## §2 — D<N> reality check

No `D24_tasks_*.md` Tier-3 deep-dive doc exists on this branch. The only D-file in `docs/` is `DEPLOYMENT_GUIDE.md`. So there is no historical doc to verify against.

The audit precedents that are relevant — and remain accurate as of 2026-05-24:

| Doc | Date | Relevant claims still accurate? |
|---|---|---|
| `contacts_dashboard_rebuild_audit.md` (2b.36 prep) | 2026-05-23 | Yes. Notes that `TaskQueuePanel` "already implements a one-at-a-time walk-through queue" and is "the seed of the Start Queue mode" (§1, §3). Notes that the dashboard's "Today's Priorities" lane click is wired to `/tasks?mode=queue` (matches 2b.54 ship). Notes that no global push exists. |
| `automation_engine_audit.md` (2b.12) | 2026-05-20 | Mostly. The engine has shipped through 2b.23 (TTL purge cron). The `create_task` schema-drift bug **was not flagged** in that audit — it is being flagged for the first time here (see §7 F1). |
| `outbound_audit.md` (2b.6) | 2026-05-11 | The fake "End Call" on `ClickToCallDialer` (§1.1) is still in the codebase; the rebuild has to accept that as a known carry-over since the brief takes it out of scope. |
| `deal_attachment_audit.md` (2b.11.5) | 2026-05-19 | Locked principles #5 (single deal per activity), #6 (most-recently-active open deal), #13 (reassignment doesn't re-fire first-response) are all in force. Relevant to the per-deal-close task prompt: the prompt only fires on the *deal* closing, not on an *activity* moving — those are different events. |

---

## §3 — Code inventory

### Tasks: page + UI components

| Path | LOC | Role |
|---|---|---|
| `src/app/tasks/page.tsx` | 825 | The Tasks page. Filter tabs (`all/overdue/today/tomorrow/this_week/no_due_date`), filter row (location/contact/deal/assignee/type/priority), search, bulk-selection checkboxes, view toggle (`list/calendar/analytics`), Start Queue + New Task buttons. Reads `tasks_with_associations` view (line 192-196). Loads `contacts/deals/users` for the filter dropdowns. Auto-opens `TaskQueuePanel` on `?mode=queue`. Keyboard shortcuts (`j/k/Cmd+N/Cmd+Q`). |
| `src/components/tasks/task-queue-panel.tsx` | 597 | The walk-through queue side-modal (900px wide). Loads contact + deal details for the current task. Notes textarea. Prev / Skip / Complete & Next buttons. Right column is a **placeholder "AI Briefing"** with fake talking points + suggested opening lines (line 461-514) — those are hardcoded strings, not real AI output. |
| `src/components/tasks/task-card-enterprise.tsx` | 229 | Card render variant of a single task (not currently mounted on `/tasks`). |
| `src/components/tasks/task-detail-modal.tsx` | 468 | Standalone task detail modal. Used by `bulk-actions-menu.tsx` and `task-card-enterprise.tsx`. |
| `src/components/tasks/task-calendar-view.tsx` | 170 | Calendar grid view. `/tasks` mounts this on `viewMode === 'calendar'`. Brief says: keep as third view. |
| `src/components/tasks/bulk-actions-menu.tsx` | 585 | Bulk-edit dropdown (assign / priority / due date / type / delete / export). Brief is silent on bulk; safe to keep. |
| `src/components/tasks/task-reminders-config.tsx` | 252 | Per-task reminder configuration UI. Writes a `reminder_at` column on tasks (already exists in schema). |
| `src/components/tasks/task-templates-manager.tsx` | 344 | Template CRUD for the `task_templates` table. Brief: keep, lives at `/settings/task-templates`. Today there's no `/settings/task-templates` route mounting it; the page is dormant. |

### Tasks: three creation surfaces

| Path | LOC | Where mounted |
|---|---|---|
| `src/components/tasks/create-task-slide-over.tsx` | 479 | `app/tasks/page.tsx` (toolbar "New Task" + `?mode=queue` flow), `app/dashboard/page.tsx`, `app/dashboard-new/page.tsx`, `app/dashboard/page.old.tsx`. The canonical creator. Has `preselectedContactId` + `preselectedDealId` props. **Requires a `location_id` to be resolvable** (line 137-152 of `/api/tasks/route.ts` enforces this). |
| `src/components/tasks/create-task-dialog.tsx` | 506 | `src/components/contacts/contact-tasks.tsx` only. `react-hook-form` + `zodResolver`. Has `tenantId` + `preselectedContactId` + `preselectedDealId` props. Uses centred Dialog component. |
| `src/components/tasks/create-task-panel.tsx` | 396 | `src/components/deals/deal-tasks.tsx` only. Right-side slide-over with `prefilledDealId` + `prefilledContactId`. Pre-fills `estimated_duration_minutes=30`. |

All three POST to the same endpoint (`/api/tasks` or the `useTaskMutation` hook). Functional difference is **only the UX shell** (Dialog vs Slide-over vs Panel). All three currently **require either contact_id or deal_id** to be set (via the `location_id` requirement in the API).

### Tasks: API routes

| Path | Methods | Role |
|---|---|---|
| `src/app/api/tasks/route.ts` | GET, POST | List + create. GET filters by `status/priority/task_type/assignee_user_id/contact_id/deal_id/location_id/due_before/due_after`. POST validates against `TaskCreateSchema` (`src/schemas/task.schema.ts`). **Enforces non-null `location_id`** at line 170 — this is the reason a free-floating task requires either a contact-link or a deal-link or an explicit `location_id`. |
| `src/app/api/tasks/[id]/route.ts` | GET, PATCH, DELETE | Per-task. DELETE soft-deletes (sets `status: 'cancelled'` + `deleted_at`). PATCH re-resolves location on contact/deal change. |
| `src/schemas/task.schema.ts` | — | Zod schemas. `TaskStatusEnum = open|in_progress|done|cancelled`. `TaskPriorityEnum = low|normal|high|urgent`. `TaskTypeEnum = call|email|meeting|todo|follow_up`. Notably **no `is_recurring`, no `recurring_rule_id`, no `reminder_at`** in the schema — those columns exist on the table but the API can't write/read them. |

### Automations: page + builder + engine

| Path | LOC | Role |
|---|---|---|
| `src/app/automations/page.tsx` | 537 | The automations hub. 4 category tabs (`deal/pipeline/task/marketing`). Reads from `automations` table directly. `Plus` button opens `CreateAutomationSlideOver`. |
| `src/app/automations/new/page.tsx` | 12 | Mount point for `WorkflowWizard`. |
| `src/components/automations/workflow-wizard.tsx` | 451 | 3-step linear wizard. Trigger → first action → optional wait + follow-up → on-patient-reply (`stop` / `ai_continue`) → quiet hours → publish. Output is `graph_json` for the engine. Triggers limited to 4 today: `inbound_sms`, `inbound_whatsapp`, `form_submitted`, `google_lead_form_submitted`. **Does NOT include the brief's needed triggers**: `deal_stage_change`, `deal_created`, `contact_created (with source filter)`, `deal_aging` — though all four are mapped in the event-listener and supported by the engine. Wizard just doesn't expose them. |
| `src/components/automations/automation-canvas.tsx` | n/a | Advanced XYFlow canvas (free-form node graph). |
| `src/components/automations/create-automation-slide-over.tsx` | n/a | Slide-over for creating automations (likely the older path). |
| `src/components/automations/nodes/` | n/a | XYFlow node components. |

### Automations: engine + actions

| Path | LOC | Role |
|---|---|---|
| `src/lib/automations/automation-engine.ts` | 989 | The runner. Node types include `create_task` (line 494-517). **Bug:** writes `due_date`, `assigned_to`, `created_by: 'automation'`, `status: 'pending'` — these columns/values don't match the live schema (see §7 F1). |
| `src/lib/automations/task-automation-actions.ts` | 674 | Escalations + dependencies + reminders + auto-reassignment + auto-prioritisation + auto-completion. Reads/writes the `tasks` table directly. Most paths use the API or the `tasks` table; the engine's `create_task` is the broken outlier. |
| `src/lib/automations/automation-event-listener.ts` | n/a | Maps unified events → trigger_type strings. Has rows for: `DEAL.CREATED → deal_created`, `DEAL.MOVED → deal_stage_change`, `DEAL.WON → deal_won`, `DEAL.LOST → deal_lost`, `DEAL.AGING → deal_aging`, `TASK.COMPLETED → task_completed`, `CONTACT.CREATED → contact_created`, `INBOUND.SMS_RECEIVED → inbound_sms`, and ~25 others. All the brief's needed triggers are wired. |
| `src/lib/automations/prebuilt-workflows.ts` | 487 | The static template library. `DEAL_WORKFLOWS` (6 templates), `TASK_WORKFLOWS` (2 templates: `task_overdue_escalation`, `task_completed_next_task`), `CONTACT_WORKFLOWS` (2 templates). The brief wants 8 net-new task-creation templates seeded as toggleable cards on `/automations`. |
| `src/lib/automations/inbound-prebuilts.ts` | 200 | Five tenant-seed inbound workflows (added in 2b.22). Seeded per-tenant as drafts. The brief's 8 task-creation templates would follow the same shape. |
| `src/lib/automations/practice-brain.ts`, `ai-reply-drafter.ts`, `pipeline-router.ts`, `faq-responder.ts` | n/a | Claude one-shot helpers. Precedents for the AI commitment detector. |
| `src/app/api/automations/route.ts`, `[id]/route.ts`, `[id]/clone/route.ts`, `install-template/route.ts`, `seed/route.ts`, `templates/route.ts`, `templates/[id]/route.ts` | n/a | CRUD endpoints. `install-template` is the endpoint the new "toggle this template on" button would call. |

### Activities feed + chat bubble (where the AI pill mounts)

| Path | LOC | Role |
|---|---|---|
| `src/components/activities/activity-feed-enterprise.tsx` | 1665 | The chat feed. Renders `ActivityChatBubble` per row (since 2b.41). Carries the AI-suggest-pipeline pill plumbing. |
| `src/components/activities/activity-chat-bubble.tsx` | 545 | The bubble. Already has an inline pill region (line 420-525) that the new "AI heard a commitment" pill can graft onto — same visual language (rounded amber pill + Accept/Dismiss buttons + Suggest button + Thinking… animation). |
| `src/components/activities/chat-quick-reply.tsx` | 289 | Pinned bottom quick-reply. Same precedent for an inline "Create task" CTA shape. |
| `src/lib/lead-ingestion/judge-deal-attachment.ts` | n/a | The closest existing Claude one-shot judging-text-content precedent (decides whether an inbound goes onto an existing deal vs a new one). The commitment detector borrows this pattern. |
| `src/lib/anthropic-client.ts` | 70 | `claudeOneShot()`. Default Haiku 4.5. Cheap enough for commitment detection. |

### Notifications + cron + push

| Path | LOC | Role |
|---|---|---|
| `src/lib/notifications/notification-router.ts` | n/a | `emitNotification()`. Routes through channel adapters per user prefs. |
| `src/lib/notifications/channel-adapters.ts` | n/a | In-app + Email (Resend) + SMS (Twilio) + WhatsApp adapters. **Push channel** is named in comments as "Firebase — future" — **not implemented**. |
| `src/lib/notifications/event-catalog.ts` | n/a | Event-type registry. Already has `task.assigned`, `task.due_soon`, `task.overdue`, `task.escalated`. |
| `src/components/notifications/notifications-bell-button.tsx` + `notifications-drawer.tsx` | n/a | The in-app notification UI. |
| `src/app/api/cron/process-automation-waits/route.ts` | n/a | Existing cron for automation wait-step processing. |
| `src/app/api/cron/purge-automation-data/route.ts` | n/a | TTL purge cron (2b.23). |
| `src/app/api/cron/scheduled-audits/route.ts` | n/a | Audit-data scheduled job. |
| (no `cron/daily-digest`) | — | **Missing.** The morning email digest at 8am tenant-local time needs a new cron route. |
| (no `cron/task-reminders`) | — | **Missing.** Existing `sendTaskReminders()` function in `task-automation-actions.ts` is never called by any cron — it's defined but orphaned. |
| `public/manifest.json` | n/a | PWA manifest exists. Standalone display mode. Icons referenced. **No service-worker registration for push** — `public/form-service-worker.js` is offline-form only. |

### Reception + call coaching + deal-close hooks

| Path | LOC | Role |
|---|---|---|
| `src/app/reception/page.tsx` | 18 | Mount of `ReceptionWorkspace`. |
| `src/components/reception/reception-workspace.tsx` | 1203 | The workspace. Imports `resolveMostRecentlyActiveOpenDeal`, `ClickToCallDialer`, all four composers. Has its own deals/persona/tasks/activities loaders. **Replaced by Dashboard + Tasks + Call Coaching per the brief.** |
| `src/components/dashboard/live-coach-panel.tsx:140` | n/a | Single string reference to "receptionist interactions" — copy only, no code dep on the route. |
| `src/components/layout/dashboard-layout.tsx:64` | n/a | The sidebar Nav item for `/reception`. |
| `src/config/dashboard-layouts.ts:129` | n/a | `case 'receptionist'` in a layout-by-role switch — copy only. |
| `src/app/call-coaching/page.tsx` | 78 | Mount of `CallCoachingWorkspace`. Carries the 2b.55 `?mode=queue` banner (purple bar + "Back to dashboard" + X to exit). **The brief deletes this banner** because the call-coaching takeover is invoked from the Tasks queue, not from a separate URL state. |
| `src/components/call-coaching/call-coaching-workspace.tsx` | 765 | Loads top-30 deals by `deals.updated_at DESC` (line 73-85). Mounts persona + scripts + ClickToCall + Email + SMS composers + Activity feed. **Imports** `ContactPsychProfile` + `ContactPsychProfileHistory` — those tables don't exist (see contacts-dashboard audit P2-D). |
| `src/app/api/deals/[id]/route.ts` | n/a | Deal PATCH endpoint. **No "are there open tasks?" check** before applying `stage_id` change. The deal-close prompt has to either be a client-side check (open tasks → modal → call separate "close-tasks" endpoint) or a server-side return-prompt response that the client handles. |

---

## §4 — Data model

### `public.tasks` — live columns (from `src/types/supabase.ts` line 21699-21792)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | UUID NOT NULL | RLS-scoped |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `status` | TEXT NOT NULL | Live CHECK: `open/in_progress/done/cancelled`. Engine writes `pending` — **not allowed** (see §7 F1). |
| `priority` | TEXT NOT NULL | `low/normal/high/urgent` |
| `task_type` | TEXT | `call/email/meeting/todo/follow_up` per schema |
| `assignee_user_id` | UUID FK app_users | Canonical assignee field |
| `assignee` | TEXT | **Legacy**, present, not used by API |
| `assignee_id` | UUID | **Legacy**, present, not used by API |
| `owner_user_id` | UUID FK app_users | Owner (separate from assignee) |
| `due_at` | TIMESTAMPTZ | Canonical due time |
| `due_date` | DATE | **Legacy**, present, engine writes here — wrong target |
| `contact_id` | UUID FK contacts | nullable |
| `deal_id` | UUID FK deals | nullable |
| `location_id` | UUID FK locations | nullable in schema, **enforced non-null by API** |
| `auto_created` | BOOLEAN | Marker for automation-created tasks |
| `is_recurring` | BOOLEAN | **Exists**, no API path to write |
| `recurring_rule_id` | UUID | **Exists**, FK target table missing |
| `parent_task_id` | UUID FK tasks | Subtasks (brief: no subtasks in v1, so don't write) |
| `reminder_at` | TIMESTAMPTZ | Per-task reminder; `task-reminders-config.tsx` writes it |
| `position` | INTEGER | Manual sort order; unused by `/tasks` page |
| `completed_at` | TIMESTAMPTZ | Set on done |
| `started_at` | TIMESTAMPTZ | Set when moved to in_progress (reassignment logic depends on it being null = "not started") |
| `actual_duration_minutes` | INTEGER | |
| `estimated_duration_minutes` | INTEGER | Pre-filled by `create-task-panel.tsx` to 30 |
| `notes` | TEXT | |
| `deleted_at` | TIMESTAMPTZ | Soft-delete |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**Indexes** (from `20240101000000_initial_schema.sql:146-149`):
- `idx_tasks_tenant_id`, `idx_tasks_assignee_user_id`, `idx_tasks_status`, `idx_tasks_due_at`

### `public.task_templates`

`id`, `tenant_id`, `name`, `description`, `task_type` NOT NULL, `priority`, `estimated_duration_minutes`, `default_notes`, `trigger_stage_id` (FK pipeline_stages), `is_active`, timestamps. Brief: lives at `/settings/task-templates` page (which doesn't exist yet); manual fire only.

### `public.task_escalation_rules`

Per `2025011617_task_automation_rules.sql`: `id`, `tenant_id`, `priority`, `overdue_hours`, `escalate_to_role` (`manager|owner|director`), `notify_assignee`, `notify_escalation_target`, `auto_increase_priority`, `is_active`. Read by `checkTaskEscalations()` cron-style function — **not invoked by any cron** today.

### `public.task_dependencies`

Per same migration: `id`, `tenant_id`, `parent_task_id` (plain UUID, no FK constraint by design), `child_task_template` (JSONB), `is_active`. Read by `handleTaskCompletion()` which DOES fire when a task is completed via `useTaskMutation`.

### `public.task_reminder_settings`

Per-tenant (UNIQUE `tenant_id`). Fields: `remind_1h_before`, `remind_4h_before`, `remind_24h_before`, `email_enabled`, `sms_enabled`, `push_enabled`, `in_app_enabled`, `respect_business_hours`, `business_hours_start`, `business_hours_end`. **Mostly aspirational** — `sendTaskReminders()` reads tasks but doesn't actually consult this table; the values are settings for a future cron.

### `public.task_comments`

`id`, `tenant_id`, `task_id`, `user_id`, `content`, `mentions[]`. Used by `tasks_with_associations.comment_count`. Brief is silent on comments.

### `public.tasks_with_associations` view

Joins `tasks` + `contacts` + `deals` + `app_users` + `locations`. Adds `contact_name`, `contact_email`, `contact_phone`, `deal_title`, `assignee_name`, `assignee_email`, `location_name`, `subtask_count` (computed), `comment_count` (computed).

### `public.notification_preferences`

Already carries: `in_app_enabled`, `email_enabled`, `sms_enabled`, `push_enabled`, `email_consented_at`, `sms_consented_at`, `event_preferences` (JSONB per-event toggles), `digest_preferences` (JSONB) — **the digest column already exists; the brief's morning email digest can persist its opt-in there**. `quiet_hours` (JSONB w/ start/end/timezone/days). `muted_objects` (JSONB). `snoozed_until` (TIMESTAMPTZ).

### `public.notifications`

`id`, `tenant_id`, `location_id`, `event_key`, `event_id` (dedup), `user_id`, `title`, `body`, `severity`, `priority` (`low/medium/high/urgent`), `module`, `entity_type`, `entity_id`, `entity_url`, `quick_actions` (JSONB), `read_at`, `archived_at`, `snoozed_until`, `expires_at`, `group_key`, `parent_id`, `metadata`, `triggered_by_user_id`.

### `public.tenant_routing_settings` (default-assignee target)

Already exists (per type-defs grep). Natural home for the brief's `default_assignee_policy` (`owner` / `group:<id>` / `everyone`).

### Tables that DO NOT exist on this branch

- `task_recurring_rules` — **needed**; `tasks.recurring_rule_id` FK target.
- `practice_groups` — **needed**; job-function groups (Front Desk / TC / Hygienist / etc).
- `user_group_memberships` — **needed**; many-to-many between `app_users` and `practice_groups`.
- `push_subscriptions` — **needed**; persists browser-push endpoints + VAPID keys per user.
- `contact_psych_profiles` / `contact_psych_profile_history` — exist in TS types but **no live tables** (paused per contacts audit P2-D); reception workspace + call-coaching workspace import them but the imports never resolve at runtime.

### RLS / triggers / FKs relevant to the rebuild

- **`audit_trail`** insert restricted to service-role (locked principle). The new "task reassigned" / "task closed" / "task auto-completed" audit rows must go through `logAuditServer()`.
- **No trigger** on `tasks` bumps `deals.last_activity_at` (carry-over from deal-attachment P1).
- **No trigger** maintains `tasks.completed_at` — the API and the `TaskQueuePanel.handleComplete` both set it manually.

---

## §5 — Current behavior (behavior matrix)

### Tasks list (`/tasks`)

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Default load | Filter tab = `today`, view = `list`, sort `due_at asc nulls last` then `created_at desc`. | Brief: keep `today` as default landing, add multi-bucket date filter, add channel filter chips. |
| Filter tabs | `all/overdue/today/tomorrow/this_week/no_due_date` with count badges. | Brief: keep `All / Today / Tomorrow / Overdue`; **add multi-bucket** (next week, next month, custom range, multi-select). |
| Channel filter | Task-type dropdown filter exists (call/email/meeting/todo/follow_up). | Brief: add **channel chip row** above the table (Calls / Messages / All-mixed). The chip determines whether Start Queue mounts modal or workspace. |
| Assignee filter | Single-select dropdown (or `unassigned`). All users from tenant. | Brief: **permission-aware** — solo sees only themselves; group membership shows their group; manager sees all + multi-select. Requires `practice_groups` + `user_group_memberships`. |
| Priority filter | Single-select dropdown. | Keep. |
| Search | In-memory across `title/description/contact_name/deal_title/assignee_name/location_name/task_type/priority`. | Keep. |
| Bulk select | Checkbox column + BulkActionsMenu. | Keep (silent in brief). |
| Per-row Mark Done | **Missing** — there's a hover MoreVertical button but no inline checkmark. | **Add inline Mark Done button.** |
| Per-row priority | Shown as Badge next to type icon. | Brief: priority dot/chip next to title. Minor restyle. |
| View mode | `list` / `calendar` / `analytics` toggle. | Keep `calendar` (third view); analytics dashboard stays. |
| Start Queue | Opens TaskQueuePanel with `filteredTasks`. | Brief: same trigger, but the queue inherits the active **channel chip mode**. |
| Recurring badge | `task.is_recurring` shows a Repeat icon (line 700-702). Field is unwritten today. | Will become live once recurring rules schema ships. |
| Sort order | Per filter tab. No urgent-first jump. | Brief: **urgent priority jumps to front** of queue (not list — list keeps due-time sort). |

### TaskQueuePanel

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Mount | 900px right-side slide-over. 2-column body (Task Details / AI Briefing). | Brief: keep side-modal shell, but the right "AI Briefing" column is fake (hardcoded talking points line 461-514) — **delete or replace with real deal-intelligence summary**. |
| Per-task load | Loads contact + deal details via Supabase fetch. | Keep. |
| Complete | Sets `status='done'`, `completed_at=now`, advances to next. | Keep. |
| Skip | Advances to next without mutating. | Brief: **append the task to END of today's queue**, not just advance the cursor. Today's behaviour silently drops the task from the session. |
| Snooze | **Not present**. | Net-new: chips (1h / End of day / Tomorrow 9am / Next week) + Custom date+time. Calls PATCH `tasks/[id]` with new `due_at`. |
| Reschedule | **Not present**. | Net-new: open date+time picker, PATCH `due_at`. |
| Reassign | **Not present**. | Net-new: open user-picker (permission-aware), PATCH `assignee_user_id`. Audit log via `logAuditServer()`. |
| Inline composers | **Not present** in queue panel (contact card has tel:/mailto: links only). | Net-new: per channel — Call/SMS/WhatsApp/Email opens the relevant existing composer slide-over OR an inline mini-composer per the brief. |
| Inline add-note | **Notes textarea exists** but is per-task `task.notes`, NOT a contact activity note. | Brief: add the ability to log a contact note from inside the queue. |
| AI-done auto-complete | **Not present**. | Net-new (Path X): when an outbound activity of the matching channel is created for the task's contact AFTER the task's `created_at`, the next page render of the queue marks the task done with hint "Auto-completed because you sent an [email] to [Joey]" + Reopen button. Watchable via a query on `activities` filtered by `type` + `contact_id` + `occurred_at > task.created_at`. |
| Call outcome rules | **Not present**. ClickToCallDialer doesn't write task outcome. | Net-new: connected → done; voicemail → done + auto-create follow-up tomorrow; no-answer → done + auto-create +3h; busy/wrong-number → leave open. Outcomes already captured on the `activities.outcome` field for calls. |
| Mid-queue arrival | **Not present**. The `tasks` prop is closed-over on open. | Net-new: subscribe (or poll every ~30s) to new tasks for the same tenant + filter; if a new one matches, push to end of queue + "+1 new" footer badge. |
| End-of-queue celebration | Today: toast `🎉 All tasks completed!` + auto-close. | Brief: full celebration screen + back-to-dashboard CTA — replace the toast. |
| Channel-batch awareness | **Not present**. Queue is type-agnostic. | Net-new: if mode = Calls, mount `CallCoachingWorkspace` takeover per task; if mode = Messages, side modal per task; if All-mixed, flip per task. |
| Queue order | Whatever `tasks` was filtered to (no resort). | Brief: urgent priority jumps to front; otherwise sorted by due time. Sort happens on queue mount. |

### Task creation surfaces

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| From `/tasks` toolbar | `CreateTaskSlideOver` opens with no preselect. | Keep. |
| From contact page | `contact-tasks.tsx` mounts `CreateTaskDialog` with `preselectedContactId`. | Migrate to `CreateTaskSlideOver` (the canonical surface) with the same prop. Archive `CreateTaskDialog`. |
| From deal page | `deal-tasks.tsx` mounts `CreateTaskPanel` with `prefilledDealId`. | Migrate to `CreateTaskSlideOver` with `preselectedDealId`. Archive `CreateTaskPanel`. |
| From dashboard Quick Actions | "Log activity" deferred per 2b.57.3 NOTE — needs contact picker. | Brief: net-new **contact-pickerless manual task creation flow** for free-floating tasks. New props on `CreateTaskSlideOver`: allow no contact, no deal, no location (relax the API requirement). |
| Free-floating tasks (no contact, no deal) | **API rejects** at `/api/tasks/route.ts:170` — requires `location_id` which is inherited from contact or deal. | Brief explicitly wants free-floating tasks. **Schema change:** make `location_id` nullable OR default to operator's active location (`activeLocationId` is already in context). Recommend the latter (less invasive). |
| Recurring | UI has no field for it. | Net-new: dropdown (none/daily/weekly/monthly/custom). Writes to a new `task_recurring_rules` row + sets `is_recurring=true` + `recurring_rule_id`. |
| Date + time | Single `due_at` TIMESTAMPTZ field. UI picker is single combined picker. | Brief: date picker + time picker as separate inputs (both required for new tasks). Implementation = same column, just split UI. |
| Assignee | Single user dropdown. | Brief: person OR group OR "everyone" (shared-inbox semantics). Requires `practice_groups` schema. Tasks table needs new columns `assignee_group_id UUID NULL` + `assignee_kind TEXT NOT NULL DEFAULT 'user'` (`user`/`group`/`everyone`). |

### Practice playbook (Path 2)

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| `/automations` page | 4 category tabs (deal/pipeline/task/marketing). Reads from `automations` table. | Brief: keep page, **do not create new page**. The new Practice Playbook is the same UI just with more templates seeded. |
| Pre-built templates UI | Today, templates live in `prebuilt-workflows.ts`. No toggle-card UI on `/automations` page. The "+" button opens the wizard for new automations. | Net-new: toggle-card row per template (default ON for the recommended 5; OFF for the optional 3). |
| Custom rule builder | `workflow-wizard.tsx` (451 LOC) — 3 steps (trigger / action / wait+follow-up + reply behaviour + quiet hours). | Brief matches the existing wizard shape but **needs more triggers exposed**: `deal_stage_change`, `deal_created`, `contact_created`, `deal_aging`. All four are mapped in the event listener. |
| `create_task` action | Engine has the node type. **Broken — writes wrong columns** (see §7 F1). | Fix the column names + status value before any prebuilt template using it can ship reliably. |
| Template vars | `{{contact.full_name}}`, `{{deal.title}}`, etc. | Brief: `{contact.full_name}`, `{deal.title}`, `{deal.value}` (uses curly-single not curly-double). Pick one and migrate. Recommend the existing `{{...}}` (matches Mustache/Handlebars convention, already used by send_email subject templates). |
| Per-tenant install | `install-template` API exists. | Brief: toggle on a template = install for tenant + auto-publish. |

### AI-suggest pill (Path 3)

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Existing precedent | The "AI unsure" pill on the bubble (lines 428-525 of `activity-chat-bubble.tsx`) — exact same shape (amber pill → Suggest button → fetching → Accept/Dismiss). | Net-new pill follows the same JSX layout. Different metadata field (`ai_commitment_detected`) and different POST endpoint. |
| When to fire | **Today: never.** No code scans inbound message text for commitments. | Net-new: a Claude one-shot fires on every inbound (SMS/WhatsApp/email) text. Cache result on `activities.metadata.ai_commitment` JSONB with `{detected: bool, suggested_title, suggested_due_at, suggested_type, confidence}`. |
| When to render | If `metadata.ai_commitment?.detected === true`. | Net-new render condition under the bubble. |
| Click → create task | **Not present.** | Net-new POST `/api/tasks` with parsed fields. Edit button opens `CreateTaskSlideOver` pre-filled. |
| For outbound | Brief: also detect on outbound ("I'll call you Thursday"). | Same one-shot, just runs on outbound activities too. |

### `/call-coaching`

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Mount | `/call-coaching` page with optional `?mode=queue` purple banner (2b.55). | Brief: **delete the banner** + the `?mode=queue` URL state. Workspace is invoked as a takeover from the Tasks queue. |
| Queue load | Top-30 deals by `deals.updated_at DESC`. | Brief: replace with "the call tasks the Tasks queue is currently iterating over". The `CallCoachingWorkspace` needs a new prop `taskQueue?: Task[]` that bypasses the deal-loader. |
| Live coaching | Persona + scripts + ClickToCall + composers. | Keep. |
| Post-call review | Standalone landing page (today's `/call-coaching` without `?mode=queue`). | Keep. |
| End Call (in dialer) | Fake setTimeout (outbound audit §1.1). | Out of scope. Carry forward. |

### `/reception`

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Route | `/reception` mounts `ReceptionWorkspace`. | **DELETE**. |
| Sidebar nav | Item at `dashboard-layout.tsx:64`. | Remove. |
| Other code refs | `live-coach-panel.tsx:140` (copy only — "Latest receptionist interactions"), `config/dashboard-layouts.ts:129` (`case 'receptionist'` — copy only). | Update copy in both. |
| Component imports | `ReceptionWorkspace` is imported only by `/reception/page.tsx`. Its own imports (`ClickToCallDialer`, composers, `resolveMostRecentlyActiveOpenDeal`, etc) are reused everywhere else. | Safe to delete the file. |

### Notifications

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| In-app | Real-time via Supabase realtime + `notifications-drawer.tsx`. | Keep. |
| Email | Resend adapter (`channel-adapters.ts`). | Keep. |
| SMS | Twilio adapter. | Keep. |
| Push (browser) | **Absent**. No `push_subscriptions` table, no service-worker registration, no VAPID keys. `manifest.json` is PWA-ready but doesn't request push permission. | Net-new infra: `push_subscriptions` table + a service worker (separate from `form-service-worker.js`) + VAPID key generation + a permission-request UX + a `web-push` library + adapter wiring. |
| Email digest | `notification_preferences.digest_preferences` JSONB exists but **no cron fires it**. | Net-new cron at `/api/cron/daily-digest/route.ts`. Tenant-local 8am — requires tenant timezone settings (already on `tenant_routing_settings`?). |
| Due-now ping | `sendTaskReminders()` defined in `task-automation-actions.ts:331-400` but **never invoked by cron**. | Net-new cron at `/api/cron/task-reminders/route.ts` — wires the existing function on a schedule. |
| Overdue ping | `checkTaskEscalations()` defined but **never invoked by cron**. | Same: wire it via cron. |
| Manager escalation | Engine has it; needs cron wiring. | Same. |

### Per-deal-close prompt

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Where deals close | DnD on Kanban → `enterprise-deals-table.tsx:929` directly updates `stage_id`. Slide-in stage change → `deal-slide-in-panel.tsx:55` direct update. `simple-deal-dialog.tsx:584` for edits. `PATCH /api/deals/[id]/route.ts` for the API path. | None of these check open tasks. |
| Closed = won/lost detection | Done by joining `pipeline_stages.is_won/is_lost` (locked principle #9). | Use the same flag check. |
| Prompt UX trigger | **No existing chokepoint.** | Recommend: client-side check before PATCH (across all 3 mutation points). On stage change → if target stage `is_won || is_lost` AND open tasks for `deal_id` > 0 → open modal → operator un-ticks tasks they want to keep open → confirm → call `PATCH /api/tasks/bulk-close` (new endpoint) → then proceed with the stage PATCH. Server-side check is the safety net (rejects stage change if open tasks exist + caller didn't pass `force=true`). |

---

## §6 — Live DB state

Queries were not run via Supabase MCP for this audit (credentials access denied; the audit is read-only and the existing types in `src/types/supabase.ts` are the canonical column reference). Carrying forward the working baselines from the prior audits:

- Test tenant: `5aadca14-9786-4aef-bc53-e9287cdd0bbf`.
- 135 deals on the test tenant (per `deal_attachment_audit.md` §6).
- 0 rows in `task_templates` across all tenants (per `contacts_dashboard_rebuild_audit.md` §6 — checked there).
- `pipeline_stages.is_won/is_lost` flags set correctly on test tenant.
- `notifications` + `notification_preferences` + `notification_delivery_log` tables present (per the migration `2025011613_notifications_system.sql` which has been applied — types reflect it).
- `tasks_with_associations` view present (applied via MCP per `20260502155655_*.sql` back-fill note).

Planner should run a quick sanity SELECT before the first execution phase confirms the following live state, on the test tenant:

1. `SELECT COUNT(*) FROM tasks WHERE tenant_id = '5aadca14-...';`  
2. `SELECT COUNT(*) FROM tasks WHERE tenant_id = '5aadca14-...' AND status = 'open';`  
3. `SELECT COUNT(*) FROM tasks WHERE tenant_id = '5aadca14-...' AND is_recurring = true;` (expected 0 — column unused)
4. `SELECT to_regclass('public.task_recurring_rules');` (expected NULL — table missing)
5. `SELECT to_regclass('public.practice_groups');` (expected NULL — table missing)
6. `SELECT to_regclass('public.push_subscriptions');` (expected NULL — table missing)
7. `SELECT * FROM automations WHERE tenant_id = '5aadca14-...' AND category = 'task';` (expected very few or none)

---

## §7 — Failure modes / common errors

| # | Failure | Where | Severity |
|---|---|---|---|
| F1 | **`create_task` engine action writes wrong columns and wrong status.** Writes `due_date` (legacy column, not the API's `due_at`), `assigned_to` (column doesn't exist; live API uses `assignee_user_id`), `created_by` (column doesn't exist), `status: 'pending'` (CHECK constraint only allows `open/in_progress/done/cancelled`). The Supabase `insert` likely succeeds for `due_date` (legacy column exists) and silently NULLs the unrecognised fields, but the status value will be rejected at the CHECK constraint — **the insert fails entirely**, and the engine swallows the error (the `catch` at line 318-321 just logs and continues). Net effect: prebuilt task workflows installed but never produce tasks. | `src/lib/automations/automation-engine.ts:494-517` | **P0** — blocks the entire practice-playbook feature |
| F2 | **`tasks.recurring_rule_id` FK target doesn't exist.** Column declared, no backing table. Any attempt to write a real value would fail constraint check (or NULL if the FK wasn't actually defined; the migration setting up these columns isn't in the visible migration history — they were likely added via MCP without a tracked file). | live schema | **P1** — blocks recurring tasks v1 |
| F3 | **`/api/tasks` requires `location_id`** (line 170-175). Combined with `location_id` being inherited only from contact OR deal, free-floating tasks (the brief's explicit Path 1) cannot be created at all. | `src/app/api/tasks/route.ts:170` | **P1** — blocks the dashboard Quick Actions free-floating create |
| F4 | **`TaskQueuePanel` right column is fake AI.** Hardcoded talking points + suggested opening lines ("Hi {first_name}, this is [Your Name] from [Practice Name]…") are static strings, not Claude output. Operators will trust them as real. | `src/components/tasks/task-queue-panel.tsx:461-514` | **P1** — misleading UI |
| F5 | **`sendTaskReminders()` + `checkTaskEscalations()` are dead functions.** Defined in `task-automation-actions.ts`, never invoked by any cron route. Tasks marked as "Reminders ON" never fire. | `src/lib/automations/task-automation-actions.ts:331,35` + missing cron route | **P1** — silent feature breakage |
| F6 | **No browser-push subscription storage.** No `push_subscriptions` table, no service-worker for push, no VAPID key infra. Brief calls for "browser push notification — Default ON". | absent | **P1** — net-new infrastructure required |
| F7 | **No daily-digest cron.** `digest_preferences` JSONB column exists on `notification_preferences` but no scheduled job reads it. Brief calls for morning email at 8am tenant-local. | absent | **P1** — net-new cron required |
| F8 | **Three task-creator components diverge subtly.** Same backend, three UI shells, three slightly different forms. Operator UX inconsistent (e.g. `CreateTaskPanel` pre-fills `estimated_duration_minutes=30`; the other two don't). | `create-task-{slide-over,dialog,panel}.tsx` | **P2** — visual / muscle-memory inconsistency |
| F9 | **`CallCoachingWorkspace` imports types for tables that don't exist.** `ContactPsychProfile` + `ContactPsychProfileHistory` referenced at lines 26-28. The types exist in `src/types/database`, but the underlying tables were paused per 2b.30.2. Any code path that actually queries these tables 500s. The workspace renders OK because the loaders are gated by tenant-existence checks. | `call-coaching-workspace.tsx:26-28` | **P3** — dormant; would bite if a feature flag flipped |
| F10 | **`reception-workspace.tsx` does the same psych-profile imports.** Same issue. Reception is being deleted anyway — the issue moots itself. | `reception-workspace.tsx` | **P3** — moot |
| F11 | **`task_reminder_settings` is per-tenant CHECK UNIQUE but seeded for every tenant in its own migration.** A new tenant created after the migration ran won't have a row unless the tenant-provisioning code inserts one. | `2025011617_task_automation_rules.sql:154-157` | **P3** — only bites on new tenants |
| F12 | **No `audit_trail` write on task creation / completion / reassignment.** The Change Deal pattern (2b.11.5b.1) is "audit-first → mutate → compensate-delete on failure". Tasks don't follow this — `useTaskMutation` writes the task without `logAuditServer()`. | `src/lib/hooks/use-task-mutation.ts` (not read in this audit; verify) | **P2** — compliance + observability gap |
| F13 | **`TaskQueuePanel` does not call `useTaskMutation`** — it writes the `done` status directly via Supabase client (line 134-141). Bypasses any audit hooks added later. | `task-queue-panel.tsx:127-168` | **P2** — refactor risk |
| F14 | **Old Husky pre-push deploy gotcha.** 90s wait before checking `.cursor/post-push-deploy.log`. | process | **P3** — known |
| F15 | **`authFetch` NavigatorLock hang** — already mitigated with 2.5s race. Any new endpoints the rebuild adds should remain cookie-friendly. | known | **P3** — known, mitigated |
| F16 | **DOMPurify cold-start crash** — lazy-require pattern required for all heavy server-side libs. The new commitment-detector (Claude one-shot) is light, but if the email-digest cron uses any HTML library, apply the pattern. | known | **P3** — known |

---

## §8 — Recommendation

### Recommended path: **B — Fix-then-extend, in tight phases**

The tasks module is the rare case of an existing system that's mostly built but has *latent breakage* that has to be cleared before the new layer can be trusted. The order:

1. **Fix-forward the broken substrate** (1-2 phases).
2. **Net-new schema for groups, recurring rules, push subs, default-assignee setting** (1 phase, batched).
3. **Consolidate the three creators + add free-floating mode** (1-2 phases).
4. **Layer the new UI on top of the queue panel** (3-4 phases — snooze/reschedule/reassign/inline-composers/AI-done/end-celebration).
5. **AI commitment-detection pill** (1 phase: one Claude one-shot + bubble pill wiring, mirrors `judge-deal-attachment` exactly).
6. **Practice playbook: 8 prebuilt templates + wizard trigger expansion** (1 phase).
7. **Notifications: cron wiring for due-now + overdue + escalation, daily-digest cron, push infrastructure** (2-3 phases — push is the heaviest because of the service worker + VAPID + permission UX).
8. **Per-deal-close prompt** (1 phase — one modal + bulk-close API + 3 client call-site wraps).
9. **Sidebar cleanup: delete `/reception`, reframe `/call-coaching`** (1 phase).
10. **Tasks page rebuild: channel chips, permission-aware assignee, multi-bucket filter, urgent-first queue sort** (1-2 phases).

Ship feature-by-feature, not surface-by-surface. The queue UX is the riskiest single piece — split it into 3 phases (snooze+reschedule+reassign / inline-composers+AI-done / end-celebration+mid-queue-arrival) so each surface can be QA-tested against the test tenant.

### Alternative paths considered

**A — Big-bang rebuild.** Rejected per CLAUDE.md (phases ~1-2 days). A single PR touching the engine, the schema, three creators, the queue panel, the bubble, the playbook, the cron, the prompt, and the sidebar would be ~20 files in one go — un-testable atomically.

**C — Defer the AI commitment detector + push notifications to a future feature.** Tempting because those are the most fragile bits. Rejected because the brief is product-locked on both. Push can be deferred behind a feature flag if launch deadline forces it — leave the in-app + email channels as the default.

**D — Build a parallel `/tasks-v2` page behind a flag, swap.** Rejected because the existing page is reusable as-is (mostly trim + extend). The duplication cost outweighs the safety benefit.

### Effort estimate

- Path B (recommended): ~12-15 small phases × 1-2 days each = **3-5 weeks** of focused work. Faster than the contacts/dashboard rebuild (which was 6-10 weeks) because more of the substrate exists.
- Path A: maybe 2-3 weeks elapsed but with high risk of regression cascades.
- Path C (deferred push + AI): ~10-12 phases / **2.5-4 weeks** for the core rebuild.

### Suggested next phases (first 5)

If Toffee signs off:

- **2b.58** — Substrate fixes. (a) Fix `create_task` engine action to write `due_at`, `assignee_user_id`, drop `created_by`, use `status: 'open'`. (b) Create `task_recurring_rules` schema (id, tenant_id, cadence enum `daily/weekly/monthly/custom`, rrule TEXT for custom, next_run_at TIMESTAMPTZ, is_active). (c) Make `tasks.location_id` nullable (or auto-fill to operator's active location in API). (d) Wire `sendTaskReminders()` + `checkTaskEscalations()` into a new cron at `/api/cron/task-reminders` running every 15 minutes. Phone gate: verify a manually-installed prebuilt task workflow now creates a task.

- **2b.59** — Net-new schema for groups + default-assignee + push subscriptions. (a) `practice_groups (id, tenant_id, name, description, is_active, created_at, updated_at)`. (b) `user_group_memberships (user_id, group_id, tenant_id, role NULL, created_at)`. (c) Add column `tenant_routing_settings.default_assignee_policy JSONB DEFAULT '{"kind":"owner"}'` (kind ∈ `owner`/`group:<id>`/`everyone`). (d) `push_subscriptions (id, tenant_id, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)`. (e) RLS policies for all four. No UI yet.

- **2b.60** — Three creators → one. Migrate `contact-tasks.tsx` and `deal-tasks.tsx` to use `CreateTaskSlideOver` with preselect props. Add the free-floating mode to `CreateTaskSlideOver` (no contact, no deal, no location). Archive `CreateTaskDialog` and `CreateTaskPanel`. Phone gate: open a contact page, create a task. Open a deal page, create a task. Open dashboard, create a free-floating task. All three should produce a row.

- **2b.61** — AI commitment detector. Build `src/lib/ai/detect-task-commitment.ts` (mirrors `judge-deal-attachment.ts`). Cache result on `activities.metadata.ai_commitment`. Mount the pill in `activity-chat-bubble.tsx` below the body (mirrors the existing "AI unsure" pill JSX). Wire the Accept button to POST `/api/tasks` with parsed fields. Edit button opens `CreateTaskSlideOver` pre-filled.

- **2b.62** — Practice playbook templates. (a) Expose `deal_stage_change`, `deal_created`, `contact_created`, `deal_aging` triggers in `workflow-wizard.tsx`. (b) Add 8 prebuilt task-creation templates to `prebuilt-workflows.ts`. (c) Toggle-card UI on `/automations` page (a new section above the existing tabs) that lets a tenant install/remove each template. (d) Default-ON for 5, default-OFF for 3.

Toffee can review what's shipped after every 1-2 phases.

---

## §9 — Recommended execution sequence

| Phase | Area | Purpose | Effort (days) |
|---|---|---|---|
| 2b.58 | Substrate | Fix engine `create_task` + recurring-rules schema + free-floating-task allowlist + reminder cron | 2 |
| 2b.59 | Schema | Practice groups + user_group_memberships + default-assignee setting + push_subscriptions | 1 |
| 2b.60 | Creators | Consolidate to one slide-over; archive Dialog + Panel; add free-floating mode | 1-2 |
| 2b.61 | AI pill | Commitment detector + bubble pill + Accept→create flow | 2 |
| 2b.62 | Playbook | Templates library + wizard trigger expansion + toggle UI on /automations | 2 |
| 2b.63 | Queue UX (A) | Snooze + reschedule + reassign in TaskQueuePanel | 1-2 |
| 2b.64 | Queue UX (B) | Inline composers per channel + AI auto-done detection | 2 |
| 2b.65 | Queue UX (C) | Mid-queue arrival badge + end-of-queue celebration screen + urgent-first sort | 1 |
| 2b.66 | Tasks page | Channel chips + permission-aware assignee filter + multi-bucket date filter + per-row Mark Done | 2 |
| 2b.67 | Deal-close prompt | Modal + bulk-close API + 3 client call-site wraps | 1 |
| 2b.68 | Sidebar | Delete /reception route + workspace; reframe /call-coaching; remove `?mode=queue` banner; wire workspace takeover from Tasks queue | 1 |
| 2b.69 | Notifications (A) | Daily-digest cron at 8am tenant-local + per-user opt-in UI on /settings | 2 |
| 2b.70 | Notifications (B) | Browser push: service worker + VAPID key gen + permission UX + web-push adapter + due-now wiring | 2-3 |
| 2b.71 | Sweep | Final bug sweep + docs pass + audit-trail wiring for task mutations (P2 F12) | 1 |

Total: ~14 numbered phases + sweep = **~20-25 days of focused work** spread over 4-5 weeks calendar.

---

## §10 — What to leave alone

Code that should NOT be touched in any of the rebuild phases:

1. `src/lib/communications/dispatcher.ts` — canonical outbound (principle #1, #8, #10).
2. `src/lib/lead-ingestion/ingest-lead.ts` — canonical inbound (principle #1).
3. `src/lib/deal-resolver.ts` — most-recently-active open deal (principle #6).
4. `src/lib/communications/conversation-id.ts` — namespace UUID (principle #3).
5. `src/lib/auto-audit.ts` — `logAuditServer()` (use it for task audit writes; don't re-implement).
6. `src/lib/anthropic-client.ts` — Claude one-shot helper (use it for commitment detector).
7. `src/lib/lead-ingestion/judge-deal-attachment.ts` — the precedent for the commitment detector. Don't modify; mirror its shape.
8. The `audit_trail` RLS / service-role pattern.
9. The `activities_with_integrations` view.
10. `src/lib/automations/automation-engine.ts` outside of the `create_task` case (P0 fix) and the trigger expansion (the wizard exposes more triggers without touching the engine).
11. The Practice Setup wizard.
12. The `ChangeDealAffordance` component.
13. The `ActivityChatBubble` body — the AI commitment pill renders BELOW the bubble in a new region, mirroring the existing "AI unsure" pill region (already laid out at line 428-525).
14. `next-best-action.ts` (NBA engine).
15. Migration files under `supabase/migrations/` — all new schema goes via fresh migration files.
16. `task_templates` table + `task-templates-manager.tsx` (manual-fire template library — keep as-is; lives at `/settings/task-templates` per brief).

---

## §11 — Issues / risks register

### P0 — blocks launch or causes data loss

- **P0-1** (F1) — Engine `create_task` writes wrong columns + invalid status. Silently failing. Fix in 2b.58 before any practice-playbook template is installed.

### P1 — wrong behavior visible to users

- **P1-1** (F2) — `tasks.recurring_rule_id` FK has no target table. Create `task_recurring_rules` in 2b.58.
- **P1-2** (F3) — `/api/tasks` POST rejects free-floating tasks (no location). Fix in 2b.58 (auto-fill location to `activeLocationId` OR make column nullable).
- **P1-3** (F4) — `TaskQueuePanel` right column is fake hardcoded "AI Briefing". Replace in 2b.63 (use the existing `deal-intelligence-card.tsx` query plus real Claude summary, or drop the column).
- **P1-4** (F5) — `sendTaskReminders` + `checkTaskEscalations` defined but never run. Wire cron in 2b.58.
- **P1-5** (F6) — No browser-push subscription storage. Schema in 2b.59, wiring in 2b.70.
- **P1-6** (F7) — No daily-digest cron. Cron in 2b.69.

### P2 — confusing / incomplete / not blocking

- **P2-1** (F8) — Three task creators diverge. Consolidate in 2b.60.
- **P2-2** (F12) — Task mutations don't write `audit_trail`. Wire `logAuditServer()` in 2b.71.
- **P2-3** (F13) — `TaskQueuePanel.handleComplete` bypasses `useTaskMutation` (writes directly via Supabase). Refactor in 2b.63 or 2b.71.
- **P2-4** — `task_reminder_settings` UI exists per task (`task-reminders-config.tsx`) but the per-tenant table is unused. The new daily-digest cron should read from it.
- **P2-5** — Engine's `create_task` config schema uses `assigned_to`, `due_in_days`, `description` — the wizard needs a UI that produces these exact keys (or the engine fix should normalise both old and new shapes for backward compat with any existing automation definitions).
- **P2-6** — `practice_groups` is a brand new concept — existing membership-roles (`owner`/`manager`/`member` on `user_tenant_memberships`) are about permissions, not job function. Don't conflate.

### P3 — docs / naming / future-hardening

- **P3-1** (F9, F10) — Reception + Call-coaching workspace import dormant psych-profile types. Carry over until either psych profile is restored or the workspaces are deleted (Reception is, in 2b.68).
- **P3-2** (F11) — New tenants won't get a `task_reminder_settings` row unless provisioning code inserts one. Add to tenant-provisioning during the cron wiring phase.
- **P3-3** — `assignee` and `assignee_id` legacy columns on `tasks` should be dropped (currently dead). Defer to a post-launch cleanup phase.
- **P3-4** — `due_date` (DATE) legacy column should be dropped; only `due_at` (TIMESTAMPTZ) is used now. Same cleanup phase.
- **P3-5** — `tasks.position` is unused by `/tasks` page. Keep for future drag-reorder.
- **P3-6** — Brief says "delete `/reception` … replaced by Dashboard + Tasks + Call Coaching". Confirm there is no UAT operator who has muscle-memory of `/reception` before deletion.

---

## §12 — Out of scope for upcoming phases

Things the brief excludes or that the rebuild deliberately doesn't touch:

- **No subtasks v1.** The `parent_task_id` column stays unused.
- **No semantic AI auto-done.** Path X (channel match) only. Heuristic, no model in the loop.
- **No multi-contact tasks.** One contact, one deal, one location per task.
- **No bulk reassign UI inside the queue.** Bulk operations stay on the table.
- **No conversation_id changes.**
- **No `audit_trail` RLS broadening.** Task audit writes go through `logAuditServer()`.
- **No fix for ClickToCallDialer's fake "End Call".** Out of scope (carried from outbound audit).
- **No psych-profile restoration.** Reception is being deleted; call-coaching loads the persona block but the table is missing — handled by the existing 2b.30.2 pause.
- **No marketing-grade automation analytics.** The `automation-analytics.ts` module exists; not touched.
- **No new permission codes.** Tenant-wide "anyone can close anyone's task" per brief.
- **No mobile redesign.** Desktop / iPad only.

---

## §13 — Adjacent findings

Things noticed during the audit that aren't strictly the topic but the planner should know:

- **`task-templates-manager.tsx` is dormant.** It exists but no page mounts it; brief says it should live at `/settings/task-templates`. Adding that page is a 30-minute task.
- **`task_dependencies` already lets you say "when task X is done, create task Y from template".** This is functionally a degenerate form of the practice playbook for `task_completed` triggers. Consider whether the new playbook templates should write into `task_dependencies` or into the regular `automations` table. Recommend: `automations` table for consistency with all other triggers.
- **The legacy columns on `tasks` (`assignee`, `assignee_id`, `due_date`)** are evidence of an older schema. Their presence suggests at least one bulk migration happened without a tracked migration file. Cleanup phase (post-launch) should drop them.
- **`tasks_with_associations` view computes `subtask_count` and `comment_count` via correlated subqueries.** Fine at current data volume but expensive at scale. Replace with materialised counts if the list page slows down.
- **The activity feed already shows tasks in some renders.** When a task is created from an automation, the parent activity gets a deal_id stamp. The new chat bubble might want to surface "→ Task created" as a small annotation under the bubble. Optional.
- **`automations.category` enum** includes `task` but not all automations the new playbook needs are task-specific. A "Patient → Send confirmation email" template is a `marketing` category. Brief calls them all "practice playbook automations" but the underlying engine uses different categories. Don't fight the existing categorisation in the data; the UI just groups them under one "Playbook" tab on `/automations`.
- **`CallCoachingWorkspace` queries the top-30 deals by `updated_at`** which is a fragile proxy. When the takeover invocation from Tasks queue lands, pass the explicit task list down (don't reload deals).
- **`workflow-wizard.tsx` hardcodes `categoryFor(trigger)` as `'marketing'`** (line 124). New triggers like `deal_stage_change` should resolve to `'task'` or `'deal'` depending on the action. Small but easy to miss.
- **`notification_preferences.event_preferences` JSONB is the right place** for the brief's per-event opt-in (urgent SMS, email digest). Don't add new columns.
- **`channel-adapters.ts` already gates push with `if push not implemented, log and skip`** — the router won't crash, just silently no-op. Safe carry-over until 2b.70 ships push for real.
- **The brief assumes "everyone in the practice can close/edit any task"** — verify with the planner that this also extends to tasks created from prebuilt playbook automations (auto_created = true). If yes, no UI gating needed.
- **No `task_audit_trail` view today.** Audit rows would be siblings to `deal_change` rows in `audit_trail`. The Change-Deal precedent (2b.11.5b.1) is the template.
- **`use-task-mutation` hook** wasn't read in this audit but is widely used (`/tasks` page, `bulk-actions-menu`, etc). Worth inspecting in 2b.71 to ensure the audit-trail write lives there (single source of truth for task mutations).
- **The brief mentions `priority shown as a coloured dot/chip next to title`** — the existing `task-card-enterprise.tsx` already does that. The table page uses a Badge instead. Minor visual unification.
- **The "morning email digest" needs the operator's timezone.** No `app_users.timezone` column today. Either fall back to tenant timezone (likely on `tenant_routing_settings` or `tenants.metadata`) or add the column.

---

## §14 — Open questions for planner

Plain-English questions that need Toffee's sign-off before execution prompts can be written. Each has a recommendation.

### Q1 — How aggressively should we delete the three task-creator components?

**Background.** Three components do almost the same job: `CreateTaskSlideOver` (used 4 places), `CreateTaskDialog` (centred modal, used by the contact page's task panel), `CreateTaskPanel` (right-side slide-over, used by the deal page's task panel). The brief says one canonical creator. Each callsite shows the user a different shell today; consolidating means everyone sees the same right-side slide-over.

**Options:**
1. Migrate both holdout callers to `CreateTaskSlideOver` and physically delete the other two files.
2. Migrate both holdout callers but keep the old files as `.deprecated.tsx` for one cycle in case we need to roll back.
3. Keep all three; tweak each to match the new fields (recurring, group assignee, etc).

**Recommendation:** Option 1 (delete cleanly). Both holdout callers are small wrappers; the migration is a one-file change each. The "muscle memory" cost is real — operators currently see a centred dialog on the contact page — but the cost of carrying three slightly-different forms forever is worse.

### Q2 — How should free-floating tasks (no contact, no deal, no location) be stored?

**Background.** The API requires `location_id`. For free-floating tasks (the dashboard Quick Action), there's no contact or deal to inherit from. Two ways out: make the column nullable, or auto-fill to the operator's current active location.

**Options:**
1. Make `tasks.location_id` nullable. Free-floating tasks have NULL. Filters need to handle NULL ("All Locations" includes NULL).
2. Keep the column non-null. Auto-fill to `activeLocationId` from the API context. Single-location practices: always fills with the only location. Multi-location: fills with operator's current focus.
3. Add a `tasks.is_floating BOOLEAN DEFAULT FALSE` column. Floating tasks still get a `location_id` (via Option 2's auto-fill) but the flag tells the UI "this isn't really location-bound".

**Recommendation:** Option 2 (auto-fill to active location). Simpler — no nullable handling in filters, no new column. The auto-fill is invisible to single-location practices (the only practice type today). The downside (multi-location with floating tasks "stuck" at the location they were created in) is minor; the brief's free-floating tasks are typically personal todos that don't really need to move locations.

### Q3 — Where should the "default assignee" tenant setting live, and what shape?

**Background.** The brief says: "Assignee tenant default = contact owner / group / everyone. Setting lives at /settings/practice." Shape options vary.

**Options:**
1. New column on `tenant_routing_settings`: `default_assignee_policy JSONB DEFAULT '{"kind":"owner"}'`. Kind values: `"owner"` (use deal/contact owner), `"group:<group_id>"` (assign to a specific group), `"everyone"` (shared inbox — no assignee). Most flexible.
2. Three boolean toggles on `tenant_routing_settings`: `default_assign_to_owner`, `default_assign_to_group`, `default_assign_to_everyone`. Plus a `default_group_id` UUID. Less elegant but easier to scan.
3. A whole new table `tenant_task_settings` with proper columns. Future-proof but heavy.

**Recommendation:** Option 1 (JSONB on `tenant_routing_settings`). The setting is conceptually one piece — "who gets the task by default" — so one field. JSONB lets us extend without migration (e.g., add `{"kind": "round_robin", "group_id": "..."}` later). `tenant_routing_settings` is the natural home (already carries routing rules).

### Q4 — What's the recurring-task cadence shape?

**Background.** Brief: "recurring spec (none/daily/weekly/monthly/custom)". `task_recurring_rules` is net-new. Need to decide: simple enum + interval fields, or full RRULE-style.

**Options:**
1. Simple: `cadence TEXT CHECK IN ('daily','weekly','monthly')`, `interval INTEGER DEFAULT 1` (every N days/weeks/months), `days_of_week INTEGER[]` (for weekly), `day_of_month INTEGER` (for monthly), `end_date DATE NULL`.
2. RRULE-style: `rrule TEXT NOT NULL` storing iCal RFC 5545 strings. Powerful but harder to surface in UI.
3. Hybrid: Option 1's columns for `daily/weekly/monthly`, plus `rrule TEXT` for `custom` (the "custom" option in the brief).

**Recommendation:** Option 3 (hybrid). 90% of users want "weekly on Tuesday" or "monthly on the 1st" — simple columns make those queryable and renderable. The "custom" option in the brief is the long-tail; RRULE handles it. Cron worker reads `cadence`/`interval`/`days_of_week` for the simple cases and falls back to an RRULE parser for `custom`.

### Q5 — Should the AI commitment detector run synchronously (blocking the chat-bubble render) or asynchronously (queue + later update)?

**Background.** Same trade-off as the email summariser in 2b.43 (which is lazy on render). For inbound activities, the detector needs to run before the pill can render. Two patterns: lazy on render (cheap, one-shot per bubble per session) or eager on inbound (heavier, one one-shot per inbound).

**Options:**
1. Lazy on chat-bubble first render (same pattern as email summariser). One-shot per session per bubble. Pill appears 1-2 seconds after the bubble shows.
2. Eager during `ingestLead` and dispatcher post-send hook. Result cached on `activities.metadata.ai_commitment` immediately. Pill appears with the bubble.
3. Background worker (cron every minute) catches up on activities without `ai_commitment` set.

**Recommendation:** Option 1 (lazy on render). Same reasoning as Q3 of the contacts-dashboard audit — cheapest, simplest, no queue infra, invisible to most users (the pill just animates in). The pre-existing `chat-bubble` already has this pattern wired for email summaries; copy-paste with a new endpoint.

### Q6 — When the deal-close prompt appears, should it default to "close all open tasks" or "keep all open tasks"?

**Background.** Brief: "prompt operator at the moment of close: 'This deal has N open tasks — close them?' with un-tick per task, default = close all". That's the brief's recommendation but worth confirming.

**Options:**
1. Default = close all (brief's recommendation). Operator un-ticks the ones to keep.
2. Default = keep all. Operator ticks the ones to close.
3. No default — force the operator to make N decisions individually.

**Recommendation:** Option 1 (default = close all). Matches the brief. Cognitively right because a closed deal usually means the work is done; outstanding tasks are usually no longer relevant.

### Q7 — How should the browser-push permission be requested?

**Background.** Browser-push needs an explicit `Notification.requestPermission()` call. The UX of when to ask matters — asking on first login is annoying; asking when the user toggles a setting is mature.

**Options:**
1. On first login, after dashboard renders, show a small banner: "Get task reminders on your screen? [Enable] [Not now]".
2. Hidden until the user visits `/settings/notifications` and toggles "Push notifications". The toggle triggers the permission ask.
3. Both: show the banner once on first login, and the setting also triggers ask.

**Recommendation:** Option 2 (settings-driven). Toffee is a sole operator + a few staff; the settings flow is enough. The first-login banner is a low-trust pattern that browsers increasingly de-rank.

### Q8 — Should the 8 prebuilt playbook templates seed automatically for the test tenant on the first deploy after 2b.62, or wait for explicit install?

**Background.** The brief says "ship ~8 sensible defaults, some default ON, some default OFF". For the test tenant + future new tenants, the cleanest path is to seed them as drafts with the brief's default ON/OFF state.

**Options:**
1. Auto-seed on tenant create (new tenants only). Don't backfill the test tenant.
2. Auto-seed on tenant create AND backfill the test tenant on 2b.62 deploy.
3. Manual install via the toggle-card UI.

**Recommendation:** Option 2 (auto-seed everywhere, including backfill). Toffee is the only real tenant today; backfill is risk-free. The toggle-card UI then becomes "turn off the ones I don't want" rather than "install the ones I do want" — better UX.

### Q9 — Should the AI-done auto-complete fire instantly when the matching outbound activity is created, or on the next queue render?

**Background.** Path X says "if task type matches outbound channel AND outbound is to right contact AFTER task created → auto-complete". Two implementations: (a) write a trigger or post-dispatcher hook that scans for matching tasks and closes them. (b) check on every queue panel render.

**Options:**
1. Trigger on the activity insert (server-side hook in dispatcher). Tasks close in real-time.
2. Check in the queue panel on render. Tasks close when the operator next opens the queue.
3. Background cron every minute. Tasks close within ~60s.

**Recommendation:** Option 1 (server-side hook in dispatcher). Same place where conversation-id is set, where AI metadata is stamped. The dispatcher already knows the outbound type + contact + tenant; one extra query and one extra UPDATE. Real-time is the right UX — the hint "Auto-completed because you sent an [email]" is meaningful right after the send.

---

## §15 — Validation

- Audit doc exists at `dental-crm/docs/audits/tasks_module_rebuild_audit.md`. §1–§14 populated.
- Build clean: NOT re-run (audit is read-only; the snapshot at commit `1b111c3` already passed `npm run build` per the 2b.57.3 changelog).
- TypeScript clean: NOT re-run (same reason; nothing in this audit modifies source).
- Git working tree shows only the new audit file + pre-existing unrelated unstaged items (`supabase/.temp/cli-latest`, `.claude/scheduled_tasks.lock`, untracked `docs/2b/2b-23-1-fix-changes.md`, untracked `scripts/fill-practice-brain.mjs`).


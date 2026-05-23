# Contacts + Dashboard + Tasks + Call-coaching + Deals rebuild audit

> **Audit type:** Read-only docs/code investigation — no code or schema changes.
> **Date:** 2026-05-23
> **Audited at commit:** `5bae190` (`feat(2b.23): TTL purge cron + pipeline-router tests + Build A close`)
> **Branch:** `phase-1-attribution-foundation`
> **Working-tree state:** clean apart from `supabase/.temp/cli-latest`, the gitignored `.claude/scheduled_tasks.lock`, and the untracked `scripts/fill-practice-brain.mjs`. No code or schema changes were made by this audit.
> **Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf` ("Deepak's Dental Practice")
> **Scope:** Contacts list + contact detail page + activity feed + activity detail slide-in + dashboard + tasks + call-coaching + deals Kanban + Next-Best-Action + Practice Setup wizard + AI / Claude infrastructure + email body storage. Excludes deeper schema for `tasks`, `pipelines`, `marketing_*` (only the slices touched by the rebuild are inventoried).
> **Reference docs read:** `docs/operational-gotchas.md`, `docs/audits/deal_attachment_audit.md`, `docs/audits/outbound_audit.md`, `docs/audits/automation_engine_audit.md`, `docs/2b/2b-30-to-33-contacts-module.md`, `docs/2b/2b-23-1-fix-changes.md`. (No `D03_*.md` / `D11_*.md` exist on this branch — they live in the older `Audit and Analysis/full_system_audit/` tree not on this checkout.)

---

## §1 — TL;DR (verdict per area)

| Area | Verdict | One-line summary |
|------|---------|------------------|
| Contacts list (`/contacts`) | ⚠ Triage-inbox features added in 2b.34.2 (`needs_reply`, `last_inbound_snippet`, default sort by `updated_at`) need to be ripped out for the directory-style rebuild. |
| Contact detail (`/contacts/[id]`) | ❌ Wholesale rebuild — current page is a left-sidebar + right-tabs layout with NBA card, 3-card KPI strip, Quick-Actions row, and an "Activity"/"Deals" tabs pair. WhatsApp-style chat layout is net-new. |
| Activity feed (`activity-feed-enterprise.tsx`) | ⚠ Card-based feed (1543 LOC, deal-chip filter + DnD reassign + AI-suggest pipeline). The data model and most of the secondary behaviour are reusable; the **render shell** has to become chat-bubble. |
| Activity detail slide-in | ✅ Reusable as the "click bubble → side detail" panel. 869 LOC, already handles all 6 activity types + Change-Deal + Reply, with `hasRealAiInsights()` for the AI-empty guard. |
| Dashboard (`/dashboard`) | ⚠ Today's dashboard is KPI-cards-first (Revenue / Contacts / Deals / Tasks) + analytics. The new dashboard's triage-lane layout is largely net-new; **`TodaysPriorities` + `AIInsightsWidget` can be reused** as two of the lanes. |
| Tasks (`/tasks`) | ⚠ `TaskQueuePanel` (~600 LOC) already implements a one-at-a-time walk-through queue. It's the seed of the "Start Queue" mode. |
| Call-coaching (`/call-coaching`) | ⚠ Workspace exists (765 LOC); already loads a queue (top 30 by `deals.updated_at`), shows persona + scripts + composer panels. Needs a "dial-then-next" mode wired on top. |
| Deals Kanban (`/deals` Board) | ⚠ `DraggableDealCard` shows title, aging badge, value, owner avatar, treatment tags. Adding `last_activity_at` + `next_activity_at` to the card is a small local edit. |
| Next-Best-Action card (NBA) | ⚠ Engine + UI work today, mounted at the top of contact detail page. **Will be unmounted from contact pages** per the rebuild brief; can be remounted on `/deals/[id]` if Toffee wants. |
| Practice Setup wizard | ✅ Live at `/settings/practice-setup` (2b.35.4). Provisions treatments → pipelines + Unsorted. Dashboard's "Practice Setup Incomplete" prompt has a clear target. |
| AI infrastructure | ✅ Claude one-shot helper (`anthropic-client.ts`) live; used by 4 sites (reply drafter, pipeline router, FAQ responder, deal title). Persona summariser and email summariser can plug in identically. |
| Email body storage | ✅ Outbound HTML lives in `activities.rich_content` (DOMPurify-sanitised). Inbound email body still goes through `ingestLead` → `activities.description`. Both readable today; **no denormalisation needed** for the email-summariser. |
| `ContactDetailView` size | ⚠ 1302 LOC, dead `psych_profile` paths + `Learning Loop` paths + summary cards still present behind feature flags. Rebuild is a strong moment to delete them. |
| `EnterpriseDealsTable` size | ⚠ 1959 LOC; Kanban + List + Filters + Saved Views all in one file. Only the Board branch (line 1330+) and the `DraggableDealCard` (line 1902) get touched by this rebuild. |

**Headline:** The five surfaces share one underlying activity-feed engine (the `activities_with_integrations` view + `metadata.ai_*` fields). The rebuild is **mostly UI/layout change**; the engine, the AI hooks, the deal-resolver, the conversation-id model, the NBA engine, the dispatcher, the audit-trail pattern — all stay. The biggest concentrated work is **the contact detail page** (chat-bubble rebuild + AI-summary side panel) and **the dashboard** (triage-lane redesign + dismissable smart prompts).

---

## §2 — D<N> reality check

No `docs/D<N>_*.md` Tier-3 docs exist on this branch's `docs/` root — the only D-file is `docs/DEPLOYMENT_GUIDE.md`. Older deep-dive docs (`D03_communications.md`, `D11_automations.md`, `D01_pipeline_and_deals.md`) lived under `Audit and Analysis/full_system_audit/` in earlier audits but are not in this working tree.

So the reality check collapses to the three audit docs:

| Doc | Date | Still accurate? |
|---|---|---|
| `outbound_audit.md` (2b.6) | 2026-05-11 | Mostly — the outbound channel surfaces have shipped a lot since (2b.7/2b.8/2b.9/2b.10/2b.11/2b.11.5b). Dispatcher is the canonical path. Failed sends now produce activities. Conversation IDs now stamped. Audit's "no thread headers" gap is **still open**. |
| `deal_attachment_audit.md` (2b.11.5) | 2026-05-19 | Mostly — 2b.11.5b (`resolveMostRecentlyActiveOpenDeal`), 2b.11.5b.1 (audit-first PATCH), 2b.24 (AI judge), 2b.34.1 (deal title), 2b.34.4 (deal-chip filter), 2b.35.2 (AI-suggest CTA), 2b.35.3 (DnD reassign) all shipped on top. The single-deal-per-activity rule is locked. |
| `automation_engine_audit.md` (2b.12) | 2026-05-20 | Mostly — automations shipped through 2b.23. AI reply drafter + pipeline router + FAQ responder + Practice Brain are live. Not directly relevant to this rebuild except for the inline-suggest CTA which the new chat-bubble feed inherits. |

No claim from those audits is materially wrong for the surfaces this rebuild touches.

---

## §3 — Code inventory

### Contacts module

| Path | LOC | Role |
|---|---|---|
| `src/components/contacts/contacts-list-enterprise.tsx` | 1173 | The directory page. Currently includes triage-inbox extensions (`last_inbound_snippet`, `needs_reply`, default sort by `updated_at desc`). |
| `src/components/contacts/contact-detail-view.tsx` | 1302 | The contact detail page. Two-column layout (sidebar + main). Contains: header w/ Edit-Profile + Deal buttons, contact-fields sidebar, **paused** Persona Insights block (gated `PSYCH_PROFILE_ENABLED=false`), **paused** Learning Loop block (`LEARNING_LOOP_ENABLED=false`), Next-Best-Action card, Quick-Actions row, 3-card summary strip, Activity/Deals tabs, AI Assistant slide-out, composer panels. |
| `src/components/contacts/next-best-action-card.tsx` | 316 | NBA card. Self-fetches activities + deals, computes recommendation, renders one CTA. |
| `src/components/contacts/contact-deals.tsx` | n/a | Deals list panel for the per-contact view (not currently mounted on detail page after 2b.35.1). |
| `src/components/contacts/contact-tasks.tsx` | n/a | Tasks panel for the per-contact view (similarly orphaned). |
| `src/components/contacts/contact-profile-dialog.tsx` | n/a | Edit-profile dialog mounted from the contact detail header. Already a "single overlay with full profile" per the rebuild brief. |
| `src/components/contacts/contact-slide-in-panel.tsx` | n/a | Right-side contact preview slide-in (used outside `/contacts/[id]`). |
| `src/components/contacts/create-contact-slide-over.tsx` | n/a | Used by /contacts/new and the dashboard's "New Contact" button. POSTs to `/api/contacts/manual-create` (2b.32). |
| `src/components/contacts/csv-import-dialog.tsx` | n/a | CSV import. Independent of the rebuild. |
| `src/components/contacts/learning-loop-summary.tsx` | n/a | The paused Learning Loop tile. |
| `src/lib/contacts/next-best-action.ts` | 232 | Pure rule engine. 7 prioritised rules. Has 11 unit tests in `src/lib/contacts/__tests__/`. |

### Activity feed + detail

| Path | LOC | Role |
|---|---|---|
| `src/components/activities/activity-feed-enterprise.tsx` | 1543 | The feed shown on every contact / deal detail page. Reads `activities_with_integrations` (falls back to `activities` if view missing). Includes deal-chip filter (2b.34.4), DnD reassign (2b.35.3), AI inline-suggest CTA (2b.35.2 + `/api/activities/[id]/suggest-pipeline`), Log Activity button, all four composer slide-overs, AI badges (`ai_purpose` / `ai_outcome` / `ai_summary`), inbound media renderer. |
| `src/components/activities/activity-feed-simple.tsx` | n/a | Older, simpler feed. Not on critical path. |
| `src/components/activities/activity-timeline-enterprise.tsx` | n/a | A separate timeline view. Not mounted on the contact detail right now. |
| `src/components/activities/log-activity-panel.tsx` | n/a | Manual activity logging panel triggered from the feed. |
| `src/components/activities/activity-media.tsx` | n/a | Inline render for inbound media (photos / voice notes / video / PDFs). |
| `src/components/communications/activity-detail-slide-in.tsx` | 869 | The detail panel that opens when a feed row is clicked. **Reusable as the chat-bubble's "click → side slide-out" detail panel.** Already handles all 6 activity types, Change-Deal affordance, Reply, AI insights (with `hasRealAiInsights()` guard), transcripts for calls, attachments. |

### Dashboard

| Path | LOC | Role |
|---|---|---|
| `src/app/dashboard/page.tsx` | 547 | The current dashboard. KPI cards (Revenue / Contacts / Deals / Tasks) + `LiveCoachPanel` + `DashboardIntelligencePanel` + `TodaysPriorities` + `AIInsightsWidget` + collapsed Analytics card. |
| `src/components/dashboard/todays-priorities.tsx` | n/a | "Today's priorities" widget — already a triage lane (computes urgency, renders cards). Reusable as the "Today's Priorities" lane. |
| `src/components/dashboard/ai-insights-widget.tsx` | n/a | AI Insights tiles. |
| `src/components/dashboard/dashboard-intelligence-panel.tsx` | n/a | A higher-level intelligence summary panel. |
| `src/components/dashboard/live-coach-panel.tsx` | n/a | Live coach prompts. |
| `src/components/dashboard/revenue-chart.tsx`, `area-chart-widget.tsx`, `bar-chart-widget.tsx`, `deals-funnel-chart.tsx`, `time-period-selector.tsx`, `quick-filters.tsx`, `widget-customizer.tsx`, `widget-skeletons.tsx`, `widget-error-boundary.tsx`, `enhanced-kpi-card.tsx`, `live-notification-badge.tsx`, `error-state.tsx`, `collapsible-card.tsx`, `keyboard-shortcuts-modal.tsx`, `export-menu.tsx` | n/a | Supporting widgets. Most won't make the cut into the new triage-first layout; some (skeleton, error-boundary) carry over as plumbing. |
| `src/lib/dashboard-analytics.ts`, `src/lib/dashboard-priorities.ts`, `src/hooks/use-data-freshness.ts`, `src/lib/realtime-service.ts` | n/a | Data-loaders. Reusable for the new lanes — the queries map directly to the new "replies needed", "stale follow-ups" etc. |

### Tasks

| Path | LOC | Role |
|---|---|---|
| `src/app/tasks/page.tsx` | 802 | Tasks page. List, calendar, analytics view modes, filter chips, queue panel mount. |
| `src/components/tasks/task-queue-panel.tsx` | ~600 | **The walk-through queue.** Slide-over that steps task-by-task with prev/next, contact + deal context, notes, complete-and-next. Seed of the dashboard "Start Queue" mode. |
| `src/components/tasks/task-card-enterprise.tsx`, `task-detail-modal.tsx`, `task-calendar-view.tsx`, `bulk-actions-menu.tsx`, `task-reminders-config.tsx`, `task-templates-manager.tsx`, `create-task-slide-over.tsx`, `create-task-panel.tsx`, `create-task-dialog.tsx` | n/a | Card render, detail, calendar, bulk ops, reminders, templates, creators. Unchanged by this rebuild beyond a few callsite tweaks for "Start Queue from dashboard". |
| `src/lib/hooks/use-task-mutation.ts` | n/a | Task completion hook (reusable). |

### Call-coaching

| Path | LOC | Role |
|---|---|---|
| `src/app/call-coaching/page.tsx` | 18 | Mounts `CallCoachingWorkspace` + `GlobalAIAssistant`. |
| `src/components/call-coaching/call-coaching-workspace.tsx` | 765 | Loads a queue (top-30 deals by `deals.updated_at`), renders deal cards, mounts persona + scripts + ClickToCall + Email + SMS composers + ActivityFeedEnterprise. |
| `src/components/communications/click-to-call-dialer.tsx` | 488 | The dialer. Calls `/api/communications/initiate-call`. In-page "End Call" is fake (a setTimeout, doesn't actually hang up — `outbound_audit.md` §1.1). Loads deal intelligence for the call. |
| `src/components/scripts/next-best-script-panel.tsx` | n/a | Next-best-script recommendations alongside the call. |

### Deals Kanban

| Path | LOC | Role |
|---|---|---|
| `src/components/deals/enterprise-deals-table.tsx` | 1959 | Unified deals view. `viewMode === 'board'` branch at line 1330 renders the Kanban. `DraggableDealCard` at line 1902 — currently shows title, aging badge, contact name, value, owner avatar, treatment tags. Drag-drop updates `stage_id` + `last_activity_at` on drop (line 929). |
| `src/components/deals/deal-detail-view.tsx`, `deal-slide-in-panel.tsx`, `deal-detail-view-modal.tsx`, `deal-intelligence-card.tsx`, `deal-tasks.tsx`, `deal-treatment-tags.tsx`, `deal-profile-dialog.tsx`, `deal-marketing-source-section.tsx`, `assign-deal-dropdown.tsx`, `create-deal-slide-over.tsx`, `simple-deal-dialog.tsx`, `edit-deal-dialog.tsx`, `create-activity-dialog.tsx`, `saved-views-dropdown.tsx`, `activity-timeline.tsx` | n/a | Deal-detail components. The NBA migration target is `deal-detail-view.tsx` if Toffee accepts the recommendation. |

### Practice Setup + AI infrastructure

| Path | LOC | Role |
|---|---|---|
| `src/app/settings/practice-setup/page.tsx` | 495 | The wizard (2b.35.4): treatments → pipelines + Unsorted. `loadError` already surfaced in UI. Good hook target. |
| `src/app/api/practice-setup/provision-treatments/route.ts` | 397 | Provisions treatment_offerings + pipelines + ensures Unsorted. |
| `src/app/api/settings/treatment-offerings/route.ts` | n/a | Loads the wizard's initial state. |
| `src/lib/anthropic-client.ts` | 70 | Claude one-shot helper. Default model `claude-haiku-4-5-20251001`. Lazy-init, no top-import crash. `isAnthropicConfigured()` for gating. |
| `src/lib/automations/ai-reply-drafter.ts` | n/a | One-shot reply drafter (uses Practice Brain context). |
| `src/lib/automations/pipeline-router.ts` | n/a | Pipeline classifier (keyword + AI). |
| `src/lib/automations/faq-responder.ts` | n/a | FAQ matcher. |
| `src/lib/lead-ingestion/deal-title.ts` | n/a | 3-word deal title generator. |
| `src/lib/lead-ingestion/judge-deal-attachment.ts` | n/a | Inbound deal-attachment judgement. |
| `src/lib/services/psychological-analyzer.ts` | 295 | **Existing persona analyser** (uses OpenAI, not Claude). Writes to `contact_psych_profiles` + history. The tables don't exist on this branch (paused per 2b.30.2). |
| `src/app/api/psych-profiles/analyze/route.ts` | 56 | POST endpoint that calls `analyzeContactPsychProfile`. Currently fails because tables don't exist. |

### NBA migration target / deal detail

`src/components/deals/deal-detail-view.tsx` is the natural mount point if Toffee wants the NBA visible somewhere after it leaves the contact page.

---

## §4 — Data model

### `activities` table — the core dependency for every feed/bubble/chip/queue

Verified via the live `activities_with_integrations` view shape in `src/types/supabase.ts` (the view exposes everything `activities` has, plus the joined `contact_*` / `deal_*` / `agent_name` fields):

**Columns relevant to the rebuild:**

- `id`, `tenant_id`, `contact_id`, `deal_id` (single-deal-per-activity per principle #5)
- `type` enum: `call | email | whatsapp | sms | meeting | note`
- `direction`: `inbound | outbound` (calls + notes can be null in some legacy rows)
- `source_channel`: enum (`sms_inbound`, `whatsapp_inbound`, `google_lead_form`, `manual_entry`, etc.) — only set on inbound; outbound rows leave it null
- `subject`, `snippet` (200-char preview), `rich_content` (full HTML for email outbound, DOMPurify-sanitised), `description` (used by ingestLead-driven inbound — SMS/WhatsApp/forms — for the full body text)
- `conversation_id` (uuidv5 since 2b.11; null for voice + form channels)
- `external_id` (provider's message id), `integration_provider` (e.g. `twilio`, `sendgrid`), `integration_metadata` (`error.message` + `error.raw` on failed sends — 2b.9), `message_status` (`pending|sent|delivered|read|failed`)
- `email_to[]`, `email_cc[]`, `email_bcc[]`, `email_from`, `email_reply_to`
- `to_number`, `from_number` (SMS/WhatsApp)
- `call_sid`, `call_to`, `call_from`, `recording_url`, `duration_seconds`, `outcome` (call only)
- `attendees[]` (meetings)
- `is_edited`, `edited_at`, `edited_by_user_id`, `parent_activity_id`
- `metadata` (jsonb) — carries the **AI badges** the new chat-bubble inline labels render:
  - `ai_purpose` (string) — e.g. "Booking enquiry"
  - `ai_outcome` (string) — e.g. "Booked", "Follow up needed"
  - `ai_summary` (string) — the 1-2 sentence summary the bubble shows in place of full email body
  - `ai_sentiment` (string) — e.g. "neutral", "positive", "negative"
  - `ai_attachment_uncertain` (boolean) — drives the "AI unsure" amber pill in the feed
  - `ai_key_points[]`, `ai_actions[]`, `ai_engagement`, `ai_urgency`, `treatments_mentioned[]` (rendered in the AI Insights panel of the slide-in)
  - `attribution_touchpoint_id`, `utm`, `sla_due_at`, `sla_minutes`, `sla_rule_source`, `message_id`, `provider_name`
- `has_attachments`, `attachment_count`, `ai_artifact_count`
- `marketing_campaign_id`, `marketing_event_type`
- `raw` (jsonb, full provider payload)
- `mentions[]`

**Critical fact for the chat layout (RIGHT/LEFT split):**

Direction determines which side of the chat:
- `direction = 'outbound'` → practice/us → **RIGHT bubble**
- `direction = 'inbound'` → patient/them → **LEFT bubble**
- `type = 'note'` → practice-internal → **always RIGHT** (per the brief)
- `type = 'call'` → has both directions; calls inherit the direction (e.g. an inbound call sits on the LEFT). Calls also have `outcome` + `duration_seconds` to render as compact summaries.

### `deals` table — relevant slice

- `id`, `tenant_id`, `contact_id`, `title`, `pipeline_id`, `stage_id`, `value_estimate_cents`
- `last_activity_at` (still **stale** — not maintained by trigger; deal-attachment audit §1.1 notes this. The chat-layout AI summary / strip computes from `MAX(activities.occurred_at)` instead, same as `deal-resolver.ts`.)
- `updated_at`, `created_at`, `deleted_at`
- `treatment_tags[]`
- `is_won` / `is_lost` derived via join to `pipeline_stages` (`stage.is_won` / `stage.is_lost`)

For the **deal counts strip** on the new contact page: "open" = `is_won = false AND is_lost = false`, "closed" = the rest. LTV = sum(value_estimate_cents) across open + closed-won + closed-lost.

### `pipeline_stages`

Has `is_won` + `is_lost` flags (the source of truth per locked principle #6). `is_won` defaults to `false`, `is_lost` defaults to `false` per gotchas doc — already correct on the test tenant.

### `contacts` table

Standard fields (`full_name`, `primary_email`, `primary_phone`, `date_of_birth`, `address`, `tags[]`, `lead_score`, `owner_id`, `tenant_id`). Plus attribution columns (`first_touch_*`, `last_touch_*`) from 2b.2.

### `contact_psych_profiles` + `contact_psych_profile_history`

**These tables do not exist on this branch** (2b.30.2 paused them). The `analyzeContactPsychProfile` service expects them; flipping `PSYCH_PROFILE_ENABLED = true` would 404. So the new **AI persona summary** can EITHER:
1. Be a brand-new pair of tables (likely `contact_persona_summaries` w/ `(tenant_id, contact_id) PK`, `summary text`, `model_version`, `inputs_hash`, `generated_at`), OR
2. Hijack the long-dormant `contact_psych_profiles` schema (would need to author it anyway).

Recommendation: brand-new minimal schema. The psych-profile work was scoped wider (anxiety + trust + style + tags); the new persona is just a 2-3 sentence blurb.

### `tasks` table

Has `(id, tenant_id, contact_id, deal_id, type, status, due_at, priority, notes, ...)`. View `tasks_with_associations` joins contact + deal for the page query. Already supports the "queue" walkthrough.

### Views the rebuild touches

- `activities_with_integrations` — read by the feed + the slide-in + the AI suggest route. Used everywhere.
- `tasks_with_associations` — read by `/tasks`.
- (No `contacts_with_*` view; the list reads `contacts` directly + parallel queries for stats.)

### Triggers / RLS gotchas relevant to the rebuild

- `activities_stamp_deal_first_response` — fires only on INSERT outbound with a `deal_id`. Reassignment doesn't re-fire (locked principle #13). No change here.
- `audit_trail` INSERT requires service-role (gotchas). `logAuditServer()` is the canonical path. Reassignment via PATCH already uses it (2b.11.5b.1). No change here.
- RLS on `activities` — tenant-scoped. The feed query goes through user-session client, so RLS is enforced for the operator. New persona-summary writes will need a service-role client (same pattern as audit_trail).

---

## §5 — Current behavior (behavior matrix)

### Contacts list (`/contacts`)

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Default load | Sort by `updated_at desc` (2b.34.2 inbox sort). Sub-text shows "Last touch X ago" | Revert sort default to `full_name asc` (directory). Keep "last touch" sub-text but de-emphasise. |
| Row sub-text | Lucide icon + source label + Reply pill (`needs_reply`) + last-inbound snippet | Strip the Reply pill and snippet preview. Keep source-channel icon + label (`src/lib/source-channels/labels.ts` is a clean dep). |
| "Reply" pill on row | Rendered when `needs_reply = true` (most recent inbound has no outbound after it). Computed in a parallel activities-query fold-in (`contacts-list-enterprise.tsx:275`+). | Remove — replies now triage off the dashboard. |
| Filter row | Search, Type, Source, Location, Tag, Owner, Date Added | Keep as-is. |
| Bulk actions | Bulk assign, tag, delete, export | Keep as-is. |
| Saved views | `useSavedContactViews` hook | Keep as-is. |
| Click row | Navigates to `/contacts/[id]` | Unchanged. |

### Contact detail page (`/contacts/[id]`)

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Left sidebar | Avatar + name + lead-score badge + Edit-Profile + Deal buttons + Contact-Information fields (phone, email, DoB, address) + tags + (paused Persona block) | Reshape: Avatar + name + Edit-Profile button (top-right repositioned), then **active-deals list** (small cards) + "View all deals" expansion + Call / SMS / WhatsApp quick-action buttons. Contact-Information moves into the Edit-Profile overlay. |
| Right column top | NBA card → Quick-Actions row → 3-card summary strip (Active Deals / Pipeline Value / Last Engagement) | Replace with one-line strip: deal counts (open / closed) + LTV. AI persona summary block below. Both new. |
| Tabs | Activity / Deals (2-tab) | Remove tabs. The chat feed IS the page. Deals moved into the left sidebar (active) + expansion. |
| Activity feed | `ActivityFeedEnterprise` w/ deal-chip filter, DnD reassign, AI inline-suggest, AI badges, type/search filters | Reshape render to chat bubbles (LEFT/RIGHT by direction; notes always RIGHT). Filter row becomes type tabs + direction tabs + keyword. Inline AI badges become 1-2 word labels. Quick-reply input pinned to bottom, inherits active deal-chip filter (already wired via `effectiveOutboundDealId`). |
| Activity click | Opens `ActivityDetailSlideIn` | Keep — this becomes the chat-bubble side detail panel. |
| AI persona summary | Block exists behind `PSYCH_PROFILE_ENABLED=false` flag — not rendered. Backed by `contact_psych_profiles` schema that doesn't exist. | Replace with a much lighter 2-3 sentence blurb feature (new table, new POST endpoint, Claude one-shot). |
| Edit profile | Dialog mounted via `contact-profile-dialog.tsx`. Full profile + attribution fields. | Keep — already matches the brief's "single overlay with full profile + attribution data". |
| Floating AI Assistant FAB | Bottom-right bot button. Opens `AIAssistantChat` slide-out. | Brief is silent on this. Leave it unless Toffee asks to remove. |
| NBA card | Pulls last inbound/outbound + open deals, computes one of 7 rules, renders one CTA | **Unmount from contact page.** Optionally remount on `/deals/[id]`. |
| Summary cards (Active Deals / Pipeline Value / Last Engagement) | 3 cards under quick-actions | Replace with the one-line top strip. |
| Learning Loop block | Behind `LEARNING_LOOP_ENABLED=false` flag, not rendered. | Delete the gated JSX + the constant. |

### Activity feed (today)

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Initial query | `activities_with_integrations` view (falls back to `activities` table on PGRST205/42P01). Filter by `contact_id` if `showAllContactActivities` true, else `deal_id`. Order `occurred_at desc`. | Keep query untouched. |
| Media attachment | Separate `message_media` query + signed URLs via `signMessageMediaUrls`. | Keep — chat bubbles render the photos / voice notes / etc inline (already a sane render). |
| Deal-chip filter (2b.34.4) | Chips derived from activities' deal_ids + "Unsorted" for null. Click → filter. | **Keep — exactly the brief's "filter by deal" affordance.** Inline reply uses `effectiveOutboundDealId` (= active chip or page default). |
| Drag-and-drop reassign (2b.35.3) | Activity row's grip → drop on chip → PATCH `/api/activities/[id]` with `deal_id` → audit_trail row → refresh. | **Keep** — the chat-bubble has the same drag affordance. |
| AI inline-suggest (2b.35.2) | `metadata.ai_attachment_uncertain` → "Suggest" CTA → fetch `/api/activities/[id]/suggest-pipeline` → "Looks like X" → Accept. | **Keep** — fits the chat-bubble brief verbatim. |
| Type filter tabs | All / Calls / Emails / Meetings / Notes (no SMS / WhatsApp dedicated tab today — they're grouped under "WhatsApp" via icon) | Add WhatsApp + SMS tabs explicitly per the brief. Direction tabs (All / Inbound / Outbound) are net-new (one-line `useState` + `filter()` add). |
| Search | In-memory `subject` + `snippet` substring | Keep. Maybe extend to `description` for inbound-form/SMS/WhatsApp bodies (today's feed already falls back to description when snippet is missing — see line 992). |
| Quick-actions strip | Send Email / Make Call / Send SMS / WhatsApp buttons (disable if no email/phone) | Move logic into the chat-bottom quick-reply (channel-aware). |
| Log Activity button | Opens `LogActivityPanel` | Keep. |
| Hover Reply buttons | Per-row Reply (email) / Call (call/sms) / Reply (whatsapp) | Make the quick-reply inline at the bottom of the chat carry this load. Per-row Reply can become a context-menu on the bubble. |

### Dashboard

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| KPI strip | 4 cards: Revenue / Contacts / Deals / Tasks | Replace with the brief's top strip: total open deals · open deal value · new leads this week · replies needed · avg response time. |
| Today's Priorities | List of items computed by `getTodaysPriorities` | Reuse as the "Today's Priorities" triage lane. Click → /tasks queue mode. |
| AI Insights widget | Pulls AI-flagged items | Reuse or repurpose as "AI-Needs-Your-Eye" lane (filtered to `ai_attachment_uncertain`). |
| Live Coach panel | Real-time nudges | Likely keep (or fold into "Today's Priorities"). |
| Analytics card | Collapsible "Charts and detailed analytics will load here..." stub | Delete or defer. |
| Quick-create buttons | New Contact / New Deal / New Task in the header | Keep + add "Log Quick Activity" + "Global Search" per brief. |
| Smart prompts | None today | Net-new: Practice Setup Incomplete, Integration Warnings, Re-engagement Opportunity, AI Features Unconfigured. Dismissible. |
| Triage lanes (4 main) | Not implemented | Net-new. Each click navigates to a filtered view. |
| Triage lanes (additional 4) | Not implemented (Unread Inbound / Failed Sends / Voicemails / AI-Needs-Eye) | Net-new. |

### Tasks queue

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| List view | Filter tabs (today/overdue/...), task rows | Keep. |
| Start Queue button | Opens `TaskQueuePanel` (slide-over, steps through one task at a time, prev/next/notes/complete) | **Wire to dashboard "Today's Priorities" lane click.** |
| Calendar view | Calendar grid | Keep. |
| Analytics view | Analytics dashboard | Keep. |

### Call-coaching

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Queue load | Top-30 deals by `updated_at desc` | Tweak to a "today's-calls"-specific query (open deals with a call task due today, or with `next_activity_at` today). |
| Deal click | Shows persona + scripts + ClickToCall + Email + SMS composers + Activity feed | Keep. |
| Dial-then-next | Not implemented (dialer doesn't auto-advance the queue) | Net-new — after `callDialerOpen` closes with `connected/voicemail/no_answer`, auto-load next deal in the queue. Small wrapper. |
| ClickToCall in-page End Call | Fake setTimeout, doesn't hang up actual Twilio call (outbound audit §1.1) | Pre-existing bug; out of scope for this rebuild. |

### Deals Kanban

| Scenario | Current behavior | Verdict for rebuild |
|---|---|---|
| Board render | Columns by stage, count + total value per column header, `DraggableDealCard` per deal | Keep. |
| Card content | Title + aging badge + contact name + value + owner avatar + first 2 treatment tags | Add `last_activity_at` (relative-time) + `next_activity_at` (relative-time / "today" / "overdue") — both readable via existing fields (`deals.last_activity_at` is stale; needs to read from `MAX(activities.occurred_at)` per deal or denormalise it; `next_activity_at` not on `deals` today — needs to read from earliest open `tasks.due_at` per deal). |
| Drag deal between stages | PATCH `deals.stage_id` + `last_activity_at` | Keep. |
| Card click | Navigates to `/deals/[id]` | Keep. |

### NBA card on `/deals/[id]` (migration target)

Today the NBA only mounts on contact pages. The engine in `src/lib/contacts/next-best-action.ts` is contact-bound (it takes "open deals for this contact" + "last inbound" + "last outbound"). To remount on the deal page, the inputs become "last inbound/outbound on activities **with this deal_id**" + "this single open deal" — a minor adapter wrapping the same `computeNextBestAction` call.

---

## §6 — Live DB state

Queries scoped to test tenant `5aadca14-9786-4aef-bc53-e9287cdd0bbf`. Not re-run for this audit (the previous outbound + deal-attachment audits already established the live shape). Key facts carried forward:

- 1 tenant total in DB.
- ~30 outbound activities + ~70 inbound activities on the test tenant (mix of fixtures + real Twilio sandbox traffic).
- 0 rows in `contact_psych_profiles` (table itself is missing on this branch).
- 0 rows in `activity_templates` across all tenants (templates UI exists; unused).
- `pipeline_stages` for the test tenant: `is_won` + `is_lost` flags set correctly.
- Multi-deal contacts present: Joey Baby (`+447424805475`, ~2-3 deals after 2b.34.1 deal-title work split them properly), historical multi-deal Richard Rivera may still be there.

No live `execute_sql` was run by this audit beyond static schema verification (the `activities_with_integrations` view shape was confirmed via `src/types/supabase.ts`). The planner should treat the DB facts above as the working baseline; re-run a quick sanity SELECT before the first execution phase if anything looks off.

---

## §7 — Failure modes / common errors

### Things that are broken or fragile today and the rebuild MIGHT trip over

| # | Failure | Where | Severity |
|---|---|---|---|
| F1 | Outbound email's "End Call" button on `ClickToCallDialer` is fake — doesn't hang up the actual Twilio call (a setTimeout-only UI illusion). | `click-to-call-dialer.tsx:146-156` (per `outbound_audit.md` §1.1) | P2 — pre-existing, predates this rebuild |
| F2 | `deals.last_activity_at` is **not maintained by trigger** when new activities arrive. The deal-resolver computes from `MAX(activities.occurred_at)` instead. If the Kanban card displays this stale field directly, dates will look wrong. | `deals.last_activity_at` column | P1 — surfaces directly when the Kanban card change ships |
| F3 | `activity_feed-enterprise.tsx`'s feed fetch swallows `error.code === 'PGRST205'` / `42P01` and falls back to plain `activities` table. The fallback path **doesn't surface deal_title / contact_name** (those come from the view's join). Bubbles will lose deal chips on tenants where the view migration hasn't run. | `activity-feed-enterprise.tsx:376-394` | P3 — every tenant on this branch has the view |
| F4 | `contact_psych_profiles` table doesn't exist; `analyzeContactPsychProfile` 500s if called; `psych-profiles/analyze/route.ts` will 500. The flag (`PSYCH_PROFILE_ENABLED = false`) prevents the UI from triggering it. Don't accidentally flip the flag during the rebuild. | `contact-detail-view.tsx:77`, schema | P2 — only bites if someone deletes the guard |
| F5 | NBA card's activities query has a hard `.limit(50)` (`next-best-action-card.tsx:135-136`). If a contact has 50+ outbound-only with no inbound, the "last inbound" is null even when one exists older than 50 rows back. Edge-case; usually fine. | `next-best-action-card.tsx:135` | P3 |
| F6 | Inbound email body lands in `activities.description` (via `ingestLead.insertActivity`), not `rich_content`. Outbound HTML lands in `rich_content`. The email summariser needs to read from **both** fields for full coverage. | `ingest-lead.ts:857`, `dispatcher.ts:411` | P3 — both fields readable today; just remember to OR them |
| F7 | The activity feed's `metadata.ai_*` fields are populated by the **dispatcher inline** today (e.g. `inferEmailPurpose` based on subject keywords; "Sent successfully" hardcoded). They're not real AI calls. So a chat bubble showing "ai_purpose: General" is a heuristic, not Claude output. The persona summary + email summariser **are** real Claude calls — different infra. | `dispatcher.ts:340, 417, 568, 658` | P2 — naming may confuse the design team |
| F8 | `tasks_with_associations` view exists per the page query but isn't documented in this branch's docs. If the rebuild adds queue-mode entry points, double-check the view is actually deployed (it should be — the page works today). | `src/app/tasks/page.tsx:170` | P3 |
| F9 | Husky pre-push deploy: must wait 90s before checking `.cursor/post-push-deploy.log`. Standard gotcha (per `operational-gotchas.md`). | Husky | P3 — known |
| F10 | Heavy server-side libraries (DOMPurify, jsdom) crash Vercel cold-start if top-imported. Pattern is `require()` inside the function. Per principle #12. Anything new in the dispatcher path inherits this discipline. | gotcha doc | P3 — known |
| F11 | `authFetch` NavigatorLock hang — already mitigated with the 2.5s timeout in `src/lib/auth-fetch.ts`. New routes the rebuild adds should remain cookie-friendly. | gotcha doc | P3 — known, mitigated |

---

## §8 — Recommendation

### Recommended path: **B — Layered surface rebuild on top of existing engines**

The rebuild is ~25–30 small phases across 5 surfaces. The strong signal from the code inventory is:
- **None of the engines change.** Dispatcher, `ingestLead`, `resolveMostRecentlyActiveOpenDeal`, deal-resolver, conversation-id, `logAuditServer`, the PATCH /api/activities/[id] route, the AI suggest route, the NBA engine, the Claude one-shot helper, the Practice Setup wizard, the dispatcher's `metadata.ai_*` heuristics — all stay. The activity feed query stays.
- **The UI shells change a lot.** Contact detail page is the biggest single rewrite. Activity feed renders chat bubbles instead of cards. Dashboard becomes a triage-first layout. List page reverts to directory. Kanban card gains two fields.
- **Two AI features are net-new** (persona summary, email summariser). Both are tiny — they're Claude one-shots with a cache table.

Approach: ship feature-by-feature, **not surface-by-surface**. The atomic units are:

1. Contacts list directory revert (1 phase)
2. New table: `contact_persona_summaries` + POST /api/contacts/[id]/persona-summary + Claude one-shot generator (1 phase)
3. Contact detail layout shell — strip NBA + summary cards + tabs + Learning Loop dead code; keep sidebar mount points (1 phase)
4. Contact detail — top one-line strip (deal counts + LTV) (1 phase)
5. Contact detail — AI persona summary block consuming (2) (1 phase)
6. Contact detail — left sidebar active-deals + "View all" + quick actions (1 phase)
7. Activity feed → chat-bubble render shell (LEFT/RIGHT/notes always right, time grouping) (1 phase, biggest)
8. Chat bubble inline 1-2 word AI labels (purpose / outcome / sentiment) — read from existing `metadata.ai_*` (1 phase)
9. Email summariser table (`email_message_summaries` or store on `activities.metadata.ai_summary`) + Claude one-shot triggered on outbound send + inbound webhook arrival (1-2 phases)
10. Chat bubble emails/calls render as AI summary, not full body (1 phase)
11. Filter row (type tabs incl. SMS+WhatsApp+Notes, direction tabs, search) (1 phase)
12. Pinned inline quick-reply at bottom of chat, inherits active deal-chip filter (1 phase)
13. Edit-profile overlay polish — already matches brief, may need only minor tweaks (1 phase)
14. NBA card → unmount from contact page; remount on `/deals/[id]` (1 phase, small)
15. Dashboard top strip metrics (5 numbers) (1 phase)
16. Dashboard triage lanes (4 main) (1-2 phases)
17. Dashboard triage lanes (4 additional) (1 phase)
18. Dashboard dismissible smart-prompt cards (3-4) (1 phase)
19. Dashboard quick-action buttons (1 phase)
20. Tasks Start Queue mode entry from dashboard lane (1 phase — `TaskQueuePanel` already exists)
21. Call-coaching dial-then-next queue mode (1 phase)
22. Deals Kanban card adds `last_activity_at` + `next_activity_at` (1 phase, small)

That's 22 atomic units; conservative buffer to ~28–30 small phases including doc + sweep phases.

### Alternative paths considered

**A — Build a fresh `/contacts/[id]-v2` page in parallel, ship behind a flag, swap.** Rejected because (a) every operator-gate test would have to be run on both pages until swap; (b) the activity feed is shared with deal detail page and call coaching so a chat-bubble shell needs a real branch, not a duplicate; (c) Toffee said no half-built features in production. Path B's small phases give the same safety with one canonical page.

**C — Big-bang single rebuild PR.** Rejected per CLAUDE.md ("phases ~1-2 days of focused work; catching mistakes early"). The rebuild is too broad — a single PR breaks the testability story.

**D — Defer the AI persona summary + email summariser until after the layout ships.** Tempting because they're the most product-shaped pieces. **Recommended as a sub-sequence within Path B** — i.e. ship the chat-bubble shell first with the existing dispatcher's `ai_purpose/outcome/summary` heuristics, then layer the real Claude-generated email summary on top. The persona summary slot can render "Generating…" until phase 9 ships.

### Effort estimate

- Path B (recommended): ~28 small phases × 1-2 days each = **6-10 weeks** of focused work. Reasonable for a 5-surface rebuild.
- Path A: ~6-10 weeks **plus** the cost of dual-running pages and the swap phase.
- Path C: maybe 4 weeks elapsed but with no operator gates between → catastrophic if it breaks anything.
- Path D (deferred AI): ~5-7 weeks for layout-only; the two AI features add 1-2 weeks each.

### Suggested next phases (the first 4-5)

If Toffee signs off on Path B, the planner should write execution prompts for:

- **2b.36** — Contacts list directory revert. Strip `last_inbound_snippet`/`needs_reply`/`last_inbound_*` from `EnhancedContact` and the `loadContacts()` parallel query. Change default sort from `updated_at desc` to `full_name asc`. Delete the Reply pill render. Update the column-header sort options. Tests cover (a) directory sort default, (b) Reply pill is gone, (c) snippet sub-text is gone. Phone gate: open `/contacts`, verify it looks like a directory.

- **2b.37** — Contact detail layout shell. Delete the `psych_profile` + `learning_loop` + summary-cards + Tabs blocks (gated code can finally go). Replace with a placeholder div that says "Chat layout TK" + keep the contact-fields sidebar + Edit-Profile button. Tests cover (a) page renders without crashing on contacts with 0 deals + 0 activities, (b) all dead-code imports are dropped. Phone gate: open a contact detail page, confirm the old tabs / NBA / summary cards are gone.

- **2b.38** — Top one-line strip (deal counts + LTV). New `<ContactKpiStrip>` component reading `deals` already in state. Tests cover (a) closed-lost still counts in LTV, (b) open/closed split is by stage flags.

- **2b.39** — Active-deals list in left sidebar + "View all deals" expansion + Call/SMS/WhatsApp/Email quick actions. Replaces the Contact-Information section's old placement.

- **2b.40** — `contact_persona_summaries` table + POST /api/contacts/[id]/persona-summary route + Claude one-shot generator that reads recent activities and produces a 2-3 sentence blurb. UI block in the right column above the chat reads from the cache table; re-generate button fires the POST.

After 2b.40 the chat-bubble work (2b.41+) can start. Toffee can review what's shipped after every 1-2 phases.

---

## §9 — Recommended execution sequence (table form)

| Phase | Surface | Purpose | Effort (days) |
|---|---|---|---|
| 2b.36 | Contacts list | Revert to directory | 1 |
| 2b.37 | Contact detail | Strip dead code; placeholder | 1 |
| 2b.38 | Contact detail | Top KPI strip | 1 |
| 2b.39 | Contact detail | Left sidebar active-deals + quick actions + Edit-Profile reposition | 1-2 |
| 2b.40 | Contact detail | AI persona summary (schema + route + UI block) | 2 |
| 2b.41 | Activity feed | Chat-bubble render shell | 2 |
| 2b.42 | Activity feed | Inline AI labels + AI Summary preview | 1 |
| 2b.43 | Activity feed | Email summariser (cache + Claude one-shot) | 2 |
| 2b.44 | Activity feed | Render emails + calls as AI summary in bubbles | 1 |
| 2b.45 | Activity feed | Filter row (type tabs + direction tabs + search) | 1 |
| 2b.46 | Activity feed | Pinned inline quick-reply at bottom | 1 |
| 2b.47 | Activity feed | Edit-profile overlay polish | 1 |
| 2b.48 | NBA | Unmount from contact page; remount on /deals/[id] | 1 |
| 2b.49 | Dashboard | Top metric strip (5 numbers) | 1 |
| 2b.50 | Dashboard | Triage lanes part 1 (Priorities / Calls / New Inquiries / Stale) | 2 |
| 2b.51 | Dashboard | Triage lanes part 2 (Unread Inbound / Failed Sends / Voicemails / AI-Needs-Eye) | 1-2 |
| 2b.52 | Dashboard | Smart-prompt dismissible cards | 1 |
| 2b.53 | Dashboard | Quick-action buttons (New Contact / Deal / Activity / Search) | 1 |
| 2b.54 | Tasks | Start Queue from dashboard | 1 |
| 2b.55 | Call-coaching | Dial-then-next queue mode | 1-2 |
| 2b.56 | Deals Kanban | Card `last_activity_at` + `next_activity_at` | 1 |
| 2b.57 | Sweep | Final bug sweep + doc pass | 1 |

That's 21 numbered phases + sweep = ~25-30 days of focused work spread over 6-10 weeks calendar time.

---

## §10 — What to leave alone

Code that should **NOT** be touched in any of the rebuild phases:

1. `src/lib/communications/dispatcher.ts` — canonical outbound; principle #1 / #8 / #10.
2. `src/lib/lead-ingestion/ingest-lead.ts` + `deal-creation.ts` + `judge-deal-attachment.ts` + `deal-title.ts` — canonical inbound; principle #1.
3. `src/lib/deal-resolver.ts` — single source of truth for "most recently active open deal"; principle #6.
4. `src/lib/communications/conversation-id.ts` — namespace UUID; principle #3.
5. `src/lib/auto-audit.ts` — `logAuditServer()`. Reassignment audit pattern; principle #5 (PATCH path).
6. `src/lib/anthropic-client.ts` — Claude one-shot helper.
7. `src/lib/contacts/next-best-action.ts` — NBA engine (the rules are unit-tested; the rebuild only changes where the card mounts).
8. `src/app/api/activities/[id]/route.ts` PATCH path — audit-first reassignment.
9. `src/app/api/activities/[id]/suggest-pipeline/route.ts` — AI inline-suggest.
10. `src/components/communications/change-deal-affordance.tsx` — Change-Deal UI.
11. `src/components/communications/click-to-call-dialer.tsx` initiation path. (The fake "End Call" bug is pre-existing and out of scope.)
12. The migration files under `supabase/migrations/`.
13. `src/lib/integrations/email-provider.ts` and per-tenant credential resolver.
14. The `audit_trail` RLS / service-role pattern.
15. The `activities_with_integrations` view and its joined fields — many downstream surfaces depend on it.
16. The Practice Setup wizard route + provision-treatments endpoint (it's the dashboard's "Practice Setup Incomplete" target; touching it loops the dependency).

---

## §11 — Issues / risks register

### P0 — must fix before launch (or surface to Toffee)

**None blocking this rebuild specifically.** The pre-existing outbound P0 (settings PATCH routes lacked auth) was closed in 2b.7.

### P1 — wrong behavior visible to users

- **P1-A** — `deals.last_activity_at` is stale (no trigger maintains it). If 2b.56 displays this directly on the Kanban card it'll look wrong. **Fix in 2b.56's own scope**: compute from `MAX(activities.occurred_at)` per deal, or denormalise via trigger.
- **P1-B** — When the chat-bubble renders inbound message bodies, the body might live in `activities.description` (ingestLead path) OR `activities.snippet` (composer reply path) OR `activities.rich_content` (outbound email). The current feed already handles the snippet/description fallback (line 992); the bubble must keep that.

### P2 — confusing / incomplete / not blocking

- **P2-A** — `metadata.ai_purpose` / `ai_outcome` / `ai_summary` on **outbound** activities are dispatcher heuristics (`inferEmailPurpose` / hardcoded "Sent successfully"), not real Claude output. Surfacing them as AI labels in the chat bubble is fine but may set wrong expectations.
- **P2-B** — `contact-detail-view.tsx` carries dead-code paths behind feature flags (psych profile + learning loop). 2b.37 should delete them entirely.
- **P2-C** — `EnterpriseDealsTable` is 1959 LOC monolith. The 2b.56 Kanban-card change should resist the temptation to split the file.
- **P2-D** — `analyzeContactPsychProfile` service uses OpenAI (not Claude); will need refactor or replacement for the new persona summary feature. Recommendation is to ignore the old service and write a new lean one against `anthropic-client.ts`.
- **P2-E** — `ContactDetailView` mounts `AIAssistantChat` FAB at bottom right. The brief is silent on whether it stays. Default: keep.

### P3 — docs / naming / future-hardening

- **P3-A** — The `activities_with_integrations` view's fallback path on the feed doesn't carry joined fields. New tenants need the view applied; current branch is fine.
- **P3-B** — NBA's `.limit(50)` activity scan won't see the most recent inbound for hyper-active contacts. Acceptable; document the constraint when remounting on /deals/[id].
- **P3-C** — `contacts-list-enterprise.tsx` 2b.30 added unbounded last-activity query for the list rows (`tap MEDIUM #4` in `2b-30-to-33`). If 2b.36 reverts the sub-text, also drop that query so the list loads faster.
- **P3-D** — The dashboard has 11 components in `src/components/dashboard/`. Several (`live-coach-panel`, `dashboard-intelligence-panel`, `live-notification-badge`, `time-period-selector`, `widget-customizer`, `area-chart-widget`, `bar-chart-widget`, `deals-funnel-chart`, `revenue-chart`) may not survive the triage-first redesign. Plan an end-of-rebuild prune phase.
- **P3-E** — `tasks_with_associations` view dependency is undocumented; if a new tenant lacks it the queue mode breaks. Add a verification step to the dashboard wiring phase.

---

## §12 — Out of scope for upcoming phases

The brief is broad. Some adjacent things the rebuild should NOT bundle:

- **No new inbound channel adapters.** The chat-bubble renders what's already there; we don't add a new source.
- **No automation engine changes.** The AI-suggest CTA, the pipeline router, FAQ responder — all stay as-is.
- **No conversation_id namespace changes.** Locked principle #3.
- **No `audit_trail` RLS broadening.** Reassignment + persona-summary writes go through `logAuditServer()` / service-role.
- **No real "End Call" button fix in the ClickToCallDialer.** Out of scope for the call-coaching dial-then-next phase; flag separately.
- **No `activity_templates` resurrection.** Templates UI exists but is unused; not part of this rebuild.
- **No psych-profile (anxiety/trust/style) restoration.** Replaced by the lighter persona summary blurb. Old schema stays paused / deleted.
- **No multi-contact chat threads.** Each contact gets one chat layout; principle #3 (one conversation per (tenant, contact, channel)).
- **No bulk-reply UI.** Bulk-send is a separate panel; the new quick-reply is single-contact.
- **No real-time push for the chat.** Today the feed re-fetches on send; sticking with that is fine for V1.
- **No mobile redesign.** Desktop / iPad-sized canvas only.
- **No deletion of the AI Assistant FAB on contact pages** unless Toffee asks.
- **No re-introduction of Persona Insights blocks (anxiety/trust sliders) on contact pages.** The new persona summary block replaces this surface.

---

## §13 — Adjacent findings

Things noticed during the audit that aren't strictly the rebuild's topic but the planner should know:

- **The Practice Setup wizard (2b.35.4) is a clean dependency target.** The dashboard's "Practice Setup Incomplete" smart-prompt needs a "wizard is complete when X" check. Today the wizard doesn't store completion state on the tenant; checking "has the tenant got at least one treatment_offering + at least one non-Unsorted pipeline" is the natural proxy. Add a flag or compute it.
- **`tasks.next_activity_at` doesn't exist** as a column. For the Kanban card's "next activity" date the query has to be `MIN(tasks.due_at) WHERE deal_id = X AND status != 'done' AND due_at > now()`. Build a small helper.
- **The activity feed re-fetches on every dropoff** (`fetchActivities()` after Send + after DnD + after AI accept). For chat bubbles this might feel slow on slow connections; consider optimistic insert with a "sending…" bubble that swaps to "sent" on response.
- **`/contacts/[id]` and `/deals/[id]` both mount `ActivityFeedEnterprise`.** When the feed becomes chat-bubble, the deal page inherits the chat layout too. Confirm with Toffee that's wanted (likely yes — chat-bubble is universally better — but worth flagging).
- **`/pipeline` redirects to `/deals`** (2b.34.9). Any new doc / link should target `/deals?view=board` or rely on the toggle.
- **The 2b.34.2 default `updated_at` sort on the contacts list bleeds into saved views.** Users who created a saved view in 2b.34.2 onward inherit the inbox sort. The 2b.36 phase should reset stored views' default-sort to `full_name` (or at least clear the field so users get the new default).
- **`inboxstyle` ContactProfileDialog is already a "single overlay" matching the brief.** Maybe just polish (Edit-Profile button position) rather than rebuild.
- **No global search exists today.** The dashboard's "Global Search" button is a new component (likely a slide-over with `<Command>` palette pattern); plan accordingly.
- **`NextBestScriptPanel` (in `src/components/scripts/`) is mounted on `/call-coaching` and on the `psych_profile`-gated section of the contact page.** With NBA leaving contact pages, the contact-side script panel mount goes too. The call-coaching mount stays.
- **AI's `claudeOneShot` defaults to Haiku 4.5** — cheap, fast. Good for persona summary + email summariser. If quality is poor, escalate to Sonnet 4.6 inside the prompt rather than churning the helper.
- **`activities_with_integrations` view includes `agent_name` joined from `app_users`.** The chat bubble's "who replied" surface gets this for free.

---

## §14 — Open questions for planner

Plain-English questions that need Toffee's sign-off before execution prompts can be written. Each has a recommendation.

### Q1 — Should the NBA card move to the deal page, or just disappear entirely?

**Background.** Right now the contact page has a Next-Best-Action card at the top of its right column. It looks at the contact's open deals + latest inbound/outbound and tells the operator what to do next ("Reply to this patient", "Follow up — stale deal", "Create a deal", etc.). The rebuild brief removes it from the contact page. The brief mentions it could move to the deal detail page.

**Options:**
1. Move it to the deal detail page (1 small phase to adapt the inputs from contact-level → deal-level).
2. Delete it entirely. The dashboard's triage lanes effectively replace it.
3. Keep it ONLY for "reply_inbound" (the urgent case) and surface it on the chat bubble as a small "reply now" pill.

**Recommendation:** Option 2 (delete entirely). The dashboard "replies needed" lane + "stale follow-ups" lane do exactly what the NBA used to do, but at the practice-wide level which is more useful. Keeping the NBA on /deals/[id] duplicates the same signal in a place operators rarely linger.

### Q2 — Where does the AI persona summary get stored, and when is it refreshed?

**Background.** The brief says "AI persona summary block — synthesise a 2-3 sentence 'what kind of person is this' blurb." It needs a cache (calling Claude on every contact page load is expensive); the cache has to know when to invalidate.

**Options:**
1. New table `contact_persona_summaries` with `(tenant_id, contact_id) PK`, `summary text`, `generated_at`, `last_activity_seen_at`. Re-generate on demand (button click) and **automatically** once a contact has accumulated more than N new inbound/outbound activities since `last_activity_seen_at` (say N=5).
2. Same table but generate ONLY on user click — never auto.
3. Store on `contacts.persona_summary text` directly (no separate table).

**Recommendation:** Option 1. Auto-refresh when there's enough new signal feels right; the user-click "Refresh" button is the escape hatch. New table beats a column because we may later add `model_version` / `confidence` / multi-persona-variant fields without churning `contacts`.

### Q3 — How does the email summariser get triggered for inbound emails?

**Background.** Outbound emails go through the dispatcher (one clear hook point). Inbound emails arrive via webhook + `ingestLead` (another clear hook). Calls have their own transcription path (`/api/ai/transcribe-call` already exists). For the chat bubble to show "AI summary" instead of full body, every email row needs a `metadata.ai_summary` populated.

**Options:**
1. Trigger Claude one-shot at the dispatcher (outbound) and the inbound email webhook (inbound). Inline, blocking — adds ~1-2 seconds to send/receive.
2. Trigger asynchronously via a queue / background worker. Bubble shows "Generating summary…" until done.
3. Trigger lazily on first chat-bubble render — i.e. if the chat opens and the activity doesn't yet have `ai_summary`, fire the one-shot, cache it. Subsequent renders are instant.

**Recommendation:** Option 3 (lazy on first render). Cheapest, simplest, no queue infrastructure. Adds latency once per email per browser session but that's invisible (the bubble can render the subject + a "summarising…" pulse for ~1 second).

### Q4 — Should calls render as AI summaries or as the simple "5min 23s • Connected" we have today?

**Background.** The brief says "emails + calls rendered as AI summaries". Calls already have `outcome` + `duration_seconds` + (when transcribed) full transcripts. We have `/api/ai/summarize-call` route. Today the chat bubble would naturally show "5m 23s • Connected" as the call's preview — but the brief wants an AI summary like "Patient asked about Invisalign pricing; said they'd think about it."

**Options:**
1. Run `summarize-call` for every call (requires the call to have been transcribed first — most calls aren't).
2. Show a short caption if a summary is already cached (`metadata.ai_summary`), else fall back to "5m 23s • Connected"-style preview.
3. Always show "5m 23s • Connected" in the bubble; the AI summary appears only in the side-detail panel.

**Recommendation:** Option 2 (graceful fallback). Don't block call display on AI processing; use what's there and let summaries enrich over time.

### Q5 — Should the chat-bubble "filter by deal" chips be persistent or per-session?

**Background.** Today's deal-chip filter (2b.34.4) is per-mount — switch tabs and it resets to "All". The chat layout's pinned quick-reply respects the active chip via `effectiveOutboundDealId`. If an operator filters to Deal A, sends a reply, refreshes, the chip goes back to "All" and the next reply attaches to the page-level default.

**Options:**
1. Keep per-mount (current behaviour). Resets to All on refresh.
2. Remember in URL (`?deal=<id>`) so refresh keeps it.
3. Remember per-contact in localStorage so opening a contact next week resumes the last filter.

**Recommendation:** Option 2 (URL). It's the most predictable for users and survives the back button. localStorage feels magic for the wrong reasons.

### Q6 — Should the dashboard's smart-prompt cards be dismissed forever, dismissed-for-now (re-appears after a day), or hide-if-resolved?

**Background.** The brief lists 4 smart-prompts: Practice Setup Incomplete, Integration Warnings, Re-engagement Opportunity, AI Features Unconfigured. Each is dismissible.

**Options:**
1. Dismissed = forever (operator's choice; never appears again). Simple.
2. Dismissed = 24h snooze. Reappears tomorrow if still applicable.
3. Hide-if-resolved (no dismiss button at all — the prompt disappears when the underlying issue is fixed).

**Recommendation:** Option 3 (hide-if-resolved) for Practice Setup, Integration Warnings, AI Features Unconfigured — these are objective states. Option 1 (forever) for Re-engagement Opportunity, which is more "we noticed something" advisory and dismissing should respect "don't bug me about this lead again". Mix-and-match.

### Q7 — Should the call-coaching "dial-then-next" queue continue after a missed/voicemail call, or stop?

**Background.** The brief says "dial-then-next-call queue mode". When the first call ends, what's the rule?

**Options:**
1. Always advance to next in the queue, regardless of outcome.
2. Advance on `connected` / `voicemail`; stop on `no_answer` / `busy` (so operator can reattempt). Manual "next" button always available.
3. Always advance; show a small "go back" button to retry the previous deal.

**Recommendation:** Option 1 (always advance) with a visible "Previous" button always available. Operators in flow want to keep moving; if a call didn't connect they can come back to the deal later in the day.

### Q8 — Does the new contact page's "Edit profile" overlay open as a slide-over (right side) or as a centred dialog?

**Background.** Today's `ContactProfileDialog` is a centred dialog with full profile + attribution fields. The brief says "single overlay with full profile + attribution data". Doesn't specify side-slide vs centred.

**Options:**
1. Keep as centred dialog (current).
2. Convert to right-side slide-over (matches Create Contact and Create Deal flows).
3. Inline-edit fields on the page itself, no overlay.

**Recommendation:** Option 2 (right-side slide-over). It matches the other "edit big entity" patterns in the app (Create Contact, Create Deal, the new Slide-In for activity detail). Consistency wins.

---

## §15 — Validation

- Audit doc exists at `dental-crm/docs/audits/contacts_dashboard_rebuild_audit.md`. §1–§14 populated.
- Build clean: NOT re-run (audit is read-only; the snapshot at commit `5bae190` already passed `npm run build` per the last 2b.23 changelog).
- TypeScript clean: NOT re-run (same reason; nothing in this audit modifies source).
- Git working tree shows only the new audit file + pre-existing unrelated unstaged items (`supabase/.temp/cli-latest`, `.claude/scheduled_tasks.lock`, untracked `scripts/fill-practice-brain.mjs`).

# Deal-attachment audit (Phase 2b.11.5)

> **Audit type:** Read-only docs investigation — no code or schema changes.
> **Date:** 2026-05-19
> **Audited at commit:** `7629ff3d16641a153d92d25c5a80f9cb7c8ac011` (`docs(2b.11): record deploy ID and curl smoke pass`)
> **Branch:** `phase-1-attribution-foundation` (working tree had unrelated unstaged edits at audit time; this file is the only deliverable).
> **Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf` ("Deepak's Dental Practice")
> **Scope:** How `activities.deal_id` is set on inbound (`ingestLead`) and outbound (dispatcher + composers), deal/pipeline data model, UI affordances, audit infrastructure. Excludes `conversation_id` (2b.11), automation engine (2b.12), deal merge UI.
> **Post-push deploy (docs-only):** `dpl_QumNBUdcAS8VuApAnpcCuw6JYiah` — Ready 2026-05-19 ~22:35 UTC (`8c7dc22`).

**Pre-flight reference docs**

| File | Present |
|------|---------|
| `docs/audits/outbound_audit.md` | Yes (structural reference) |
| `docs/2b/2b-2-a-3-changes.md` | Yes |
| `docs/2b/2b-11-changes.md` | Yes |
| `docs/audits/D01_pipeline_and_deals.md` | **No** (not on disk) |

**DB query path:** Supabase MCP `execute_sql` — all queries succeeded (no pooler fallback needed).

---

## §1 — TL;DR — what works, what doesn't

| Area | Verdict | One-line summary |
|------|---------|------------------|
| Inbound attachment (`ingestLead`) | ⚠️ Partial | Open deals are **reused** (2b.2.a.3); multi-open-deal pick uses `deals.last_activity_at`, which is **not** bumped when messages arrive. |
| Outbound attachment (dispatcher) | ✅ Pass-through | `deal_id` = caller's `context.dealId`; **no inference** when null. |
| Contact-level outbound UI | ⚠️ Wrong default | Passes `deals[0].id` by **`created_at` DESC**, not most-recent activity. |
| Deal-level outbound UI | ✅ | Explicit `dealId` from deal view / feed. |
| Slide-in Reply path | ✅ Inherit | Reply uses `activity.deal_id` from the source row. |
| Edge cases (multi-open contact) | ❌ Risk | Inbound reuses **one** open deal (any pipeline); outbound from contact UI may stamp a **different** deal. |
| UI: view deal on activity | ✅ Read-only | Slide-in + feed show deal chip/link when `deal_id` set. |
| UI: change deal on activity | ❌ Missing | No reassignment affordance anywhere. |
| Audit trail for reassignment | ⚠️ Infra exists | `audit_trail` + `logAudit()` ready; not used for activities today. |
| `activities_stamp_deal_first_response` | ⚠️ INSERT-only | Fires on **INSERT** outbound with `deal_id`; reassignment via UPDATE would not re-stamp. |

**Headline:** Inbound and outbound both **can** attach activities to deals, but there is **no single consistent rule** for "which deal" when a contact has multiple open deals. The engine reuses one open deal per inbound (good for duplicate prevention); the UI often picks a different deal for outbound (newest-created, not most-recently-messaged). Planner should treat 2b.11.5b as aligning **engine + UI + `last_activity_at` maintenance** under one policy.

---

## §2 — User-facing capabilities today

### What users can see

- **Activity timeline** (`ActivityFeedEnterprise`): optional purple deal badge with link to `/pipeline?deal={id}` when the activity row has a joined `deal_title`.
- **Activity detail slide-in** (`ActivityDetailSlideIn`): "Context" section shows deal title, stage, pipeline, value, and external link — **only when** `activity.deal_title` is populated (from `activities_with_integrations` view).
- **Deal detail view**: activities filtered by `deal_id`; composers receive that deal's id.
- **Contact detail view**: activity tab uses `showAllContactActivities={true}` (all contact activities); deal badge still shown per row.

### What users cannot do

- **Change** which deal an activity is on (no dropdown, no PATCH route).
- **Detach** an activity from a deal (`deal_id` null) from the UI.
- **See** which deal an outbound composer will use before send (contact page: small "Deal Related" badge only when `dealId` prop is set — no deal title in composer header).

### Reply behavior (user-visible)

- **Slide-in Reply** (email/SMS/WhatsApp): sends with the same `deal_id` as the activity being viewed.
- **Feed Reply** (email only in feed hover actions): passes `activity.deal_id` into `EmailComposerPanel`.
- Neither path sets `In-Reply-To` / thread headers (separate from deal attachment; see `outbound_audit.md`).

---

## §3 — Code inventory

### Engine — lead ingestion

| Path | LOC | Role |
|------|-----|------|
| `src/lib/lead-ingestion/ingest-lead.ts` | 816 | Canonical inbound chokepoint; calls `createDealForLead` then `insertActivity` with `deal_id`. |
| `src/lib/lead-ingestion/deal-creation.ts` | 593 | `findReusableOpenDeal`, `createDealForLead`, pipeline/stage/owner resolution. |
| `src/lib/lead-ingestion/types.ts` | — | `SourceChannelEnum` including `sms_inbound`, `whatsapp_inbound`, `google_lead_form`, forms, widget channels. |
| `src/lib/lead-ingestion/dedup-engine.ts` | — | Contact match / `review_required`; no deal logic. |
| `src/lib/lead-ingestion/adapters/google-lead-form-adapter.ts` | 177 | Pure mapper → `IngestLeadInput`; **no** deal logic. |

**Inbound orchestrators (not under `adapters/`, but call `ingestLead`)**

| Path | `source_channel` | Deal handling |
|------|------------------|---------------|
| `src/lib/whatsapp/inbound.ts` | `whatsapp_inbound` | Delegates to `ingestLead`; propagates `deal_id`. |
| `src/lib/sms/inbound.ts` | `sms_inbound` | Same. |
| `src/app/api/webhooks/whatsapp/route.ts` | — | Glue + signature. |
| `src/app/api/webhooks/sms/route.ts` | — | Glue + signature. |
| `src/app/api/webhooks/google-lead-form/route.ts` | — | Adapter + `ingestLead`. |
| `src/app/api/marketing/forms/submit/route.ts` | form channels | Direct `ingestLead`. |
| `src/app/api/widget/sessions/[id]/submit/route.ts` | booking/widget | Direct `ingestLead`. |
| `src/app/api/dedup-queue/[id]/resolve/route.ts` | queue channel | Calls `createDealForLead` on resolve (same reuse rules). |

**Fast paths:** None found that insert activities **without** going through `ingestLead` for SMS/WhatsApp/Google Lead Form. Email inbound stub (`src/app/api/webhooks/email/route.ts`) inserts activities separately (deal attachment not audited in depth here; 2b.11 notes it).

### Dispatcher — outbound

| Path | LOC | Role |
|------|-----|------|
| `src/lib/communications/dispatcher.ts` | 923 | `dispatchEmail` / `dispatchSms` / `dispatchWhatsApp` / `dispatchVoiceCall`; stamps `deal_id: context.dealId ?? null`. |

### Composers

| Path | LOC | API route |
|------|-----|-----------|
| `src/components/communications/email-composer-panel.tsx` | 364 | `POST /api/communications/send-email` |
| `src/components/communications/sms-composer-panel.tsx` | 243 | `POST /api/communications/send-sms` |
| `src/components/communications/whatsapp-composer-panel.tsx` | 239 | `POST /api/communications/send-whatsapp` |

Routes pass `deal_id` from JSON body → `context.dealId` (see `send-email/route.ts` lines 37–39, 88–89).

### Slide-in

| Path | LOC | Role |
|------|-----|------|
| `src/components/communications/activity-detail-slide-in.tsx` | 831 | Load activity; Reply sets `deal_id: activity.deal_id`. |

### Composer mount points (`dealId` source)

| Surface | File | `dealId` passed |
|---------|------|-----------------|
| Deal detail modal | `deal-detail-view-modal.tsx` | `dealId` prop (explicit) |
| Contact detail — header composers | `contact-detail-view.tsx` | `deals[0].id` after `order('created_at', { ascending: false })` |
| Contact detail — activity feed quick actions | `activity-feed-enterprise.tsx` | Prop `dealId` (= `deals[0].id` on contact tab) **or** `activity.deal_id` on per-row Reply |
| Reception workspace | `reception-workspace.tsx` | `details?.deals?.[0]?.id` |
| Call coaching | `call-coaching-workspace.tsx` | (pattern similar to reception) |

**Note:** `contact-detail-view` also computes `primaryDealId` via stage **name** heuristics (`closed`/`won`/`lost` in name) for other UI — but composers use `deals[0].id`, not `primaryDealId`.

---

## §4 — Data model

### `deals` (live columns — excerpt)

Key columns for attachment policy:

- `id`, `tenant_id`, `contact_id`, `pipeline_id`, **`stage_id`** (FK to `pipeline_stages`; audit prompt's `pipeline_stage_id` name is **not** used in app code)
- `title`, `status`, `last_activity_at`, `first_response_at`, `deleted_at`
- `owner_user_id`, `value_estimate_cents`, `treatment_tags`, `source`

### `pipeline_stages`

- `is_won`, `is_lost` (boolean NOT NULL DEFAULT false) — added in 2b.2.a.3
- `position` (sort order; not `sort_order` in DB)
- Test tenant has one terminal stage: **Closed-Lost** (`is_lost = true`) on the default pipeline; no `is_won = true` stage configured

### `activities.deal_id`

- FK: `activities_deal_id_fkey` → `deals(id)` **ON DELETE CASCADE**
- Indexes: `idx_activities_deal_id`, `idx_activities_org_deal` (partial `WHERE deal_id IS NOT NULL`)
- Nullable: yes (`deal_id` can be null)

### Triggers on `activities`

| Trigger | Effect relevant to deal attachment |
|---------|-----------------------------------|
| `activities_stamp_deal_first_response` | AFTER INSERT: if `direction = outbound` AND `deal_id IS NOT NULL`, sets `deals.first_response_at` once. |
| `trigger_update_contact_first_response` | Contact-level sibling (unchanged). |
| `validate_activity_tenant_fks` | Tenant consistency on insert/update. |
| `activities_prevent_tenant_change` | Blocks `tenant_id` mutation. |

**Reassignment implication:** Changing `activities.deal_id` via UPDATE does **not** fire the first-response trigger. Moving an outbound activity to a new deal will **not** stamp `first_response_at` on the target deal.

### `deals.last_activity_at` — important gap

- Set on **deal insert** in `createDealForLead` (`deal-creation.ts` line 196).
- Updated manually in some UI flows (pipeline board, deal dialogs, automations).
- **Not** updated by `ingestLead`, dispatcher, or any DB trigger when a new activity is inserted.

Therefore `findReusableOpenDeal`'s `ORDER BY last_activity_at DESC` reflects **deal creation / manual bumps**, not **latest message on the deal**. Live check on contact `13994c8a-…` (7 open deals): `last_activity_at` on deal rows did not match `max(activities.occurred_at)` for linked activities.

### Audit log candidates

| Table | Fit for "Change deal" events |
|-------|------------------------------|
| **`audit_trail`** | **Best fit** — `entity_type`, `entity_id`, `before_state` / `after_state`, `changed_fields`, `user_id`, `tenant_id`. Used by `src/lib/auto-audit.ts` (`logAudit`) and marketing modules; viewer at `settings/audit-trail-viewer.tsx`. |
| `audit_logs` | Simpler (`action`, `resource` only) — too coarse. |
| `deal_stage_history` | Stage moves only, not activity↔deal. |
| `permission_changes_log` | RBAC only. |

---

## §5 — Current behavior — exhaustive map

### 5.1 `ingestLead` deal decision flow

```
validate → idempotency (event_id) → dedup
  → review_required → no contact, no deal, no activity
  → matched | new → contact
  → resolveSLA → touchpoint
  → createDealForLead
       → findReusableOpenDeal → if hit: reuse deal id (no insert)
       → else resolveDealContext → insert new deal
  → insertActivity(deal_id)
  → notifications / optional Google Lead conversion
```

**`IngestLeadInput` shape (confirmed):** nested `contact: { email, phone, …, consents }`, nested `attribution: { utm_*, gclid, … }`, top-level `treatment_offering_id`, `source_channel`, `event_id`, `external_message_id`, etc.

### 5.2 `createDealForLead` / reuse rules (2b.2.a.3)

From `findReusableOpenDeal` (`deal-creation.ts` lines 261–294):

1. **Open deal** = joined `pipeline_stages` with `is_won = false` AND `is_lost = false`, `deals.deleted_at IS NULL`.
2. **No pipeline filter** — any open deal for the contact qualifies (cross-pipeline reuse is intentional).
3. **No treatment filter** — inbound `treatment_offering_id` does not affect which open deal is reused.
4. **No time-gap rule** — stale open deals still reuse until moved to a terminal stage.
5. **Pick one:** `ORDER BY last_activity_at DESC NULLS LAST, updated_at DESC`, `LIMIT 1`.
6. If none: create new deal — title **"Inquiry"** on tenant **default pipeline** when no active offering; else offering-driven pipeline/stage/title.

**"Re-engagement creates new deal" (planner memory):** There is **no** separate time-based re-engagement rule in code. A **matched** contact gets a **new** deal only when `findReusableOpenDeal` returns null (all deals terminal, or no deals). Tests in `ingest-lead.test.ts` ("Phase 2a.7 re-engagement") explicitly pre-stage `null` for reuse lookup to test owner inheritance on **create** path.

### 5.3 Dispatcher outbound

- Pending/final activity insert: `deal_id: context.dealId ?? null` (email ~326, SMS ~506, WhatsApp ~647, voice ~837).
- **No** `SELECT` from `deals` to infer a deal when `dealId` is omitted.
- When `context.dealId` set: `detectAndFireFirstResponse` runs after successful send (email/SMS/WhatsApp/voice).

### 5.4 Edge-case matrix (§2.10)

| Scenario | Current behavior |
|----------|------------------|
| Known contact, exactly one open deal — inbound | Reuses that deal; activity `deal_id` set. |
| Known contact, multiple open deals — inbound | Reuses **one** deal: highest `deals.last_activity_at` (then `updated_at`). **Not** the deal that last received a message unless that coincides with creation order. |
| Known contact, zero open deals (all won/lost) — inbound | `findReusableOpenDeal` null → **creates** new deal (Inquiry or offering path). |
| Known contact, never had a deal — inbound | Creates new deal on first successful ingest (dedup `new` or `matched`). |
| Unknown sender (dedup `new`) — inbound | New contact + new deal (same create path). |
| Sender in `review_required` — inbound | No contact, **no** activity, **no** deal; queue row only. |
| Outbound from deal-specific surface | `deal_id` = that deal (explicit prop). |
| Outbound from contact-level surface, 1 open deal | `deal_id` = `deals[0].id` (**newest created**, not necessarily the open deal with latest messages). |
| Outbound from contact-level surface, 0 open deals | `dealId` undefined → activity `deal_id` **null**. |
| Outbound from contact-level surface, 3+ open deals | `deal_id` = `deals[0].id` (newest **created**); likely **≠** deal inbound reuse would pick (`last_activity_at` ordering). |
| Reply from slide-in on inbound with `deal_id` | Outbound activity gets **same** `deal_id` as source (`activity-detail-slide-in.tsx` 187). |
| Reply from slide-in on inbound with `deal_id = null` | Outbound `deal_id` **null** (no inference). |

---

## §6 — Live DB state (verbatim)

**Tenant deal count**

```json
[{"deal_count": 135}]
```

### 6a — `deals` columns (information_schema)

See query result in investigation: 40+ columns including `stage_id`, `last_activity_at`, `first_response_at`, `deleted_at`, `status`, etc.

### 6b — `pipeline_stages` columns

`id`, `tenant_id`, `pipeline_id`, `name`, `position`, `created_at`, `updated_at`, `deleted_at`, **`is_won`**, **`is_lost`**.

### 6c — Stages on test tenant

14 stages across 3 pipelines; only **Closed-Lost** has `is_lost = true`; all `is_won = false`.

### 6d — Sample deals (LIMIT 50)

50 rows returned (ordered by `contact_id`, `updated_at DESC`). Examples:

- Contact `4ef5a768-…` (Deepak Hegde / WhatsApp validation): open **Inquiry** `285b47c3-…` + closed-lost **Inquiry** `346398b7-…` (2b.2.a.3 validation data).
- Contact `13994c8a-…` (Richard Rivera): **7** open deals across pipelines (matches multi-open query below).

Full row set omitted here for size; captured in audit run 2026-05-19 via MCP.

### 6e — Activity counts per deal (TOP 20)

| deal_id | title | activity_count | distinct_conversations |
|---------|-------|----------------|------------------------|
| 37d8044a-… | Dental Assessment - Edward Carter | 11 | 3 |
| 94bd7300-… | Initial Consultation - Donna Mitchell | 11 | 3 |
| f6203f01-… | Veneers - Jason Flores | 10 | 3 |
| … | … | … | … |

(20 rows total — top deal has 11 activities and 3 distinct `conversation_id`s.)

### 6f — Contacts with multiple open deals (TOP 20)

| contact_id | open_deals_count | deal_titles (sample) |
|------------|------------------|----------------------|
| 13994c8a-… | 7 | Wisdom Teeth Extraction, First Visit, Teeth Whitening, … |
| 76753d46-… | 6 | Invisalign, Dental Assessment, Gum Treatment, … |
| 3da14920-… | 5 | Veneers, Crown & Bridge, Teeth Whitening, … |
| … | … | … |

20 contacts returned with `open_deals_count > 1`. This is the primary population for auto-attach policy design.

---

## §7 — Issues / risks register

| ID | Pri | Issue |
|----|-----|-------|
| D1 | **P0** | **Inbound vs outbound deal mismatch** for multi-open contacts: engine reuse uses `findReusableOpenDeal`; contact UI outbound uses `deals[0]` by `created_at`. Messages can land on different deals in the same thread. |
| D2 | **P1** | **`deals.last_activity_at` is stale** for messaging: not updated on activity insert; reuse ordering does not reflect real conversation activity. Recommended policy using `max(activities.occurred_at)` requires engine **or** trigger work in 2b.11.5b. |
| D3 | **P1** | **No UI to correct** wrong attachment; users cannot move activity to another deal. |
| D4 | **P2** | **Contact `primaryDealId` vs composer `deals[0]`** use different heuristics (stage name vs created_at). |
| D5 | **P2** | **Open deal definition split**: engine uses `is_won`/`is_lost`; contact UI `isDealClosed` uses stage **name** substring matching — can disagree. |
| D6 | **P2** | **Terminal stages sparse**: only one `is_lost` stage on one pipeline; most "late" stages still count as open → aggressive reuse. |
| D7 | **P3** | **Reassigning `deal_id`** won't update `deals.first_response_at` (INSERT-only trigger). May be correct but must be documented for conversion/SLA reporting. |
| D8 | **P3** | **Seed data**: many deals show `activity_count` > 0 but `max(activities.occurred_at)` null on sampled rows — likely activities not linked via `deal_id` on seed/fixture data; confuses manual QA. |

---

## §8 — Recommended policy (planner sign-off required)

> All items below are **recommendations**, not implemented.

### 8.1 Inbound auto-attachment rule

**Recommend:** For a known contact with one or more **open** deals (`is_won = false AND is_lost = false`), attach inbound activities to the open deal with the latest **`max(activities.occurred_at)`** on that deal (tenant-scoped). Tie-break: `deals.updated_at DESC`.

- If **zero** open deals → keep current behavior: create new Inquiry (or offering) deal via `createDealForLead`.
- **Replace** `findReusableOpenDeal`'s reliance on `deals.last_activity_at` with an activity-based query (or add a trigger to maintain `last_activity_at` on every activity insert — activity-based query is simpler to reason about).

**Trade-offs**

| Approach | Pros | Cons |
|----------|------|------|
| **Most recent activity (recommended)** | Matches user mental model ("last conversation continues") | Requires SQL change; slightly heavier query |
| Keep `last_activity_at` on deal row | Fast index lookup | Must add reliable maintenance on every activity insert/update |
| Treatment / pipeline filter | Cleaner pipelines per service | Conflicts with 2b.2.a.3 "any open deal" product decision |
| AI / content matching | Could disambiguate implant vs whitening | Out of scope; latency and errors |

### 8.2 Outbound attachment rule

**Recommend:**

- **Deal context surfaces:** unchanged — use explicit `dealId`.
- **Contact-level surfaces:** use the **same** rule as §8.1 (most recently active open deal by `activities.occurred_at`). If none, `deal_id` null (do not auto-create a deal on outbound).

**Trade-offs:** Consistency with inbound vs forcing user to pick deal in composer when ambiguous (could add later).

### 8.3 Slide-in Reply rule

**Recommend:** **Inherit** source activity's `deal_id` (current behavior). Do not re-run "most recent active" on Reply — the user is explicitly continuing that message's deal context.

### 8.4 "Change deal" UI shape

**Recommend:** In `ActivityDetailSlideIn`, header Context section:

- Chip: **"Deal: {title} ▾ Change"**
- Dropdown: contact's deals — **open** first (sorted by latest activity), then **closed** (won/lost) in muted style
- Bottom option: **Detach (no deal)**
- Confirm dialog before apply
- Requires new API: `PATCH` activity `deal_id` with auth + tenant checks

### 8.5 Audit trail

**Recommend:** Reuse **`audit_trail`** via `logAudit()`:

- `action_type`: `update`
- `action_category` / `entity_type`: `activity`
- `before_state` / `after_state`: `{ deal_id: … }`
- `changed_fields`: `['deal_id']`

Dedicated `activity_deal_changes` table only if compliance needs immutable append-only separation from general audit.

### 8.6 Permissions

**Recommend:** Add **`activities.deal_association.edit`** (or document reuse of **`deals.edit`** with description "includes reassigning activities between deals"). No existing permission mentions activities.

---

## §9 — Recommended execution sequence (2b.11.5b)

**Single phase (recommended)** unless planner wants a logic-only ship first:

1. **Engine:** Update `findReusableOpenDeal` (or rename) to use activity-based recency; align optional outbound inference helper (shared module).
2. **Maintenance (if keeping `last_activity_at`):** Trigger or shared post-insert hook on `activities` to bump `deals.last_activity_at` when `deal_id` set.
3. **API:** `PATCH /api/activities/[id]` or `/api/communications/activities/[id]/deal` with audit log.
4. **UI:** Slide-in dropdown (§8.4).
5. **Composers:** Contact-level `dealId` from shared resolver (not `deals[0]`).
6. **Tests:** Multi-open contact matrix; reuse + outbound + reply + reassign.
7. **Gate:** Manual test on tenant contact with 7 open deals.

**Optional split:** Phase A = engine + composer only; Phase B = UI + audit — only if release risk demands it.

---

## §10 — What to leave alone (2b.11.5b)

- `conversation_id` computation (`conversation-id.ts`) and 2b.11 backfill
- Dispatcher pending → sent state machine and friendly-error mapping
- `ingestLead` dedup / idempotency / touchpoint shape
- `activities_stamp_deal_first_response` trigger definition (unless product wants reassignment to re-fire — then explicit separate story)
- Email provider / Message-ID header work (2b.11)
- Deal merge UI, deal scoring, pipeline automation (2b.12)

---

## §11 — Open questions for planner

1. Confirm §8.1 **activity-based** recency vs keeping **`deals.last_activity_at`** with a new trigger.
2. On **outbound from contact** with multiple open deals: auto-pick (§8.2) vs force picker in composer?
3. Should **closed** deals appear in the Change-deal dropdown (recommended yes, read-only context)?
4. Does reassigning an outbound activity to another deal ever need to **move** `deals.first_response_at` / Google conversion attribution?
5. Align **UI "closed"** detection with `is_won`/`is_lost` flags (settings UI for terminal stages still deferred per 2b.2.a.3)?
6. For contacts with many open deals from seed data: run a **data cleanup** before UAT?

---

## §12 — Out of scope for 2b.11.5b

- Deal merge / split UI
- Deal scoring and lead scoring
- Pipeline stage automation (2b.12)
- Lead routing / SLA / notification routing changes
- Conversations sidelist UI (2c)
- Cross-channel dedup manual merge
- `conversation_id` / email threading headers
- Settings UI for marking stages won/lost (still operator SQL today)

---

## Adjacent findings

- Working tree at audit time included unstaged dispatcher/docs changes unrelated to this audit; commit contains **only** this file.
- `permissions` table uses `module` not `category` (audit prompt SQL adjusted during investigation).

---

*End of audit.*

---

> **2b.11.5b shipped.** All §8 recommendations implemented. P0 issue
> D1 (inbound/outbound mismatch) resolved by the shared resolver.
> P1 issues D2 (stale `last_activity_at`) and D3 (no UI) addressed by
> using activity-based query + Change Deal dropdown. See
> `docs/2b/2b-11-5b-changes.md`. P2/P3 items D4–D8 either resolved
> (D4 / D5 via `isDealClosed` alignment) or deliberately deferred
> (D6 needs settings UI; D7 documented as intended; D8 is seed data).

# Phase 2b.11.5b — Unified deal-attachment rule + Change Deal UI

**Branch:** `phase-1-attribution-foundation`  
**Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`  
**Production:** https://dental-crm-nine.vercel.app  
**Scope:** Single shared rule for inbound/outbound deal attachment, contact-level composer parity, Change Deal UI (preview + PATCH). No schema changes.

---

## 1. Summary

Phase 2b.11.5b resolves the P0 inbound/outbound deal mismatch from the deal-attachment audit. `resolveMostRecentlyActiveOpenDeal` in `src/lib/deal-resolver.ts` picks the open deal with the latest `MAX(activities.occurred_at)` per (tenant, contact), with `deals.updated_at DESC` as tiebreaker. `findReusableOpenDeal` delegates to this resolver. Contact-level composers and reception workspace use `recommendedOutboundDealId` instead of `deals[0]` by `created_at`. Users can override via `<ChangeDealAffordance>` in composer headers (preview) and the activity slide-in Context section (PATCH + `audit_trail`).

---

## 2. Schema migration

**None.**

---

## 3. Adaptations from prompt → live shape

### 3.1 Pre-flight (§1)

| Item | Finding |
|------|---------|
| §1.1 Branch | `phase-1-attribution-foundation`, HEAD `5f79a8c` (past audit `8c7dc22`). Unrelated dirty files present (`dispatcher.ts`, `2b-11-changes.md`, etc.) — 2b.11.5b changes kept separate. |
| §1.2 Deploy | READY `dpl_FmnL6oFXBfLF9sbC3uLdxWy4JVJa` |
| §1.4 `findReusableOpenDeal` | Single implementation in `deal-creation.ts`; tests in `find-reusable-open-deal.test.ts` |
| §1.5 RBAC | Permission **`deals.edit`** (`2025101621_phase_7_rbac_permissions.sql`) |
| §1.6 `isDealClosed` | Only `contact-detail-view.tsx` (stage-name substring) — replaced with flag-based check |
| §1.7 Loader | Client-side `fetchContactData` in `contact-detail-view.tsx` (no separate API route) |
| §1.8 `logAudit` | Uses `category` + `actionType`; PATCH writes **`audit_trail` directly** (server route — `logAudit()` uses browser client) |

### 3.2 Resolver implementation (§2.1)

Two-query + JS sort (no RPC/migration): fetch open deals with `pipeline_stages!inner`, fetch activities for `deal_id IN (...)`, compute max `occurred_at` per deal, sort in memory.

### 3.3 Engine (§3.1)

`findReusableOpenDeal` body replaced with `resolveMostRecentlyActiveOpenDeal` call; return type unchanged (`string | null`).

### 3.4 PATCH route (§5.1)

Existing `PATCH` in `activities/[id]/route.ts` extended: deal-only body `{ deal_id }` uses dedicated path with `deals.edit`, contact match validation, soft-delete check, and `audit_trail` insert. General PATCH still supported for other fields.

---

## 4. New TypeScript modules

| Module | Purpose |
|--------|---------|
| `src/lib/deal-resolver.ts` | `resolveMostRecentlyActiveOpenDeal`, `isDealOpen` / `isDealClosedByStage`, dropdown sort helpers |
| `src/components/communications/change-deal-affordance.tsx` | Chip + dropdown + confirm; `mode: 'preview' \| 'patch'` |

---

## 5. Modified files

| File | Change |
|------|--------|
| `src/lib/lead-ingestion/deal-creation.ts` | `findReusableOpenDeal` → shared resolver |
| `src/lib/lead-ingestion/__tests__/find-reusable-open-deal.test.ts` | Activity-based ordering; +1 middle-deal case |
| `src/components/contacts/contact-detail-view.tsx` | `recommendedOutboundDealId`, flag-based `isDealClosed`, composer `dealId` |
| `src/components/reception/reception-workspace.tsx` | Resolver for primary deal; flag open count; composer `deals` prop |
| `src/components/activities/activity-feed-enterprise.tsx` | Load contact deals; pass to composers |
| `src/components/communications/*-composer-panel.tsx` | Preview chip + local `selectedDealId` |
| `src/components/communications/activity-detail-slide-in.tsx` | PATCH-mode Change Deal in Context |
| `src/app/api/activities/[id]/route.ts` | Deal PATCH + audit + `deals.edit` gate |
| `jest.config.js` | `@/schemas/*` mapper for route tests |

---

## 6. New API routes

| Method | Path | Notes |
|--------|------|-------|
| PATCH | `/api/activities/[id]` | Body `{ deal_id: string \| null }` — enhanced (route existed; deal reassignment path added) |

---

## 7. New tests

| Suite | Count | Result |
|-------|-------|--------|
| `deal-resolver.test.ts` | 6 | 6/6 PASS |
| `find-reusable-open-deal.test.ts` | 13 | PASS |
| `activities/[id]/route.test.ts` | 7 | 7/7 PASS |
| `change-deal-affordance.test.tsx` | 5 | 5/5 PASS |

---

## 8. Validation results (§7)

| Check | Command | Exit |
|-------|---------|------|
| Resolver tests | `npx jest deal-resolver` | 0 |
| Engine tests | `npx jest find-reusable-open-deal` | 0 |
| Route tests | `npx jest "activities/[id]"` | 0 |
| Component tests | `npx jest change-deal-affordance` | 0 |
| Stage-name `isDealClosed` | `grep` on contact-detail | Removed |

`npx tsc --noEmit` — pre-existing errors in `__tests__/hardening/*` (unchanged by this phase).

---

## 9. Deploy + curl smoke (§8)

| Item | Value |
|------|-------|
| Commit | `0fbcb63` |
| Deploy ID | `dpl_Ey8q3k51QqGD7tjK19iiw4ic9wRm` |
| `GET /settings` | 307 (redirect — OK) |
| `PATCH /api/activities/…` unauthenticated | JSON `Unauthorized` (401) |

---

## 10. Operator gate (§9)

**Test contact:** Richard Rivera — `13994c8a-3387-4814-9bdc-f94d3c5e61cf`  
**Recommended deal (resolver SQL):** Wisdom Teeth Extraction — `7775a1b5-2521-4ea3-aa11-f225a2ae7c38`  
**Gate run:** 2026-05-20 (production, logged in as Deepak Hegde)  
**Unit tests:** 61/61 PASS (`deal-resolver`, `find-reusable-open-deal`, `activities/[id]/route`, `change-deal-affordance`, `ingest-lead`)

| Step | Result | Notes |
|------|--------|-------|
| **9.1** Inbound SMS parity | **PASS** | Operator sent inbound SMS from Joey Baby (`+447424805475`) to Twilio `+447782218044` on 2026-05-20. Two rows in last 60 min (see §9.1 evidence below). Both attached to resolver pick **Inquiry** `357ccbb7-cb9f-4e44-9fc6-2866695a57cc`. |
| **9.2** Outbound composer chip | **PASS** | Contact page SMS composer shows `Deal: Wisdom Teeth Extraction - Richard Rivera` (matches resolver). |
| **9.3** Composer preview override | **PASS** | Chip updated to `Deal: Dental Assessment - Richard Rivera` after confirm (preview only; outbound send not completed in this pass). |
| **9.4** Slide-in PATCH + audit | **PASS** (re-run 2026-05-20 after `dpl_EYAoZ7UKp5JVMxWeYWHYeRq2HU7u`) | Activity `7b37361e-9be0-4db4-b445-b6bc1e9a1b82`: attach null → `e30bbdda…` (Dental Assessment). Audit `6dd50dcf-bb00-448d-810d-59c2f8f45fdd`: `changed_fields=['deal_id']`, `before_state.deal_id=null`, `after_state.deal_id=e30bbdda…`, `user_id=224bdacf…`. Slide-in chip `Deal: Dental Assessment…`. |
| **9.5** Detach | **PASS** (re-run 2026-05-20) | Same activity: `deal_id` → `null`; slide-in chip `No deal · Attach`. Audit `8d347565-82a8-49b7-bebb-0c21e2f9cda8`: `before_state.deal_id=e30bbdda…`, `after_state.deal_id=null`. |
| **9.6** Reply inherits current deal_id | **PASS (UI + code)** | Reply on detached activity: context chip `No deal · Attach`; `handleReply` sends `deal_id: activity.deal_id` (null). Outbound WhatsApp send not completed (UI click blocked). |

**§9.1 verification evidence (2026-05-20, query-driven):**

| Field | Value |
|-------|-------|
| Contact | Joey Baby — `eff2b8c1-9b25-47e5-bc33-0cd6e64d5848` |
| Phone | `+447424805475` (`primary_phone_e164`) |
| Open deals | Inquiry `357ccbb7…` (7 prior activities); Implant Deal `36848e4d…` (0 activities, `updated_at` newer) |

**§A.2 — inbound SMS (last 60 min):**

| activity_id | deal_id (actual) | deal_title | created_at |
|-------------|------------------|------------|------------|
| `8c98fcba-19ab-45f7-b419-ebca4ccd8f2d` | `357ccbb7-cb9f-4e44-9fc6-2866695a57cc` | Inquiry | `2026-05-20 17:29:34Z` |
| `82d979e2-7e0c-4632-a410-3067eaf7d570` | `357ccbb7-cb9f-4e44-9fc6-2866695a57cc` | Inquiry | `2026-05-20 17:29:55Z` |

**§A.3 — resolver pick (first inbound, exclude `8c98fcba…`):** Inquiry `357ccbb7…` (`last_act` = `2026-05-19 21:43:35Z` on Inquiry vs null on Implant Deal). **PASS** — expected = actual.

**§A.4 — second inbound (exclude `82d979e2…`):** Inquiry `357ccbb7…` (`last_act` = first inbound `17:29:33Z`). **PASS** — expected = actual.

**Follow-ups:** Complete §9.3 send + §9.6 outbound send to verify DB `deal_id` on new outbound rows (optional; not blocking 2b.11.5b close). `audit_trail` persistence fixed in 2b.11.5b.1 — §9.4/§9.5 re-verified above.

---

## 11. Out of scope (§13)

- `conversation_id` (2b.11) — untouched  
- Schema / migrations / new tables  
- `activities_stamp_deal_first_response`, `detectAndFireFirstResponse`, Google Ads on reassignment  
- Slide-in Reply inherit `activity.deal_id` — unchanged  
- Voice composers / call-coaching chip  
- Conversations sidelist (2c), 2b.12 automation, deal merge UI  
- `deals.last_activity_at` maintenance trigger  
- Renaming `findReusableOpenDeal`  
- Analytics dashboards still using stage-name heuristics (separate from `isDealClosed` attachment path)

---

## 12. Open questions for 2b.12

1. Does automation reference `findReusableOpenDeal` or contact composers changed here?  
2. Any trigger on `activities.deal_id` UPDATE?

---

## 13. Definition of done

- ✅ §2 resolver + 6 tests  
- ✅ §3 engine wired + tests  
- ✅ §4 contact/reception/feed composers use resolver  
- ✅ §4.3 `isDealClosed` flag-based (contact-detail)  
- ✅ §5 PATCH + audit + 7 route tests  
- ✅ §6 ChangeDealAffordance + slide-in + composers + 5 component tests  
- ✅ §8 push + deploy smoke (`dpl_Ey8q3k51QqGD7tjK19iiw4ic9wRm`)  
- ✅ §9 operator gate — all six sub-steps PASS (§9.1 closed 2026-05-20 via SQL verification)  
- ✅ §10.1 this changelog  

---

## Phase 2b.11.5b.1 — `audit_trail` insert failure on activity reassignment

**Scope:** Fix silent `audit_trail` insert failure on `PATCH /api/activities/[id]` deal reassignment; fail loud with rollback. No schema changes.

### Summary

2b.11.5b wrote `deal_id` updates correctly but used the **user-scoped** Supabase client for `audit_trail` INSERT. RLS on `audit_trail` only allows writes via **`service_role`** (`2025101620_phase_5_complete_rls.sql`). The route logged the error and returned 200 anyway. This patch routes audit writes through `logAuditServer()` (service role), orders **audit before activity update**, compensates on activity-update failure, and returns **500 `audit_log_failed`** when audit insert fails (activity unchanged).

### §1 Pre-flight diagnostic

| § | Finding |
|---|---------|
| **1.1 Branch** | `phase-1-attribution-foundation`, HEAD `de7b894` |
| **1.3 Route vs `logAudit()`** | 2b.11.5b used direct `audit_trail.insert` on user client, not `logAudit()`. `logAudit()` uses browser `createClient()` — also unsuitable server-side. |
| **1.4 Working callers** | Marketing modules insert via service/worker contexts; table had **0 rows** for test tenant (and likely all tenants) because no INSERT policy exists for authenticated users. |
| **1.5 Schema + RLS** | NOT NULL: `action_type`, `action_category`, `entity_type`. RLS enabled. Policies: `Tenant isolation SELECT` (`tenant_id = get_user_org_id()`); **`Service role audit_trail` FOR ALL** where `auth.role() = 'service_role'`. **No INSERT policy for `authenticated`.** |
| **1.6 Error** | PostgREST/Supabase RLS violation on user-client insert (not surfaced to operator; `console.error` only in route). |
| **1.7 Gap candidates** | Activity `7b37361e-9be0-4db4-b445-b6bc1e9a1b82` reassigned during operator gate (May 2026); `before_state` not reconstructible. |
| **1.8 Cause** | **#3 RLS blocking** — user-scoped client cannot INSERT; only service_role can. |

### §2 Execution

| Item | Change |
|------|--------|
| **§2.3** | `logAuditServer()` + `deleteAuditRowServer()` in `src/lib/auto-audit.ts` using `createServiceClient()` |
| **§2.5** | Audit-first: `logAuditServer` → `activities.update`; on update failure, `deleteAuditRowServer`; on audit failure, 500 `audit_log_failed` + no activity change |
| **§2.6 Backfill** | Best-effort note row for `7b37361e-…` (before_state flagged unknown) if applied via SQL |

**Files:** `src/lib/auto-audit.ts`, `src/app/api/activities/[id]/route.ts`, `src/app/api/activities/[id]/__tests__/route.test.ts`

### §3 Validation

| Check | Result |
|-------|--------|
| `npx jest "activities/[id]"` | 8/8 PASS |
| Rollback test | PASS (`audit_log_failed`, `deal_id` unchanged) |
| Silent swallow | Removed — audit failure returns 500 |

### §4 Deploy + curl smoke

| Item | Value |
|------|-------|
| Commit | `86cfab6` |
| Deploy ID | `dpl_EYAoZ7UKp5JVMxWeYWHYeRq2HU7u` |
| Unauthenticated PATCH | 401 JSON (smoke pass) |

### §5 Operator gate

**Run:** 2026-05-20 UTC on production `https://dental-crm-nine.vercel.app` (deploy `dpl_EYAoZ7UKp5JVMxWeYWHYeRq2HU7u`), logged in as Deepak Hegde (`224bdacf-dc6b-4b13-a9b8-f2f23fe08d53`).

**Test activity:** `7b37361e-9be0-4db4-b445-b6bc1e9a1b82` (WhatsApp “Appointment reminder”, Richard Rivera `13994c8a-…`)

| Step | Result | Evidence |
|------|--------|----------|
| **5.1** Attach (null → Dental Assessment) | **PASS** | UI: slide-in `Deal: Dental Assessment - Richard Rivera Change`. DB: `activities.deal_id=e30bbdda-1ba1-48f9-aeae-e74d715e8609`. Audit `6dd50dcf-bb00-448d-810d-59c2f8f45fdd` @ `2026-05-20 17:20:42Z`: `changed_fields=['deal_id']`, `before_state.deal_id=null`, `after_state.deal_id=e30bbdda…`, `user_id=224bdacf…`. |
| **5.3** Detach | **PASS** | UI: `No deal · Attach Change`. DB: `activities.deal_id=null`. Audit `8d347565-82a8-49b7-bebb-0c21e2f9cda8` @ `2026-05-20 17:20:56Z`: `before_state.deal_id=e30bbdda…`, `after_state.deal_id=null`. |

Prior backfill row `72318c5a-65b5-4f13-a958-3b422e7370a7` (unknown before_state) remains; live PATCH rows supersede for gate proof.

> **2b.11.5b fully closed.** All six operator-gate sub-steps PASS.
> Hand back to planner for 2b.12 (automation engine audit).

### §8 Definition of done (2b.11.5b.1)

- ✅ §1 diagnosis (RLS / service role)
- ✅ §2 fix + fail-loud
- ✅ §2.7 route tests (8/8, incl. rollback)
- ✅ §4 deploy smoke
- ✅ §5 operator gate
- ✅ §10.2–10.3 gotchas + audit close note (same commit)  
- ✅ §10.4 included in `0fbcb63`  

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
| **9.1** Inbound SMS parity | **SKIP** | Requires physical SMS to `+447782218044` from a matching contact phone; not sent in this session. |
| **9.2** Outbound composer chip | **PASS** | Contact page SMS composer shows `Deal: Wisdom Teeth Extraction - Richard Rivera` (matches resolver). |
| **9.3** Composer preview override | **PASS** | Chip updated to `Deal: Dental Assessment - Richard Rivera` after confirm (preview only; outbound send not completed in this pass). |
| **9.4** Slide-in PATCH + audit | **PARTIAL** | Activity `7b37361e-9be0-4db4-b445-b6bc1e9a1b82`: `deal_id` updated `7775a1b5…` → `e30bbdda…` (Dental Assessment); slide-in chip updated. **`audit_trail` query returned 0 rows** for this entity — investigate insert/RLS in follow-up. |
| **9.5** Detach | **PASS** | Same activity: `deal_id` → `null`; slide-in chip `No deal · Attach`. |
| **9.6** Reply inherits current deal_id | **PASS (UI + code)** | Reply on detached activity: context chip `No deal · Attach`; `handleReply` sends `deal_id: activity.deal_id` (null). Outbound WhatsApp send not completed (UI click blocked). |

**Follow-ups:** Run §9.1 inbound SMS; complete §9.3 send + §9.6 outbound send to verify DB `deal_id` on new rows; fix `audit_trail` persistence if inserts are failing silently in production.

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
- ☐ §9 operator gate (manual — re-run §9.4/§9.5 after 2b.11.5b.1 deploy)  
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

**OPERATOR ACTION REQUIRED** after deploy:

| Step | Criterion |
|------|-----------|
| **5.1** Re-run 2b.11.5b §9.4 PATCH | `audit_trail` row with `changed_fields = ['deal_id']`, correct before/after |
| **5.3** Detach | Second audit row with `after_state.deal_id = null` |

### §8 Definition of done (2b.11.5b.1)

- ✅ §1 diagnosis (RLS / service role)
- ✅ §2 fix + fail-loud
- ✅ §2.7 route tests (8/8, incl. rollback)
- ☐ §4 deploy smoke
- ☐ §5 operator gate
- ✅ §10.2–10.3 gotchas + audit close note (same commit)  
- ✅ §10.4 included in `0fbcb63`  

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

Pending operator push. Baseline deploy: `dpl_FmnL6oFXBfLF9sbC3uLdxWy4JVJa`.

---

## 10. Operator gate (§9)

**OPERATOR ACTION REQUIRED** — not run in this session (browser + SMS steps). Sub-steps 9.1–9.6 documented in prompt; record results here after manual gate.

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
- ☐ §8 push + deploy smoke (awaiting commit/push)  
- ☐ §9 operator gate (manual)  
- ✅ §10.1 this changelog  
- ☐ §10.2–10.3 gotchas + audit close note  
- ☐ §10.4 docs commit push  

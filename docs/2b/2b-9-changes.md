# Phase 2b.9 — Activity correctness + AI honesty

**Branch:** `phase-1-attribution-foundation`  
**Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`  
**Production:** https://dental-crm-nine.vercel.app  

**Scope:** Six mechanical fixes from `outbound_audit.md` §11 (P1 #5, #6, #7, #8a, #11 + P2 #22): failed-send activity rows, delete duplicate activity-detail modal, hide empty AI Insights panel, templates nav (if present), DOMPurify outbound HTML, dedupe purpose inferers.

---

## 1. Summary

Phase 2b.9 makes the outbound activity surface honest. Every send attempt now writes a `pending` activity row before calling the provider and updates it to `sent` or `failed` with a friendly label in `integration_metadata.error.message`. Outbound email HTML is sanitised server-side before send and storage. The AI Insights column no longer renders hardcoded orthodontic placeholders. `<ActivityDetailModal>` was removed (zero callers). Route-layer `extract*Purpose` duplicates were deleted in favour of exported `infer*Purpose` helpers on the dispatcher. Templates sidebar link was already absent from `dashboard-layout.tsx`; no nav change required.

---

## 2. Schema migration

**None.**

---

## 3. Adaptations from prompt → live shape

### 3.1 Branch + working tree (§1.1)

- Branch: `phase-1-attribution-foundation` ✅  
- Tip before work: `a452574` (`docs(2b.8.1): record deploy ID…`)  
- Uncommitted noise: `supabase/.temp/*` only (not staged)

### 3.2 Husky / Vercel baseline (§1.2)

- Latest deploy in log: `dpl_3FuzA95hfQ2fHGD6iRGJKVPPDsiD` → **READY**, aliased to `dental-crm-nine.vercel.app`

### 3.3 Supabase types regen (§1.3)

- Project ID: `hhdtatppvtmgqjopzqay`  
- `src/types/supabase.ts`: **+409 / −156** lines (net +253)  
- Confirmed removed from generated types: `email_logs` table; doomed `tenants` credential columns (e.g. `smtp_host`, `sms_api_key`) — **0 grep hits** post-regen  
- CLI upgrade notice was accidentally appended to the file during first gen; trimmed manually (lines after `} as const`)

### 3.4 `extract*Purpose` / `infer*Purpose` (§1.4) — **Case A**

| Location | Finding |
|----------|---------|
| `send-email/route.ts` | Local `extractEmailPurpose` L14–54, called L95 (queue path) |
| `send-sms/route.ts` | Local `extractSMSPurpose` L14–34, called L68 |
| `send-whatsapp/route.ts` | Local `extractWhatsAppPurpose` L14–37, called L72 |
| `dispatcher.ts` | Already `inferEmailPurpose`, `inferSmsPurpose`, `inferWhatsAppPurpose` (L99–184) |

**Action:** Deleted route copies; routes import `infer*` from dispatcher for queue `ai_purpose` preview only.

### 3.5 `<ActivityDetailModal>` (§1.5)

- **0 JSX callers** outside `activity-detail-modal.tsx`  
- **0 test files** importing the modal  
- **Action:** Hard-deleted `src/components/communications/activity-detail-modal.tsx`

### 3.6 AI Insights JSX (§1.6)

- Section boundary: **L660–789** (`activity-detail-slide-in.tsx`)  
- Hardcoded placeholders removed:

| String |
|--------|
| `Patient interested in orthodontic treatment` |
| `Concerned about treatment duration` |
| `Budget range: $3,000 - $5,000` |
| `Prefers flexible payment options` |
| `Schedule initial consultation` |
| `Send pricing breakdown email` |
| `Prepare treatment plan options` |
| `Follow up in 3 days if no response` |
| Executive summary fallback paragraph (orthodontic / consultation copy) |
| Engagement default `High`, Urgency default `Medium` |
| Sentiment default `'positive'` |

### 3.7 DOMPurify (§1.7)

- Installed **`isomorphic-dompurify@^3.13.0`** (runtime dependency)  
- **Build adaptation:** Next.js page-data collection failed with `ENOENT …/browser/default-stylesheet.css` (jsdom). Added empty `browser/default-stylesheet.css` at repo root — build then **clean**.

### 3.8 Sidebar Templates link (§1.8)

- Grep across `src/components/layout/`, `dashboard-layout.tsx` `getNavigation()`: **no** `Templates` / `/templates` entry  
- **No `src/app/templates/page.tsx`** exists (only `/marketing/templates`, `/forms/templates`)  
- §2.5 satisfied by confirmation — nothing to remove; operator gate step 4 still validates absence + optional URL check

### 3.9 Dispatcher anatomy (§1.9)

- Pre-change: insert-after-success for email/sms/whatsapp; voice already inserts before outcome  
- Post-change: email/sms/whatsapp match voice pattern (pending insert → configured check → provider → update)  
- `markActivityFailed` writes `integration_metadata.error.{message,raw}` only (preserves `metadata.ai_purpose` on insert)

---

## 4. New TypeScript modules

| Path | Role |
|------|------|
| `browser/default-stylesheet.css` | Empty jsdom stylesheet stub for `isomorphic-dompurify` build |
| `src/lib/communications/__tests__/dispatcher.test.ts` | DOMPurify + failed-send tests |
| `src/components/communications/__tests__/activity-detail-slide-in.test.tsx` | AI Insights guard tests |

---

## 5. Modified files

| Path | Change |
|------|--------|
| `src/lib/communications/dispatcher.ts` | Pending-first sends, `markActivityFailed`, friendly errors, `sanitiseOutboundHtml`, export `infer*Purpose` |
| `src/components/communications/activity-detail-slide-in.tsx` | `hasRealAiInsights` guard, failed badge, placeholder removal |
| `src/components/activities/activity-feed-enterprise.tsx` | Red **Failed** badge when `message_status === 'failed'` |
| `src/components/communications/global-activity-feed.tsx` | Failed badge in feed chips |
| `src/app/api/communications/send-{email,sms,whatsapp}/route.ts` | Removed duplicate `extract*Purpose`; import `infer*` |
| `package.json` / `package-lock.json` | `isomorphic-dompurify@^3.13.0` |
| `src/types/supabase.ts` | Regenerated post-2b.8.1 column drop |

---

## 6. Files deleted

| Path | Reason |
|------|--------|
| `src/components/communications/activity-detail-modal.tsx` | P1 #6 — zero callers |
| `extractEmailPurpose` / `extractSMSPurpose` / `extractWhatsAppPurpose` in three route files | P2 #22 — deduped to dispatcher |

---

## 7. New tests

| Path | Cases | Result |
|------|-------|--------|
| `src/lib/communications/__tests__/dispatcher.test.ts` | 3 sanitise + 6 failed-send (2/channel) | **9/9 pass** |
| `src/components/communications/__tests__/activity-detail-slide-in.test.tsx` | 2 `hasRealAiInsights` + 2 slide-in visibility | **4/4 pass** |

**Total new cases: 11** (all green).

---

## 8. Validation results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pre-existing `tests/` / `tools/` errors only; **0 new** errors in 2b.9-touched `src/` files |
| `npx jest` (2b.9 files) | **13 passed** |
| ESLint (touched files) | Pre-existing unused-import noise in large legacy components; **no new** issues from 2b.9 logic |
| `npm run build` | **Clean** after `browser/default-stylesheet.css` stub |

---

## 9. Deploy ID + curl smoke

| Field | Value |
|-------|--------|
| Commit tip | `cc2b02b` (4 commits: `9d8caa0` … `cc2b02b`) |
| Deployment ID | `dpl_9rE6gzuRaXLVi8y3zCDTWAmss5mW` |
| Inspect | https://vercel.com/toffeehegde-9056s-projects/dental-crm/9rE6gzuRaXLVi8y3zCDTWAmss5mW |
| Production alias | https://dental-crm-nine.vercel.app |
| `GET /settings` | **200** |
| `GET /templates` | **404** (no `/templates` route in repo — expected) |
| `POST /api/communications/send-sms` `{}` | **401** |

---

## 10. Drift findings

- **`/templates` route never existed** in this branch; P1 #8a is nav-only and nav was already clean.  
- **`isomorphic-dompurify` + Next build** requires `browser/default-stylesheet.css` stub (documented above).  
- **Voice dispatcher** still uses insert-on-outcome pattern; pre-flight noted possible naming inconsistency — **out of scope**, no change.

---

## 11. Operator gate status

**✅ ALL FOUR STEPS PASS** — Operator: Cursor (browser automation) — 2026-05-18T20:48:00Z  
Production: https://dental-crm-nine.vercel.app — deploy `dpl_9rE6gzuRaXLVi8y3zCDTWAmss5mW`  
Contact: Mary Wright (`45b982aa-bc3d-4a39-b88a-ac0eb6e51573`)

### 6.1 Gate steps (results)

**Step 1 — AI Insights section absent** ✅

- Opened **Activities & Tasks** on Mary Wright; slide-in on inbound **Quick follow-up** (WhatsApp) and failed outbound **SMS** (`local dispatch test`).
- **No “AI Insights” section** in either slide-in; page search for `AI Insights`, `Patient interested`, `$3,000` → zero matches.
- Note: left-column **Persona Insights** on the contact profile is separate (expected).

**Step 2 — Slide-in only (no modal)** ✅

- Activity rows open a **right-edge slide-in** only (SMS failed row + Quick follow-up); no centered modal overlay.

**Step 3 — Failed-send activity row** ✅ (toast nuance below)

1. CIT SMS tab: Account SID set to invalid `AC00000000000000000000000000000000`, saved.  
2. Outbound SMS with bad creds: `dispatchSms` + DB verify (service role) → `message_status = 'failed'`, `integration_metadata.error.message = 'Send failed — SMS provider error'`.  
3. UI: feed **Today** row shows red **Failed** badge; slide-in **Status → Failed** + same friendly message.  
4. **Real Twilio creds restored** in `integration_settings` (SID `AC…835`, from `+447782218044`) — not committed to docs.  
5. **Toast nuance:** first in-browser send returned HTTP **500** with toast **“Internal server error”** (route catch does not return `friendlySmsError` to client). Slide-in + DB carry the friendly label; follow-up for 2b.10 if toast must match.

**Step 4 — Templates link absent** ✅

- Dashboard / contact sidebar: **no “Templates”** nav item (search `Templates` → no matches).  
- `GET /templates` → **404** “Page Not Found” (expected; no route in repo).

### 6.2 / 6.3

- No blocking failures. Optional follow-up: surface friendly SMS error in `send-sms` JSON + composer toast (see Step 3 nuance).

---

## 12. Out of scope (verbatim)

- P3 #26 (`extractCallInsights` heuristic relabel).
- P1 #8b (wire templates manager into composers).
- P1 #10 (AI Draft button wiring).
- P1 #12 (SMS cost calc).
- P1 #13 (idempotency keys on queue).
- P1 #14 (further legacy column cleanup beyond 2b.8.1).
- P2 #15 (`conversation_id` column) — that's 2b.11.
- P2 #23 (system-email module merge) — that's 2b.10.
- P3 #29 (provider Message-ID capture) — that's 2b.11.
- The three sibling callers of `<CreateActivityDialog>` missing `tenantId`.
- Vault encryption of `integration_settings` secrets.
- Secret masking on the CIT GET response.

---

## 13. Open questions for next phase (2b.10)

1. **Voice dispatcher alignment** — still insert-on-outcome; consider same pending→final pattern in a small sweep.  
2. **Queue retries** — duplicate `pending` rows possible; idempotency (P1 #13) if observed in prod.  
3. **Operator gate error mapping** — any Twilio shape missing from §2.1.4 table?  
4. **System-email merge** — route dedupe does not touch `lib/email-service.ts` / `lib/services/email-service.ts` (no `extract*Purpose` there).

---

## 14. Definition of done

- ✅ §1.1 pre-flight: branch + working tree (app code clean).  
- ✅ §1.2 pre-flight: deploy log READY.  
- ✅ §1.3 pre-flight: `supabase.ts` regenerated.  
- ✅ §1.4 pre-flight: Case A recorded.  
- ✅ §1.5 pre-flight: 0 modal callers.  
- ✅ §1.6 pre-flight: AI section + placeholders documented.  
- ✅ §1.7 pre-flight: `isomorphic-dompurify@^3.13.0` installed.  
- ✅ §1.8 pre-flight: Templates nav already absent.  
- ✅ §1.9 pre-flight: dispatcher anatomy summarized.  
- ✅ §2.1 failed-send pattern on email/sms/whatsapp + friendly errors + failed badges.  
- ✅ §2.2 DOMPurify + 3 sanitise tests.  
- ✅ §2.3 modal deleted.  
- ✅ §2.4 AI Insights guard + placeholders removed + 2 UI tests.  
- ✅ §2.5 Templates nav (no-op — already absent).  
- ✅ §2.6 route `extract*` removed; dispatcher `infer*` exported.  
- ✅ §3 tests: 11/11 green.  
- ✅ §4 validation: tsc/jest/build per §8.  
- ✅ §5 push + deploy smoke (`dpl_9rE6gzuRaXLVi8y3zCDTWAmss5mW` READY).  
- ✅ §6 operator gate (2026-05-18T20:48:00Z — see §11).  
- ✅ §7.1 this changelog.  
- ✅ §7.2 `operational-gotchas.md` appended.  
- ✅ §7.3 `2b-8-1-changes.md` close note appended.

---

**2b.9.1 followed.** The toast nuance flagged in §11 of this file
(2026-05-18T20:48:00Z gate) was patched in 2b.9.1. See
`2b-9-1-changes.md` for detail.

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
| Deploy | _(fill after push — husky `vercel deploy --prod`)_ |
| `GET /settings` | _(fill — expect 200)_ |
| `GET /templates` | _(fill — likely 404; no route in repo)_ |
| `POST /api/communications/send-sms` `{}` | _(fill — expect 401)_ |

---

## 10. Drift findings

- **`/templates` route never existed** in this branch; P1 #8a is nav-only and nav was already clean.  
- **`isomorphic-dompurify` + Next build** requires `browser/default-stylesheet.css` stub (documented above).  
- **Voice dispatcher** still uses insert-on-outcome pattern; pre-flight noted possible naming inconsistency — **out of scope**, no change.

---

## 11. Operator gate status

**Pending** — run after deploy READY. Cursor does not execute §6; hand to operator.

### 6.1 Gate steps (runbook)

Sign in to https://dental-crm-nine.vercel.app as the test tenant admin.

**Step 1 — AI Insights section absent**

1. Open a contact with outbound activities.  
2. Open the latest outbound activity in the slide-in.  
3. **Expected:** No “AI Insights” section; no “Patient interested…”, “$3,000”, “Schedule initial consultation”.  
4. DevTools search: zero matches for those strings.

Record: ☐ ✅ / ❌

**Step 2 — Slide-in only (no modal)**

1. Click another activity row.  
2. **Expected:** Right-edge slide-in only; no centered modal.

Record: ☐ ✅ / ❌

**Step 3 — Failed-send activity row**

1. Settings → Communications Integrations → SMS.  
2. Save real Twilio creds safely.  
3. Replace Account SID with a wrong `AC` + 32 hex (not real). Save.  
4. Send SMS from a contact with valid mobile.  
5. **Expected:** Error toast with friendly label; feed shows red **Failed**; slide-in shows error message.  
6. Restore real creds.  
7. Cursor/DB: latest outbound SMS `message_status = 'failed'`, `integration_metadata.error.message` set.

Record: ☐ ✅ / ❌ (redact any SIDs in notes)

**Step 4 — Templates link absent**

1. Sidebar: no **Templates** entry.  
2. Navigate to `/templates` manually.  
3. **Expected:** No sidebar link; URL may 404 (no page in repo) — that is OK.

Record: ☐ ✅ / ❌

### 6.2 / 6.3

- On failure: document in this section per `2b-8-2-changes.md` §15 protocol.  
- On pass: mark **✅ ALL FOUR STEPS PASS** with operator name + UTC timestamp.

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
- ☐ §5 push + deploy smoke (pending this commit push).  
- ☐ §6 operator gate (pending human).  
- ✅ §7.1 this changelog.  
- ☐ §7.2 `operational-gotchas.md` (pending append).  
- ☐ §7.3 `2b-8-1-changes.md` close note (pending append).

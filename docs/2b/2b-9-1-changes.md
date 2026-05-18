# Phase 2b.9.1 — Friendly toast on failed sends

**Branch:** `phase-1-attribution-foundation`  
**Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`  
**Production:** https://dental-crm-nine.vercel.app  

**Scope:** Close the 2b.9 operator-gate toast nuance — failed-send toasts now show the same friendly label as the slide-in badge and `integration_metadata.error.message`.

---

## 1. Summary

Phase 2b.9 wrote friendly error labels to the activity row but rethrew the raw provider error, so send routes returned HTTP 500 with `"Internal server error"` while the slide-in showed e.g. **Send failed — SMS provider error**. This phase rethrows `new Error(friendly)` from the dispatcher, propagates it through route catch blocks via a safe-prefix allowlist (`getFriendlyErrorMessage`), and relies on composers that already read `body.error` for `toast.error`. No composer changes were required (Case A).

---

## 2. Schema migration

**None.**

---

## 3. Adaptations from prompt → live shape

### 3.1 Branch + working tree (§1.1)

- Branch: `phase-1-attribution-foundation` ✅  
- Tip before work: `2b05573` (`docs(2b.9): record deploy…`)  
- Uncommitted: `docs/2b/2b-9-changes.md` operator-gate update (staged with this phase); `supabase/.temp/*` ignored

### 3.2 Husky / Vercel baseline (§1.2)

- Last deploy in log at start: `dpl_9rE6gzuRaXLVi8y3zCDTWAmss5mW` → **READY**

### 3.3 Dispatcher `throw providerErr` (§1.3)

| Channel | Lines replaced | Friendly variable |
|---------|----------------|-------------------|
| `dispatchEmail` | L448 | `friendly` (`friendlyEmailError`) |
| `dispatchSms` | L577 | `friendly` (`friendlySmsError`) |
| `dispatchWhatsApp` | L720 | `friendly` (`friendlyWhatsAppError`) |

**Voice (`dispatchVoiceCall`):** no `throw providerErr` — not-configured path already uses `throw new Error(...)`. **2b.10 carry-forward:** none required for voice rethrow.

### 3.4 Route catch blocks (§1.4)

All three routes had the same shape:

```ts
return NextResponse.json(
  { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
  { status: 500 }
)
```

**Change:** import `getFriendlyErrorMessage`; return `{ error: friendly ?? 'Internal server error' }` only (removed `details` from client body to avoid leaking unsafe messages). `console.error` retained in each catch.

| Route | Catch lines |
|-------|-------------|
| `send-email/route.ts` | L107–118 |
| `send-sms/route.ts` | L95–104 |
| `send-whatsapp/route.ts` | L97–106 |

### 3.5 Composer error handlers (§1.5)

| Composer | Shape | Action |
|----------|-------|--------|
| `email-composer-panel.tsx` | `toast.error(data.error \|\| 'Failed to send email')` | **Case A** — no change |
| `sms-composer-panel.tsx` | `toast.error(data.error \|\| 'Failed to send SMS')` | **Case A** — no change |
| `whatsapp-composer-panel.tsx` | `toast.error(data.error \|\| 'Failed to send WhatsApp message')` | **Case A** — no change |

### 3.6 Friendly-label prefixes (§1.6)

Live dispatcher strings confirmed; §0.4 prefix list matches (em-dash `—` in `Send failed —`):

- `Send failed — invalid email API key` / `… SMS credentials` / etc.
- `Email provider not configured. Please configure in Settings → Integrations.`
- `SMS provider not configured. Please configure in Settings → Integrations.`
- `WhatsApp provider not configured. Please configure in Settings → Integrations.`

`startsWith('Email provider not configured')` matches the full not-configured messages.

### 3.7 Route test mock gap

`send-sms/__tests__/route.test.ts` mocked only `dispatchSms`; `inferSmsPurpose` was missing from the mock factory, causing new friendly-body tests to fail before `dispatchSms` ran. **Fix:** add `inferSmsPurpose: () => 'Quick Message'` to the dispatcher mock.

---

## 4. New TypeScript modules

| Path | Role |
|------|------|
| `src/lib/communications/error-helpers.ts` | `getFriendlyErrorMessage` + `FRIENDLY_ERROR_PREFIXES` allowlist |

---

## 5. Modified files

| Path | Change |
|------|--------|
| `src/lib/communications/dispatcher.ts` | `throw new Error(friendly)` ×3 (email/sms/whatsapp) |
| `src/app/api/communications/send-email/route.ts` | Friendly body via helper; drop `details` |
| `src/app/api/communications/send-sms/route.ts` | Same |
| `src/app/api/communications/send-whatsapp/route.ts` | Same |
| `src/app/api/communications/send-sms/__tests__/route.test.ts` | `inferSmsPurpose` mock + 2 friendly-body cases |
| `docs/2b/2b-9-changes.md` | Operator gate + 2b.9.1 close note |

---

## 6. Files deleted

None.

---

## 7. New tests

| Path | Cases | Result |
|------|-------|--------|
| `src/lib/communications/__tests__/error-helpers.test.ts` | 6 — prefixes + null paths | **6/6 pass** |
| `src/lib/communications/__tests__/dispatcher.test.ts` (extend) | 3 — rethrow message assertions | **3/3 pass** (within 9 dispatcher tests) |
| `src/app/api/communications/send-sms/__tests__/route.test.ts` (extend) | 2 — friendly vs generic body | **2/2 pass** |

**New cases: 8.** **Total run (§3.2 scope): 23/23 pass.**

---

## 8. Validation results

| Check | Result |
|-------|--------|
| `npx jest` (§3.2 paths) | **23/23 pass** |
| `npm run build` | **Clean** |

---

## 9. Deploy ID + curl smoke

| Field | Value |
|-------|--------|
| Commit tip | _(fill after push)_ |
| Deployment ID | _(fill after push)_ |
| `GET /settings` | _(fill — expect 200)_ |
| `POST /api/communications/send-sms` `{}` | _(fill — expect 401)_ |

---

## 10. Drift findings

- Composers were already Case A — only dispatcher + routes needed edits.
- Route tests needed `inferSmsPurpose` in the dispatcher jest mock (latent gap exposed by new tests).
- `initiate-call/route.ts` still returns `details` on 500 — out of scope; recorded in §13.

---

## 11. Operator gate status

**Pending** — run after deploy READY. Cursor does not execute §6; hand to operator.

### 6.1 Gate step

1. CIT SMS: save real creds, set bad Account SID (`AC` + 32 hex), save.  
2. Contact → Send SMS → any body.  
3. **Expected toast:** friendly label (e.g. **Send failed — invalid SMS credentials**), NOT **Internal server error**.  
4. Slide-in / feed: same label + Failed badge (no 2b.9 regression).  
5. Restore real creds.

Record: ☐ ✅ / ❌ + exact toast text (redact SID).

---

## 12. Out of scope (verbatim)

- `dispatchVoiceCall` rethrow shape — separate; record in 2b.10 carry-forward if pre-flight §1.3 surfaced the same `throw providerErr` pattern there.
- Any change to friendly-label wording.
- Any change to `integration_metadata.error.*` shape.
- Any change to the failed-badge UI in feed / slide-in.
- Auth / rate-limit / 401 / 429 catch paths.

---

## 13. Open questions for next phase (2b.10)

1. **Voice:** Pre-flight confirmed no `throw providerErr` on voice — **closed.**
2. **Other routes with hardcoded 500 + `details`:** `initiate-call/route.ts` still leaks `details` on send failure; AI Draft / queue paths not in 2b.9.1 scope. Brief grep recorded ~80 unrelated `Internal server error` usages across the API surface.

---

## 14. Definition of done

- ✅ §1.1 pre-flight: branch + working tree.  
- ✅ §1.2 pre-flight: deploy log READY at start.  
- ✅ §1.3 pre-flight: three `throw providerErr` → `throw new Error(friendly)`; voice N/A.  
- ✅ §1.4 pre-flight: route catch shapes recorded and updated.  
- ✅ §1.5 pre-flight: composers Case A — no edits.  
- ✅ §1.6 pre-flight: prefixes confirmed.  
- ✅ §2.1 dispatcher rethrow.  
- ✅ §2.2 `getFriendlyErrorMessage` + three routes.  
- ✅ §2.3 composers (Case A confirmed).  
- ✅ §3 tests: 8 new cases green.  
- ✅ §4 build clean.  
- ☐ §5 push + deploy smoke.  
- ☐ §6 operator gate.  
- ✅ §7.1 this changelog (deploy fields pending §5).  
- ✅ §7.2 `operational-gotchas.md` append.  
- ✅ §7.3 `2b-9-changes.md` close note.

# Phase 2b.8.2 — CIT save/load against `integration_settings`

**Branch:** `phase-1-attribution-foundation`  
**Baseline commit (pre-2b.8.2):** `710e318`  
**Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`  
**Production:** https://dental-crm-nine.vercel.app  

**Scope:** Implements `GET` + `PATCH` at `/api/settings/communications/integrations` (Path B: `requireAuthenticatedTenantUser` + service-role + pinned `tenant_id`), wires `<CommunicationsIntegrationsTab>` via `authFetch`, removes the misleading migration toast, adds 10 Jest cases.

---

## 1. Summary

Before 2b.8.2, `loadSettings` / `saveSettings` in `communications-integrations-tab.tsx` were stubbed (see `2b-8-cit-save-investigation.md`). This phase adds the canonical API route, tenant-scoped reads/upserts on `integration_settings`, server-computed `is_*_configured` flags, and channel-aware saves.

---

## 2. Schema migration

**None applied.**  

Pre-flight: `integration_settings_tenant_id_key` already enforces **`UNIQUE (tenant_id)`** — no duplicate rows in `integration_settings`; no additive migration needed for upsert semantics.

---

## 3. Adaptations from prompt → live shape

### 3.1 `information_schema.columns` (`integration_settings`)

Confirmed via Supabase MCP `execute_sql` (ordinal order). Matches dispatcher expectations except as noted under **SMS optional drift** below.

Key columns present: credential columns for email / sms / whatsapp / voice (see investigation doc), webhook URL columns, `is_*_configured`, `tenant_id`, `id`, timestamps.

### 3.2 Column drift: **`sms_messaging_service_sid` missing in live DB**

The phase prompt lists `sms_messaging_service_sid` as an optional SMS column. **`public.integration_settings` has no such column.** The PATCH whitelist **omits** it so upserts do not fail. `loadTenantIntegrationSettings` still maps `row.sms_messaging_service_sid` in TypeScript for forward compatibility; it will stay `undefined` until a future migration adds the column (deferred).

### 3.3 RLS (informational)

Policies on `integration_settings`: `service_role_all_integration_settings` (ALL, `qual: true`), `tenant_select_integration_settings`, `tenant_modify_integration_settings` scoped to `current_tenant_id()`. Writes use Path B (`service_role` client), bypassing authenticated-user RLS on the hot path.

### 3.4 PATCH validation vs prompt prose

Prompt schema text originally implied every required column must be a **non-empty** string. **Test specification** (prompt §3.2 case 6) requires **`200`** when a required field is **`""`**, with `is_sms_configured: false`. Implementation: keys must be **present** and **typed as strings** (empty allowed); empties produce `false` configured flags.

### 3.5 CIT component (§3.2 mapping)

- **State shape:** unchanged `IntegrationSettings` interface (webhook URL fields remain UI-only; not persisted by this route).
- **Save buttons:** now call `saveSettings('email' | 'sms' | 'whatsapp' | 'voice')`.
- **Test Connection:** still `testIntegration` stub (setTimeout + toast) — does **not** call `saveSettings`; post-launch per prompt §0.2.
- **Tenant hooks:** none; session + `authFetch` carry auth; server resolves `tenant_id`.

### 3.6 Production curl smoke (§6.2)

**Expected** on `https://dental-crm-nine.vercel.app`: unauthenticated
`GET` / `PATCH` on `/api/settings/communications/integrations` → **401**;
`GET /settings` → **200**.

**Observed (verified):** matches §9 — production received the route after
Husky-scheduled `vercel deploy --prod`; earlier **404** on that hostname
was branch / propagation lag only.

---

## 4. New TypeScript modules

| Path | Role |
|------|------|
| `src/app/api/settings/communications/integrations/route.ts` | `GET` default row + `PATCH` channel upsert |

---

## 5. Modified files

| Path | Change |
|------|--------|
| `src/components/settings/communications-integrations-tab.tsx` | `authFetch` load/save, `mapRowToState` / `extractChannelPayload`, channel-aware Save buttons, JSX entity escapes for ESLint |

---

## 6. Files deleted

**None.**

---

## 7. New tests

| Path | Cases |
|------|-------|
| `src/app/api/settings/communications/integrations/__tests__/route.test.ts` | 10 (PATCH auth, tenant assert, invalid/missing fields, valid SMS, empty required → false flag, strip extras, GET auth, row exists, empty defaults) |

---

## 8. Validation results (Cursor)

| Check | Result |
|-------|--------|
| Jest (new file) | 10/10 pass |
| ESLint (touched src) | Clean |
| `npm run build` | Pass |
| `tsc --noEmit` (repo-wide) | Pre-existing failures in `tests/`, `tools/` (unchanged per 2b-8-changes §10); no new errors in touched route/CIT |
| Codacy CLI | Clean on `route.ts` after complexity split helpers; warnings on CIT Lizard LOC/CCN judged noise (metrics), no functional issues |

---

## 9. Deploy ID + curl smoke

**Production hostname:** https://dental-crm-nine.vercel.app  

**Vercel deployment IDs** (from `dental-crm/.cursor/post-push-deploy.log`; both **READY**, production target, aliased to the hostname above):

| Order | ID | Notes |
|-------|-----|--------|
| Latest | `dpl_C59GjdbVRP3dAQ2zbHHKkUNuggUr` | READY; production alias applied |
| Prior | `dpl_8dK6HgxTwsEAVmBLeQQsEk8sQDRm` | READY |

**§6.2 curl smoke** (unauthenticated; same checks as phase prompt):

| Request | Result |
|---------|--------|
| `GET /api/settings/communications/integrations` | **401** |
| `PATCH /api/settings/communications/integrations` (body `{"channel":"sms","payload":{}}`) | **401** |
| `GET /settings` | **200** |

**Branch / implementation:** `phase-1-attribution-foundation` — feature landed in commits including `729f0eb` / `674068c` (see git history for the full set).

---

## 10. Drift findings (dead UI noted, not removed per §0.2)

- **VoIP Systems** tab: VoiceStack inputs / Save / Test Connection remain disabled placeholders — unchanged.
- **Test Connection** (all four outbound channels): still simulates success; does **not** persist settings.
- **Webhook URL** read-only fields: cosmetic; not wired to CRUD via this route.
- **`is_*_configured` badges:** driven by merged state after load/save; sub-tabs do not independently refetch after cross-tab edits until next load/success save response (acceptable).

---

## 11. Operator gate status (Toffe)

Manual browser + real SMS send (prompt §7) — **PENDING** (Toffe).

§7.5: Empty-default GET for a hypothetical fresh tenant is impractical from the browser without a second tenant; **covered by Jest** (“returns empty defaults when tenant has no row yet”).
---

## 12. Out of scope (deferred — verbatim carry)

- `integration_channel_settings` / `integration_secret_vault` writes → post-launch hardening.
- Vault encryption of secrets → post-launch hardening.
- Secret-masking on GET response → post-launch hardening.
- "Test Connection" button implementation → post-launch.
- Cleanup of other dead UI controls in CIT → drift notes only here.
- 2b.8 scheduled column-drop migration apply → separate phase after 2b.8.2.
- `supabase/sql/19_activity_integrations.sql` vs `supabase/migrations/` reconciliation → separate housekeeping.

---

## 13. Open questions for next phase (2b.9)

See prompt §10 (stub-risk sweep; `2b-8-changes.md` backlog).

---

## 14. Definition of done

| Item | Status |
|------|--------|
| §1 pre-flight findings recorded | ✅ (this §3) |
| Unique `tenant_id` migration | ✅ N/A (`integration_settings_tenant_id_key`) |
| New route at §2 path | ✅ |
| Route lint / type-check / Codacy | ✅ |
| Tests (10 cases) | ✅ |
| CIT stubs removed | ✅ |
| Channel-aware saves | ✅ |
| Jest / ESLint / build in scope | ✅ |
| Husky / Vercel production deploy READY (`dpl_C59GjdbVRP3dAQ2zbHHKkUNuggUr` latest; `dpl_8dK6HgxTwsEAVmBLeQQsEk8sQDRm` prior) | ✅ |
| Prod curl §6.2 (401 / 401 / 200) | ✅ |
| Docs + operational-gotchas + 2b-8 append | ✅ |
| Operator gate §7 | ☐ PENDING (Toffe) |

When deploy + operator gate ✅, phase 2b.8.2 is fully closed end-to-end.

# Phase 2b.11 — Conversation rows + outbound Message-ID capture

**Branch:** `phase-1-attribution-foundation`  
**Test tenant:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`  
**Production:** https://dental-crm-nine.vercel.app  

**Scope:** Add `activities.conversation_id` (stable per tenant + contact + messaging channel), stamp on outbound dispatcher paths and inbound `ingestLead` / email webhook stub, capture outbound RFC 5322 / Twilio Message-IDs in `metadata`. No Conversations UI (2c). Audit refs: `outbound_audit.md` §11 P2 #15, P3 #29.

---

## 1. Summary

Phase 2b.11 adds the data plumbing for lifetime per-channel threads: one `conversation_id` for all email (or SMS, or WhatsApp) between a practice and a contact. Outbound email generates `<uuid@dental-crm-nine.vercel.app>` before the provider call, sends it as `Message-ID`, and stores it in `metadata.message_id` with `metadata.provider_message_id` from the provider response. SMS/WhatsApp store the Twilio SID after send. Voice and form-submission activities stay `conversation_id = null` by design.

---

## 2. Schema migration

**File:** `supabase/migrations/20260519120000_add_conversation_id.sql`

- Column: `activities.conversation_id uuid` (nullable)
- Index: `activities_conversation_id_idx` on `(tenant_id, conversation_id, occurred_at DESC)` partial `WHERE conversation_id IS NOT NULL`
- Backfill: `uuid_generate_v5('dc5cee30-9488-4ebf-a7fe-250a98176501', tenant_id || ':' || contact_id || ':' || type)` for rows with `contact_id IS NOT NULL` and `type IN ('email','sms','whatsapp')`
- Safety: abort backfill if row count > 100k

**Namespace UUID (`CONVERSATION_NAMESPACE_UUID`):** `dc5cee30-9488-4ebf-a7fe-250a98176501`

### 2.1 Apply result

| Attempt | Result |
|---------|--------|
| `npx supabase db push --linked` | **Failed** (remote-only migration drift — see 2b.8.1) |
| Supabase MCP `apply_migration` (`add_conversation_id`) | **Success** (`{"success":true}`) |

### 2.2 Post-apply verification (MCP `execute_sql`)

| Check | Expected | Observed |
|-------|----------|----------|
| Column exists | 1 | **1** |
| Index `activities_conversation_id_idx` | 1 | **1** |
| Backfill email | 39 | **39** (0 null remaining) |
| Backfill sms | 63 | **63** (0 null remaining) |
| Backfill whatsapp | 53 | **53** (0 null remaining) |
| distinct_conversations = distinct_contacts | per channel | email 30/30, sms 33/33, whatsapp 37/37 |
| Non-deterministic groups | 0 rows | **0 rows** |

### 2.3 Pre-flight counts (§1.3)

| type | will_backfill | will_skip_nullcontact | total |
|------|---------------|----------------------|-------|
| email | 39 | 0 | 39 |
| sms | 63 | 0 | 63 |
| whatsapp | 53 | 0 | 53 |

Types regenerated via MCP `generate_typescript_types` → `src/types/supabase.ts` (includes `conversation_id`).

---

## 3. Adaptations from prompt → live shape

### 3.1 `channel` vs `activities.type`

The prompt and audit text refer to `channel`; the live `activities` table uses **`type`** (`'email' | 'sms' | 'whatsapp' | 'call' | …`). Migration backfill, `computeConversationId`, and all stamping use **`type`** / activity type from `mapSourceChannelToActivityType()`.

### 3.2 Activity insert sites (§1.4)

| Path | Direction | Notes |
|------|-----------|--------|
| `src/lib/communications/dispatcher.ts` | Outbound email/sms/whatsapp/voice | Stamped email/sms/whatsapp; voice explicitly skipped |
| `src/lib/lead-ingestion/ingest-lead.ts` | Inbound (SMS/WhatsApp/forms/…) | Stamped when mapped `type` is email/sms/whatsapp |
| `src/app/api/webhooks/email/route.ts` | Inbound stub | Stamped when contact resolved |
| `src/app/api/webhooks/sms/route.ts` | Inbound | Delegates to `ingestLead` — no direct insert |
| `src/app/api/webhooks/whatsapp/route.ts` | Inbound | Delegates to `ingestLead` |
| `src/lib/automations/deal-automation-actions.ts` | System | `stage_change` / `assignment` — null conversation naturally |
| `src/app/api/marketing/track-click/route.ts` | Marketing | Not messaging channel |
| `src/lib/engagement/campaign-engine.ts` | Campaign | Not messaging channel |
| `src/app/api/dedup-queue/[id]/resolve/route.ts` | Dedup merge | Planner review if merge activities need threads (out of scope) |

### 3.3 Inbound channel mapping (§6.1)

| `source_channel` (examples) | Activity `type` | `conversation_id` |
|-----------------------------|-----------------|-------------------|
| `sms_inbound` | `sms` | computed |
| `whatsapp_inbound`, `whatsapp_*` | `whatsapp` | computed |
| `form_embedded`, `google_lead_form`, … | `form_submission` / `google_lead_received` | null |
| `phone_call_inbound` | `call` | null |

### 3.4 `uuid` package

Installed **`uuid@9.0.1`** (CommonJS-compatible with Jest). `uuid@14` is ESM-only and broke the test runner.

### 3.5 SES custom Message-ID

`SendEmailCommand` does not accept arbitrary `Message-ID` headers. SES branch returns `providerMessageId` from AWS `MessageId` only; outbound RFC header is still generated and stored for threading prep when tenants use Resend/SendGrid/Gmail/Outlook.

---

## 4. New TypeScript modules

| File | Purpose |
|------|---------|
| `src/lib/communications/conversation-id.ts` | `CONVERSATION_NAMESPACE_UUID`, `computeConversationId()` |

---

## 5. Modified files

| File | Change |
|------|--------|
| `src/lib/communications/dispatcher.ts` | `conversation_id`, Message-ID metadata, provider headers |
| `src/lib/integrations/email-provider.ts` | `headers` on payload; `providerMessageId` on result; Resend/SendGrid/Gmail/Outlook |
| `src/lib/lead-ingestion/ingest-lead.ts` | `conversation_id` on `insertActivity` |
| `src/app/api/webhooks/email/route.ts` | `conversation_id` on stub insert |
| `src/types/supabase.ts` | `conversation_id` on activities Row/Insert/Update (manual until regen post-migrate) |
| `package.json` / `package-lock.json` | `uuid@9.0.1`, `@types/uuid@9.0.8` |
| `scripts/apply-2b11-conversation-id-migration.mjs` | Direct Postgres apply helper |

### 5.1 Post-gate hotfix (operator session — not in `90a5a7d`)

| File | Change |
|------|--------|
| `src/lib/communications/dispatcher.ts` | `sanitiseOutboundHtml()` try/catch fallback when DOMPurify/jsdom fails on Vercel |
| `src/components/settings/communications-integrations-tab.tsx` | Add **Resend** to email provider dropdown (DB already used `resend`) |
| `src/lib/communications/__tests__/dispatcher.test.ts` | +1 test for sanitise fallback |

**Note:** Hotfix code was deployed live first, then committed as part of the 2b.11 follow-up commit.

---

## 6. Files deleted

None.

---

## 7. New tests

| Suite | Cases |
|-------|-------|
| `conversation-id.test.ts` | 9 (8 spec + SQL parity) |
| `dispatcher.test.ts` | +7 (4 conversation_id, 3 Message-ID) |
| `ingest-lead.test.ts` | +1 (whatsapp inbound `conversation_id`) |

**Run:** `npx jest src/lib/communications src/lib/lead-ingestion` → **98 passed** (12 skipped integration).

---

## 8. Validation results

| Check | Result |
|-------|--------|
| `npx jest` (modified libs) | **Pass** (98/98 in scope) |
| `npx jest` (full repo) | Pre-existing failures in Playwright/visual suites (unchanged) |
| `npx tsc --noEmit` | Pre-existing errors in `tests/`, `tools/` (unchanged) |
| `npm run build` | **Exit 0** |
| Migration post-apply §2.2 | **Pass** (see §2.2 table) |

---

## 9. Deploy + curl smoke

| Item | Value |
|------|--------|
| Commits | `90a5a7d` (feat), `f1251e0` (docs), `7629ff3` (docs deploy note) |
| Deploy ID (2b.11) | `dpl_28DctoFfrS9KXQjfNa93PvkJsppV` |
| Deploy ID (email hotfix) | `dpl_Gpd7mu27kCXmoFPScNPRRwWasg7v` |
| Status | **READY** → https://dental-crm-nine.vercel.app |

| Curl | Expected | Observed |
|------|----------|----------|
| `GET /settings` | 200 or 307 | **200** |
| `POST /api/communications/send-email` `{}` | 401 JSON | **401** `{"error":"unauthenticated","message":"Login required"}` |
| `POST /api/communications/send-email` (authed, post-hotfix) | 200 JSON | **200** `success: true`, `activity_id` + Resend `external_id` |

---

## 10. Operator gate (§10)

**Run:** 2026-05-19 on production (`https://dental-crm-nine.vercel.app`), test tenant `5aadca14-9786-4aef-bc53-e9287cdd0bbf`.

| Step | Result | Evidence |
|------|--------|----------|
| §10.1 Outbound email | **PASS** (after hotfix deploy) | Resend tenant: `onboarding@resend.dev`, API key configured. Initial gate: activities stuck `pending` + API 500 (DOMPurify/jsdom crash on Vercel — not Resend). **Hotfix** `sanitiseOutboundHtml` try/catch fallback deployed `dpl_Gpd7mu27kCXmoFPScNPRRwWasg7v`. Post-fix activity `92181f42-…`: `conversation_id` `3ddfd5e1-e94c-522b-a84b-34f3fa5c5fbc`, RFC `metadata.message_id`, Resend id `67ebb39d-…`, API **200**. Operator confirmed **two** test emails received at `deepakshegde@gmail.com`. |
| §10.2 Outbound SMS | **PASS** | Contact **Unknown Lead** `eff2b8c1-…` → `+447424805475`. Activity `5041f3f4-…` / `4c64b699-…`: `conversation_id` `2d65d216-38c2-5112-8c34-f51d13b5a132`, Twilio SID in `metadata.message_id`. |
| §10.3 Outbound WhatsApp | **PASS** | Twilio sandbox `+14155238886` → `+919916558958`. Activities `8d7980d7-…`, `df1c7349-…`: `conversation_id` `8d946aea-7aa6-5e15-80d0-769739844524`. Contact page **WhatsApp** quick action opens **Add Note** dialog (known UI bug; out of scope — use API or Reception). |
| §10.3b Inbound WhatsApp | **PASS** | Inbound `02399df0-…` at 2026-05-19 21:43 UTC — same `conversation_id` `8d946aea-…` as outbound. |
| §10.4 Inbound SMS roundtrip | **PASS** | Inbound `7c9d384a-…`, `5d71a041-…`, `ddd5d981-…` — same `conversation_id` `2d65d216-…` as outbound. |
| §10.5 Backfill spot-check | **PASS** | Mary Wright `45b982aa-…`: one `conversation_id` per channel. Deepak Hegde whatsapp thread: single `8d946aea-…`. |

**Contacts used**

| Channel | Contact | ID | Phone / email |
|---------|---------|-----|----------------|
| SMS in/out | Unknown Lead | `eff2b8c1-9b25-47e5-bc33-0cd6e64d5848` | `+447424805475` |
| WhatsApp | Deepak Hegde | `4ef5a768-2b39-4758-b085-52e2f9a56672` | `+919916558958` |
| Email | Mary Wright | `45b982aa-bc3d-4a39-b88a-ac0eb6e51573` | `deepakshegde@gmail.com` |

---

## 11. Drift findings

- `supabase db push` blocked by remote-only migration versions (documented in `operational-gotchas.md`).  
- Prompt SQL used `channel`; schema uses `type`.  
- Resend works with `onboarding@resend.dev` for **account-owner email only** until a custom domain is verified (not a 2b.11 blocker).

---

## 12. Out of scope (verbatim)

- The Conversations sidelist UI (2c).
- The "Change deal" UI on activity slide-in (2b.11.5).
- Auto-deal-attachment heuristic for inbound (2b.11.5).
- Reply-To token threading for inbound emails (post-launch, with domain purchase).
- Real inbound email parser wiring (post-launch, with domain purchase).
- Switching the RFC 5322 hostname from `dental-crm-nine.vercel.app` to the real outbound domain (post-launch).
- 2b.12 automation engine audit.
- Any change to ingestLead's deal-reuse logic.
- Backfill of voice activities (they stay null by design).
- Backfill of web-form / Google-Lead-Form activities (they stay null by design).

---

## 13. Open questions for next phase (2b.11.5)

1. **Current ingestLead deal-reuse behavior** — audit before auto-attachment rule.  
2. **Outbound deal context inference** — which `deal_id` when sending from contact-level UI?  
3. **"Change deal" UI placement** — slide-in vs modal.  
4. **Audit trail for deal reassignment** — existing table vs new `activity_deal_changes`.

---

## 14. Definition of done

- ✅ §1 pre-flight: branch `phase-1-attribution-foundation`, tip `36bead4`, temp-only dirty tree  
- ✅ §1.2 deploy READY (`dpl_Gpd7mu27kCXmoFPScNPRRwWasg7v` post-hotfix)  
- ✅ §1.3 schema reconnaissance — §2.2–2.3 live counts  
- ✅ §1.4 insert sites mapped (§3.2)  
- ✅ §1.5 dispatcher anatomy — inserts L304/L471/L601/L783, updates L388/L530/L663  
- ✅ §1.6 Message-ID header support documented (§3.5 SES caveat)  
- ✅ §1.7 `uuid@9.0.1` installed  
- ✅ §1.8 namespace `dc5cee30-9488-4ebf-a7fe-250a98176501`  
- ✅ §1.9 tests baseline — modified libs green  
- ✅ §2.0–2.1 migration applied via MCP  
- ✅ §2.2 post-apply verification — all pass  
- ✅ §2.3 types regenerated (`conversation_id` present)  
- ✅ §3.1 helper + tests  
- ✅ §4–5 dispatcher stamping + Message-ID  
- ✅ §6.1 ingestLead stamping  
- ✅ §6.2–6.3 SMS/WhatsApp via ingestLead  
- ✅ §6.4 email webhook stub stamped  
- ✅ §6.5 form channels null by design  
- ✅ §7 tests in modified libs  
- ✅ §8 build green; tsc/jest pre-existing caveats  
- ✅ §9 push + deploy (`dpl_28DctoFfrS9KXQjfNa93PvkJsppV`, curls green)  
- ✅ §10 operator gate — **all steps PASS** (email after hotfix; operator confirmed inbox delivery)  
- ✅ §11.1 this changelog (final operator + hotfix results recorded)  
- ✅ §11.2 `operational-gotchas.md`  
- ✅ §11.3 `2b-10-changes.md` close note  
- ✅ §11.4 docs commit + deploy (`f1251e0`)

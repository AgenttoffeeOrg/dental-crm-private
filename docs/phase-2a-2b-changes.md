# Phase 2a.2b — Notifications & Dedup Queue (changes)

Phase 2a.2b shipped in two passes:

1. **Notification dispatch** (Checkpoints 1–5 of the original prompt) was
   completed in the same chat that delivered Phase 2a.2a (engine).
2. **Dedup queue API + UI** (this document) was completed as the
   `phase_2a_2b_notifications_and_queue.md` resume prompt.

This file documents pass 2.

---

## What was built

### API endpoints (server)

| File | Method | Purpose |
| --- | --- | --- |
| `src/app/api/dedup-queue/route.ts` | `GET` | List queue items, paginated + searchable; enriched with matched-contact summaries. |
| `src/app/api/dedup-queue/[id]/route.ts` | `GET` | Single queue-item detail with matched-contact enrichment. |
| `src/app/api/dedup-queue/[id]/resolve/route.ts` | `POST` | Apply `merge` / `create_new` / `dismiss`. Writes attribution touchpoint + activity, marks the queue row, fires `lead.arrived`. |

All three endpoints:

- Use `getApiRequestContext(request)` (3-arg form match: `{ p_user_id, p_tenant_id, p_permission_code }`).
- Gate on `contacts.dedup_queue_manage`.
- Return `403` (`{ error: 'Permission denied' }`) when the caller lacks the permission. The UI treats `403` as the trigger for the empty-state card.
- Set `export const dynamic = 'force-dynamic'` to avoid Next.js trying to prerender them at build time.

### UI

| File | Role |
| --- | --- |
| `src/app/dedup-queue/page.tsx` | Page route (`/dedup-queue`) inside `DashboardLayout`, with the `NoOrgEmptyState` guard mirrored from `/contacts`. |
| `src/components/dedup-queue/dedup-queue-list.tsx` | Top-bar (title + pending subtitle) + Status filter + search + table + permission-denied empty state. |
| `src/components/dedup-queue/dedup-review-modal.tsx` | Comparison modal: candidate card, match cards, signals explainer, notes, actions. |
| `src/components/dedup-queue/dedup-match-card.tsx` | Per-match card with click-to-select radio. |
| `src/components/dedup-queue/dedup-signals-explainer.tsx` | Plain-English `match_signals` translation. |
| `src/components/dedup-queue/dedup-actions.tsx` | Three buttons + notes field; `Dismiss` confirms via `AlertDialog`. |

### Sidebar entry

`src/components/layout/dashboard-layout.tsx`:

- Imports the new `useDedupQueueAccess()` hook.
- Adds `{ name: 'Dedup Queue', href: '/dedup-queue', icon: GitMerge, dynamicKey: 'dedup_queue' }` to the static nav array, between Contacts and Tasks.
- Filters that entry out when the hook reports `hasAccess === false` (server returned `403`).
- Renders an amber count badge when `pendingCount > 0`.

### Supporting library code

| File | Role |
| --- | --- |
| `src/lib/lead-ingestion/source-labels.ts` | New `sourceChannelToLabel(channel)` helper. Lives next to the lead-ingestion module so producers (`ingestLead`) and consumers (queue UI, future widget UI) share one source of truth. |
| `src/lib/hooks/use-dedup-queue-access.ts` | Client-side polling hook (30 s) used by the sidebar to derive `{ hasAccess, pendingCount }`. Hides the link entirely on `403`. |

---

## Pause-gate findings (post Checkpoints 1–3)

### `dedup_review_queue` schema (live, introspected 2026-05-03)

```
id                   uuid           NOT NULL
tenant_id            uuid           NOT NULL
candidate_payload    jsonb          NOT NULL
candidate_email      text           NULL
candidate_phone      text           NULL
candidate_name       text           NULL
source_channel       USER-DEFINED   NULL   -- public.source_channel_enum
matched_contact_ids  uuid[]         NOT NULL
match_signals        jsonb          NOT NULL
status               text           NOT NULL  -- 'pending'|'merged'|'new_contact'|'dismissed'
resolved_contact_id  uuid           NULL
resolved_by_user_id  uuid           NULL
resolved_at          timestamptz    NULL
resolution_notes     text           NULL
created_at           timestamptz    NOT NULL
updated_at           timestamptz    NOT NULL
expires_at           timestamptz    NOT NULL
```

Matches the prompt exactly. No surprises.

### `contacts` columns the resolve endpoint depends on

Confirmed present (from `information_schema.columns`):

`full_name, primary_email, primary_email_norm, primary_phone, primary_phone_e164, marketing_consent, email_consent, sms_consent, treatment_offering_id, owner_user_id, last_touch_at, first_touch_at, first_response_at, deleted_at`

Confirmed **absent**:

- `first_name` / `last_name` (only `full_name`).
- `last_activity_at` — used `last_touch_at` instead in the matched-contact enrichment select.
- `assigned_user_id` — used `owner_user_id` for the notification metadata's `assigned_user_id` slot.

Consents are flat booleans (`marketing_consent boolean`, etc.), not JSONB. Both the additive merge patch and the create-new insert respect the widen-only rule (`true` is never downgraded; `null/false` may flip to `true`).

### `user_has_permission` signature actually used

Two overloads exist in the live DB:

- `user_has_permission(p_user_id uuid, p_permission_key text) returns boolean` (legacy 2-arg)
- `user_has_permission(p_user_id uuid, p_tenant_id uuid, p_permission_code text) returns boolean` (canonical 3-arg)

Every dedup-queue endpoint calls the **3-arg** form with named args:

```ts
supabase.rpc('user_has_permission', {
  p_user_id: user.id,
  p_tenant_id: tenantId,
  p_permission_code: 'contacts.dedup_queue_manage',
})
```

(Note: the prompt's pseudocode used `p_code`; the live DB parameter name is `p_permission_code`. We use the live name.)

### Manual curl smoke tests

Not run from this Cursor session — the dev server requires an interactive browser-issued session cookie / Bearer token. The build, type-check, and Codacy passes are documented below; e2e validation is the smoke-test step Toffee owns per the prompt's "4.6 Manual smoke test (Toffee runs after Cursor finishes)" section.

---

## Action-by-action behaviour of `POST /api/dedup-queue/[id]/resolve`

All three actions:

- Validate body via a Zod discriminated union (`merge | create_new | dismiss`).
- Re-check `contacts.dedup_queue_manage` (3-arg RPC).
- Load the queue row with `status='pending'` (so resolved rows can't be re-resolved).

**`merge`:**

1. Validate `merge_into_contact_id ∈ matched_contact_ids` (returns `400` on mismatch).
2. Load target contact, additively patch (only fills NULL fields; consents widen-only).
3. Insert `attribution_touchpoint` (with `event_id = 'dedup_resolved:<queue_id>'` for idempotency).
4. Insert `activity` (`type` mapped from source_channel; `direction='inbound'`).
5. Update queue row → `status='merged', resolved_contact_id, resolved_by_user_id, resolved_at, resolution_notes`.
6. Fire `lead.arrived` notification (idempotency `dedup_resolved:<queue_id>`, `dedup_resolved_action='merge'`). Best-effort; never throws.

**`create_new`:**

1. Insert new `contacts` row from `candidate_payload` using the same field mapping the form submit route uses (full_name, primary_email, primary_phone, treatment_offering_id, consents, source=source_channel, contact_type='lead', status='lead').
2. Touchpoint + activity + queue update + notification — same as merge except `dedup_resolved_action='create_new'`, queue `status='new_contact'`.

**`dismiss`:**

- Updates only the queue row → `status='dismissed', resolved_by_user_id, resolved_at, resolution_notes`.
- No contact mutation, no touchpoint, no activity, **no notification**.

---

## Deviations / notes for the planner

1. **`p_code` → `p_permission_code` parameter name.** Used the live DB name. Functional behaviour unchanged.
2. **`last_activity_at` → `last_touch_at`.** That's the live column. The match-card UI labels it "Last activity {relative time}" so the user-facing wording matches the prompt.
3. **`assigned_user_id` → `owner_user_id`.** That's the column actually present on `contacts`. The notification metadata still uses the key `assigned_user_id` (the recipient resolver expects that name), so audience routing is unchanged.
4. **Source-channel label helper newly created.** The prompt assumed `sourceChannelToLabel` already existed in `ingest-lead.ts`; it did not. Added at `src/lib/lead-ingestion/source-labels.ts` as a typed enum→label map. Also imported by the queue list, modal, and could be used by future widget UI.
5. **Touchpoint attribution is partial.** `dedup_review_queue.candidate_payload` only stores the form `payload` (the original ingest stores UTM/IP/UA on `attribution_touchpoints` via `input.attribution`, not in `raw_payload`). When a queue item is later resolved, we no longer have the original UTM/click IDs/IP/UA. The resolved-from-queue touchpoint has `source_channel`, `treatment_offering_id`, `event_id`, and `metadata.raw_payload` only. This is a known minor data-loss vs. the never-queued fast path; a follow-up could persist the structured attribution alongside the candidate row. Logged as a deferred item below.
6. **3-arg RPC compliance audit.** Every call from the dedup-queue files uses the 3-arg form. One pre-existing 2-arg call remains in `src/app/api/treatment-routing/bulk-reroute/route.ts` (uses `bulk_reroute_deals` permission, no tenant arg). Out of scope for this prompt, but worth a tiny follow-up PR.
7. **No `force-dynamic` on existing routes.** Added `export const dynamic = 'force-dynamic'` to all three new routes to silence Next.js prerender warnings. Consistent with the routes' actual runtime behaviour (they require auth headers).
8. **Tests not added.** The original prompt didn't request unit tests for the API endpoints, and the resolve endpoint mutations are best validated by Toffee's end-to-end smoke pass (Section 4.6). Worth a follow-up if we want CI coverage.
9. **Pre-existing `tsc --noEmit` errors.** The project baseline is ~1,562 errors (mostly tests + tooling, plus the existing `getApiRequestContext()`-without-arg pattern in tasks/deals routes). My new files contribute **zero** of those; verified with `npx tsc --noEmit | grep -E "dedup-queue|source-labels|use-dedup-queue|dashboard-layout" → 0 matches`.

---

## Verification (Checkpoint 5)

```bash
test -f src/app/api/dedup-queue/route.ts                        # ✓
test -f src/app/api/dedup-queue/\[id\]/route.ts                 # ✓
test -f src/app/api/dedup-queue/\[id\]/resolve/route.ts         # ✓
test -f src/app/dedup-queue/page.tsx                            # ✓
ls src/components/dedup-queue/*.tsx | wc -l                     # 5
npx tsc --noEmit                                                 # 0 new errors
npm run build                                                    # ✓ Compiled successfully
                                                                 #   (only pre-existing /404 + /500 prerender errors remain)
grep -rn "dedup_queue_manage" src/                              # all use 'contacts.dedup_queue_manage'
grep -rn "user_has_permission" src/                             # 3-arg in dedup-queue files; one pre-existing 2-arg
                                                                 #   call in bulk-reroute (out of scope)
codacy_cli_analyze (each new file)                              # 0 Trivy / 0 ESLint / 0 Opengrep findings
                                                                 #   (only Lizard complexity warnings, in line with baseline)
```

---

## Deferred (carried forward from original 2a.2b prompt + this run)

- Booking widget React component — Phase 2a.3
- Widget API routes — Phase 2a.3
- Static Netlify test site — Phase 2a.4
- E2E tests across booking widget → `ingestLead` — Phase 2a.4
- The 5 broken notification insert sites in `src/lib/automations/*` — separate cleanup PR
- The `notifications-tab.tsx` legacy stub — remove
- Coalescing/digest worker for burst-lead notifications — Phase 2b+
- SMS / Push channels — Phase 2b
- Auto-reply cadence — Phase 2c
- Meta/Google/TikTok webhook refactor through `ingestLead` — Phase 2b
- Conversion event firing back to ad platforms — Phase 2b
- Regenerate Supabase Deal type to remove the `DealRow` local alias
- Drop legacy `lead_intakes`, `lead_sources`, `auto_categorize_lead` RPC — late 2a or early 2b
- Remove `quickRouteDeal` alias re-export — confirmed zero call sites
- Plumb `routingLogId` back through `AdapterResult` — minor follow-up from 2a.1
- Business-hours-aware SLA resolution — Phase 2b
- `lead.arrived` per-event preference toggle in `notifications-preferences-tab.tsx` — small UI follow-up

**New deferred items from this pass:**

- Persist structured attribution (UTM / clickIDs / IP / UA) on `dedup_review_queue` rows so resolved-from-queue touchpoints don't lose attribution chain.
- Migrate `bulk-reroute/route.ts` from the legacy 2-arg `user_has_permission` to the canonical 3-arg form.
- Unit / integration tests for the three dedup-queue API endpoints (currently relies on Toffee's smoke pass).

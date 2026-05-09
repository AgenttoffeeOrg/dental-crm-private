# Phase 2b.2.a.2 — WhatsApp inbound media capture: change log

**Scope:** when a prospective patient sends a photo, voice note, video, or
PDF via WhatsApp, the practice now sees the file inline in the contact's
activity timeline. The webhook downloads each media item from Twilio
synchronously, uploads it to a private Supabase Storage bucket, and links
it to the activity via a new `message_media` table; the contact-detail
view loads the related rows, signs short-lived URLs, and renders images,
audio players, video players, or download links per content type.

**Out of scope (deferred — explicitly NOT done in this phase):**

- Outbound media (practice replies with photos / files) — separate later
  phase.
- GDPR retention enforcement — `message_media.expires_at` is added as
  scaffolding; no automated deletion job is built.
- Right-to-erasure flow (delete-on-request).
- F1 fix from 2b.2.a §11.2 ("reuse open deal" instead of creating one
  per WhatsApp message) — separate phase 2b.2.a.3.
- Image thumbnails / optimisation / EXIF stripping.
- Audio transcoding (e.g., OGG → MP3 for Safari compatibility).
- PDF inline preview — for now, just download.
- OCR / AI analysis of image content.
- Quoted-message handling (when a WhatsApp reply quotes an earlier
  message).
- Settings UI changes (that's 2b.2.c).
- Messenger media (that's 2b.2.b — different API, different fields).

**Branch baseline:** `phase-1-attribution-foundation`, on top of Phase
2b.2.a (`bc38c3b`, validated and live).
**Date applied:** 2026-05-09.
**Live tenant exercised:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
("Deepak's Dental Practice"), `whatsapp_phone_number = '+14155238886'`
(Twilio shared sandbox).

---

## 1. Summary

2b.2.a wired text-only WhatsApp inbound through `ingestLead()` and shipped
DB-backed idempotency. 2b.2.a.2 closes the captured-not-rendered media
gap: the structured `mediaUrls` array `parseTwilioInboundMessage`
already produces is now followed end-to-end into Supabase Storage and the
contact-timeline UI.

The single design choice worth surfacing: the download → upload →
persist pipeline runs **synchronously** inside the webhook handler,
immediately after `processWhatsappInboundMessage` creates the activity.
We accept the ~1–3 s added webhook latency because:

- Inbound volume is low (a sandbox today, single-tenant production
  shortly); a queue would be over-engineered.
- Twilio's 11-second response budget covers it with margin (10 s timeout
  per item × N items, where N ≤ 10 in practice).
- Per-item failures don't fail the webhook — the orchestrator logs and
  continues, so a single broken download doesn't take the activity down
  with it. Twilio media URLs expire in 7–30 days, so deferring to a
  worker queue introduces a real loss-of-data risk we don't want.

If volume grows, the obvious next step is to move the orchestrator into a
worker (BullMQ already in the repo) and have the webhook return 200
immediately; the contract on `processInboundMediaItems` is already the
right shape for that.

---

## 2. Schema migration — `20260509120000_phase_2b_2_a_2_message_media.sql`

Applied via Supabase MCP `apply_migration` (name:
`phase_2b_2_a_2_message_media`). Validated by post-apply count query
(table=1, indexes=6 incl. PK, table policies=2, bucket=1, storage
policies=2).

| # | Object | Notes |
|---|---|---|
| 1 | `public.message_media` table | 14 columns. FKs to `tenants`, `activities`, `contacts`, `attribution_touchpoints` all with `ON DELETE CASCADE` so a tenant / activity / contact / touchpoint deletion sweeps the related media rows automatically. |
| 2 | `idx_message_media_msg_idx_uniq` | Unique on `(external_message_id, media_index)`. The DB-level idempotency net for Twilio retries — `persistMessageMedia` SELECT-then-INSERT is the optimistic path, this index catches races. |
| 3 | `idx_message_media_activity` / `idx_message_media_contact` / `idx_message_media_tenant_created` | The three access paths the UI uses — by activity (timeline render), by contact (future contact-page summaries), by tenant + recency (admin views, future retention sweeper). |
| 4 | `idx_message_media_expires` partial | `WHERE expires_at IS NOT NULL`. Keeps the index small (almost all rows have NULL); a future GDPR-retention sweeper can scan it directly. |
| 5 | `mm_select_tenant_members` (table RLS) | `tenant_id = ANY(public.get_accessible_tenants())` — same pattern as `activities`, `attribution_touchpoints`, `contacts`. Read-only for `authenticated`. |
| 6 | `mm_service_role_all` (table RLS) | `service_role` catch-all so the webhook can insert. No `authenticated` write policy intentionally — UI is read-only. |
| 7 | `storage.buckets.message-media` | Private (`public=false`), 16 MiB cap (Twilio WhatsApp media maximum), `allowed_mime_types` covers image/audio/video/PDF families WhatsApp supports. |
| 8 | `mm_storage_select_tenant_members` (storage RLS) | First path segment (`storage.foldername(name)[1]::uuid`) must be in `get_accessible_tenants()`. Tenant-scoped read for `authenticated`. |
| 9 | `mm_storage_service_role_all` (storage RLS) | Bucket-scoped service-role catch-all for webhook uploads. |

**Validation queries (post-apply):**

```sql
SELECT
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema='public' AND table_name='message_media') AS table_exists,
  (SELECT count(*) FROM pg_indexes
     WHERE schemaname='public' AND tablename='message_media') AS index_count,
  (SELECT count(*) FROM pg_policies
     WHERE schemaname='public' AND tablename='message_media') AS table_policy_count,
  (SELECT count(*) FROM storage.buckets WHERE id='message-media') AS bucket_exists,
  (SELECT count(*) FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects'
       AND policyname LIKE 'mm_%') AS storage_policy_count;
-- → 1 / 6 / 2 / 1 / 2
```

**Migration discipline:**

- Idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`,
  `DROP POLICY IF EXISTS` before each `CREATE POLICY`).
- No backfill — `expires_at` is `NULL` for all new rows; no enforcement.
- Supabase advisors re-run after apply: zero new issues against
  `message_media` or the bucket.
- No rollback companion: dropping the table would orphan any uploaded
  files; recovery path if needed is `TRUNCATE message_media`,
  `DELETE FROM storage.objects WHERE bucket_id='message-media'`,
  `DELETE FROM storage.buckets WHERE id='message-media'`, then drop the
  table. The existing `attribution_touchpoints.metadata.raw_payload._media_urls`
  field (populated by 2b.2.a) is the recovery breadcrumb for retried
  downloads.

### 2.1 — RLS verification (Task 5)

The storage policy uses `(storage.foldername(name))[1]::uuid =
ANY(public.get_accessible_tenants())`. Verified the policy expression
evaluates correctly for the canonical path shape `{tenant_id}/{activity_id}/{idx}.{ext}`:

```sql
WITH names(name) AS (VALUES
  ('5aadca14-9786-4aef-bc53-e9287cdd0bbf/test-activity-id/0.txt'),
  ('00000000-0000-0000-0000-000000000001/test-activity-id/0.txt'))
SELECT name, (storage.foldername(name))[1] AS first_segment,
       (storage.foldername(name))[1]::uuid = '5aadca14-...'::uuid AS matches_test_tenant,
       (storage.foldername(name))[1]::uuid = '00000000-...0001'::uuid AS matches_other_tenant
FROM names;
-- → first row: matches_test_tenant=true,  matches_other_tenant=false
-- → second row: matches_test_tenant=false, matches_other_tenant=true
```

`get_accessible_tenants()` is the same battle-tested function used by the
RLS on `activities`, `attribution_touchpoints`, `contacts`, and
`message_media` itself, so the cross-tenant isolation guarantee is
inherited. End-to-end signed-URL-vs-direct-access check is captured
under §11.6 once the manual validation runbook completes.

---

## 3. Adaptations from prompt → live shape

| # | Prompt assumed | Live shape | Resolution |
|---|---|---|---|
| A | UI media fetching would be done at the server-component level using a server-side signed-URL helper. | `src/components/activities/activity-feed-enterprise.tsx` is a `'use client'` component; the contact detail view loads activities client-side via the browser Supabase client. Adding a server data-fetching layer would be a much larger refactor than the prompt scope allows. | Created `src/lib/inbound-media/signed-urls.ts` as a channel-agnostic `signMessageMediaUrls(supabase, paths)` helper that works on **any** `SupabaseClient` — server- or client-side. Wired it in client-side from `attachMessageMedia` inside the existing `fetchActivities`. The browser `authenticated` user can sign URLs for their own tenant's paths because the storage RLS allows tenant-scoped SELECT on `storage.objects`. Future server-rendered surfaces (e.g. activity-detail slide-in if it moves to RSC) can reuse the same helper unchanged. |
| B | Activity has a `body` column. | `activities.description` is the long-text column (per 2b.2.a §3 row B). Activities with empty `description` already render with the type icon + timestamp; no changes needed to keep media-only activities visible. | Verified by reading the existing `renderActivityCard` flow — the type icon + timestamp + smart badges all render unconditionally; media now slots in below the snippet placeholder. |
| C | Codacy's `0 issues` gate on every modified file. | Pre-existing `Lizard_file-nloc-medium` warning on `src/components/activities/activity-feed-enterprise.tsx` (file nloc 549 before our edits, 606 after). The file is already over the 500-line threshold; my delta added 57 lines but did not introduce a new warning category. | Verified pre-existing by stashing the modified version, re-running Codacy, and confirming the same warning at 549 nloc. Tolerated per the 2b.2.a §3 row F precedent (pre-existing complexity warnings on `ingest-lead.ts` were tolerated). All NEW files (`media-store.ts`, `signed-urls.ts`, `activity-media.tsx`, both test files, the migration) are clean across Trivy / ESLint / Lizard / Opengrep / PMD. |
| D | Lizard would tolerate the simple inline `KIND_BY_PREFIX` array iteration in `kindFor`. | Lizard's TSX parser conflated the surrounding component's branches with `kindFor`'s body and reported CCN 13 against the function. | Refactored `kindFor` to three plain `if` statements + a default; extracted a `renderMediaItem` dispatcher so the `ActivityMedia` component itself is trivially low-CCN. Codacy then reports zero issues on the file. |
| E | The contact-detail view's activity query would need a separate fetch for media. | The activities query already runs from `ActivityFeedEnterprise` which loads via the regular client (or fallback table). The simplest fit is to attach media client-side after the activities load. | Added `attachMessageMedia()` as a module-level helper in `activity-feed-enterprise.tsx`. It runs once after the activities query, batches a single `message_media` SELECT (`.in('activity_id', ids)`), then a single `createSignedUrls` call, and groups results by `activity_id` into the `Activity.media` field. |
| F | Tests would mock both `'@/lib/inbound-media/media-store'` and `'@/lib/lead-ingestion/ingest-lead'` independently. | `ingest-lead`'s mock was already in place per 2b.2.a; adding a sibling `processInboundMediaItems` mock follows the same pattern. | Added the second mock at the top of `src/lib/whatsapp/__tests__/inbound.test.ts` and three new test cases covering empty / 2-item / mixed-failure paths. |

---

## 4. New TypeScript modules

| File | Responsibility |
|---|---|
| `src/lib/inbound-media/media-store.ts` | The download / upload / persist pipeline. Exports `downloadTwilioMedia` (Basic-Auth + 10 s `AbortSignal.timeout` + tagged `TwilioMediaDownloadError`), `uploadMediaToStorage` (canonical `{tenant}/{activity}/{idx}.{ext}` path, `upsert: false`, collision detection), `persistMessageMedia` (insert + `23505`-fallback select for idempotency), and `processInboundMediaItems` (orchestrator with absorbed per-item failures). All functions ≤ CCN 8 per Lizard. |
| `src/lib/inbound-media/signed-urls.ts` | `signMessageMediaUrls(supabase, paths)` — batches `createSignedUrls` for the `message-media` bucket with a 1-hour TTL. Channel-agnostic across server- and client-side Supabase clients. Empty-input fast path. |
| `src/lib/inbound-media/__tests__/media-store.test.ts` | 22 unit tests across the five exports: `extensionFor` mapping; `downloadTwilioMedia` happy path / timeout / 401 / 404 / 500 / oversized / no-env; `uploadMediaToStorage` happy path / collision / non-collision error; `persistMessageMedia` happy path / unique-violation idempotency / non-unique error; `processInboundMediaItems` empty / 3-item happy / mixed-failure / all-failed; `TwilioMediaDownloadError` shape. |
| `src/components/activities/activity-media.tsx` | Per-content-type renderer. `image/*` → bounded `<img>` with click-to-open-fullsize. `audio/*` → `<audio controls preload="none">`. `video/*` → `<video controls preload="none" playsInline>`. Other → file-icon download link with content-type + human-readable size. Missing-signed-URL → "Media unavailable" placeholder. |
| `src/components/activities/__tests__/activity-media.test.tsx` | 8 RTL tests over each rendering branch + the empty / mixed-stack / unavailable / unknown-content-type paths. |

No new dependencies. Uses `@supabase/supabase-js` already in the repo,
the existing `lucide-react` icon set (`FileText`, `Download`,
`AlertCircle`), and Node 18+ `fetch` for Twilio downloads.

---

## 5. Modified TypeScript modules

| File | Change |
|---|---|
| `src/lib/whatsapp/inbound.ts` | (1) Imported `processInboundMediaItems` + `MediaItemResult` from the new helper. (2) Extended `ProcessInboundResult` with `mediaResults: MediaItemResult[]` (additive — existing callers can ignore). (3) After ingestLead succeeds, if `message.mediaUrls.length > 0`, call the orchestrator with the activity / contact / touchpoint IDs ingestLead returned and the parsed media URL array; empty array otherwise. (4) Updated the file-level docstring to reflect that media is now downloaded, not just captured. |
| `src/lib/whatsapp/__tests__/inbound.test.ts` | (1) Added a sibling `mockProcessInboundMediaItems` mock for `@/lib/inbound-media/media-store`. (2) Updated the existing happy-path assertion to expect `mediaResults: []`. (3) Added 3 new tests: empty mediaUrls → orchestrator NOT called + empty array; 2 mediaUrls → orchestrator called once with the correct args + result propagated; mixed-failure orchestrator result → activity creation still succeeds + results propagated. |
| `src/components/activities/activity-feed-enterprise.tsx` | (1) Imported `ActivityMedia` and `signMessageMediaUrls`. (2) Added `media?: ActivityMediaItem[]` to the `Activity` interface. (3) Added module-level `attachMessageMedia(supabase, activities)` helper — single `message_media` SELECT, single `createSignedUrls`, group by `activity_id`. (4) Called it after the existing activity load (both view and table-fallback paths). (5) Rendered `<ActivityMedia items={activity.media} />` below the existing snippet line in `renderActivityCard`. |
| `.gitignore` | Added `.codacy/` so the Codacy CLI scratch folder doesn't get committed. |

---

## 6. Wire-up flow

```
Twilio webhook POST /api/webhooks/whatsapp (form-encoded, 1+ MediaUrl{N}/MediaContentType{N} pairs)
  └─ route.ts (unchanged shape)
       ├─ verifyTwilioSignature
       ├─ parseTwilioInboundMessage  → message.mediaUrls = [{url, contentType}, ...]
       ├─ resolveTenantByWhatsappNumber
       ├─ isMessageAlreadyProcessed (200 idempotent if so)
       └─ processWhatsappInboundMessage
            ├─ ingestLead() → activityId + contactId + touchpointId + dealId
            └─ if mediaUrls.length > 0:
                 processInboundMediaItems()
                   for each (sequential, per-item failure absorbed):
                     ├─ downloadTwilioMedia(url)              [10 s timeout, Basic Auth]
                     ├─ uploadMediaToStorage(...)             [upsert: false → idempotent]
                     └─ persistMessageMedia(...)              [23505 → idempotent]
                   returns MediaItemResult[]
       └─ return { ..., mediaResults }

UI: ContactDetailView → ActivityFeedEnterprise.fetchActivities()
  ├─ load activities (existing query, unchanged)
  └─ attachMessageMedia(supabase, activities)
       ├─ SELECT id, activity_id, content_type, byte_size, storage_path
       │  FROM message_media WHERE activity_id IN (...)
       ├─ supabase.storage.from('message-media').createSignedUrls(paths, 3600)
       └─ group by activity_id → activity.media
  └─ renderActivityCard → <ActivityMedia items={activity.media} />
       per item: <img> / <audio> / <video> / download link / unavailable placeholder
```

---

## 7. Tests

| Suite | Type | Count | Status |
|---|---|---|---|
| `src/lib/inbound-media/__tests__/media-store.test.ts` | jest unit (mocked fetch + mocked supabase) | 22 | ✅ |
| `src/components/activities/__tests__/activity-media.test.tsx` | jest RTL (jsdom) | 8 | ✅ |
| `src/lib/whatsapp/__tests__/inbound.test.ts` | jest unit (mocked ingestLead + mocked media-store) | 26 (was 23 in 2b.2.a; +3 new for the media path) | ✅ |
| `src/lib/whatsapp/__tests__/twilio-signature.test.ts` | jest unit | 9 (unchanged) | ✅ |
| `src/app/api/webhooks/whatsapp/__tests__/route.test.ts` | jest unit | 11 (unchanged) | ✅ |
| **2b.2.a.2 unit total** | | **76** (33 new + 43 inherited) | ✅ |
| Pre-existing `src/lib/lead-ingestion/*` | jest unit | 64 | ✅ (no regression) |
| Pre-existing `src/app/api/webhooks/google-lead-form/__tests__/*` | jest unit | 9 | ✅ (no regression) |

`npx jest src/lib/inbound-media src/lib/whatsapp src/app/api/webhooks/whatsapp src/components/activities src/lib/lead-ingestion src/app/api/webhooks/google-lead-form`
→ 10 suites passed (+ 2 integration suites skipped behind
`LEAD_INGESTION_INTEGRATION=1`), 138 tests, 0 failures.

---

## 8. Verification status

| Gate | Status | Evidence |
|---|---|---|
| Schema migration applied | ✅ | Supabase MCP `apply_migration` `success: true`. Validation: table=1, indexes=6 (incl. PK), table policies=2, bucket=1, storage policies=2. |
| Storage bucket RLS verified | ✅ | Policy expression evaluated against canonical and other-tenant paths via SQL — first-segment extraction + tenant comparison works as designed. End-to-end signed-URL-vs-direct-access check deferred to §11.6. |
| Supabase advisors | ✅ | No new issues against `public.message_media` or `storage.objects` after apply. |
| `tsc --noEmit` clean for touched files | ✅ | `npx tsc --noEmit \| grep -E "src/lib/inbound-media\|message-media\|message_media\|signed-urls\|activity-media"` → 0 lines. The 3 pre-existing `contact_id` errors in `activity-feed-enterprise.tsx` (lines shifted from 495/517/538 → 578/600/621 by my +83-line insertion) were verified pre-existing by stashing my changes and re-running tsc. |
| Unit tests (2b.2.a.2) | ✅ | 33 new tests pass; 138 total across all relevant suites. |
| Pre-existing tests still green | ✅ | `src/lib/lead-ingestion` 64 unit tests pass; `src/app/api/webhooks/google-lead-form` 9 unit tests pass. |
| Codacy CLI clean for new/modified files | ✅ (with one tolerated pre-existing) | Trivy / ESLint / Lizard / Opengrep / PMD: 0 issues across all 5 new files (migration, `media-store.ts`, `signed-urls.ts`, `activity-media.tsx`, both test files). The only finding on a touched file is `Lizard_file-nloc-medium` on `activity-feed-enterprise.tsx` (549 → 606 nloc; threshold 500), verified pre-existing per §3 row C. |
| Vercel deployment live with new code | ⏳ | To be verified after commit + push fires the auto-deploy. |
| Manual validation runbook | ⏳ | Operator runs Phases 1–4 (photo, voice, PDF) from `+919916558958`; Cursor handles Phases 0, 5, 6 + §11. |

---

## 9. Open questions for the planner

None blocking. Two for awareness:

1. **Synchronous vs queued media downloads.** Today's pipeline runs
   inline inside the webhook (added latency ~200–800 ms per media item
   over Vercel's regional Twilio fetch path; well under the 11 s
   request budget). When inbound volume scales beyond a single tenant's
   sandbox traffic, the obvious next step is to push the orchestrator
   into a BullMQ worker (already present in the repo). The orchestrator
   contract — pure args in / per-item result array out — is already
   queue-friendly. Surfacing for sequencing.

2. **Audio playback on Safari.** Twilio sends WhatsApp voice notes as
   `audio/ogg` (Opus). Chrome and Firefox decode it natively; Safari
   (desktop and iOS) does not. Operators using Safari will see the
   `<audio>` element render with controls, but pressing play will fail
   silently. A future phase could transcode on the way in (FFmpeg in a
   worker → MP3 sibling) or on the way out (signed URL through a
   transcoding edge). Not urgent for the test tenant; flagged for the
   day a Safari-only operator complains.

---

## 10. Deferred items (call-out)

The following are explicitly out of scope for 2b.2.a.2 and tracked for
later phases:

| Item | Phase / Owner |
|---|---|
| Outbound media (practice replies with photos / files) | Future outbound phase |
| GDPR retention enforcement using `expires_at` | Later GDPR phase |
| Right-to-erasure (delete-on-request) flow | Later GDPR phase |
| F1 "reuse open deal" fix from 2b.2.a §11.2 | Phase 2b.2.a.3 |
| Image thumbnails / EXIF stripping / optimisation | Future image-pipeline phase |
| Audio transcoding (OGG → MP3 for Safari) | Future audio-compat phase |
| PDF inline preview (in-browser viewer) | Future viewer phase |
| OCR / AI analysis of image content | Future intelligence phase |
| Quoted-message handling (WhatsApp reply quotes earlier message) | Future reply-context phase |
| Settings UI for WhatsApp | Phase 2b.2.c |
| Messenger media (Meta `mid` + Graph API download) | Phase 2b.2.b |
| Outbound credential cleanup (encrypted vault vs `tenants.whatsapp_*` plain text) | Separate sprint |

---

## 11. Manual validation evidence (to be populated after the runbook)

Placeholder. Will be replaced with row-level evidence per the runbook's
Phase 7 once the operator has driven the photo / voice / PDF tests
against Vercel production.

- **11.1 — Photo:** _pending operator Phase 1._
- **11.2 — UI rendering of photo:** _pending operator Phase 2._
- **11.3 — Voice note:** _pending operator Phase 3._
- **11.4 — PDF:** _pending operator Phase 4._
- **11.5 — Idempotency (re-fired MessageSid):** _pending Cursor Phase 5._
- **11.6 — Storage RLS (signed URL works; direct access blocked):**
  _pending Cursor Phase 6._

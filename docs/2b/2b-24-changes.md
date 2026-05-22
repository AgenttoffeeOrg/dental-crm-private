# Phase 2b.24 — AI-aware inbound deal attachment

Builds on 2b.2.a.3 (reuse-before-create) and 2b.16 (pipeline router)
to make ingestLead split inbound messages into separate deals when
the AI is confident the patient is asking about a different
treatment pipeline than any open deal they have.

## Product rules locked 2026-05-22

Discussion-driven decisions:

- **Trigger:** inbound text / WhatsApp from a contact who already has
  one or more open deals.
- **Granularity:** pipeline-level. A message that classifies into a
  pipeline the contact has no open deal in → new deal there. A
  message that classifies into the same pipeline as an open deal →
  attach to that deal (most-recent if multiple share the pipeline).
- **Uncertainty default:** conservative. If the classifier can't
  commit (vague message, no signal, AI below confidence threshold),
  fall back to the legacy most-recently-active reuse — but stamp the
  activity with `ai_attachment_uncertain` so the operator sees a
  marker AND gets a notification.
- **Operator override:** existing `<ChangeDealAffordance>` reassign
  control unchanged. Reassigning clears the marker automatically
  (the operator just made the decision).
- **No retroactive splits.** Forward-looking only.
- **No effect on offering-driven leads.** Forms with explicit
  `treatment_offering_id` already drive the pipeline; the new
  judgement only runs when there's free-text intent to classify.

## Sub-phases

| Phase | Commit | What |
|---|---|---|
| 2b.24.1 | `d5a0ed6` | `judgeInboundDealAttachment()` — pure judgement function. Three outcomes: reuse_matching_pipeline / new_pipeline / uncertain. Wraps `routePipeline` (same keyword + AI + confidence pipeline used everywhere). 11 unit tests. |
| 2b.24.2 | `32a56f9` | Wired into `createDealForLead`. New `decideDealAttachment` helper. `DealCreationOutcome` extended with `attachmentUncertain: boolean`. `ingestLead` plumbs it through to `insertActivity`, which stamps `activities.metadata.ai_attachment_uncertain = true` when set. All 52 existing lead-ingestion tests still pass. |
| 2b.24.3 | `6df75e2` | Activity feed renders a small amber "AI unsure" badge when `metadata.ai_attachment_uncertain === true`. `PATCH /api/activities/[id]` strips the flag from metadata when the operator reassigns the activity. 2 new route tests. |
| 2b.24.4 | `fdbe71e` | New `lead.attachment_uncertain` event in the notification catalog. ingestLead emits it (best-effort) alongside `lead.arrived` when the attachment was uncertain. `in_app` channel only, normal priority, threaded by event_key. |
| 2b.24.5 | (this commit) | Sweep + changelog + tenant_routing_settings seed for the test tenant (the AI judgement is a no-op without routing config; seeded with sensible defaults so the e2e test works out of the box). |

## Behaviour matrix

| Inbound has intent text? | Contact has open deals? | Classifier verdict | Outcome |
|---|---|---|---|
| No | — | — | Legacy reuse-most-recent (unchanged) |
| Yes | No | — | New deal (existing flow, intent-text routes pipeline) |
| Yes | Yes | matches an open deal's pipeline | Attach to that deal (most-recent if multiple) |
| Yes | Yes | matches a pipeline with NO open deal | New deal in that pipeline |
| Yes | Yes | unsorted / null / threshold miss | Legacy reuse + `ai_attachment_uncertain` |
| Yes | Yes | router threw | Legacy reuse + `ai_attachment_uncertain` |

## Tenant configuration needed

`tenant_routing_settings` row with:

- `routing_enabled = true`
- `ai_routing_enabled = true` (and `ANTHROPIC_API_KEY` set in env)
- `ai_confidence_threshold` — defaults to 60; tune per tenant
- `unsorted_pipeline_id` — the "I don't know" bucket
- optional `keyword_pipeline_rules` — hand-tuned `[{ keywords, pipeline_id, priority }]`

Without routing settings, `routePipeline` returns null and the
judgement always falls back to legacy reuse (i.e. the new feature is
a silent no-op). Seeded for the test tenant in 2b.24.5; new tenants
will get this set up at onboarding (separate phase).

## Failure modes

All best-effort. The chain `ingestLead → createDealForLead →
decideDealAttachment → judgeInboundDealAttachment → routePipeline`
swallows errors at every layer:

- Router throws → judgement returns `uncertain` with
  `reason: 'router_error'` → activity gets the marker, flow
  continues.
- Open-deals lookup fails → judgement skipped, fall back to
  `findReusableOpenDeal`.
- Notification emit fails → logged, ingestion continues.
- Metadata clear-on-reassign fails → swallowed inside the same
  update statement (Supabase update is atomic; if it succeeds the
  deal_id moves AND the flag clears).

No new database migrations. The flag lives in the existing
`activities.metadata` jsonb column.

## Deferred / out of scope

- Offering-driven inbound (forms with `treatment_offering_id`) still
  follows the old "reuse any open deal" rule — i.e. a form
  submission for "Invisalign" from a contact with an open Implants
  deal will still reuse the Implants deal. Product call: forms are
  rare enough vs SMS/WhatsApp that this can wait. When we tackle it,
  the same `decideDealAttachment` logic can short-circuit on the
  offering's `pipeline_id` instead of running the AI.
- Notification dismissal (without reassign). The marker disappears
  on reassign; if the operator just clicks "dismiss" on the
  notification without reassigning, the marker stays on the
  activity. Acceptable — the in-app marker is the durable record.
- Multi-tenant test coverage for the e2e flow. Unit tests cover the
  branches; live SMS test verifies the happy path on the test
  tenant.

## Code-review findings (MEDIUM / LOW) — deferred per CLAUDE.md

From the cumulative code-review run after 2b.24.4 (0 CRITICAL, 0
HIGH). All logged here rather than fixed inline.

**MEDIUM**

- `deal-creation.ts` `new_pipeline` branch invokes `routePipeline`
  twice: once in `judgeInboundDealAttachment`, once again inside
  `resolveDealContext`/`buildRoutedPartial`. Extra Claude call +
  cost on splits. Future patch: cache the `RouteResult` on the
  decision struct and pass it into a slimmed `resolveDealContext`
  variant.
- `ingest-lead.ts:337` — `event_id` for `lead.attachment_uncertain`
  uses `lead.attachment_uncertain:${activityId}` rather than
  `input.event_id ?? ...`. Inconsistent with `lead.arrived`'s
  fallback; outer idempotency normally protects, but a 1-line
  follow-up to mirror the pattern is worth it.
- No end-to-end test asserting `lead.attachment_uncertain` actually
  emits when the judgement returns uncertain. Branch coverage is
  there (judge tests + ingest-lead tests), but the cross-cut "set
  flag → emit notification" path needs one integration assertion.
  Worth adding in 2b.24.5-fix.

**LOW**

- API route reassign test mocks `logAuditServer` — pre-existing
  pattern that violates CLAUDE.md's "tests must SELECT the real
  audit_trail row" rule. Inherited; not a 2b.24 regression.
- Defensive `route.source === 'none'` branch in the judge is
  unreachable in production (router returns `null`, not `'none'`).
  Test exercises it via cast. Belt-and-braces; keep.
- `lead.attachment_uncertain` and `lead.arrived` emits don't pass
  `entity_id`; navigation_url's `{{entity_id}}` token resolves to
  empty. Matches existing `lead.arrived` shape (no NEW bug); UI
  tolerates. Fix both together when next touched.
- `pickMostRecentlyActiveFromIds` falls back to `matchingIds[0]`
  when no activities yet exist (rare for a one-pipeline tiebreak).
  Worth a one-line comment about the deterministic-fallback intent.

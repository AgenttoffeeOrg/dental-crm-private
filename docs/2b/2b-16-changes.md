# Phase 2b.16 — Pipeline routing (keyword + AI + unsorted fallback)

> Part 4 of 11 in `docs/2b/automations-master-plan.md`.

## What changed

- **Migration.** `tenant_routing_settings.keyword_pipeline_rules`
  added — JSONB array, default `[]`. Shape:
  `{ keywords: string[], pipeline_id: uuid, stage_id?: uuid, priority?: int }`.
  Applied via Supabase MCP.

- **`lib/automations/pipeline-router.ts`** — three-tier router:
  1. **Keyword rules.** Case-insensitive substring match against
     `keyword_pipeline_rules`. Highest `priority` wins; array order
     resolves ties.
  2. **AI classifier** (Claude haiku-4-5). Active only when
     `ai_routing_enabled = true` AND `ANTHROPIC_API_KEY` is set.
     Shows Claude the tenant's pipelines + Practice Brain services
     and asks for a strict-JSON `{pipeline_id, confidence}`.
     Confidence is gated by `ai_confidence_threshold` (default 60).
     Hallucinated ids (not in the list) are rejected.
  3. **Unsorted fallback** — `tenant_routing_settings.unsorted_pipeline_id`
     when set, otherwise null. Caller continues to its default-pipeline
     path on null.

- **`lib/lead-ingestion/deal-creation.ts`** — `resolveDealContext`
  inserts `buildRoutedPartial` between offering match and the
  `is_default = true` fallback. New `resolutionPath` values:
  `router_keyword`, `router_ai`, `router_unsorted`.

- **`lib/lead-ingestion/ingest-lead.ts`** — passes `intentText` to
  `createDealForLead`. Prefers explicit `treatment_intent_text`, falls
  back to `raw_payload.body` / `raw_payload.message` (so SMS /
  WhatsApp inbound feed the router for free).

- Dispatcher import remains lazy in the engine (locked principle #12)
  — added in 2b.15.

## Tests

Full automation + lead-ingestion suites: 96 passed, 12 skipped. No
new dedicated pipeline-router tests in this commit (deferred to the
2b.23 sweep with the AI classifier integration test).

## Operator gate

**Agent-handleable** (keyword path):

1. Seed a `keyword_pipeline_rules` JSON row on the test tenant's
   `tenant_routing_settings` row, e.g. `[{"keywords":["braces"],"pipeline_id":"<orthodontics-pipeline-id>","priority":10}]`.
2. Call `routePipeline({ tenantId, intentText: "Do you offer braces?" })`
   via a one-off Node script or simulated `ingestLead` payload.
3. Verify the returned `pipelineId` matches the rule and `source = 'keyword'`.

**Phone-side AI path** — deferred until Toffee sets `ANTHROPIC_API_KEY`
on Vercel and an automation with `ai_routing_enabled=true` is active.

## Follow-ups

- Add a dedicated `pipeline-router.test.ts` with mocked Supabase +
  Claude.
- UI for editing keyword rules (planned alongside the Pipelines
  settings tab in 2b.19 / 2b.20).
- Stage-level routing — currently a rule can pin a `stage_id`, but
  the AI classifier doesn't pick stages. Acceptable for v1.

# CRM Core API Surface – Phase 0 Modernization

This document captures the validated behaviour for the `deals`, `tasks`, and `activities` REST endpoints introduced during Phase 0. It complements the automated integration tests in `tests/api/crm-core-apis.test.ts` and serves as the rollback / support reference point.

## Shared Guarantees

- **Authentication**: All routes require a Supabase session token (`Authorization: Bearer <access_token>`). Requests without a token (or with an invalid token) return `401`.
- **Tenant Isolation**: Every query pins `tenant_id = auth.get_user_org_id()`. Objects outside the active tenant are invisible and cannot be mutated.
- **Location Enforcement**:
  - Users with `all_locations = false` are limited to the locations returned by `get_user_accessible_locations`.
  - All new records auto-populate `location_id` from the active location or inherited context (contact/deal). Attempts to explicitly set an inaccessible `location_id` return `403`.
- **Soft Delete Semantics**: `DELETE` does not remove rows; it updates the status (`archived`/`cancelled`) and timestamps the row’s `deleted_at` column.

## `/api/deals`

### `GET /api/deals`

- **Params**: `stage_id`, `pipeline_id`, `contact_id`, `owner_user_id`, `status`, `location_id`, `search`, `limit` (1–100, default 25), `offset` (default 0), `include_archived` (bool).
- **Filters**:
  - Defaults to `status != 'archived'`.
  - Text search applies to `title`.
  - Enforces location scope based on the caller’s permissions.
- **Response**: `{ deals: Deal[], pagination: { total, limit, offset, hasMore } }`.

### `POST /api/deals`

- **Body Schema**:
  ```json
  {
    "title": "string",
    "contact_id": "uuid",
    "pipeline_id": "uuid",
    "stage_id": "uuid",
    "status": "open|won|lost|archived",
    "source": "enum",
    "owner_user_id": "uuid|null",
    "value_estimate_cents": "number|null",
    "location_id": "uuid|null",
    "treatment_tags": ["string"]
  }
  ```
- **Validation**:
  - References (contact, pipeline, stage, owner) must be tenant-scoped.
  - `location_id` is optional; when omitted it falls back to active location or related entities.
- **Returns**: `{ deal }` with `201` on success. Unauthorized location → `403`.

### `PATCH /api/deals/{id}`

- Accepts partial payload via `DealUpdateSchema`. Validates tenant ownership of all provided references.
- Enforces location scope for updates (`403` if the new location is not accessible).
- Optional `script_outcome` object lets callers attach a `sales_script_usage` to the deal win flow:
  ```json
  {
    "status": "won",
    "script_outcome": {
      "usage_id": "uuid",
      "outcome_type": "deal_won",
      "notes": "Closed with premium plan",
      "revenue_cents": 325000
    }
  }
  ```
  When provided, the API inserts a matching record in `conversation_outcomes`.
- Returns `{ deal }` with updated fields.

### `DELETE /api/deals/{id}`

- Sets `status = 'archived'` and populates `deleted_at`.
- Response `{ success: true }`.

## `/api/tasks`

### `GET /api/tasks`

- **Params**: `status`, `priority`, `task_type`, `assignee_user_id`, `contact_id`, `deal_id`, `location_id`, `due_before`, `due_after`, `limit`, `offset`.
- Results scoped by tenant + accessible locations. Inaccessible location rows are omitted.

### `POST /api/tasks`

- **Body Schema**:
  ```json
  {
    "title": "string",
    "description": "string|null",
    "status": "open|in_progress|done|cancelled",
    "priority": "low|normal|high|urgent",
    "task_type": "call|email|meeting|todo|follow_up",
    "due_at": "ISO8601|null",
    "contact_id": "uuid|null",
    "deal_id": "uuid|null",
    "location_id": "uuid|null",
    "assignee_user_id": "uuid|null"
  }
  ```
- `location_id` defaults to active context (deal/contact) and is checked against accessible locations.
- Returns `{ task }` (`201`).

### `PATCH /api/tasks/{id}`

- Partial updates respecting schema defaults; verifies tenant ownership and location scope.
- When toggling `assignee_user_id` the membership must belong to the same tenant.
- Response: `{ task }`.

### `DELETE /api/tasks/{id}`

- Updates `status` to `cancelled` and sets `deleted_at`.
- Response `{ success: true }`.

## `/api/activities`

### `GET /api/activities`

- **Params**: `type`, `direction`, `contact_id`, `deal_id`, `location_id`, `script_version_id`, `conversation_session_id`, `occurred_before`, `occurred_after`, `limit` (default 50), `offset`.
- Returns auth-scoped activity feed with pagination metadata.

### `POST /api/activities`

- **Body Schema** (core fields):
  ```json
  {
    "type": "call|email|whatsapp|sms|note|meeting",
    "direction": "inbound|outbound|null",
    "contact_id": "uuid",
    "deal_id": "uuid|null",
    "location_id": "uuid|null",
    "subject": "string|null",
    "snippet": "string|null",
    "outcome": "enum|null",
    "duration_seconds": "number|null",
    "attendees": ["uuid"],
    "mentions": ["uuid"],
    "metadata": {},
    "raw": {}
  }
  ```
- Auto-infers `location_id` from contact/deal when omitted.
- Validates that `contact_id` is tenant-scoped; `deal_id` is optional but must match tenant if present.
- Returns `{ activity }` (`201`).

### `PATCH /api/activities/{id}`

- Partial updates. Validates tenant ownership, location scope, and reference IDs.
- Supports updating `outcome`, `is_edited`, `metadata`, etc.
- Response `{ activity }`.

### `DELETE /api/activities/{id}`

- Sets `deleted_at` (soft delete). Response `{ success: true }`.

## `/api/scripts`

### `GET /api/scripts/recommendations`

- **Purpose**: surfaces the top playbook variations for a given trigger/persona.
- **Query params**:
  - `trigger` – scenario identifier (`price_objection`, `dental_anxiety`, `timing_conflict`, `trust_and_credibility`, `finance_and_insurance`, `alternative_seeking`, `pain_urgency`, `second_opinion`, `universal`). Defaults to `price_objection`.
  - `contactId` – optional UUID. When supplied, tags and psychological profile snapshots enrich the persona ranking.
  - `dealId` – optional UUID for contextual analytics.
  - `limit` – optional (1–10, default 3).
- **Behaviour**:
  - Ensures the seeded script library exists for the tenant (`sales_scripts` + `sales_script_versions` via the service seeder).
  - Scores recommendations using success rate, persona alignment, and recent usage load.
  - Returns `{ data: ScriptRecommendation[], meta: { trigger, personaTags } }`.
- **Error handling**: invalid params → `400`; missing auth/tenant context → `401/403`.

### `POST /api/scripts/usages`

- **Purpose**: logs when an agent selects “Use Script” from the Next Best Script panel.
- **Body schema**:
  ```json
  {
    "scriptVersionId": "uuid",
    "contactId": "uuid?",
    "dealId": "uuid?",
    "activityId": "uuid?",
    "trigger": "string?",
    "personaSnapshot": {},
    "context": {},
    "helpful": true,
    "feedback": "optional note",
    "metadata": {}
  }
  ```
- **Behaviour**:
  - Validates the script version belongs to the active tenant.
  - Inserts into `sales_script_usages` (RLS enforced) and returns `{ data: { id } }`.
  - Optional `helpful`/`feedback` fields are recorded immediately; otherwise the follow-up API is used.
- **Responses**: `201` (JSON body) on success, `404` if the script version is missing, standard auth errors as above.

### `PATCH /api/scripts/usages/{id}`

- **Purpose**: updates an existing usage with helpful/not-helpful feedback, qualitative notes, or additional context.
- **Body schema**:
  ```json
  {
    "helpful": true,
    "feedback": "string?",
    "personaSnapshot": {},
    "context": {},
    "metadata": {}
  }
  ```
- **Constraints**:
  - Usage must belong to the active tenant (checked via RLS).
  - Empty payloads are rejected with `400`.
- **Returns**: `{ success: true }` on update.

### `POST /api/scripts/outcomes`

- **Purpose**: records downstream events (appointment booked, deal won, etc.) tied to a `sales_script_usage`.
- **Body schema**:
  ```json
  {
    "usageId": "uuid",
    "outcomeType": "appointment_booked",
    "notes": "Booked hygiene visit for next Tuesday",
    "revenueCents": 12500
  }
  ```
- Automatically copies `contact_id`, `deal_id`, and `activity_id` from the usage and refreshes script success metrics.
- Returns `{ data: { id } }` with `201` on success.

## Observability & Rollback Notes

- Every route logs errors to server console (`[API:deals]`, `[API:tasks]`, `[API:activities]`) for quick triage.
- Rollback simply reverts to prior deployment; soft delete ensures no irreversible data removal occurred during failures.
- Integration verification: `pnpm test tests/api/crm-core-apis.test.ts`.

## Open Follow-Ups

1. Extend Postman/Insomnia collections once feature flagging is introduced.
2. Consider documenting the optional idempotency key support for deals/tasks when added.
3. When conversation intelligence is enabled, link `conversation_session_id` and `script_version_id` to analytics dashboards.

### `POST /api/psych-profiles/analyze`

- **Purpose**: run the psychological analyzer for a specific contact and persist the latest profile + history entry.
- **Body schema**:
  ```json
  {
    "contactId": "uuid"
  }
  ```
- Requires authentication; tenant is inferred from the active session.
- Returns `{ data: { profile, snapshot } }` with the structured analysis (scores, persona tags, recommended approach) on success.



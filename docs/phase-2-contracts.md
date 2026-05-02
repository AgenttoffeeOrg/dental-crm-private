# Phase 2 Contracts

Phase 1 created the data model. Phase 2 will build:

1. The booking widget (React component + JS embed loader + landing page route)
2. The central `ingestLead()` function
3. The CareStack potential-patient join worker
4. Refactor of every existing webhook handler to call `ingestLead()`

This document is the contract. Phase 1 deliberately did **not** implement
any of the below. Build everything here against the schema in
`supabase/migrations/20260502210540_phase_1_attribution_foundation.sql` and
the seeded SLA defaults from
`supabase/migrations/20260502211011_phase_1_backfill.sql`.

---

## The three Phase 2 surfaces

### 1. The booking widget

**Two delivery wrappers, one widget:**

- **Wrapper A — JS embed.** Practice pastes a `<script>` tag into their site.
  Loads widget config from
  `app.<crm>.com/api/widget/config?slug=<slug>&secret=<embed_script_secret>`.
  Renders a "Book Online" trigger that opens the widget modal.
- **Wrapper B — CRM-hosted landing page.** `app.<crm>.com/book/<slug>`
  renders the widget as the full page. Same widget code, different chrome.

Both wrappers share the `practice_booking_widgets` config row, the session
creation + redirect flow, and the `ingestLead()` call. The widget is
chatbot-styled (chat-bubble UI, conversational tone) but is **not** an AI
chatbot — it presents three explicit option buttons.

**Widget paths:**

- **Calendar** (if `enable_calendar`):
  1. User clicks "Book on Calendar" (`calendar_button_label`)
  2. Phone input + optional email/full_name (gated by `calendar_capture_*`)
     + consent checkbox using `calendar_consent_text`
  3. POST `/api/widget/sessions` → create `lead_intent_sessions` row with
     `intent_path = 'calendar'`, captured phone, consent fields, full
     attribution snapshot (UTM + click IDs + HTTP context)
  4. Call `ingestLead()` with `source_channel = 'booking_widget_calendar'`
     and `lead_intent_session_id` set
  5. Show interstitial (`calendar_interstitial_message`) for
     `calendar_interstitial_duration_ms`
  6. Redirect to `calendar_redirect_url`
  7. Stamp `redirect_completed_at` on the session

- **Webform** (if `enable_webform`):
  - `webform_kind = 'practice_url'`: create a session with
    `intent_path = 'webform'` (no phone yet, just attribution), then
    redirect to `webform_redirect_url`
    (open-in-new-tab if `webform_open_in_new_tab`)
  - `webform_kind = 'crm_form'`: pass `session_token` as a query param when
    navigating to the CRM form so the form-submit can join back to the
    session

- **WhatsApp** (if `enable_whatsapp`):
  1. Generate tracking code `WA-{first 8 chars of session uuid}`
  2. Create a session with `intent_path = 'whatsapp'` and
     `whatsapp_tracking_code` set
  3. Open `wa.me/<whatsapp_phone_e164>?text=<encoded message + tracking_code>`
     using `whatsapp_prefilled_message_template` as the base
  4. WhatsApp ingestion path joins the inbound message back to the session
     by `whatsapp_tracking_code` on first inbound

**Required new API routes (Phase 2):**
- `GET  /api/widget/config?slug=...&secret=...` — public, returns widget
  config (must verify `embed_script_secret` matches)
- `POST /api/widget/sessions`                  — public, creates a
  `lead_intent_sessions` row, calls `ingestLead()` for the calendar path,
  returns `{ session_id, session_token, redirect_url }`
- `POST /api/widget/sessions/:id/complete`     — public, stamps
  `redirect_completed_at`

### 2. ingestLead()

The central ingestion function every channel handler must call. No more
parallel handlers writing directly to `contacts` / `activities` / etc.

#### Signature

```ts
async function ingestLead(input: IngestLeadInput): Promise<IngestLeadResult>
```

#### IngestLeadInput

```ts
{
  tenant_id: string;                 // required, no DEFAULT_TENANT_ID
  source_channel: SourceChannel;
  source_sub_id?: string;            // form_id, ad_id, page_id, etc.
  lead_intent_session_id?: string;   // if widget-originated

  // Identity claims (≥1 required)
  email?: string;
  phone_e164?: string;
  channel_identifiers?: Array<{
    channel: ChannelIdentifierKind;
    external_id: string;
    external_handle?: string;
    metadata?: Record<string, unknown>;
  }>;

  full_name?: string;
  first_name?: string;
  last_name?: string;

  utm: { source?: string; medium?: string; campaign?: string;
         content?: string; term?: string };
  click_ids: { gclid?: string; fbclid?: string;
               msclkid?: string; ttclid?: string };
  http: { referrer_url?: string; landing_page_url?: string;
          ip_address?: string; user_agent?: string };

  consent: {
    marketing: boolean;
    transactional: boolean;
    text_version: string;
    text: string;
    method: 'widget_checkbox' | 'form_checkbox' | 'whatsapp_double_optin'
          | 'verbal_call' | 'implied_inquiry' | 'imported_consent_record';
    captured_at: string;             // ISO8601
    ip_address?: string;
    user_agent?: string;
    lawful_basis?: 'consent' | 'contract' | 'legal_obligation'
                 | 'vital_interests' | 'public_task' | 'legitimate_interests';
  };

  raw_payload: object;               // full original payload for replay
}
```

#### IngestLeadResult

```ts
{
  contact_id: string;
  is_new_contact: boolean;
  merged_with_existing: boolean;
  review_required: boolean;
  touchpoint_id: string;
  sla_due_at: string | null;         // ISO8601, null when no SLA matched
  activities_created: string[];
}
```

#### Steps in order

1. **Resolve tenant.** Reject (400) if missing or unknown. No
   `DEFAULT_TENANT_ID` fallback — Phase 0 removed that footgun.
2. **Normalise identity.** Lowercase + trim email; phone to E.164 (UK
   default region for now).
3. **Dedup, tiered:**
   - Tier 1 — exact email match → use existing contact
   - Tier 2 — phone match where emails do not conflict → use existing
   - Tier 3 — `channel_identifiers` match (channel + external_id) → use
     existing
   - Tier 4 — phone match where emails conflict → enqueue
     `dedup_review_queue` row, return `review_required = true`
   - Tier 5 — no match → create a new contact
4. **Apply attribution to contacts.** New contact gets both
   `first_touch_*` and `last_touch_*` populated. Existing contact gets
   only `last_touch_*` overwritten (first-touch is immutable once set).
5. **Append `attribution_touchpoints`** row with all UTM, click IDs, HTTP
   context, source_channel, occurred_at, and source_sub_id (e.g. form_id,
   ad_id).
6. **Resolve `lead_intent_sessions` join:**
   - If `lead_intent_session_id` provided → mark session
     `joined_to_contact_id`, `joined_at`, `join_method = 'session_cookie'`
   - Else if `phone_e164` set → look up unjoined session in same tenant
     within 30 days (`expires_at`), order by `created_at DESC`, mark
     joined with `phone_match_exact` (or `phone_match_normalised` if E.164
     normalisation was needed)
   - Else if a WhatsApp tracking code is present in `raw_payload` → look
     up by `whatsapp_tracking_code`, join with method
     `whatsapp_tracking_code`
   - On any successful join: backfill the session's click IDs and UTMs
     onto the contact's `first_touch_*` (only when the contact's value is
     NULL — never overwrite). This is the "attribution recovery" pathway.
7. **Upsert `channel_identifiers`** for every supplied identifier
   (`(tenant_id, channel, external_id)` is the unique key — bump
   `last_seen_at` on conflict).
8. **Write `consent_records`** row (using new
   `consent_text_version`, `lawful_basis`, `consent_locale`).
9. **Resolve SLA.** Cascade:
   `(tenant_id, practice_location_id, source_channel)`
   → `(tenant_id, source_channel, location IS NULL)`
   → `(NULL, source_channel, NULL)` (system default).
   Compute `sla_due_at = now() + first_response_minutes`, respecting
   `business_hours_only` / `business_hours_*` if set.
10. **Notify and start SLA timer.** Phase 2 also builds the
    `notification_dispatch` and `sla_monitor` workers.
11. **Create activity row** (use the post-Phase-0 column names: `type`,
    `occurred_at`, `description`).
12. **Return result.**

### 3. CareStack potential-patient join worker

When CareStack's potential-patient sync returns
`{ phoneNumberStandard, locationId, visitedDate, potentialPatientId }`:

1. Normalise phone to E.164.
2. Look up unjoined `lead_intent_sessions` by `(tenant_id, phone_e164)`
   within 30 days (`expires_at`), ordered by `created_at DESC`.
3. **If a session exists:** call `ingestLead()` with
   `source_channel = 'online_booking_abandoned'`, full session
   attribution, the phone, a `channel_identifier` of
   `carestack_potential_patient_id = potentialPatientId`, and
   `lead_intent_session_id` set so the session gets joined.
4. **If no session exists:** call `ingestLead()` with minimal
   attribution (the CareStack record is the only signal). Mark for
   outbound follow-up either way.

The same worker handles `online_booking_completed` for
`bookingMode = 2` new patients from appointment sync.

---

## What Phase 2 will also need to build

- `dedup_review_queue` table
- `notification_dispatch` worker (in-app, email, SMS, push)
- `sla_monitor` worker (consumes `lead_sla_rules` + `attribution_touchpoints`)
- `conversion_events_out` worker (Meta CAPI, Google Offline Conversions —
  uses the stored `gclid` / `fbclid` etc. on `contacts` to fire enhanced
  conversions)
- The widget React component + JS embed loader
- The `app.<crm>.com/book/<slug>` route
- `/api/widget/config` and `/api/widget/sessions` API routes
- The CareStack potential-patient join worker
- TypeScript types matching `IngestLeadInput` / `IngestLeadResult`
  (`SourceChannel` should be generated from the `source_channel_enum`)

---

## What Phase 1 deliberately did NOT do

- Did not build the widget
- Did not refactor any webhooks
- Did not create `dedup_review_queue`, `conversion_events_out`,
  `sla_monitor`, or the notification dispatcher
- Did not delete any of the parallel ingestion paths
- Did not implement any CareStack / VoiceStack API client
- Did not write a single line of business logic that uses the new schema

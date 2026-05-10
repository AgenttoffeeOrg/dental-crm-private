# Practice onboarding runbook

> **Status:** living document. First written for Phase 2a.4 friends-and-family
> onboarding of practice #1. Update the steps, fill in real screenshots, and
> note rough edges as you walk a real practice through this for the first
> time. Anything that trips up a non-technical practice owner is a bug to
> capture and fix before practice #2.

This runbook is the playbook for onboarding a new dental practice onto
DentalCRM. It covers **everything from the first conversation through to
"first lead in their inbox"** — written so a non-technical operator (you, or
an account manager) can walk a non-technical practice owner through it.

---

## 0. Audience & assumptions

- **You** (the operator running this runbook): comfortable in the CRM admin UI,
  can read SQL output, can paste a script tag into a website CMS.
- **The practice contact**: the practice owner, principal dentist, or office
  manager. Probably not technical. Has admin access to their own website
  (Wix / Squarespace / WordPress / a developer they can email).
- **Their tools**: a website, an email account they actually check, and
  ideally a phone number that takes WhatsApp messages.
- **Time budget**: 45–60 minutes of the practice contact's time, plus another
  60 minutes of yours after the call to verify everything landed.

If the practice doesn't have admin access to their own website, **stop**.
Onboard the web developer first, or wait until they have access. We can't
embed a widget without it.

---

## 1. Pre-flight checklist

Get these from the practice **before** the onboarding call. A short email or
a 5-minute pre-call works.

- [ ] **Practice display name** — what they want patients to see in the
      widget (e.g. "Bright Smile Dental", not "Bright Smile Dental Practice
      Limited").
- [ ] **Website URL** — both the live URL (`https://example.co.uk`) and the
      CMS / platform (Wix / Squarespace / WordPress / Webflow / "my web
      developer handles it").
- [ ] **Primary lead-response person** — name + email of the person who
      should receive every new-lead email. Often the practice manager.
- [ ] **Backup recipients** (optional) — anyone else who needs the email.
      Treatment coordinators, the principal, etc.
- [ ] **Treatments offered** — quickest way to pre-prune the list of 20
      defaults. A 5-bullet list is fine. ("We do general, hygiene,
      Invisalign, implants and whitening. We don't do orthodontics for
      kids.")
- [ ] **Booking pathway** — do they take bookings via:
       - Webform only? (just fields)
       - Calendar booking? (Calendly / SimplyBook / NHS practice diary URL)
       - WhatsApp? (which number?)
- [ ] **Calendar URL** (if applicable) — full URL to the booking calendar.
      `https://calendly.com/practice-name/consultation` or similar.
- [ ] **WhatsApp number** (if applicable) — full international format,
      e.g. `+447700900100`. Confirm it's the number that receives WhatsApp
      Business messages.
- [ ] **Brand colour** (optional) — hex code. If they don't know it, look at
      their website's primary button colour and eyeball it. "Their blue" is
      usually fine.
- [ ] **Logo** (optional) — square PNG, transparent if possible. Skip for
      now; not used by the widget yet.

[SCREENSHOT: shared notion / email template you use to gather the above]

---

## 2. Tenant creation

The practice owner needs an account in the CRM. As of Phase 2a.4 the only path
is the public auth signup flow.

### 2.1 Direct them to sign up

1. Send them the signup URL: `https://<your-crm-host>/signup`.
2. They sign up with **the email of the principal lead-response person**
   (matters — this becomes the default notification recipient until you
   change routing).
3. They complete email verification.
4. On first sign-in, the CRM walks them through tenant creation:
   - Tenant (practice) name
   - Country / timezone (default GB / Europe/London)
   - Industry (default Dental)

[SCREENSHOT: signup form]
[SCREENSHOT: tenant-creation step]

### 2.2 Verify the tenant exists

In the CRM, sign in as the same user, or as super-admin, and check:

```sql
SELECT id, name, created_at
FROM tenants
WHERE name ILIKE '%<practice name>%'
ORDER BY created_at DESC
LIMIT 5;
```

You should see exactly one new row. Note the `tenant_id` — you'll reference it
later if anything needs to be fixed up directly in the database.

### 2.3 Known rough edges to watch for

- **Verification email goes to spam.** Particularly Gmail and Outlook. Tell
  the practice contact up front to check spam if the email doesn't arrive
  within 60 seconds. *(Tracked in `phase-2a-4-changes.md` as
  "transactional email deliverability".)*
- **They sign up with a personal Gmail.** Discourage this: lead emails will
  go to whoever owns that Gmail, which is often the dentist who isn't the
  one responding to leads. Push them to use a shared inbox like
  `frontdesk@practice.co.uk`.
- **Tenant name is hard to change later.** It's possible via the database
  but there is no UI yet. Get them to spell it out before they hit submit.

---

## 3. Default offering provisioning

The first time a tenant is created, `seed_default_treatment_offerings` runs
automatically and seeds 20 treatment offerings (general check-up, hygiene,
Invisalign, implants, etc.) with sensible defaults.

### 3.1 Confirm the seed

In the CRM, navigate to **Settings → Booking widget**. Scroll to the
"Treatments" section. You should see all 20 offerings listed.

[SCREENSHOT: treatments panel in /settings/booking-widget showing 20 rows]

If you see fewer than 20 (or zero), something went wrong with the seed. As a
fallback:

```sql
SELECT * FROM seed_default_treatment_offerings('<tenant-id>'::uuid);
```

Then refresh the page. **Note this in the changes doc** if it ever happens —
that's a regression to investigate.

### 3.2 Don't prune yet

Resist the urge to delete the offerings the practice doesn't do. Pruning lives
in the next step (it's all the same UI). It's faster to do everything in one
pass.

---

## 4. Widget configuration

This is the longest step but it's all a single screen: **Settings → Booking
widget**.

[SCREENSHOT: top of /settings/booking-widget, before changes]

Walk through the form top to bottom with the practice contact on a screenshare:

### 4.1 Practice display name

Set to the friendly name from the pre-flight checklist. Shows up in the
widget greeting. Keep it short.

### 4.2 Greeting

Default: "How can we help you today?"
Personalise: "Welcome to Bright Smile! How can we help you today?"

The greeting is the very first thing a patient sees when they click the
button. A practice-specific opener visibly increases trust.

### 4.3 Success message

Default: "Thanks — we'll be in touch shortly."
Personalise to set expectations: "Thanks — a member of our team will be in
touch within 1 working hour."

If the practice can't realistically respond within an hour, *don't promise it*.
Pick a window they'll actually meet ("today", "the next working day").

### 4.4 Treatments

For each of the 20 default offerings:

- **Active** if they offer it → leave on
- **Not offered** → toggle off

For each active offering, also confirm:

- **Display label** — "Invisalign / Clear Aligners" reads better than
  `clear_aligners`. Default labels are usually fine; tweak only if asked.
- **Pipeline mapping** — which sales pipeline new leads in this treatment
  flow into. For practice #1, leave everything mapped to the default
  pipeline. Multi-pipeline routing is a v2 conversation.

[SCREENSHOT: treatments panel with some offerings toggled off]

### 4.5 Paths enabled

Three checkboxes. Enable based on the pre-flight answers:

- **Webform** — always on. Cheapest path; works for everyone.
- **Calendar** — on if they gave you a calendar URL. Paste it into the
  "Calendar URL" field. Format: `https://calendly.com/practice-name/...`.
- **WhatsApp** — on if they gave you a WhatsApp number.
   - **WhatsApp number**: full international format with leading `+`.
   - **WhatsApp prefill template**: leave the default
     `Hi {{practice_name}}, I'm interested in {{treatment}}.` unless they
     have strong feelings. The `{{...}}` placeholders are auto-substituted.

[SCREENSHOT: paths panel with all three enabled and URLs filled]

### 4.6 Theme

- **Primary colour**: hex code (e.g. `#0d6e9c`). Eyeball-match their
  website's primary button colour if they don't know it.
- **Trigger mode**: leave as `button` (floating bottom-right). The
  always-inline mode is power-user only.
- **Position**: `bottom-right` for left-to-right languages, which is
  everyone we onboard right now.
- **Button label**: "Book a consultation" is the default and it works.
  "Get in touch" is a good alternative if they don't take direct bookings.

### 4.7 Save

Click **Save**. The page should reload with a success toast and the snippet at
the bottom should update.

[SCREENSHOT: save toast]

If save fails:

- Check the dev tools console for `[WidgetSettingsForm]` errors.
- Most common cause: a calendar URL that doesn't pass the `https://…` regex.
  Fix the URL and retry.

---

## 5. Embed code

The save action exposes a copy-paste embed snippet at the bottom of the
settings page:

```html
<script
  src="https://<your-crm-host>/widget.js"
  data-slug="practice-name-XXXX"
  async
  defer
></script>
```

[SCREENSHOT: embed-snippet box with the copy button highlighted]

The practice contact needs this snippet placed **once, in their site's global
template, just before `</body>`** so the floating button appears on every page.

### 5.1 WordPress (most common)

Two routes; pick whichever the practice has:

**Code-injection plugin (preferred):**

1. Plugins → Add new → search for **"Insert Headers and Footers"** (by
   WPBeginner). Install and activate.
2. Settings → Insert Headers and Footers → "Scripts in Footer" box.
3. Paste the snippet. Save.

**Theme editor (fallback):**

1. Appearance → Theme File Editor → `footer.php`.
2. Find the `</body>` tag near the bottom.
3. Paste the snippet on its own line just before it.
4. Update File.

Tell them to take a backup first if the theme is custom. Custom themes get
overwritten by theme updates, which is annoying but recoverable.

### 5.2 Wix

1. Settings → Custom Code (left sidebar inside the editor; search "Custom
   Code" if it's hidden).
2. **+ Add Custom Code**.
3. Paste the snippet.
4. **Add Code to Pages**: All pages.
5. **Place Code in**: Body — end.
6. Apply.

[SCREENSHOT: Wix custom-code dialog]

### 5.3 Squarespace

1. Settings → Advanced → Code Injection.
2. Paste the snippet into the **Footer** box.
3. Save.

### 5.4 Webflow

1. Site Settings → Custom code → Footer code.
2. Paste the snippet.
3. Save changes → Publish.

### 5.5 "Our developer handles it"

Send them an email with:

- The embed snippet (copy the exact text from the settings page).
- The instruction: "Please add this just before `</body>` on every page."
- Your direct contact for any questions.

A typical web developer takes 10–15 minutes for this and bills in the 30-min
minimum. We typically pay for it on practice #1 to keep things smooth — flag
that to the practice owner up front.

### 5.6 Verify the embed is live

After they save, **immediately** test it from your own browser:

```bash
curl -s https://<their-website>/ | grep -c 'widget.js'
# Expect: 1 (or more if they accidentally pasted twice)
```

Or just open their homepage and confirm the floating "Book a consultation"
button shows up bottom-right.

[SCREENSHOT: practice's site with the floating button visible]

If it doesn't show up:

- **CDN / cache**: Cloudflare, WP Super Cache, etc. Tell them to purge the
  cache. Hard-refresh (Cmd+Shift+R / Ctrl+F5) to bypass browser cache.
- **CSP blocking**: open browser devtools → Console. If you see a CSP
  violation pointing at `<crm-host>/widget.js`, the practice's CMS has a
  Content-Security-Policy that's blocking us. Solution: add our origin to
  their `script-src` directive. **This is rare** but document it if you hit
  it; Wix and WordPress default policies are permissive.
- **Wrong placement**: snippet pasted in `<head>` of a single page only,
  rather than in the global footer. Re-walk them through 5.1–5.4.

---

## 6. Notification routing

Goal: confirm the **right person** receives the lead emails (not the dentist
who can't respond during patient hours).

### 6.1 Default behaviour

By default, the tenant's first user (the person who signed up) receives all
`lead.arrived` notifications. If that's already the right person, you're done.

### 6.2 Adding more recipients

> **Phase 2a.4 caveat:** there is no UI for editing
> `practice_notification_routing` yet. This is a deferred item tracked in
> `phase-2a-4-changes.md`. Until the UI ships, edit directly in the
> database with the practice contact on the call so they're not blocked.

To send the same lead notification to multiple users:

```sql
-- 1. Find the tenant + the user(s) you want to add as recipients
SELECT id, email FROM app_users WHERE tenant_id = '<tenant-id>';

-- 2. Inspect the existing routing row
SELECT id, event_code, pipeline_id, primary_user_id, additional_user_ids
FROM practice_notification_routing
WHERE tenant_id = '<tenant-id>' AND event_code = 'lead.arrived';

-- 3. Update — set primary or append to the additional list
UPDATE practice_notification_routing
SET additional_user_ids = ARRAY['<user-id-1>'::uuid, '<user-id-2>'::uuid]
WHERE id = '<routing-row-id>';
```

The notification dispatcher reads this row and sends one email per recipient
(primary + additional) for each `lead.arrived` event.

### 6.3 Per-pipeline overrides

If the practice has a separate "Implants" pipeline that should go to the
implant coordinator, insert a *second* row with a non-NULL `pipeline_id`:

```sql
INSERT INTO practice_notification_routing
  (tenant_id, event_code, pipeline_id, primary_user_id)
VALUES
  ('<tenant-id>', 'lead.arrived', '<implants-pipeline-id>',
   '<implant-coordinator-user-id>');
```

The router falls back to the tenant default (NULL `pipeline_id`) when no
pipeline-specific row exists, so the override is purely additive.

### 6.4 Verify routing actually fires

Submit one test lead from their own site (see §7). Check that:

- The right people received the email.
- `notification_delivery_log` has `status = 'delivered'` for each recipient.

```sql
SELECT recipient_email, channel, status, error_message, created_at
FROM notification_delivery_log
WHERE notification_id IN (
  SELECT id FROM notifications
  WHERE tenant_id = '<tenant-id>'
  ORDER BY created_at DESC
  LIMIT 10
)
ORDER BY created_at DESC;
```

[SCREENSHOT: notification_delivery_log query result with delivered rows]

---

## 7. Test the widget on their site

A real lead, from their real site, with their real eyes on it. This is the
moment that surfaces 80% of the issues that won't show up in any DB query.

### 7.1 Walkthrough script

With the practice contact watching:

1. Open their homepage in a fresh **incognito window** (so no logged-in
   session interferes).
2. Wait 2–3 seconds for the floating button to appear.
3. Click **Book a consultation**.
4. Pick a representative treatment they offer (e.g. "General check-up").
5. Pick a path:
   - **Webform**: name = "Practice Test", email = your own real test inbox,
     phone = `+447700900900`, consent box ticked, submit.
   - **Calendar**: confirm the redirect lands on the calendar URL.
   - **WhatsApp**: confirm the redirect lands in WhatsApp with the
     prefill text including the treatment name.
6. Confirm the success message appears.

### 7.2 Verify in the CRM (you, in another tab)

```sql
SELECT id, full_name, primary_email, primary_phone, treatment_offering_id, created_at
FROM contacts
WHERE tenant_id = '<tenant-id>' AND primary_email = 'your-test@example.com';

SELECT source_channel, source_url, utm_source, utm_medium, landing_page_url
FROM attribution_touchpoints
WHERE contact_id = (SELECT id FROM contacts
                    WHERE tenant_id = '<tenant-id>'
                      AND primary_email = 'your-test@example.com');
```

Within ~30 seconds you should see:

- A new `contacts` row.
- An `attribution_touchpoints` row with `source_channel = 'booking_widget_<path>'`
  and `source_url` pointing at their domain.
- A new email in your inbox.

[SCREENSHOT: contact row in the CRM lead-detail page]
[SCREENSHOT: lead-arrived email in the inbox]

### 7.3 Clean up

```sql
-- After verification, remove the test data so it doesn't pollute their CRM:
DELETE FROM activities
WHERE contact_id = (SELECT id FROM contacts
                    WHERE tenant_id = '<tenant-id>'
                      AND primary_email = 'your-test@example.com');

DELETE FROM attribution_touchpoints
WHERE contact_id = (SELECT id FROM contacts
                    WHERE tenant_id = '<tenant-id>'
                      AND primary_email = 'your-test@example.com');

DELETE FROM notifications
WHERE entity_type = 'contact'
  AND entity_id IN (SELECT id::text FROM contacts
                    WHERE tenant_id = '<tenant-id>'
                      AND primary_email = 'your-test@example.com');

DELETE FROM contacts
WHERE tenant_id = '<tenant-id>' AND primary_email = 'your-test@example.com';
```

If the practice wants to keep the test record as their first "demo lead",
that's fine too — leave it in and tag it.

---

## 8. First-response training

The biggest source of failure for a small practice isn't the technology; it's
the operational habit of "actually responding to leads in under an hour".
Spend 10 minutes with the practice contact walking them through the
lead-handling loop.

### 8.1 The lead-detail page

Navigate to **Contacts → click the test lead**.

[SCREENSHOT: lead-detail page]

Walk through:

- **Header** — name, primary contact channels, source badge, treatment.
- **Activity feed** — every touchpoint, every email sent, every action by
  staff. Lives down the right or below the header (depending on layout).
- **Attribution panel** — where the lead came from. UTM params, landing
  page URL, etc.

### 8.2 Logging a "contacted" activity

Show them the **Log activity** button. Walk through:

1. Click **Log activity**.
2. Pick activity type: `Call attempted` (most common first action).
3. Notes: "Left voicemail, will try again at 3pm."
4. Save.

The activity appears in the feed with timestamp and operator name. *This is
the system of record.* If it isn't logged here, it didn't happen.

### 8.3 The SLA timer (where visible)

The lead-detail header shows "Responded within X minutes" for triaged leads.
Untriaged leads tick up. Tell them: their goal is to get every lead's first
activity logged within their stated SLA window.

[SCREENSHOT: SLA timer on a lead in the "responded within" state]

### 8.4 Marking a lead as won/lost

Show them the pipeline-stage controls in the contact header. Mention that
won/lost stages drive the conversion-rate dashboard (which they'll only
appreciate after a few weeks of data; don't oversell it on day one).

### 8.5 What NOT to do on the first day

- Don't bulk-import their existing patient database. That's a separate
  conversation; the lead pipeline is for **new** enquiries.
- Don't try to set up automation rules. Phase 2a is intentionally
  manual-first; rules ship later.
- Don't delete the test lead until they understand the layout (point at
  it during the walkthrough).

---

## 9. Dedup queue intro

The dedup queue is the safety valve for ambiguous matches — typically a
phone-number conflict where the email doesn't match an existing contact.

### 9.1 Show them the queue

Navigate to **Sidebar → Dedup queue**.

[SCREENSHOT: empty dedup queue with "no items" empty state]

Most of the time it's empty. That's fine.

### 9.2 What lands here

A lead lands in the queue when:

- The phone number matches an existing contact, **but**
- The email is different (or absent), **and**
- We're not confident enough to merge automatically.

Until a queue item is resolved, the lead **does not generate a notification
email**. That's by design: we don't want to spam staff every time someone
re-submits with a different email; we want them to consciously decide.

### 9.3 Resolving an item

Walk through it with a fake item if you can create one safely; otherwise just
walk through the UI.

[SCREENSHOT: resolution modal with candidate + matched cards visible]

Three actions:

- **Merge into existing** — when it's clearly the same person. Patient
  gets unified history.
- **Create as new contact** — when it's clearly a different person who
  happens to share a number (housemate, family member).
- **Dismiss** — spam, test, or accidental submission.

Encourage them to err toward **Create as new contact** when in doubt; merging
is destructive and hard to reverse.

### 9.4 SLA on the queue

The queue should be checked **at least once per day** during the first week.
After that, set a sensible cadence (every morning is fine).

The sidebar shows a count badge when there are pending items, so it's hard to
miss.

---

## 9b. Inbound SMS provisioning (Phase 2b.4)

> **Status:** SQL-only until the practice-onboarding wizard ships. Each new
> practice that wants inbound SMS needs a dedicated Twilio number, the
> webhook configured in the Twilio Console, and the number written into
> `tenants.sms_phone_number`. The whole loop is ~10 minutes.

### 9b.1 Buy / assign a Twilio SMS number

Production model: every practice gets its own SMS number so we can resolve
tenant by `To`.

1. Twilio Console → **Phone Numbers → Manage → Buy a number**.
2. Pick the country (UK for now). Filter by **SMS** capability.
3. Buy the number. Cost is in the per-number-per-month range; bake into
   the practice's plan or bill-through arrangement.
4. Capture the E.164 form (e.g. `+447782218044`).

For the test / friends-and-family practice, every tenant currently shares
`+447782218044` — only the oldest tenant by `created_at` will actually
receive messages (see `docs/operational-gotchas.md`). Keep this in mind
during dev-loop testing; it's not a production pattern.

### 9b.2 Configure the inbound webhook in the Twilio Console

For the number you just bought (or the shared test number):

1. Twilio Console → **Phone Numbers → Manage → Active numbers** → click
   the number.
2. Scroll to **Messaging Configuration**.
3. Under **A message comes in**, set:
   - Type: **Webhook**
   - URL: `https://<your-crm-host>/api/webhooks/sms`
   - HTTP method: **POST**
4. Leave "Primary handler fails" alone.
5. **Save**.

Don't fire a test SMS yet — the route resolves tenants by `To` against
`tenants.sms_phone_number`, which the next step sets.

### 9b.3 Set `tenants.sms_phone_number`

```sql
UPDATE public.tenants
   SET sms_phone_number = '+44…'
 WHERE id = '<tenant-id>'
   AND (sms_phone_number IS NULL OR sms_phone_number != '+44…');
```

Idempotent; safe to re-run.

### 9b.4 Smoke test

From any phone, text a short message to the configured number. Within
~10 seconds the practice should see:

- A new contact (or an updated existing one if the phone matched).
- A deal opened (or reused if one was already open — cross-channel reuse
  from Phase 2b.2.a.3 means a prior WhatsApp inbound from the same phone
  will share the deal).
- An activity row of `type='sms'`, `direction='inbound'`, with the
  message text in `description`.
- A `lead.arrived` notification email.

If the activity row doesn't appear within 30 seconds, check Vercel
function logs for `[sms-inbound]` lines — every request emits a
`correlation_id` UUID so you can trace a single inbound through.

### 9b.5 Reminder: `pipeline_stages.is_won/is_lost` SQL

Until the wizard ships, conversion-rate dashboards depend on at least one
`is_won = true` and one `is_lost = true` stage on each pipeline. See
`docs/2b/2b-2-a-3-changes.md` §11.3 for the exact SQL pattern. Phase 2b.4
doesn't change this; it's just a reminder when onboarding a new practice.

### 9b.6 What's deferred (do NOT promise yet)

- MMS / inbound photo capture — captured in `raw_payload` for a future
  phase but not downloaded or surfaced.
- A two-way SMS conversation thread — not in this phase cluster.
- Auto-replies / business-hours / opt-out flows — deferred to a later
  automations phase.
- Per-tenant SMS settings UI — comes with the wizard.

---

## 9c. Outbound communications channels (Phase 2b.5)

Outbound email / SMS / WhatsApp / voice from the CRM are gated behind
the user's authenticated session as of Phase 2b.5. There is no
per-channel knob you need to flip during onboarding — every active
member of the tenant can use whatever channels the tenant has provider
credentials configured for (`tenants.sms_*`, `tenants.whatsapp_*`,
email-provider env vars). Practical implications:

- **No `tenant_id` query parameter or body field will ever override the
  authenticated tenant.** The auth helper writes the session's tenant
  back into the request and ignores whatever the body claimed.
- **Outbound rate limits per tenant per minute (effective Phase 2b.5):**
  - Email: 60
  - SMS: 30
  - WhatsApp: 30
  - Voice: 10

  These are floor values to prevent runaway loops or accidental bursts
  (e.g. a UI bug that re-fires a send on every render). They can be
  raised per-tenant in a future phase if a customer hits them
  legitimately. Hitting the limit returns `429 rate_limit_exceeded` —
  the composer panels surface this as a toast.
- **WhatsApp outbound from the Twilio sandbox** still only works to
  numbers that have explicitly joined the sandbox (`join my-too`). For
  production WhatsApp outbound, register a WhatsApp Business sender
  with Twilio. This is operational work, not code.
- **Voice (`/api/communications/initiate-call`)** is gated identically
  but voice itself is fully deferred per product roadmap. Don't tell
  customers to use it yet.

---

## 10. Things to watch for in week 1

After go-live, follow up at 24 hours, 72 hours and 1 week. Each check-in is
~5 minutes if everything is healthy.

### 10.1 Common issues

| Symptom                                     | Likely cause                                                                        | First fix                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Lead emails landing in spam                 | Sender domain not verified for the practice                                         | Whitelist `@resend.dev` (test) or move to verified domain  |
| Floating button doesn't appear              | CMS caching plugin                                                                  | Purge cache; hard-refresh; verify `widget.js` in page HTML  |
| Widget loads but throws CSP error           | Practice's CMS has a strict Content-Security-Policy                                 | Add CRM origin to `script-src`                              |
| Widget loads but config is stale            | Aggressive CDN caching `/api/widget/config`                                         | Confirm CDN respects `Cache-Control: no-store`              |
| Lead lands but no email arrives             | `notification_delivery_log` shows `bounced` / `complained`                          | Confirm recipient address; check sender reputation          |
| Mobile layout looks squished                | Practice's site doesn't have `<meta name="viewport">` set                           | Tell their developer; we don't override it                  |
| "Phone number invalid" on submit            | E.164 validation rejecting a UK mobile typed without `+44`                          | Confirm widget shows the country picker (it does)           |
| Lead in queue, practice didn't notice       | Sidebar badge not pulled into their attention                                       | Walk through §9 again; consider an email digest later       |

### 10.2 The 24-hour check

```sql
-- Did any leads come in?
SELECT count(*) FROM contacts
WHERE tenant_id = '<tenant-id>' AND created_at > now() - interval '24 hours';

-- Did notifications all deliver?
SELECT status, count(*)
FROM notification_delivery_log
WHERE created_at > now() - interval '24 hours'
  AND notification_id IN (SELECT id FROM notifications WHERE tenant_id = '<tenant-id>')
GROUP BY status;

-- Anything stuck in the dedup queue?
SELECT count(*) FROM dedup_review_queue
WHERE tenant_id = '<tenant-id>' AND status = 'pending';
```

Ping the practice contact only if any of those numbers look wrong.

### 10.3 The 1-week check

If they have leads but few responses logged, that's a process issue, not a
software one. Encourage them to log at least the first attempt — even a
short "called, no answer". Nudging usage early prevents the system from
becoming "the place leads go to die".

---

## 11. Support escalation

When a practice reports an issue, work it through the funnel below. Don't
escalate at random.

### 11.1 First-line — you

Most reported issues are operational (cache, spam folder, missed
notification setting). Resolve directly via this runbook.

### 11.2 Second-line — Toffee

Anything that smells like a software bug:

- Lead came in but has wrong attribution data
- Widget UI looks broken in a specific browser
- Dedup queue resolved but the lead still doesn't appear

Contact: **Toffee — `<email/Slack handle>`**. Include:

- Tenant ID
- Approximate timestamp (UTC)
- What they did, what happened, what they expected
- A link to the contact / queue item if applicable

### 11.3 Third-line — Shamanth

Infrastructure / data integrity issues:

- Email deliverability problems across multiple practices
- DB migration questions
- Anything involving production data corruption

Contact: **Shamanth — `<email/Slack handle>`**. Don't escalate here unless it's
clearly an "everyone is affected" or "data is at risk" situation.

### 11.4 What to capture every time

Even for self-resolved issues, log them in
`docs/onboarding/practice-onboarding-issues.md` (create the file the first
time you hit one). Format:

```
## YYYY-MM-DD — <practice name>
- Symptom: ...
- Root cause: ...
- Fix: ...
- Add to runbook? ☐ yes ☐ no — `[link to PR]` if yes
```

Three entries in and you'll see patterns. Five entries in, the pattern
becomes a runbook section. That's how this document grows.

---

## Appendix A — Quick links

- Booking widget settings: `/settings/booking-widget`
- Dedup queue: `/dedup-queue`
- Contacts list: `/contacts`
- Pipelines: `/settings/pipelines`
- Resend dashboard: <https://resend.com/emails>

## Appendix B — One-page cheat sheet for the practice contact

Send this after onboarding so they have something pinned above their desk.

> **Bright Smile / DentalCRM cheat sheet**
>
> 1. New leads arrive by email within 1 minute. Subject starts with
>    "New lead:".
> 2. Click "View lead" in the email to open the contact.
> 3. Log every contact attempt (call, email back, text) using **Log activity**.
> 4. Mark won/lost when the deal resolves.
> 5. If the **Dedup queue** badge in the sidebar shows a number, click it
>    and resolve everything in there before lunch.
> 6. Stuck? Email `<your support inbox>`.

[SCREENSHOT: printed/PDF version of the cheat sheet]

---

## Appendix C — Things the runbook can't fix yet

These are tracked in `dental-crm/docs/phase-2a-4-changes.md` and will be
addressed in a dedicated cleanup phase between 2a.4 and 2b:

- Notification-routing UI (currently a SQL-only edit; practice owners can't
  self-serve this).
- Resend sender-domain verification per practice (currently using the shared
  `@resend.dev` test sender).
- A "test mode" toggle on widgets so smoke-test submissions don't pollute
  the real lead pipeline.
- Embed-snippet copy button doesn't include the optional `data-base`
  attribute — only matters if a practice ever loads the loader from a CDN
  separate from the CRM.

If a practice asks for any of the above before this list is closed out,
flag it so we can prioritise.

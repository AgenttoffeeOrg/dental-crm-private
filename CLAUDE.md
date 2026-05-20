# CLAUDE.md — Dental CRM project manifest

> This file is the canonical project context. **Read it in full at the start of every session.** It tells you who Toffee is, how features get built, what's been locked, what to never do, and where to find deeper docs. Without this file, you start blind.

## Project at a glance

UK dental SaaS CRM, pre-launch. Target: 10 paying Limelight Digital practice clients running paid ads. Built solo by **Toffee (Deepak)**, founder and product owner. Toffee is non-technical and uses Claude Code as the engineering team.

The CRM captures prospective patients from every channel (forms, ads, messaging) into one Contact record per real person, with attribution back to the marketing campaign. First customers come via Limelight Digital running paid ads.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind, React
- **Backend:** Next.js API routes, Supabase (Postgres + Auth + RLS)
- **Hosting:** Vercel (auto-deploy via Husky pre-push hook)
- **Messaging:** Twilio (SMS + WhatsApp)
- **Email:** Multi-provider via `lib/integrations/email-provider.ts` (Resend + SendGrid + Console)
- **HTML sanitization:** DOMPurify via `isomorphic-dompurify`

## Key identifiers (memorize these)

- **Branch:** `phase-1-attribution-foundation` (long-running; no `main` deploys exist)
- **Test tenant ID:** `5aadca14-9786-4aef-bc53-e9287cdd0bbf`
- **Production URL:** https://dental-crm-nine.vercel.app
- **Operator account (for testing):** `deepakshegde@gmail.com`
- **SMS test number:** `+447782218044` (real Twilio UK number)
- **WhatsApp test number:** `+14155238886` (shared Twilio sandbox)

---

## How Toffee operates

Toffee is the founder and product owner. He is non-technical. He gives feature directives **from his phone** via Claude Code Remote Control. He **does not want phase-level instructions**; he wants feature-level instructions.

What Toffee gives you: `"Build the automations feature"` or `"Ship appointment reminders"` or similar.

What you do with that: run the **Orchestrator workflow** below — kickoff discussion, phase breakdown, plan approval, then full multi-phase execution, end to end, until the entire feature is shipped. He should only hear from you at meaningful checkpoints.

---

## Orchestrator workflow (feature-level operation)

When Toffee sends a feature request, the main session acts as the orchestrator. Follow these stages in order.

### Stage 1 — Kickoff discussion (interactive)

Push a single message to Toffee acknowledging the feature request, then start asking clarifying questions **one at a time**. Continue until you genuinely understand:

- **What** the feature does (in his words, plain English).
- **Why** it matters — who benefits and how.
- **What success looks like** — concrete observable outcomes.
- **Edge cases** he cares about.
- **Out of scope** — adjacent things he does NOT want bundled.
- **Brand voice** for any customer-facing copy (only if the feature produces messages/emails/UI text).
- **Hard constraints** — anything that must or must not happen.

Rules for the discussion:

- Ask **one question at a time**. He's on his phone; multi-question messages are painful.
- Keep each question short. Plain English, no jargon.
- After every answer, decide whether you have enough to continue or whether the answer raised a new ambiguity. If the latter, ask the follow-up.
- Don't move on until you can write a coherent one-page scope. If after 8-10 exchanges the scope is still fuzzy, summarize what you have, flag the open ambiguities, and ask him to confirm — sometimes "fuzzy" IS the scope.
- Don't ask engineering questions (schema, libraries, file structure). Decide those yourself.

### Stage 2 — Plan breakdown

Once Stage 1 settles, produce a phase breakdown. Each phase: ~1.5 days of focused work. If a phase looks bigger, split it.

For each phase, capture:
- Phase number (continuing the project's `2b.X` sequence — see "Phase numbering").
- One-sentence purpose.
- Effort estimate in days.
- The operator gate type at the end of that phase (agent-handleable or phone-side).

Format the breakdown as a small table or numbered list. Keep it scannable on a phone.

### Stage 3 — Plan approval (push to phone)

Send the breakdown to Toffee. Format:

```
Plan for <feature>:

Phase X.1 — <purpose> (~Y days, gate: <type>)
Phase X.2 — <purpose> (~Y days, gate: <type>)
...

Total: ~N days across M phases.

Reply "approved" to start, or tell me what to change.
```

Wait for his approval. If he asks for changes, revise and re-send. **Do not start executing without explicit approval.**

### Stage 4 — Per-phase execution loop

For each phase in order:

1. **Audit (if the phase requires investigation)** — invoke the `audit-researcher` subagent. Result is a docs-only audit at `docs/audits/<topic>_audit.md`. If the audit surfaces a genuinely surprising finding that changes the plan, escalate to Toffee per "Mid-feature surprises". Otherwise proceed.

2. **Plan the phase** — write a brief internal phase plan (don't send to Toffee). Include: files to touch, decisions you're making, tests to add.

3. **Execute** — write the code. Make all engineering decisions yourself. Don't ping Toffee for technical choices.

4. **Validate** — `npx tsc --noEmit`, `npx jest`, `npm run build`. All clean before push. Fix any failures yourself.

5. **Push and deploy** — commit with message format `<type>(<phase>): <summary>`, then `git push`. Wait at least 90 seconds. Check `dental-crm/.cursor/post-push-deploy.log` for READY status. If the deploy fails, diagnose and fix; don't move on.

6. **Operator gate** — run the gate per "Operator gates" below. Agent-handleable gates: do them yourself. Phone-side gates: push to Toffee.

7. **Documentation** — write `docs/2b/<phase>-changes.md` recording what happened in the phase. Append to `docs/operational-gotchas.md` if a new gotcha emerged.

8. **Invoke the `code-reviewer` subagent** on the phase's changes. If it flags CRITICAL or HIGH issues, fix them and re-run validation. If MEDIUM/LOW, log them in the phase changelog under "Deferred" and continue.

9. Move to the next phase.

### Stage 5 — Final summary (push to phone)

When all phases are done, send a final summary to Toffee. Format:

```
<Feature name> — DONE

Phases shipped: <list>
Files changed: <count>
Tests added: <count>
Operator gates passed: <list>
Deployment: <latest deploy ID>

What to check on your end:
- <any post-launch verification steps he should do>

Open items deferred to future phases:
- <anything that didn't fit but should track for later>

Audit log entries written: <count>
```

Then stop. Wait for his review.

---

## Operator gates — what Toffee does vs what the agent does

Every phase ends with an operator gate. Sort each one into one of two buckets.

### Agent-handleable gates (agent does these inline; no phone ping needed)

These only require activity inside the CRM at https://dental-crm-nine.vercel.app. The agent logs in with the test account credentials (see "Test credentials" below) and performs the test itself, then reports results in the phase changelog. Examples:

- Click a button in the CRM UI and verify the resulting database state.
- Send a test email from the CRM's email composer and verify the activity row was written.
- Reassign an activity's deal via the Change Deal dropdown and verify the `audit_trail` row.
- Navigate to a settings page and verify a field saves correctly.
- Trigger an in-app notification and verify it renders.
- Verify a query returns the expected result count.
- Any UI smoke test that doesn't require an external device.

For these gates, the agent uses browser automation (Playwright is the canonical choice — install at the project level via `npx playwright install` if not already, and write scripts as needed). The agent logs in, performs the test, captures the result, logs to the phase changelog, and continues.

### Phone-side gates (push to Toffee's phone; wait for confirmation)

These require Toffee's actual phone or external device. The agent cannot do these. Examples:

- Send an SMS from Toffee's phone to the Twilio test number and verify inbound handling.
- Send a WhatsApp message from his phone and verify inbound handling.
- Open an email Toffee received on `deepakshegde@gmail.com` and verify rendering.
- Verify a push notification arrived on his actual phone.
- Any test that requires a real human's external device.

For these gates, push a single message to Toffee with:
- The exact action to take ("Send any SMS to +447782218044 from your phone now")
- The query he should run, OR the cue that you'll check automatically after he replies
- Reply expected ("'done' when sent")

Wait for his "done" reply, then check the result yourself via Supabase queries, log to the phase changelog, and continue. **Do not push multiple gates simultaneously**; one at a time, in order.

---

## Mid-feature surprises — when to ping Toffee

While executing the feature, push a notification to Toffee's phone ONLY if one of these is true:

1. **Scope discovery** — the phase reveals work that wasn't in the original plan and would meaningfully extend the timeline. Example: "Phase X.3 was meant to be a 1-day code edit but the audit revealed we need a schema migration first. Adds ~1 day. Proceed?"

2. **Genuinely product-shaped decision** — a choice that affects what a real practice or patient sees, that wasn't covered in the kickoff. Example: "Should the auto-reply respect business hours, or always send 24/7? Recommendation: 24/7. Options: 24/7 / business hours only."

3. **Dangerous operation** — anything destructive (deletions, force pushes, data wipes, RLS policy changes that broaden access). Always confirm before proceeding even if Auto Mode would allow it.

4. **Security concern** — credentials in code, exposed PII, missing auth check. Surface immediately.

5. **Persistent failure** — a phase has failed validation 3+ times despite fix attempts. Don't loop forever; surface for human input.

Do NOT push for:
- Routine code completion or test passes.
- Successful deploys.
- Code review subagent flagging issues you can fix yourself.
- Engineering decisions (schema choices, library versions, file structure, error handling patterns).
- Anything covered by a "locked product principle".

Format pings: one line of context, one line of recommendation, options listed as numbered choices. Keep it < 4 lines total. He's on his phone.

---

## Test credentials

The agent operates the CRM directly for in-CRM operator gates. Credentials are stored in `.claude/test-credentials.json` (gitignored — never commit).

File structure expected:

```json
{
  "test_account": {
    "url": "https://dental-crm-nine.vercel.app",
    "email": "deepakshegde@gmail.com",
    "password": "<filled in by Toffee>"
  },
  "test_tenant_id": "5aadca14-9786-4aef-bc53-e9287cdd0bbf",
  "supabase_service_role_key": "<filled in by Toffee — for fallback when MCP fails>",
  "vercel_token": "<optional — for deploy log fetching>"
}
```

Read this file at the start of any session that needs to operate the CRM. **Never echo the contents into logs, commit messages, or chat history. Treat as secrets.**

If the file doesn't exist, push a message to Toffee asking him to set it up via the first-run checklist; don't proceed with in-CRM gates without it.

---

## Repo navigation

Critical reading on every session:
- `docs/operational-gotchas.md` — known pitfalls. **Read this every session, no exceptions.**

Read these when working on related code:
- `docs/audits/` — system audits (outbound, deal attachment, automation engine, etc.)
- `docs/2b/` — phase change logs (read recent ones for current state)
- `docs/D01_*.md` through `docs/D24_*.md` — per-feature deep-dive reference docs (Tier 3)
- `docs/F00_*.md` through `docs/F06_*.md` — foundation docs

Key library modules:
- `src/lib/communications/dispatcher.ts` — canonical outbound for email/SMS/WhatsApp
- `src/lib/communications/conversation-id.ts` — `computeConversationId` helper
- `src/lib/communications/change-deal-affordance.tsx` — Change Deal UI
- `src/lib/lead-ingestion/ingest-lead.ts` — canonical inbound entry point
- `src/lib/lead-ingestion/deal-creation.ts` — `findReusableOpenDeal` + `createDealForLead`
- `src/lib/deal-resolver.ts` — `resolveMostRecentlyActiveOpenDeal` (single source of truth)
- `src/lib/auto-audit.ts` — `logAudit()` + `logAuditServer()` for `audit_trail` writes
- `src/lib/services/email-service.ts` — system emails (multi-provider)
- `src/lib/integrations/email-provider.ts` — per-tenant email provider routing
- `src/lib/auth-fetch.ts` — `authFetch()` with NavigatorLock timeout fix

---

## Locked product principles (do NOT re-litigate)

1. **All inbound lead channels flow through `ingestLead()`.** No channel-specific deal-creation branching.
2. **Multi-tenant by default.** Per-tenant credentials in `integration_settings`, RLS-enforced isolation.
3. **One conversation per (tenant, contact, channel) for life.** Computed as `uuidv5(NAMESPACE, tenantId:contactId:channel)`. Namespace UUID hardcoded; never rotate.
4. **Voice activities have `conversation_id = null` deliberately.** Calls are discrete events.
5. **Single deal per activity, reassignable via `<ChangeDealAffordance>`.** Not many-to-many. Reassignment via `PATCH /api/activities/[id]` + `audit_trail`.
6. **"Most recently active open deal" is the single rule** for both inbound attachment and outbound auto-pick. `src/lib/deal-resolver.ts`. Open = `is_won = false AND is_lost = false`.
7. **Slide-in Reply inherits source activity's `deal_id`.** Don't change.
8. **Failed sends produce a `failed` activity row** with friendly label in `integration_metadata.error.message` and raw payload in `integration_metadata.error.raw`.
9. **`isDealClosed` is flag-based everywhere** (`stage.is_won || stage.is_lost`). No stage-name substring matching.
10. **Outbound emails carry an RFC 5322 `Message-ID` header** generated at dispatch time. Hostname swaps to real domain post-launch.
11. **AI Insights section is hidden entirely** when no real AI metadata exists. No placeholder fabrication.
12. **Heavy server-side libraries are lazy-required** inside the function that uses them. DOMPurify pattern.
13. **Reassignment does NOT** re-fire `activities_stamp_deal_first_response`, update `deals.first_response_at`, or fire Google Ads conversion events. Historical facts stay historical.

---

## Critical operational gotchas (memorize)

### Husky pre-push deploys to Vercel

After `git push`: Husky sleeps 12s → runs `vercel deploy --prod` async via `nohup` → Vercel build 30-60s.

- **Do NOT curl the production URL for at least 90 seconds after push.**
- Check `dental-crm/.cursor/post-push-deploy.log` for deploy status.

### `audit_trail` RLS requires service-role client

- INSERT on `audit_trail` restricted to `service_role`. User-scoped client cannot insert; silent fails.
- Use `logAuditServer()` from `src/lib/auto-audit.ts` for all audit writes from API routes.
- Audit-first pattern: write audit row FIRST → mutate entity → compensate-delete on mutation failure. If audit insert fails, return 500 with `error: 'audit_log_failed'` and abort.
- **Tests must SELECT the real `audit_trail` row.** Never mock `logAudit*`.

### DOMPurify cold-start crash (lazy-require)

- Heavy server-side libraries crash Vercel cold-start if top-imported. Symptom: HTML 500 instead of JSON.
- Fix: `const lib = require('...')` inside the function. Already applied for `isomorphic-dompurify` in the dispatcher.

### `authFetch` NavigatorLock hang

- `supabaseBrowser.auth.getSession()` can hang on NavigatorLock during token refresh.
- Fix shipped in `src/lib/auth-fetch.ts`: 2.5s timeout race, cookie-only fallback.
- Symptom: button hangs, no network request in DevTools.

### GitHub push protection blocks Twilio SIDs

- Redact in commits and docs: `AC********************************`. Same for API keys, auth tokens, anything secret.

### Supabase MCP pooler circuit breaker

- Falls back to Supabase Management API `database/query` with CLI token.

### Sonner toasts dismiss in 4 seconds

- Not durable evidence. Use DB + UI for operator gates, not toast text.

### `pipeline_stages.is_won` and `is_lost` default to `false`

- Test tenant set correctly. New tenants need manual SQL until onboarding wizard ships.

---

## Test and validation patterns

### Operator gates are real, not mocked

- Routes touching `audit_trail` or critical tables: tests SELECT the real row, never mock the helper.
- Add a rollback case: simulate audit insert failure, assert mutation didn't happen and response is 500.

### Test tenant data is safe to mutate

All data on `5aadca14-9786-4aef-bc53-e9287cdd0bbf` is test data. Safe to seed, mutate, or wipe.

Known multi-deal contacts:
- **Joey Baby** — phone `+447424805475`, 2 deals
- **Richard Rivera** — historically 7 open deals (may have been cleaned up)

### Build validation order

Before every push: `npx tsc --noEmit`, `npx jest`, `npm run build`. All clean. Don't push partial work.

---

## Git workflow

- Branch: `phase-1-attribution-foundation` (long-running; no `main`).
- Commit format: `<type>(<phase>): <summary>` — e.g. `feat(2b.10): ...`, `docs(2b.11): ...`, `fix(2b.11.5b.1): ...`.
- After commits: `git push` → wait 90s → check post-push-deploy.log.
- Reverts: `git revert HEAD && git push` → wait → verify.
- Auto-push baked into every phase. **Never force push. Never rewrite history.**

---

## What NOT to do

- **No silent error handlers.** Errors must surface — to user, response body, changelog, or audit row.
- **Don't mock `logAudit()` / `logAuditServer()` in tests.**
- **Don't call dispatcher functions outside the canonical paths.** New outbound goes through `src/lib/communications/dispatcher.ts`.
- **Don't bypass `ingestLead()` for inbound.** New inbound channels add adapters.
- **Don't touch `conversation_id` after activity insert.**
- **Don't modify the namespace UUID** for `conversation_id`.
- **Don't reproduce real Twilio SIDs in committed code or docs.**
- **Don't ship features without an audit phase first** for anything multi-subsystem.
- **Don't auto-fire Google Ads conversion events on reassignment.**
- **Don't put real customer data in test fixtures.**
- **Don't add new permission codes without checking the existing catalog.**
- **Don't ping Toffee for engineering decisions.** Decide and proceed.
- **Don't echo `.claude/test-credentials.json` contents into logs, commit messages, or chat.**
- **Don't break the kickoff → plan → approval → execute → summary cadence.** It's the trust contract.

---

## Subagent usage

Two custom subagents are defined in `.claude/agents/`:

- **`code-reviewer`** — invoked at phase step 8 (after each phase's code changes). Read-only. Reports violations with severity. You apply the fixes.
- **`audit-researcher`** — invoked explicitly when a phase needs investigation. Read-only. Produces an audit doc at `docs/audits/<topic>_audit.md`.

For other tasks, use Claude Code's built-in subagents:
- **Plan** — research before implementation; produces a written plan.
- **Explore** — fast read-only code search.
- **general-purpose** — tasks that don't fit a specialist.

Don't spawn 5 subagents for parallel exploration unless genuinely parallelizable. Token cost compounds.

---

## When to ask Toffee a question

Ask only when:
- The decision affects what a real practice or patient sees or experiences.
- The trade-off is genuinely product-shaped, not engineering-shaped.
- An audit surfaces a path-choice with material differences (Path A vs B vs C).
- An operator gate is genuinely impossible to run autonomously (his phone, his email, his external device).

Don't ask when:
- The decision is purely technical.
- The answer is in this manifest or `docs/operational-gotchas.md`.
- The answer can be inferred from existing code patterns.
- A locked product principle already covers it.

Format pings: brief context, option set, clear recommendation. Don't bury him in technical detail.

---

## Phase numbering

Current sequence: `2b.X` for "Step 2 — response to leads" work. Examples: `2b.10`, `2b.11`, `2b.11.5b`, `2b.11.5b.1`.

- Increment by integer for major phases.
- Decimal for sub-phases (`2b.11.5` is a sub-phase of `2b.11`).
- Patches: `2b.11.5b.1` is a patch on `2b.11.5b`.

When the orchestrator breaks down a feature, use the next available `2b.X` numbers in sequence. If unsure of the next number, check the highest existing phase number in `docs/2b/` and increment.

Changelog files: `docs/2b/<phase>-changes.md`.
Audit docs: `docs/audits/<topic>_audit.md`.

---

## End of manifest

If anything in this file is unclear, contradicts a deeper doc, or surfaces an ambiguity during execution, push a concrete clarification proposal to Toffee. Don't guess.

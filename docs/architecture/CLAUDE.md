# CLAUDE.md — Dental CRM project manifest

> This file is the canonical project context. **Read it in full at the start of every session.** It tells you who Toffee is, how features get built, how bugs get fixed, what's locked, and where to find deeper docs. Without this file, you start blind.

## Project at a glance

UK dental SaaS CRM, pre-launch. Target: 10 paying Limelight Digital practice clients running paid ads. Built solo by **Toffee (Deepak)**, founder and product owner. Toffee is non-technical and uses Claude Code as the engineering team.

The CRM captures prospective patients from every channel (forms, ads, messaging) into one Contact record per real person, with attribution back to the marketing campaign. First customers come via Limelight Digital running paid ads.

**Important context:** There are no real customers yet. Only Toffee (and possibly one other test user) is using the app. Everything is test data. The full release happens only when the entire product is ready and Toffee says so. Until then, you have wide latitude to ship boldly, fix forward, and try things without fear of breaking production for real users.

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

## Model preference

Use **Claude Opus 4.7** for the main session and any subagent that doesn't specify its own model in frontmatter. Toffee is on a Max plan and explicitly wants Opus 4.7 for its decision quality — this is what makes the autonomous workflow safe. Don't downgrade to Sonnet to save tokens unless a subagent is doing genuinely narrow, repetitive read-only work.

---

## How Toffee operates

Toffee is the founder and product owner. He is non-technical. He gives feature directives **from his phone** via Claude Code Remote Control. He **does not want phase-level instructions or plan approvals**; he wants feature-level instructions.

What Toffee gives you (examples):

- `"Build the automations feature."`
- `"Build appointment reminders."`
- `"Build the patient portal login."`
- `"Add a settings page for per-tenant brand voice."`
- `"There's a bug — the WhatsApp button on the contact page opens the Add Note dialog."`

For features: run the **Feature workflow** below. For bugs: use the **Bug fix workflow** below.

The CRM is your standing job. Build the entire product end-to-end to Toffee's vision over time. He'll keep giving you features and bugs; you handle each one with the right workflow. No new products outside the CRM. No scope expansion he hasn't asked for.

---

## Feature workflow (the only workflow for new features)

When Toffee sends a feature request, the main session acts as the orchestrator. Follow these six stages in order.

### Stage 1 — Discussion (interactive, on his phone)

Push a single message to Toffee acknowledging the feature request, then start asking questions **one at a time**. Go DEEP into his vision. This is the only conversation you'll have with him about this feature — make it count.

Things to surface in the discussion:

- **What** the feature does, in his words.
- **Why** it matters — who benefits and how.
- **What success looks like** — concrete observable outcomes.
- **Edge cases** he cares about.
- **What's NOT in it** — adjacent things he does NOT want bundled.
- **Brand voice and copy** if customer-facing text is involved.
- **Hard constraints** — anything that must or must not happen.

Rules for the discussion:

- **One question at a time.** He's on his phone; multi-question messages are painful.
- **Plain English. No jargon.** Every message must be readable by a non-technical person. Don't say "we'll add a UUIDv5 namespace"; say "we'll give each conversation a permanent ID so the system never gets confused about which thread it is."
- After every answer, decide whether you have enough or whether the answer raised a new ambiguity. If new ambiguity, ask the follow-up.
- Keep going until you can write a coherent one-page understanding of his vision. Don't rush. Don't move on while anything's vague. If you've had 10+ exchanges and scope is still fuzzy, summarize what you've got, name the remaining ambiguities, and ask him to confirm — sometimes "fuzzy" IS the answer.
- **Never ask engineering questions** (schema, libraries, file structure, code patterns). You decide those silently.

When the discussion is settled, Toffee will say something like "yes, build it" or "go ahead." That's the only approval gate. Move to Stage 2.

### Stage 2 — Repo audit (silent, no ping)

Read the relevant parts of the codebase to understand what's already there. No audit doc, no ping to Toffee — this is your internal preparation.

For each part of the feature, figure out:

- **What's already built** that you can reuse.
- **What needs editing** in existing code.
- **What needs updating** (e.g. a function that handles 80% of what's needed but missing a case).
- **What's net-new** that you have to build from scratch.

Read at minimum:
- `docs/operational-gotchas.md` (every session, always).
- The relevant Tier-3 deep-dive doc (`docs/D<N>_*.md`) for the subsystem you're touching.
- Any existing audit doc in `docs/audits/` for the same area.
- Recent phase changelogs in `docs/2b/` that mention the area.

If you find that the discussion missed something — e.g., a constraint in the existing code that conflicts with what Toffee asked for — pause and ping him per the Mid-feature surprises section. Otherwise, proceed silently to Stage 3.

### Stage 3 — Plan (silent, no approval needed)

Break the feature into small phases. Each phase: ~1-2 days of focused work. If a phase looks bigger, split it. The reason for small phases: catching mistakes early. A big single phase that breaks in 12 places is harder to fix than 4 small phases that break in 3 places.

For each phase, decide internally:
- Phase number (continuing the project's `2b.X` sequence — see Phase numbering).
- One-sentence purpose.
- Files you'll touch.
- Tests you'll add.
- The type of operator gate at the end (agent-handleable or phone-side).

**Do not push the plan to Toffee for approval.** The discussion in Stage 1 already settled the vision. You're trusted to execute it.

Save the plan internally (or to a working notes file) for your own reference during execution. Move to Stage 4.

### Stage 4 — Per-phase execution loop

For each phase in order:

1. **Execute** — write the code. Make all engineering decisions yourself. Don't ping Toffee for technical choices.

2. **Validate** — `npx tsc --noEmit`, `npx jest`, `npm run build`. All clean before push. Fix any failures yourself.

3. **Push and deploy** — commit with message format `<type>(<phase>): <summary>`, then `git push`. Wait at least 90 seconds. Check `dental-crm/.cursor/post-push-deploy.log` for READY status. If the deploy fails, diagnose and fix; don't move on.

4. **Operator gate** — run per the Operator gates section below. Agent-handleable gates: do them yourself. Phone-side gates: push to Toffee in real time, wait for his "done" reply, then check the result yourself and continue. **Don't queue phone-side gates to the end.** Verify each phase fully before starting the next, so bugs surface where the cause is fresh.

5. **Documentation** — write `docs/2b/<phase>-changes.md` recording what happened. Append to `docs/operational-gotchas.md` if a new gotcha emerged.

6. **Invoke the `code-reviewer` subagent** on the phase's changes. If it flags CRITICAL or HIGH issues, fix them and re-run validation. If MEDIUM/LOW, log them in the phase changelog under "Deferred" and continue.

7. Move to the next phase.

### Stage 5 — Bug sweep across the whole feature

After all phases are done, do a sweep:

- Re-run the full test suite (`npx jest`).
- Invoke `code-reviewer` against the cumulative diff from the start of the feature.
- Run an agent-handleable end-to-end test of the feature's main user path (log into CRM, use the feature, verify expected outcomes).
- Fix anything that surfaces. Re-validate. Re-push if needed.

### Stage 6 — Final summary (push to phone)

Send Toffee a single message in plain English. Format:

```
<Feature name> — DONE

What I built (plain English):
- <bullet 1>
- <bullet 2>
- ...

How to check it works:
- <thing he can do in 1-2 minutes to see it working>

What I decided along the way (so you know):
- <any meaningful decision you made silently — kept short and non-technical>

What I left for later:
- <anything deferred to a future phase>
```

Then stop. Wait for his review.

---

## Bug fix workflow (separate path)

When Toffee reports a bug, decide for yourself whether it's small or big.

**Small bug** — fix it silently. No discussion, no plan, no notification.

A bug is small if ALL of these are true:
- The fix is localized (a single function, a single component, a small handful of files).
- It doesn't change customer-visible behavior in a way Toffee would notice as a product change.
- It doesn't require a schema migration.
- It doesn't touch any locked product principle.
- It doesn't broaden any RLS policy or change auth behavior.

For small bugs: investigate → fix → test → deploy → log to a `docs/2b/<phase>.X-fix.md` changelog → move on. Bundle into the next feature's final summary or mention in passing.

**Big bug** — run the full Feature workflow above.

A bug is big if ANY of these are true:
- It changes customer-visible behavior in a way Toffee would notice.
- It requires a schema migration.
- It touches a locked product principle.
- It involves auth, RLS, payments, or data the practice would care about.
- You're not sure how to fix it without making product trade-offs.

For big bugs: kickoff discussion, repo audit, plan, build, sweep, summary. Same as a feature.

**When in doubt, decide and proceed.** Default toward "small bug, just fix it" rather than "big bug, ping Toffee." If you're wrong, surface it in the summary at the end. Better to over-decide and over-explain than under-decide and over-ping.

---

## Communication style with Toffee

Every message you send Toffee — kickoff questions, surprise pings, operator gate requests, the final summary — must be in **plain, dumbed-down English**.

Rules:

- **No jargon.** Don't say "RLS policy," "uuidv5 namespace," "Husky pre-push," "Supabase MCP," "service-role client." Say what those things DO in plain English ("the rule that decides who can see which data," "a permanent ID for the conversation," "the thing that auto-deploys when I push code," etc.).
- **No technical specs.** Don't send him code snippets, schema definitions, or file paths unless he specifically asks.
- **Short.** He's on his phone. Long messages are unread messages.
- **One thing at a time.** Don't bundle a question with an update with a heads-up. Separate messages.
- **Lead with the thing he needs to do.** If you need him to send an SMS, the first line is "Send any SMS to +447782218044 from your phone now," not three lines of context first.
- **Reply expected.** Tell him exactly what to reply ("'done' when sent" / "reply 'go' to continue" / "tell me option 1, 2, or 3").

Imagine you're texting a smart product owner who doesn't write code. He has strong instincts about what to build but zero patience for engineering language. That's the bar.

---

## Operator gates — what you do vs what Toffee does

Every phase ends with an operator gate. Sort each one into one of two buckets.

### Agent-handleable gates (you do these inline; no phone ping)

Anything inside the CRM at https://dental-crm-nine.vercel.app. You log in with the test account credentials (see Test credentials below) and perform the test yourself. Examples:

- Click a button in the CRM UI and verify the resulting database state.
- Send a test email from the CRM's email composer and verify the activity row was written.
- Reassign an activity's deal via the Change Deal dropdown and verify the `audit_trail` row.
- Navigate to a settings page and verify a field saves correctly.
- Trigger an in-app notification and verify it renders.
- Verify a query returns the expected result.
- Any UI smoke test that doesn't require an external device.

For these gates, use browser automation (Playwright is the canonical choice — install at project level via `npx playwright install` if not already). Log in, perform the test, capture the result, log to the phase changelog, continue. Don't tell Toffee about these unless something failed.

### Phone-side gates (push to Toffee; wait for "done")

Anything that requires Toffee's actual phone or external device. Examples:

- Send an SMS from his phone to the Twilio test number.
- Send a WhatsApp message from his phone.
- Open an email he received on `deepakshegde@gmail.com` and verify how it looks.
- Verify a push notification arrived on his phone.

For these gates, push a single message in plain English:

> Send any SMS to +447782218044 from your phone now. Reply "done" when sent and I'll check it on my end.

Wait for "done." Then check the result yourself via Supabase queries. Log to the phase changelog. Continue.

**One phone-side gate at a time.** Don't push him two requests at once.

**Real-time, not queued.** Phone-side gates happen at the end of the phase that needs them, not at the very end of the whole feature. Verify each phase fully before starting the next.

---

## Mid-feature surprises — when to pause and ping Toffee

While executing, push a notification to Toffee's phone ONLY if one of these is true:

1. **The discussion missed something material.** The repo audit (Stage 2) or a phase reveals a constraint, ambiguity, or product-shaped question that wasn't covered in Stage 1. Example: "While building this, I found out we'd need to change how the practice settings page works. Want me to keep it the way it is now, or change it?"

2. **Genuinely product-shaped decision.** A choice that affects what a practice or patient sees, that wasn't covered in kickoff. Always come with a recommendation. Example: "Should the auto-reply respect business hours, or always send 24/7? I recommend 24/7. Tell me '24/7' or 'business hours only'."

3. **Dangerous operation.** Anything destructive (deletions, force pushes, data wipes, RLS policy that broadens access). Confirm before proceeding even if you're confident.

4. **Security concern.** Credentials in code, exposed PII, missing auth check. Surface immediately.

5. **Persistent failure.** A phase has failed validation 3+ times despite fix attempts. Don't loop forever; surface for human input.

Do NOT ping for:

- Routine code completion or test passes.
- Successful deploys.
- Code review subagent flagging issues you can fix yourself.
- Engineering decisions (schema choices, library versions, file structure, error handling patterns).
- Anything covered by a locked product principle.
- Bugs you've already classified as small (just fix).

**Default for ambiguous cases:** decide and proceed. Note what you decided in the final summary. Over-deciding and over-explaining is better than over-pinging.

Format pings: one line of context, one line of recommendation, options as numbered choices. Keep it < 4 lines total. Plain English.

---

## Test credentials

You operate the CRM directly for in-CRM operator gates. Credentials are stored in `.claude/test-credentials.json` (gitignored — never commit).

File structure expected:

```json
{
  "test_account": {
    "url": "https://dental-crm-nine.vercel.app",
    "email": "deepakshegde@gmail.com",
    "password": "<filled in by Toffee>"
  },
  "test_tenant_id": "5aadca14-9786-4aef-bc53-e9287cdd0bbf",
  "supabase": {
    "project_url": "...",
    "service_role_key": "..."
  },
  "vercel": {
    "token": "..."
  }
}
```

Read this file at the start of any session that needs to operate the CRM. **Never echo the contents into logs, commit messages, or chat history. Treat as secrets.**

If the file doesn't exist or fields are blank, push a message to Toffee asking him to fill them in; don't proceed with in-CRM gates without them.

---

## Repo navigation

Critical reading every session:
- `docs/operational-gotchas.md` — known pitfalls. **No exceptions.**

Read when working on related code:
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
- **Don't auto-fire Google Ads conversion events on reassignment.**
- **Don't put real customer data in test fixtures.**
- **Don't add new permission codes without checking the existing catalog.**
- **Don't ping Toffee for engineering decisions.** Decide and proceed.
- **Don't ping Toffee for plan approval.** The kickoff discussion is the only approval.
- **Don't queue phone-side operator gates to the end.** Real-time, per phase.
- **Don't send Toffee technical jargon.** Plain English only.
- **Don't echo `.claude/test-credentials.json` contents into logs, commit messages, or chat.**
- **Don't expand scope beyond what Toffee asked for.** Note out-of-scope adjacent things in the summary; don't build them.

---

## Subagent usage

Two custom subagents are defined in `.claude/agents/`:

- **`code-reviewer`** — invoked at phase step 6 (after each phase's code changes) AND during Stage 5 (final bug sweep). Read-only. Reports violations with severity. You apply the fixes.
- **`audit-researcher`** — invoked when a feature needs a docs-only audit document (rare for in-line Stage 2 reading, which doesn't need a subagent; this is for explicit audit phases that need a written deliverable).

For other tasks, use Claude Code's built-in subagents:
- **Plan** — research before implementation; produces a written plan.
- **Explore** — fast read-only code search.
- **general-purpose** — tasks that don't fit a specialist.

Don't spawn 5 subagents for parallel exploration unless genuinely parallelizable. Token cost compounds.

---

## When to ask Toffee a question

Ask only when:
- It's a kickoff discussion question (Stage 1 of the Feature workflow).
- A genuine mid-feature surprise (per Mid-feature surprises section) — scope, product decision, dangerous op, security, persistent failure.
- An operator gate genuinely needs his phone or external device (per Phone-side gates).

Don't ask when:
- The decision is technical (schema, libraries, code structure, error handling).
- The answer is in this manifest or `docs/operational-gotchas.md`.
- The answer can be inferred from existing code.
- A locked product principle already covers it.
- You're unsure whether to ask — default to deciding and surfacing in the summary.

---

## Phase numbering

Current sequence: `2b.X` for "Step 2 — response to leads" work. Examples: `2b.10`, `2b.11`, `2b.11.5b`, `2b.11.5b.1`.

- Increment by integer for major phases of a new feature.
- Decimal for sub-phases (`2b.11.5` is a sub-phase of `2b.11`).
- Patches: `2b.11.5b.1` is a patch on `2b.11.5b`.
- Small bug fixes: use `<phase>.X-fix` (e.g. `2b.12.1-fix` for a small fix to whatever ships as 2b.12).

When breaking down a feature, use the next available `2b.X` numbers in sequence. Check the highest existing phase number in `docs/2b/` and increment.

Changelog files: `docs/2b/<phase>-changes.md`.
Audit docs (when produced as standalone deliverables): `docs/audits/<topic>_audit.md`.

---

## End of manifest

If anything in this file is unclear, contradicts a deeper doc, or surfaces an ambiguity during execution, push a concrete clarification proposal to Toffee in plain English. Don't guess.

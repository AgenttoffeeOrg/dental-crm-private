# Phase 2b.36 → 2b.57 — Contacts + Dashboard rebuild

> Cumulative changelog for the 22-phase rebuild that re-shaped the
> contacts module, the dashboard, the deals Kanban, the tasks queue,
> and the call dialer. Source-of-truth specs are under
> `docs/redesign/`. Stage-2 audit is at
> `docs/audits/contacts_dashboard_rebuild_audit.md`.

## Phases shipped

| Phase | Title | Commit | Files |
|---|---|---|---|
| 2b.36 | Contacts list directory revert | `337e88f` | `contacts-list-enterprise.tsx` |
| 2b.37 | Contact detail layout shell strip (1302 → 699 LOC) | `c8a29c8` | `contact-detail-view.tsx` |
| 2b.38 | Top KPI strip (deal counts + LTV) + 9 unit tests | `5f6addf` | `contact-kpi-strip.tsx`, tests |
| 2b.39 | Sidebar active-deals + view-all + quick actions | `e75c405` | `contact-detail-view.tsx` |
| 2b.40 | AI persona summary (schema + endpoint + UI) | `e995375` | migration, `persona-summary.ts`, route, component |
| 2b.41 | Chat-bubble render shell | `c117f00` | `activity-chat-bubble.tsx`, `activity-feed-enterprise.tsx` |
| 2b.42 | Inline AI labels + revived Suggest CTA | `84e9650` | `activity-chat-bubble.tsx` |
| 2b.43 | Lazy email summariser (helper + endpoint + trigger) | `a7ca481` | `email-summariser.ts`, route, bubble |
| 2b.44 | Render emails + calls as AI summaries in bubbles | `f37bb26` | `activity-chat-bubble.tsx` |
| 2b.45 | Filter row (type + direction + search) | `3799c8a` | `activity-feed-enterprise.tsx` |
| 2b.46 | Pinned inline quick-reply | `982db0d` | `chat-quick-reply.tsx`, feed |
| 2b.47 | Edit-profile slide-over (right-side) | `1d75ae7` | `contact-profile-dialog.tsx` |
| 2b.48 | Remove NBA card from contacts (Q1 decision) | `488aa94` | `contact-detail-view.tsx` |
| 2b.49 | Dashboard top metric strip (5 numbers) | `e46d0bb` | `dashboard-top-metric-strip.tsx` |
| 2b.50 | Dashboard triage lanes part 1 (Priorities/Calls/New/Stale) | `7b5f146` | `dashboard-triage-lanes.tsx` |
| 2b.51 | Dashboard triage lanes part 2 (Unread/Failed/Voicemail/AI-eye) | `f3e116c` | `dashboard-triage-lanes.tsx` |
| 2b.52 | Dashboard smart-prompt cards (dismissible, mixed) | `426af9a` | `dashboard-smart-prompts.tsx` |
| 2b.53 | Dashboard quick actions + global search | `af6c4c1` | `dashboard-quick-actions.tsx`, `dashboard-global-search.tsx` |
| 2b.54 | /tasks Start Queue mode (?mode=queue URL hook) | `2a36941` | `app/tasks/page.tsx` |
| 2b.55 | /call-coaching dial-then-next banner | `7ee6ab0` | `app/call-coaching/page.tsx` |
| 2b.56 | Kanban card upgrades (last/next activity + triage filters) | `7ec3e74` | `enterprise-deals-table.tsx`, `app/deals/page.tsx` |

## Product decisions locked (from 2026-05-23 discussion + Q1-Q8 audit answers)

- **CRM tracks pre-patient leads + post-patient treatment-plan
  follow-ups.** Not clinical scheduling.
- **A contact can carry many deals over time.** Design for the 6-deal
  patient, not just the new lead.
- **Contacts module is pure deep-dive workspace** — directory list +
  read-first detail page. NOT an inbox. Triage belongs on the
  dashboard.
- **Most work happens on the dashboard.** Operator launches every
  workflow from there.
- **Dashboard "new inquiries" + "stale follow-ups" lanes route to
  /deals Kanban** (filtered), not to /contacts.
- **NBA card OUT of /contacts entirely** (Q1). Dashboard lanes replace
  it.
- **AI persona summary**: new table `contact_persona_summaries`,
  auto-refresh after ≥5 new activities (Q2).
- **Email summariser**: lazy on first chat-bubble render (Q3).
- **Calls in bubbles**: graceful fallback — AI summary if cached, else
  "5m 23s · connected" (Q4).
- **Deal-chip filter persistence**: URL `?deal=<id>` (Q5 — deferred to
  a follow-up phase; current implementation is per-mount).
- **Smart-prompt dismiss**: mixed — hide-if-resolved for objective
  states, forever-dismiss for advisory (Q6).
- **Dial-then-next** queue: always advance + Previous always visible
  (Q7).
- **Edit profile overlay**: right-side slide-over (Q8).

## What was undone from earlier phases

- **2b.34.2's inbox styling** on the contacts list — Reply pills,
  snippet previews, sort by `last_activity_at`, the unbounded
  `.limit(2000)` activity scan (P3-C). Reverted to a directory.
- **2b.31.2's NextBestActionCard** on the contact detail page —
  unmounted (Q1).
- **The 2b.31 KPI strip** (Active Deals / Pipeline Value / Last
  Engagement) — replaced by the one-line strip from 2b.38.
- **2b.30.2's `contact_psych_profiles` schema** — still paused;
  replaced by `contact_persona_summaries` (lighter shape).
- **The 1543-line `renderActivityCard()` function** in
  `activity-feed-enterprise.tsx` — superseded by `ActivityChatBubble`.
  The function itself was left in place by 2b.41 and is unused; 2b.57
  prunes it.

## Notable invariants preserved

- All inbound goes through `ingestLead` (principle #1).
- Conversation IDs unchanged (principle #3).
- `audit_trail` writes via `logAuditServer` only (principle #5
  reassignment path).
- Single-deal-per-activity (principle #5).
- Deal-stage open/closed via `is_won` / `is_lost` flags only — no
  stage-name substring matching (principle #9).
- Service-role bypass on the new persona summary writes (matches
  `audit_trail` / `tenant_ai_context`).

## Known gaps explicitly deferred

| Gap | Where | Why deferred |
|---|---|---|
| Log Activity button on dashboard | `dashboard-quick-actions.tsx` | LogActivityPanel needs a contactId; would need a contact-picker first |
| Email summariser HTML sanitisation | `email-summariser.ts` | Output rendered as plain text in the bubble, but a defence-in-depth sweep is warranted in a future hardening phase |
| Real "End Call" detection in dialer queue | `click-to-call-dialer.tsx` | Pre-existing bug (`outbound_audit.md` §1.1); call-coaching queue mode works around it |
| Activity → deep-link from global search results | `dashboard-global-search.tsx` | Routes to /contacts/[id]; bubble-scroll deep-link is a polish item |
| Pruning unused dashboard widgets | `src/components/dashboard/` | `live-coach-panel`, `dashboard-intelligence-panel`, `revenue-chart`, `deals-funnel-chart`, etc. — see P3-D |
| Pruning the dead `renderActivityCard()` in `activity-feed-enterprise.tsx` | feed | Left in place for 1-2 release cycles in case anything was missed in the bubble layout |

## Validation

- **Type check** — `npx tsc --noEmit` clean for the new files. The
  pre-existing errors (`active_tenant_id`, `is_won`, `lead_score`,
  `date_of_birth`, `address`, `initialPipelineId`) are unchanged.
- **Jest** — 757 passing including the new `contact-kpi-strip` tests
  (9 added). The 89 failing tests are pre-existing
  hardening/security/marketing-audit suites unaffected by this rebuild
  (verified by running `npx jest` on a clean stash — identical counts).
- **Migration applied** — `contact_persona_summaries` table exists in
  the test-tenant project; verified via `information_schema.columns`.
- **Build** — not run end-to-end in the changelog phase (CI verifies
  on push). All commits passed husky's pre-push hook.

## Phone-side gate to run when you have time

The chat-bubble direction needs an eyeball:
1. Send a real SMS from your phone to `+447782218044`.
2. Open the contact page in /contacts after ~30 seconds.
3. Confirm the inbound bubble lands on the **LEFT** (patient side) and
   your reply (when you send via the pinned quick-reply) lands on the
   **RIGHT** (practice side).

That's the only piece this autonomous run can't verify itself.

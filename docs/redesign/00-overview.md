# Contacts + Dashboard rebuild — Overview

> Source-of-truth index for the **2b.36+** phase series. Captures the vision
> agreed in the 2026-05-23 product discussion between Toffee and Claude after
> the Phase 2b.34/2b.35 contacts cleanup landed but didn't fully solve the
> module's design problems.

## What this rebuild is for

The CRM is not a clinical / appointments tool. CareStack / Dentale / Exact own
"who's walking in today, who's the dentist seeing at 2pm, who needs a cleaning."
This CRM exists for the **conversations between clinical moments** — the
follow-ups that happen over days or weeks before a person converts.

Two conversion moments matter:

1. **New inquiry → first appointment booked.** A lead inquires (form / call /
   text). Reception follows up — sometimes for weeks — until they book. When
   they book they become a patient (in the practice management software), but
   the CRM still cares because conversion #2 might come later.
2. **Treatment plan proposed → treatment plan accepted.** Whether the person
   walked in as a brand-new lead or has been a patient for years, when the
   dentist proposes a £4k Invisalign / £8k implant, the patient rarely says
   yes on the spot. The treatment coordinator follows up over days/weeks. That
   follow-up is a fresh deal — even though clinically they're already a
   patient.

A single contact can carry **many** deals over time: multiple historical lead
deals (often closed-lost — inquired about implants, ghosted, came back six
months later for Invisalign), and multiple treatment-plan deals (each plan a
distinct deal). The new design has to handle **both a brand-new 1-deal lead
and a 6-deal long-term patient** gracefully.

## The three modules and where the operator lives

| Module | Role in the operator's day |
|---|---|
| **/dashboard** | Where most of the work happens. The morning landing page. Triage lanes, at-a-glance numbers, quick actions. |
| **/deals (Kanban)** | The cross-contact lens. Who's sitting in which stage. Operator goes here from the dashboard's "new inquiries" and "stale follow-ups" lanes. |
| **/contacts** | Pure deep-dive workspace. She opens a contact only when she needs the full history of one specific person — a new starter onboarding, an operator picking up a lead after months, editing a profile. NOT an inbox. |

## What this rebuild explicitly UNDOES from 2b.34 / 2b.35

- **Contacts list inbox styling** (Reply pills, snippet previews, sort-by-most-
  recent-activity, "needs reply" surfacing — all added in 2b.34.2). The list
  reverts to a **directory** because triage belongs on the dashboard, not on
  the contacts list. See [[contacts-list]].
- **Removed sidebar items on contact detail** (the All-Deals list and the
  sidebar Quick Actions block — stripped in 2b.35.1). Both come BACK in the
  new layout, just reshaped. See [[contact-detail]].
- **The right-column header** (KPI strip + NBA card + page-level quick-actions
  row) on contact detail — collapses into a single one-line deal-counts-and-LTV
  strip + an AI persona summary block. The NBA card moves out of /contacts
  entirely; if it lives anywhere it's on the /deals/[id] detail page.
- **Big activity cards** (the current `activity-feed-enterprise` row layout)
  give way to **compact WhatsApp-style chat bubbles** — practice on the right,
  patient on the left, notes always on the right. See [[contact-detail]].

## Documents in this redesign series

| Doc | Surface |
|---|---|
| [[contact-detail]] | `/contacts/[id]` — WhatsApp chat + sidebar deals + edit-profile overlay |
| [[contacts-list]] | `/contacts` — the directory |
| [[dashboard]] | `/dashboard` — morning landing page with triage lanes |
| [[deals-kanban]] | `/deals` (board view) — card upgrades (last-activity + next-activity) |
| [[tasks-queue-mode]] | `/tasks` — Start Queue walkthrough mode |
| [[call-dialer-queue]] | `/call-coaching` — dial-then-next-call queue |
| [[ai-persona-summary]] | New AI feature: synthesised "what kind of person is this" |
| [[email-summariser]] | New AI feature: email → one-paragraph summary for chat bubble preview |

Audit deliverable: `docs/audits/contacts_dashboard_rebuild_audit.md` (Stage-2
per CLAUDE.md, produced by the audit-researcher subagent).

## Locked product decisions (from the 2026-05-23 discussion)

1. **CRM tracks pre-patient leads + post-patient treatment-plan follow-ups.
   Patient management is a separate system.** Don't try to replicate clinical
   scheduling here.
2. **A contact can have many deals over time, lead and treatment-plan mixed,
   open and closed.** Design for the 6-deal patient.
3. **Contacts module is pure deep-dive workspace.** Not an inbox. Not a
   morning landing page.
4. **Most work happens on the dashboard.** That's where the operator's day
   starts and where triage lives.
5. **Dashboard "New Inquiries" and "Stale Follow-ups" lanes both route to
   /deals Kanban** with appropriate filters. Not to /contacts.
6. **Contact detail page is read-first.** Layout: deal-count + LTV strip · AI
   persona summary · filter row · WhatsApp chat timeline · left sidebar with
   active-deals + quick actions.
7. **Chat bubbles: practice on the right, patient on the left, notes on the
   right.** Compact, not big cards. SMS/WhatsApp shown in full; emails + calls
   shown as AI summaries.
8. **NBA card OUT of /contacts.** Moves to /deals/[id] detail page if
   anywhere.
9. **Filter row on contact detail: type tabs (calls/SMS/WhatsApp/emails/notes/
   meetings) + direction tabs (inbound/outbound) + keyword search.**
10. **Click a chat bubble → side slide-out with full detail.** Full email
    content, full call transcript, full AI badges, inline notes. Preserves
    chat scroll position.
11. **Inline quick-reply pinned to the bottom of the chat.** Inherits the
    active deal-chip filter (composer attaches outbound to that deal).
12. **Edit profile button (top right of contact detail) → single overlay**
    with full profile fields + all attribution data.
13. **Sidebar shows active deals only** (compact cards) + a **"View all
    deals"** button that expands closed-won/closed-lost. Sidebar quick
    actions: Call · Send Message · Send WhatsApp.
14. **Dashboard has four triage lanes** (Today's Priorities · Today's Calls ·
    New Inquiries · Stale Follow-ups) **plus four more** that emerged in
    brainstorm (Unread Inbound · Failed Sends · Voicemails & Missed Calls ·
    AI-Needs-Your-Eye).
15. **Dashboard top strip** carries the at-a-glance numbers: total open deals
    · total open deal value · new leads this week · replies needed · avg
    response time (7-day).
16. **Dashboard quick-action buttons:** Create New Contact · Create New Deal ·
    Log Quick Activity · Global Search.
17. **Dashboard smart-prompts** (dismissible cards): Practice Setup Incomplete
    · Integration Warnings · Re-engagement Opportunity · AI Features
    Unconfigured.
18. **Role-aware dashboards and team-performance metrics are OUT of v1.**
    Manager analytics belong on a separate `/reports` page later. The
    dashboard is for the receptionist + treatment coordinator (operators, not
    managers).
19. **Stale-deal definition** for the v1 surface: no activity in 7+ days AND
    no future task set. Configurable later.
20. **AI persona summary refresh:** nightly batch + on-demand recompute when
    the contact is opened and the summary is > 24h old.

## Build approach

- ~25–30 small phases under the `2b.36+` series. Each phase = one validated
  commit. Order roughly: undo cleanup → contact detail rebuild → contacts
  list directory → dashboard → deals Kanban card upgrades → tasks queue mode
  → call dialer queue → AI persona summary + email summariser → NBA card
  migration.
- Per CLAUDE.md: silent execution between phases, agent-handleable operator
  gates run inline, phone-side gates ping Toffee real-time, final summary at
  the end.

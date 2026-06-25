# Start Here — Dental CRM Documentation

New to this codebase? Read these three documents first, in order. They were written by consolidating ~989 scattered docs and verifying the claims against the actual code, migrations, and git history (May 2026).

1. **[CURRENT_STATE_OF_THE_DENTAL_CRM.md](./CURRENT_STATE_OF_THE_DENTAL_CRM.md)** — the system as it actually is: stack, architecture, data model, auth/tenancy, integrations, deployment, the operational gotchas, and the honest "what's broken" section. **Read this first.**

2. **[COMPLETED_VS_PENDING_LEDGER.md](./COMPLETED_VS_PENDING_LEDGER.md)** — what is genuinely working vs. only *claimed* done vs. still pending, feature by feature. Use this whenever a doc says "100% complete" — check it here before trusting it.

3. **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** — the map of every doc, grouped by topic, so you can find what you need without reading everything.

## ⚠️ How to read the rest of the documentation

This repo accumulated ~1,000 docs over eight months of fast development. **Hundreds are named `*_COMPLETE`, `100_PERCENT`, `*_SUCCESS`, `PHASE_N_*`.** These are point-in-time records of what was *claimed* finished — **not** descriptions of what works today, and several are contradicted by later commits. Trust order: **the code → the three docs above → everything else as history.**

## How the docs are organized

The durable references and the historical records are now sorted into topic folders under `docs/`:

| Folder | What's in it |
|---|---|
| `architecture/` | System & module architecture |
| `database-schema/` | Schema, migrations, data flow, field mappings |
| `auth-tenancy-roles/` | Auth, multi-tenancy, RLS, roles & permissions |
| `onboarding-invites/` | Onboarding flow, wizard, invitations |
| `crm-core/` | Contacts, deals, pipeline, tasks, activities |
| `marketing/` | Marketing & the marketing-audit module |
| `ai-automation/` | AI assistant, automation engine, workflows |
| `integrations-comms/` | PMS, Twilio, Stripe, email, Google, webhooks, APIs |
| `deployment-ops/` | Deploy, Railway/Vercel, observability, operations, hardening |
| `testing-qa/` | Test suites and QA notes |
| `product-features/` | Feature lists, user guides, demo |
| `build-history/` | **All the completion / milestone / status records** — kept for history. Treat as point-in-time. |
| `audits/`, `developer/`, `developer-guides/`, `operations/`, `security/`, … | Pre-existing curated docs (left in place) |

Nothing was deleted. The 678 files that used to clutter the repo root were moved here with `git mv` (history preserved). The full old→new mapping and an undo script are in `/_DOC_AUDIT/` at the workspace root.

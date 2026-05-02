# Product Features & Modules

## Product Overview
Dental CRM supports multi-location dental groups by unifying lead intake, patient lifecycle management, financial tracking, and automation into a single Next.js workspace. The application surfaces role-aware dashboards, treatment-centric pipelines, and automated follow-up tooling designed for high-value cosmetic, orthodontic, and emergency care flows.

Primary personas include practice owners and managers monitoring conversion, treatment coordinators progressing deals and scheduling procedures, front-desk teams handling communications, and marketing specialists auditing campaigns.

## Feature Map by Module
| Module | Key Capabilities |
| --- | --- |
| Leads & Deals | Enterprise table/board views, saved filters, drag-and-drop stages, pipeline templates, CSV export, inline editing, tag-driven routing. |
| Contacts / Patients | Rich demographic, clinical, insurance, consent, and preference fields with custom sections and consent tracking. |
| Pipelines | Treatment-specific templates, location-aware routing, SLA monitoring, and auto-assignment rules via treatment tags. |
| Communications | Email via Resend, SMS via Twilio, AI-powered call transcription/summarisation, WhatsApp hooks, command shortcuts for quick actions. |
| Scheduling | Multi-view calendar (day/week/month/agenda) aggregating appointments and related activities with icons per interaction type. |
| Payments | Stripe payment intent creation with automatic method selection. |
| Reporting & Analytics | Dedicated analytics pages and SDKs for KPIs, anomaly detection, audit exports, and drilldowns (see analytics libs). |
| Permissions & Multisite | Feature flags, tenant/location switchers, and membership-driven visibility for multi-practice organisations.

## Dental-Specific Logic
- Treatment tag routing engine ties AI keyword extraction, PMS sync, and manual tagging to pipeline auto-selection, stage placement, and audit logging.
- Contacts capture clinical preferences (anxiety level, treatment concerns), insurance/NHS details, and communication consent toggles aligned with UK compliance.
- Pipelines ship with dental-themed templates (High-Value Treatment, Emergency, Orthodontics, Cosmetic) and track tags like implants, veneers, emergency care.
- Seed data highlights NHS-focused personas and NHS referral pathways, signalling support for mixed NHS/private practices.

## Navigation & UX Overview
- Enterprise dashboard layout delivers persistent sidebar navigation, location/org switchers, notifications drawer, analytics, marketing, automations, and settings clusters.
- Keyboard shortcuts (e.g., `g` + `c` for Contacts, `c` to create contact) support power users and keep command palette discoverable via `?`.
- Universal search, notifications, calendar icons, and multi-org onboarding are top-bar components within the app shell, all nested under suspense boundaries for perceived performance.
- Calendar views and pipelines leverage drag-and-drop sensors to mirror typical dental coordinator workflows.

## Feature Flags & Experiments
- Environment feature flags toggle marketing audit, domain discovery, multi-location, billing, email sending, subdomain routing, and treatment routing pilots.
- Feature flag service supports tenant-specific overrides, rollout percentages, AI/treatment routing toggles, and environment-based defaults with ENV overrides.

## Evidence
- src/components/deals/enterprise-deals-table.tsx:1-314
- supabase/sql/13_comprehensive_contact_fields.sql:4-63
- supabase/sql/45_treatment_routing.sql:25-196
- src/lib/treatment-routing/ai-extractor.ts:1-398
- supabase/sql/27_contacts_deals_data.sql:24-63
- src/components/layout/dashboard-layout.tsx:51-389
- src/hooks/use-keyboard-shortcuts.ts:1-187
- src/components/calendar/calendar-week-view.tsx:1-136
- src/lib/email-service.ts:1-215
- src/lib/sms-service.ts:1-49
- supabase/functions/process-call-activity/index.ts:41-205
- src/app/api/payments/create-intent/route.ts:1-51
- env.example:7-56
- src/lib/feature-flags.ts:1-200









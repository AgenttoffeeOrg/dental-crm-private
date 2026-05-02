# Workflows, Automations & SLOs

## Trigger → Condition → Action Chains
- **Unified Event Bus:** `events-unified` enumerates CRM events (deal lifecycle, tasks, contacts, pipelines, integrations, AI) that automations subscribe to through the automation event listener.
- **Prebuilt Templates:** Deal/task/contact/pipeline workflows pair triggers (deal_won, task_overdue, contact_inactive, stage_sla_breached) with ordered steps such as send_email → wait → create_task, including delay metadata for sequencing.
- **Pipeline Governance:** Pipeline-specific workflows (capacity alerts, bottleneck escalation, stage SLA breach) pause intake, notify managers, and create urgent tasks when specified thresholds hit.
- **AI-Triggered Journeys:** AI proactive monitor emits `DEAL.AGING`, `PIPELINE.STAGE_SLA_BREACHED`, and `AI.SUGGESTION_GENERATED` events that route through the listener to automation journeys for follow-up.
- **Cron-Driven Jobs:** Scheduled marketing audits run hourly via authenticated cron endpoint, batching due schedules, invoking orchestrator runs, sending optional emails, and disabling schedules after repeated failures.

## Queueing, Retries, Rate Limits & Dedupe
- **Automation Governance:** Approval workflow prevents unreviewed publishes; rate-limit guard tracks hourly/daily executions, email/SMS quotas, and pauses automations when limits exceeded; consent checks gate comms; consent audit logs persist outcomes.
- **Retry & Error Handling:** Governance module wraps approvals with notifications and error logging; scheduled audit job tracks error counts, retries up to configured limit, and deactivates failing schedules; automation listener guards missing tenant/contact context.
- **Wait/Delay Modeling:** Workflow templates embed `wait` steps (minutes/hours/days) to model backoff without external queue services.

## SLA / SLO Alignment
- **Deal SLA Monitor:** Hourly cron-compatible monitor scans open deals against tenant-defined inactivity/stage thresholds, emits events, and logs breaches—supporting response-time SLOs for high-value leads.
- **Pipeline Capacity & Velocity:** Workflow templates and events monitor capacity %, velocity drops, and stuck stages to alert managers within defined windows.
- **Task Escalations:** Task workflows enforce 24-hour overdue escalation sequences, sending notifications and escalating to managers if unresolved.
- **Marketing Audit Cadence:** Scheduled audits enforce max concurrent runs, throttle per-hour execution, and email stakeholders upon completion.

## Experiments & Measurement
- No explicit A/B test or holdout framework detected in automations or analytics modules; measurement currently relies on event emissions, audit logs, and scheduled job metrics.

## Evidence
- src/lib/events-unified.ts:20-373
- src/lib/automations/automation-event-listener.ts:27-200
- src/lib/automations/prebuilt-workflows.ts:1-399
- src/lib/automations/pipeline-workflows.ts:9-146
- src/lib/automations/deal-sla-monitor.ts:10-205
- src/lib/automations/automation-governance.ts:21-399
- src/app/api/cron/scheduled-audits/route.ts:16-58
- src/lib/marketing-audit/jobs/scheduled-audit-job.ts:17-194









# Automations Build B — future work

> **Status:** documented but not built. Engine in Build A is architected to support these from day one — adding each one is "add trigger type + UI tile," not a rebuild. Toffee explicitly confirmed deferring these in the kickoff (Stage 1, 2026-05-21).

## Triggers (engine support these already; UI tiles + prebuilts missing)

### Deal-stuck-too-long
- Trigger type: `deal_aging` (already exists in DB CHECK; already in listener map; emit from a scheduled scanner cron).
- Scanner: daily cron — for each deal where `now() - max(activities.occurred_at) > N days` AND deal is open, emit `DEAL.AGING` event.
- N is per-tenant config (default 5 days).
- Prebuilt workflow: "Inactive deal — send nudge OR notify owner" — practice picks via config.

### Deal-won celebration
- Trigger type: `deal_won` (already exists). Already wired in listener map.
- Emitter: needs to fire from the deals UPDATE path when stage changes to a stage with `is_won=true`. Currently no source emits this — wire up in deal-update API route.
- Prebuilt workflow: "Thank you + see-you-on-X confirmation + prep instructions."

### Deal-lost save attempt
- Trigger type: `deal_lost` (already exists). Same emitter wiring needed as deal_won.
- Prebuilt workflow: "Is there anything we could do differently?" — feedback request + re-engagement queue.

### Patient-gone-quiet (re-engagement)
- Trigger type: `contact_inactive` (already exists).
- Scanner: daily cron — for each contact where `now() - last_activity_at > N months`, emit `CONTACT.INACTIVE`.
- N default: 6 months. Per-tenant config.
- Prebuilt workflow: "We miss you" message.

### High-value lead alert (internal)
- Trigger type: `deal_value_threshold` (already exists in DB + listener map).
- Action type: `send_internal_notification` (NEW — does not patient-message; pings a practice user via in-app + email).
- Practice config: threshold value (default £2,000), and which user/role gets pinged.

## Schema additions needed when Build B is picked up

- `internal_notification_action` config schema on workflow steps.
- `automation_scheduled_scans` table or extend `automation_trigger_metadata` with scan_interval to drive the cron scanners.
- Per-tenant config for deal-aging / contact-inactive thresholds (likely in `tenant_routing_settings` or new `tenant_automation_settings`).

## Cron jobs to add in Build B

- `/api/cron/scan-deal-aging` (daily) — emit `DEAL.AGING` events.
- `/api/cron/scan-contact-inactive` (daily) — emit `CONTACT.INACTIVE` events.

## Why deferred (cost / risk)

- Build A is already 10–11 phases of work; adding Build B doubles it.
- Build B triggers depend on internal state (deal stages, time-based scans), not external inbound events — the foundational engine fixes need to ship and be operationally proven first.
- Internal-notification action type opens a new product surface (in-app notifications to practice users) that needs its own UX consideration — better as a focused phase.

## What Build A intentionally locks in to enable Build B

- New trigger types are added to DB CHECK constraint via migration: easy to add more.
- Listener EVENT_TO_TRIGGER_MAP is one file; adding new mappings is a single PR.
- Engine action handlers use a switch; new action types like `send_internal_notification` plug in.
- Prebuilt workflows file accepts new templates without engine changes.

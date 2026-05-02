# Competitor Intelligence Ingestion Runbook

## Overview
Phase 6 introduces structured competitor data capture so leadership always sees pricing and marketing shifts before patients do. This runbook covers data ingestion, queue operations, and troubleshooting.

## Data Model
- `competitors` *(existing)* – master record per competitor/tenant.
- `competitor_price_points` *(existing)* – treatment-level pricing snapshots.
- `competitor_touchpoints` *(existing)* – marketing events (ads, promos, reviews).
- `competitor_documents` *(new)* – links to collateral (brochures, screenshots) stored in Supabase Storage.
- `competitor_ingestion_jobs` *(new)* – audit trail for each ingestion run (manual or automated).

## Ingestion Options
1. **CSV Upload (CLI)**
   ```bash
   tsx scripts/ingest-competitor-intel.ts \
     --file ./competitors.csv \
     --tenant c128efd3-e2e8-4523-922f-22852b93d2d2 \
     --source "Q4 pricing audit" \
     --queue
   ```
   - Columns recognised: `competitor_name`, `website`, `primary_location`, `treatment_name`, `treatment_code`, `price_cents`, `collected_at`, `touchpoint_type`, `touchpoint_summary`, `document_path`, etc.
   - `--queue` pushes to BullMQ when `QUEUE_COMPETITOR_INTEL=true`; otherwise the script runs synchronously.

2. **Webhook / Integrations**
   - Edge function (planned extension) posts payloads directly to the queue.
   - Ensure payload matches `CompetitorIntelRecord` shape (`competitor`, `pricePoints`, `touchpoints`, `documents`).

## Queue & Worker
- Queue name: `competitor:intel`
- Enable with environment variable: `QUEUE_COMPETITOR_INTEL=true`
- Worker command: `npm run workers:competitor-intel`
- Dead-letter queue: `competitor:intel:deadletter` (surfaced in Settings → System → Reliability)

## Monitoring
- Metrics: `queue:competitor_ingest_success`, `queue:competitor_ingest_failure`, `provider:competitor_intel_ingested`
- Job history: view via Supabase table `competitor_ingestion_jobs` or admin UI (future)
- Dashboard: Competitive Insights tab (Phase 6 deliverable) highlights deltas and alerts.

## Storage & Security
- RLS mirrors tenant membership for new tables; service role is required for ingestion jobs.
- Store collateral files under storage bucket `competitor-intel/tenant_id/...` with read access restricted via signed URLs.
- Semgrep rule `security.no-pii-logs` ensures payloads aren’t logged with PHI.

## Troubleshooting
| Symptom | Likely Cause | Resolution |
| --- | --- | --- |
| Job stuck in `pending` | Queue disabled or worker not running | Verify `QUEUE_COMPETITOR_INTEL` and start worker |
| Job fails with duplicate errors | File contains repeated rows already ingested | Deduplicate source rows or enhance CSV before upload |
| No alerts in dashboard | Ingestion succeeded but deltas below threshold | Adjust alert thresholds in Phase 6 dashboard config |
| Redis connection errors | Missing `REDIS_URL` or network issue | Confirm credentials; worker exits if Redis unavailable |

## Next Steps / Extensions
- Add scheduled fetchers per tenant using cron + queue.
- Integrate with Partner APIs for automated data feeds.
- Enrich ingestion summary with win-rate impact calculations.






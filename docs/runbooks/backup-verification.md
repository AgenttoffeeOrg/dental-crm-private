# Automated Backup Verification Runbook

## Objective

Guarantee nightly Supabase/PostgreSQL backups are valid and restorable. The process runs automatically via GitHub Actions or cron on the ops runner.

## Architecture

1. **Snapshot Export** – Trigger Supabase managed backup export to S3 (or use `pg_dump` if self-hosted).
2. **Verification Job** – Restore the backup into a disposable database (`dental_crm_backup_verify`) using Docker.
3. **Health Checks** – Execute smoke tests:
   - `SELECT COUNT(*)` for key tables (`contacts`, `deals`, `sales_scripts`)
   - RLS policy existence validation (`auth.uid()` policies)
   - Migration checksum comparison against `/supabase/migrations`
4. **Report + Alerting** – Publish summary to Slack + PostHog (`metric:provider:failure`, `operation=backup_restore`) on failure.

## Automation Script

```bash
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%Y%m%d)
RESTORE_DB=\"dental_crm_backup_verify_${DATE}\"

echo \"[Backup Verify] Starting restore for ${DATE}\"

supabase db remote commit
supabase db dump -f backup_${DATE}.sql
createdb \"$RESTORE_DB\"
psql \"$RESTORE_DB\" < backup_${DATE}.sql

psql \"$RESTORE_DB\" <<'SQL'
SELECT 'contacts', COUNT(*) FROM contacts;
SELECT 'deals', COUNT(*) FROM deals;
SELECT 'sales_scripts', COUNT(*) FROM sales_scripts;
SQL

echo \"[Backup Verify] Schema checksum\"
pg_dump --schema-only \"$RESTORE_DB\" | sha256sum > /tmp/restore_schema.sha
git ls-files supabase/migrations | xargs cat | sha256sum > /tmp/repo_migrations.sha
diff /tmp/restore_schema.sha /tmp/repo_migrations.sha || {
  echo \"[Backup Verify] Schema drift detected\" >&2
  exit 42
}

dropdb \"$RESTORE_DB\"
rm backup_${DATE}.sql
echo \"[Backup Verify] Completed successfully\"
```

> Replace `supabase db dump` with your managed backup export command if running on Supabase hosting. Ensure credentials are stored in GitHub Actions secrets (`SUPABASE_DB_PASSWORD`, etc.).

## GitHub Actions Scheduler

```yaml
name: backup-verify

on:
  schedule:
    - cron: '0 9 * * *' # 9am UTC daily

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: ./scripts/backup-verify.sh
```

## Escalation

- **Severity 1** – Restore failure or schema checksum mismatch
  - Notify engineering on-call
  - Open incident in PagerDuty
  - Retain failing artifacts (SQL dump, logs)
- **Severity 2** – Record count discrepancies
  - File Jira ticket
  - Investigate partial data ingestion issues

## Manual Verification

1. Run `npm run supabase:dump` to create a local backup.
2. Restore into Docker Postgres:  
   `docker exec -i dentalcrm-db psql -U postgres < backup.sql`
3. Execute `/scripts/db-smoke-test.sql` (to be created with targeted assertions).

## Maintenance

- Rotate access keys quarterly.
- Audit S3 lifecycle policies (retain 30 days of verified backups).
- Update smoke tests when new critical tables are introduced (e.g., `conversation_sessions`, `competitors`).








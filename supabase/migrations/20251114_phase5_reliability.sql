SET search_path TO public, extensions;

-- =====================================================
-- PHASE 5 – RELIABILITY & OPERATIONS
-- Queue alert rules, incident tracking, backup verification
-- =====================================================

begin;

-- 1. Queue Alert Rules
DROP TABLE IF EXISTS queue_alert_rules CASCADE;
CREATE TABLE queue_alert_rules (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid references tenants(id) on delete cascade,
    queue_name text not null,
    label text not null,
    max_waiting_jobs integer,
    max_delayed_jobs integer,
    max_failed_jobs integer,
    max_oldest_job_seconds integer,
    notify_via text[] not null default '{}'::text[],
    enabled boolean not null default true,
    created_by_user_id uuid references app_users(id),
    updated_by_user_id uuid references app_users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_queue_alert_rules_queue on queue_alert_rules(queue_name);
create index if not exists idx_queue_alert_rules_tenant on queue_alert_rules(tenant_id);

-- 2. Queue Health Incidents
DROP TABLE IF EXISTS queue_health_incidents CASCADE;
CREATE TABLE queue_health_incidents (
    id uuid primary key default uuid_generate_v4(),
    rule_id uuid references queue_alert_rules(id) on delete set null,
    tenant_id uuid references tenants(id) on delete cascade,
    queue_name text not null,
    incident_type text not null,
    severity text not null check (severity in ('info', 'warning', 'critical')),
    status text not null check (status in ('open', 'acknowledged', 'resolved')) default 'open',
    metrics jsonb not null default '{}'::jsonb,
    detected_at timestamptz not null default now(),
    resolved_at timestamptz,
    resolution_notes text,
    acknowledged_by_user_id uuid references app_users(id),
    resolved_by_user_id uuid references app_users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_queue_health_incidents_queue on queue_health_incidents(queue_name);
create index if not exists idx_queue_health_incidents_status on queue_health_incidents(status);
create index if not exists idx_queue_health_incidents_rule on queue_health_incidents(rule_id);

-- 3. Backup Verification Runs
DROP TABLE IF EXISTS backup_verification_runs CASCADE;
CREATE TABLE backup_verification_runs (
    id uuid primary key default uuid_generate_v4(),
    tenant_id uuid references tenants(id) on delete cascade,
    environment text not null default 'production',
    status text not null check (status in ('pass', 'fail', 'skipped')),
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    duration_ms integer,
    details jsonb not null default '{}'::jsonb,
    log_url text,
    initiated_by_user_id uuid references app_users(id),
    created_at timestamptz not null default now()
);

create index if not exists idx_backup_verification_runs_tenant on backup_verification_runs(tenant_id);
create index if not exists idx_backup_verification_runs_status on backup_verification_runs(status);

-- 4. Row Level Security
alter table queue_alert_rules enable row level security;
alter table queue_health_incidents enable row level security;
alter table backup_verification_runs enable row level security;

-- Service role full access
drop policy if exists "Service role manages queue alert rules" on queue_alert_rules;
DROP POLICY IF EXISTS "Service role manages queue alert rules" ON queue_alert_rules;
CREATE POLICY "Service role manages queue alert rules" ON queue_alert_rules
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

drop policy if exists "Service role manages queue health incidents" on queue_health_incidents;
DROP POLICY IF EXISTS "Service role manages queue health incidents" ON queue_health_incidents;
CREATE POLICY "Service role manages queue health incidents" ON queue_health_incidents
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

drop policy if exists "Service role manages backup verification runs" on backup_verification_runs;
DROP POLICY IF EXISTS "Service role manages backup verification runs" ON backup_verification_runs;
CREATE POLICY "Service role manages backup verification runs" ON backup_verification_runs
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- Tenant member policies
drop policy if exists "Tenant members read queue alert rules" on queue_alert_rules;
DROP POLICY IF EXISTS "Tenant members read queue alert rules" ON queue_alert_rules;
CREATE POLICY "Tenant members read queue alert rules" ON queue_alert_rules
    for select
    using (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_alert_rules.tenant_id
        )
    );

drop policy if exists "Tenant members upsert queue alert rules" on queue_alert_rules;
DROP POLICY IF EXISTS "Tenant members upsert queue alert rules" ON queue_alert_rules;
CREATE POLICY "Tenant members upsert queue alert rules" ON queue_alert_rules
    for insert
    with check (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_alert_rules.tenant_id
        )
    );

drop policy if exists "Tenant members update queue alert rules" on queue_alert_rules;
DROP POLICY IF EXISTS "Tenant members update queue alert rules" ON queue_alert_rules;
CREATE POLICY "Tenant members update queue alert rules" ON queue_alert_rules
    for update
    using (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_alert_rules.tenant_id
        )
    )
    with check (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_alert_rules.tenant_id
        )
    );

drop policy if exists "Tenant members delete queue alert rules" on queue_alert_rules;
DROP POLICY IF EXISTS "Tenant members delete queue alert rules" ON queue_alert_rules;
CREATE POLICY "Tenant members delete queue alert rules" ON queue_alert_rules
    for delete
    using (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_alert_rules.tenant_id
        )
    );

drop policy if exists "Tenant members read queue health incidents" on queue_health_incidents;
DROP POLICY IF EXISTS "Tenant members read queue health incidents" ON queue_health_incidents;
CREATE POLICY "Tenant members read queue health incidents" ON queue_health_incidents
    for select
    using (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_health_incidents.tenant_id
        )
    );

drop policy if exists "Tenant members update queue health incidents" on queue_health_incidents;
DROP POLICY IF EXISTS "Tenant members update queue health incidents" ON queue_health_incidents;
CREATE POLICY "Tenant members update queue health incidents" ON queue_health_incidents
    for update
    using (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_health_incidents.tenant_id
        )
    )
    with check (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_health_incidents.tenant_id
        )
    );

drop policy if exists "Tenant members insert queue health incidents" on queue_health_incidents;
DROP POLICY IF EXISTS "Tenant members insert queue health incidents" ON queue_health_incidents;
CREATE POLICY "Tenant members insert queue health incidents" ON queue_health_incidents
    for insert
    with check (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = queue_health_incidents.tenant_id
        )
    );

drop policy if exists "Tenant members read backup verification runs" on backup_verification_runs;
DROP POLICY IF EXISTS "Tenant members read backup verification runs" ON backup_verification_runs;
CREATE POLICY "Tenant members read backup verification runs" ON backup_verification_runs
    for select
    using (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = backup_verification_runs.tenant_id
        )
    );

drop policy if exists "Tenant members insert backup verification runs" on backup_verification_runs;
DROP POLICY IF EXISTS "Tenant members insert backup verification runs" ON backup_verification_runs;
CREATE POLICY "Tenant members insert backup verification runs" ON backup_verification_runs
    for insert
    with check (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = backup_verification_runs.tenant_id
        )
    );

commit;



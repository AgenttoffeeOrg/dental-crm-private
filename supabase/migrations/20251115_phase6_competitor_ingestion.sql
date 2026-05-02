SET search_path TO public, extensions;

-- =====================================================
-- PHASE 6 – COMPETITOR INTELLIGENCE FOUNDATIONS
-- Adds supporting tables for ingestion jobs & document storage
-- =====================================================

begin;

DROP TABLE IF EXISTS competitor_documents CASCADE;
CREATE TABLE competitor_documents (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references tenants(id) on delete cascade,
    competitor_id uuid references competitors(id) on delete set null,
    document_path text not null,
    source text,
    captured_at timestamptz not null default now(),
    checksum text,
    metadata jsonb not null default '{}'::jsonb,
    created_by_user_id uuid references app_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_competitor_documents_tenant
    on competitor_documents(tenant_id, captured_at desc);

DROP TABLE IF EXISTS competitor_ingestion_jobs CASCADE;
CREATE TABLE competitor_ingestion_jobs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references tenants(id) on delete cascade,
    source_name text not null,
    source_type text not null default 'manual' check (source_type in ('manual','webhook','scheduled','api')),
    status text not null default 'pending' check (status in ('pending','processing','succeeded','failed')),
    payload jsonb not null default '{}'::jsonb,
    result_summary jsonb,
    error_message text,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    created_by_user_id uuid references app_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_competitor_ingestion_jobs_tenant_status
    on competitor_ingestion_jobs(tenant_id, status, started_at desc);

alter table competitor_documents enable row level security;
alter table competitor_ingestion_jobs enable row level security;

-- Service role full access
drop policy if exists "Service role manages competitor documents" on competitor_documents;
DROP POLICY IF EXISTS "Service role manages competitor documents" ON competitor_documents;
CREATE POLICY "Service role manages competitor documents" ON competitor_documents
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

drop policy if exists "Service role manages competitor ingestion jobs" on competitor_ingestion_jobs;
DROP POLICY IF EXISTS "Service role manages competitor ingestion jobs" ON competitor_ingestion_jobs;
CREATE POLICY "Service role manages competitor ingestion jobs" ON competitor_ingestion_jobs
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- Tenant member access
drop policy if exists "Tenant members read competitor documents" on competitor_documents;
DROP POLICY IF EXISTS "Tenant members read competitor documents" ON competitor_documents;
CREATE POLICY "Tenant members read competitor documents" ON competitor_documents
    for select
    using (
        exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = competitor_documents.tenant_id
        )
    );

drop policy if exists "Tenant members manage competitor documents" on competitor_documents;
DROP POLICY IF EXISTS "Tenant members manage competitor documents" ON competitor_documents;
CREATE POLICY "Tenant members manage competitor documents" ON competitor_documents
    for all
    using (
        exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = competitor_documents.tenant_id
        )
    )
    with check (
        exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = competitor_documents.tenant_id
        )
    );

drop policy if exists "Tenant members read ingestion jobs" on competitor_ingestion_jobs;
DROP POLICY IF EXISTS "Tenant members read ingestion jobs" ON competitor_ingestion_jobs;
CREATE POLICY "Tenant members read ingestion jobs" ON competitor_ingestion_jobs
    for select
    using (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = competitor_ingestion_jobs.tenant_id
        )
    );

drop policy if exists "Tenant members create ingestion jobs" on competitor_ingestion_jobs;
DROP POLICY IF EXISTS "Tenant members create ingestion jobs" ON competitor_ingestion_jobs;
CREATE POLICY "Tenant members create ingestion jobs" ON competitor_ingestion_jobs
    for insert
    with check (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = competitor_ingestion_jobs.tenant_id
        )
    );

drop policy if exists "Tenant members update ingestion jobs" on competitor_ingestion_jobs;
DROP POLICY IF EXISTS "Tenant members update ingestion jobs" ON competitor_ingestion_jobs;
CREATE POLICY "Tenant members update ingestion jobs" ON competitor_ingestion_jobs
    for update
    using (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = competitor_ingestion_jobs.tenant_id
        )
    )
    with check (
        tenant_id is null
        or exists (
            select 1
            from app_users au
            where au.id = auth.uid()
              and au.tenant_id = competitor_ingestion_jobs.tenant_id
        )
    );

commit;



-- =====================================================
-- PHASE 5 – FEATURE FLAG GOVERNANCE
-- Registry, tenant assignments, audit history
-- =====================================================

begin;

create table if not exists feature_flag_registry (
    id uuid primary key default uuid_generate_v4(),
    flag_key text not null unique,
    name text not null,
    description text,
    category text not null default 'general',
    rollout_type text not null default 'boolean',
    default_enabled boolean not null default false,
    allow_tenant_override boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,
    created_by_user_id uuid references app_users(id),
    updated_by_user_id uuid references app_users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists feature_flag_assignments (
    id uuid primary key default uuid_generate_v4(),
    flag_id uuid not null references feature_flag_registry(id) on delete cascade,
    tenant_id uuid references tenants(id) on delete cascade,
    environment text not null default 'production',
    enabled boolean not null,
    variant text,
    rollout_percentage integer check (rollout_percentage between 0 and 100),
    reason text,
    expires_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_by_user_id uuid references app_users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(flag_id, tenant_id, environment)
);

create table if not exists feature_flag_audit_log (
    id uuid primary key default uuid_generate_v4(),
    flag_id uuid references feature_flag_registry(id) on delete cascade,
    tenant_id uuid references tenants(id) on delete cascade,
    environment text not null default 'production',
    action text not null check (action in ('created', 'updated', 'deleted', 'override_enabled', 'override_disabled')),
    previous_state jsonb,
    new_state jsonb,
    context jsonb,
    performed_by_user_id uuid references app_users(id),
    performed_at timestamptz not null default now()
);

create index if not exists idx_feature_flag_assignments_flag on feature_flag_assignments(flag_id);
create index if not exists idx_feature_flag_assignments_tenant on feature_flag_assignments(tenant_id);
create index if not exists idx_feature_flag_audit_flag on feature_flag_audit_log(flag_id);
create index if not exists idx_feature_flag_audit_tenant on feature_flag_audit_log(tenant_id);

alter table feature_flag_registry enable row level security;
alter table feature_flag_assignments enable row level security;
alter table feature_flag_audit_log enable row level security;

drop policy if exists "Service role manages feature flags" on feature_flag_registry;
create policy "Service role manages feature flags"
    on feature_flag_registry
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

drop policy if exists "Service role manages feature flag assignments" on feature_flag_assignments;
create policy "Service role manages feature flag assignments"
    on feature_flag_assignments
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

drop policy if exists "Service role manages feature flag audit log" on feature_flag_audit_log;
create policy "Service role manages feature flag audit log"
    on feature_flag_audit_log
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

-- Tenant members can read registry
drop policy if exists "Tenant members read flag registry" on feature_flag_registry;
create policy "Tenant members read flag registry"
    on feature_flag_registry
    for select
    using (true);

-- Tenant members manage assignments for their tenant
drop policy if exists "Tenant members manage flag assignments" on feature_flag_assignments;
create policy "Tenant members manage flag assignments"
    on feature_flag_assignments
    for all
    using (
        tenant_id is null
        or exists (
            select 1 from app_users au
            where au.id = auth.uid()
              and au.tenant_id = feature_flag_assignments.tenant_id
        )
    )
    with check (
        tenant_id is null
        or exists (
            select 1 from app_users au
            where au.id = auth.uid()
              and au.tenant_id = feature_flag_assignments.tenant_id
        )
    );

-- Tenant members can read audit log for their tenant or global entries
drop policy if exists "Tenant members read flag audit log" on feature_flag_audit_log;
create policy "Tenant members read flag audit log"
    on feature_flag_audit_log
    for select
    using (
        tenant_id is null
        or exists (
            select 1 from app_users au
            where au.id = auth.uid()
              and au.tenant_id = feature_flag_audit_log.tenant_id
        )
    );

commit;



-- =============================================================================
-- Phase 2a.9b — Sync org_memberships with user_tenant_memberships
-- =============================================================================
--
-- The codebase has two membership tables that drifted out of sync:
--
--   * `user_tenant_memberships` — read by `getApiRequestContext()` to resolve
--     the current user's tenant + role for the session. Populated by the
--     onboarding / invitation flow.
--
--   * `org_memberships` — read by the 3-arg `user_has_permission(user_id,
--     tenant_id, permission_code)` RPC, which every permission gate
--     (e.g. `pipeline.edit`, `contacts.widget_manage`,
--     `contacts.dedup_queue_manage`) calls. Joined to `role_definitions →
--     role_permissions → permissions` to evaluate per-permission grants.
--
-- The application code never wrote into `org_memberships`, so the table was
-- empty for every user — even owners with valid `user_tenant_memberships`
-- rows. Result: every permission check returned `false`, every
-- permission-gated page rendered the "No access" panel, despite the role's
-- permissions being correctly granted in `role_permissions`.
--
-- This migration:
--   1. Backfills `org_memberships` from `user_tenant_memberships` for every
--      existing membership.
--   2. Installs a trigger that mirrors INSERT / UPDATE / DELETE on
--      `user_tenant_memberships` into `org_memberships` going forward, so
--      the invitation flow stays in sync without code changes.
--
-- Role mapping (`user_tenant_memberships.role` → `org_memberships.role`):
--   owner   → owner
--   admin   → admin
--   manager → manager
--   staff   → staff
--   viewer  → read_only   (closest match in the org_memberships role enum)
--
-- Status mapping (`user_tenant_memberships.status` → `org_memberships.status`):
--   active    → active
--   suspended → suspended
--   inactive  → declined   (closest match; `declined` is in the CHECK list)
--
-- `location_ids`: when `all_locations = true` we set `NULL` (semantic
-- equivalent of "no location restriction"). When false we'd ideally pull
-- from `membership_locations`, but for now there are no rows in
-- `membership_locations`; the trigger mirrors `NULL` and a future migration
-- can add per-location backfill if `all_locations = false` ever produces
-- rows.

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: map utm role → org role
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._map_utm_role_to_org_role(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'owner'   THEN 'owner'
    WHEN 'admin'   THEN 'admin'
    WHEN 'manager' THEN 'manager'
    WHEN 'staff'   THEN 'staff'
    WHEN 'viewer'  THEN 'read_only'
    ELSE 'staff'   -- conservative default for any future enum addition
  END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: map utm status → org status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._map_utm_status_to_org_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'active'    THEN 'active'
    WHEN 'suspended' THEN 'suspended'
    WHEN 'inactive'  THEN 'declined'
    ELSE 'active'   -- conservative default
  END;
$$;

-- ---------------------------------------------------------------------------
-- Backfill — one row per (user_id, tenant_id) pair on user_tenant_memberships
-- ---------------------------------------------------------------------------

INSERT INTO public.org_memberships (
  user_id,
  tenant_id,
  role,
  status,
  location_ids,
  invited_by_user_id,
  invited_at,
  approved_by_user_id,
  approved_at,
  created_at,
  updated_at
)
SELECT
  utm.user_id,
  utm.tenant_id,
  public._map_utm_role_to_org_role(utm.role::text)         AS role,
  public._map_utm_status_to_org_status(utm.status::text)    AS status,
  -- All current memberships are `all_locations = true` and there are no
  -- rows in `membership_locations` yet. NULL is the "no location
  -- restriction" semantic; cast explicitly to uuid[] because PostgREST /
  -- Postgres can't infer the type of a bare NULL in INSERT...SELECT.
  NULL::uuid[]                                              AS location_ids,
  utm.invited_by                                            AS invited_by_user_id,
  utm.invited_at,
  utm.invited_by                                            AS approved_by_user_id,
  utm.joined_at                                             AS approved_at,
  utm.created_at,
  utm.updated_at
FROM public.user_tenant_memberships utm
ON CONFLICT (user_id, tenant_id) DO UPDATE
   SET role       = EXCLUDED.role,
       status     = EXCLUDED.status,
       updated_at = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- Trigger: keep org_memberships in sync with future user_tenant_memberships
-- changes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_org_membership_from_utm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.org_memberships (
      user_id, tenant_id, role, status, location_ids,
      invited_by_user_id, invited_at, approved_by_user_id, approved_at,
      created_at, updated_at
    ) VALUES (
      NEW.user_id,
      NEW.tenant_id,
      public._map_utm_role_to_org_role(NEW.role::text),
      public._map_utm_status_to_org_status(NEW.status::text),
      NULL::uuid[],
      NEW.invited_by,
      NEW.invited_at,
      NEW.invited_by,
      NEW.joined_at,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (user_id, tenant_id) DO UPDATE
       SET role       = EXCLUDED.role,
           status     = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    UPDATE public.org_memberships
       SET role       = public._map_utm_role_to_org_role(NEW.role::text),
           status     = public._map_utm_status_to_org_status(NEW.status::text),
           approved_at = COALESCE(NEW.joined_at, approved_at),
           updated_at = NEW.updated_at
     WHERE user_id   = NEW.user_id
       AND tenant_id = NEW.tenant_id;

    -- If the row didn't exist (paranoid guard against pre-existing UTM rows
    -- that pre-date this trigger and weren't caught by the backfill), insert.
    IF NOT FOUND THEN
      INSERT INTO public.org_memberships (
        user_id, tenant_id, role, status, location_ids,
        invited_by_user_id, invited_at, approved_by_user_id, approved_at,
        created_at, updated_at
      ) VALUES (
        NEW.user_id,
        NEW.tenant_id,
        public._map_utm_role_to_org_role(NEW.role::text),
        public._map_utm_status_to_org_status(NEW.status::text),
        NULL::uuid[],
        NEW.invited_by,
        NEW.invited_at,
        NEW.invited_by,
        NEW.joined_at,
        NEW.created_at,
        NEW.updated_at
      )
      ON CONFLICT (user_id, tenant_id) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.org_memberships
     WHERE user_id   = OLD.user_id
       AND tenant_id = OLD.tenant_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_org_membership_from_utm
  ON public.user_tenant_memberships;

CREATE TRIGGER trg_sync_org_membership_from_utm
AFTER INSERT OR UPDATE OR DELETE ON public.user_tenant_memberships
FOR EACH ROW
EXECUTE FUNCTION public.sync_org_membership_from_utm();

COMMIT;

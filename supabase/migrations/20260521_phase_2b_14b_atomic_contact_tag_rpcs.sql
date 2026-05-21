-- =====================================================================
-- Phase 2b.14b — atomic contact-tag RPCs (engine race fix)
-- =====================================================================
-- The new automation engine's `add_tag` / `remove_tag` node handlers
-- were doing a read-modify-write on `contacts.tags`, which races when
-- multiple automations on the same contact run concurrently.
--
-- These RPCs do the update atomically inside Postgres. The engine
-- calls them via supabase.rpc(...).
--
-- Both functions are SECURITY DEFINER so the engine (service-role
-- already) can call them without re-running RLS — the engine's caller
-- is the cron route or the listener, both server-only. Tenant scoping
-- is enforced by the `tenant_id` parameter mirroring the row.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.automation_add_contact_tag(
  p_tenant_id uuid,
  p_contact_id uuid,
  p_tag text
) RETURNS public.contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.contacts;
BEGIN
  UPDATE public.contacts
  SET tags = (
    CASE
      WHEN p_tag = ANY (COALESCE(tags, ARRAY[]::text[])) THEN tags
      ELSE array_append(COALESCE(tags, ARRAY[]::text[]), p_tag)
    END
  )
  WHERE id = p_contact_id AND tenant_id = p_tenant_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.automation_remove_contact_tag(
  p_tenant_id uuid,
  p_contact_id uuid,
  p_tag text
) RETURNS public.contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.contacts;
BEGIN
  UPDATE public.contacts
  SET tags = array_remove(COALESCE(tags, ARRAY[]::text[]), p_tag)
  WHERE id = p_contact_id AND tenant_id = p_tenant_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_add_contact_tag(uuid, uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.automation_remove_contact_tag(uuid, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automation_add_contact_tag(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.automation_remove_contact_tag(uuid, uuid, text) TO service_role;

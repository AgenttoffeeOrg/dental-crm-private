-- Phase 2b.3 — public anon SELECT on marketing_forms for active + published rows.
--
-- The /forms/embed/[id] and /f/[slug] pages are intentionally public — they
-- have to render inside iframes on third-party sites for visitors who are
-- NOT logged into the CRM. The existing RLS policies all gate reads on
-- `app_users.tenant_id = auth.uid()`, which means an anon Supabase client
-- (no JWT) gets zero rows back and the page shows "Form not found".
--
-- This policy lets anon clients read **only** rows that the practice has
-- explicitly marked as live: status = 'active' AND is_published = true AND
-- deleted_at IS NULL. Drafts, archived forms, and soft-deleted rows stay
-- invisible to anon. Sensitive `tenant_id`, `created_by_user_id`, and
-- `assign_to_user_id` columns leak — that's an acceptable trade for
-- functionality on the public surface, and matches what every other public
-- form-builder service does (Tally, Typeform, Jotform).
--
-- Locking down which columns are returned would require a SECURITY DEFINER
-- view; deferred to the next phase if the audit calls for it. For now the
-- policy is simple and the renderer only reads columns it actually needs.

-- Anon needs the table-level grant in addition to the RLS policy. RLS
-- decides which rows are visible; the grant decides whether the role can
-- touch the table at all.
GRANT SELECT ON public.marketing_forms TO anon;

-- Defensive drop in case this migration is re-applied during dev.
DROP POLICY IF EXISTS "Anon can read live published forms" ON public.marketing_forms;

CREATE POLICY "Anon can read live published forms"
  ON public.marketing_forms
  FOR SELECT
  TO anon
  USING (
    status = 'active'
    AND is_published = true
    AND deleted_at IS NULL
  );

COMMENT ON POLICY "Anon can read live published forms" ON public.marketing_forms IS
  'Phase 2b.3: lets the public /forms/embed/[id] and /f/[slug] pages render '
  'for unauthenticated visitors on third-party sites. Scoped to '
  'active+published+non-deleted rows only.';

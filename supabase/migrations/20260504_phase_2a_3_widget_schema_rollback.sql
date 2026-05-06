-- =============================================================================
-- Phase 2a.3 rollback. Mirror of 20260504_phase_2a_3_widget_schema.sql.
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS practice_booking_widgets_set_updated_at
  ON public.practice_booking_widgets;

DROP FUNCTION IF EXISTS public.seed_default_booking_widget(uuid);

DELETE FROM public.role_permissions
WHERE permission_id IN (
  SELECT id FROM public.permissions WHERE code = 'contacts.widget_manage'
);

DELETE FROM public.permissions WHERE code = 'contacts.widget_manage';

ALTER TABLE public.practice_booking_widgets
  DROP CONSTRAINT IF EXISTS practice_booking_widgets_slug_format;

DROP INDEX IF EXISTS public.idx_pbw_tenant_active;
DROP INDEX IF EXISTS public.idx_pbw_slug_active;

ALTER TABLE public.practice_booking_widgets
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS success_message,
  DROP COLUMN IF EXISTS treatment_options;

COMMIT;

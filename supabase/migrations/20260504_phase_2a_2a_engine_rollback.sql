-- Phase 2a.2a — rollback companion to 20260504_phase_2a_2a_engine.sql

BEGIN;

DROP FUNCTION IF EXISTS public.seed_default_treatment_offerings(uuid);

DELETE FROM public.role_permissions
WHERE permission_id IN (
  SELECT id FROM public.permissions WHERE code = 'contacts.dedup_queue_manage'
);
DELETE FROM public.permissions WHERE code = 'contacts.dedup_queue_manage';

DROP TRIGGER IF EXISTS trigger_touch_drq_updated_at ON public.dedup_review_queue;
DROP FUNCTION IF EXISTS public.touch_drq_updated_at();
DROP TABLE IF EXISTS public.dedup_review_queue CASCADE;

DROP INDEX IF EXISTS public.idx_at_event_id_unique;
ALTER TABLE public.attribution_touchpoints DROP COLUMN IF EXISTS event_id;

ALTER TABLE public.contacts DROP COLUMN IF EXISTS treatment_offering_id;
ALTER TABLE public.attribution_touchpoints DROP COLUMN IF EXISTS treatment_offering_id;
ALTER TABLE public.lead_intent_sessions DROP COLUMN IF EXISTS treatment_offering_id;

COMMIT;

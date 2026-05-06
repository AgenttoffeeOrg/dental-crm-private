-- Rollback for 20260503_phase_2a_1_foundations.sql
BEGIN;

DROP TRIGGER IF EXISTS trigger_update_contact_first_response ON public.activities;
DROP FUNCTION IF EXISTS public.update_contact_first_response();

DROP INDEX IF EXISTS public.idx_pipelines_one_default_per_tenant;
-- Note: not restoring idx_pipelines_default; the live DB had a duplicate.

DROP INDEX IF EXISTS public.idx_activities_tenant_source_channel;
ALTER TABLE public.activities DROP COLUMN IF EXISTS source_channel;

DROP INDEX IF EXISTS public.idx_contacts_no_first_response;
DROP INDEX IF EXISTS public.idx_contacts_first_response_at;
ALTER TABLE public.contacts
  DROP COLUMN IF EXISTS first_response_user_id,
  DROP COLUMN IF EXISTS first_response_at;

DROP TABLE IF EXISTS public.practice_notification_routing CASCADE;
DROP TABLE IF EXISTS public.practice_treatment_offerings CASCADE;
DROP TABLE IF EXISTS public.treatment_types CASCADE;

COMMIT;

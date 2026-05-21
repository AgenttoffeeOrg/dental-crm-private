-- Phase 2b.16 — Pipeline routing keyword rules
-- Stores per-tenant keyword → pipeline rules. Array of:
--   { keywords: string[], pipeline_id: uuid, stage_id?: uuid, priority: int }
-- Highest priority match wins. Falls through to AI classifier (when
-- ai_routing_enabled=true), then to the unsorted_pipeline_id, then to
-- the default pipeline.
ALTER TABLE public.tenant_routing_settings
  ADD COLUMN IF NOT EXISTS keyword_pipeline_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tenant_routing_settings.keyword_pipeline_rules IS
  'Practice keyword → pipeline rules used by the 2b.16 pipeline router. Array of {keywords:string[], pipeline_id:uuid, stage_id?:uuid, priority:int}. Highest priority match wins; ties resolved by array order.';

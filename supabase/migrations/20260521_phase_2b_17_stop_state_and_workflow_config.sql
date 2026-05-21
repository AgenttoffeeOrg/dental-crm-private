-- Phase 2b.17 — adds 'stopped' state to automation_runs +
-- stop_reason column + workflow_config jsonb on automations
-- (for on_patient_reply / respect_quiet_hours / stop_rules).

ALTER TABLE public.automation_runs DROP CONSTRAINT IF EXISTS automation_runs_state_check;
ALTER TABLE public.automation_runs
  ADD CONSTRAINT automation_runs_state_check
  CHECK (state = ANY (ARRAY['running','waiting','completed','failed','cancelled','stopped']::text[]));

ALTER TABLE public.automation_runs
  ADD COLUMN IF NOT EXISTS stop_reason text;

ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS workflow_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.automation_runs.stop_reason IS
  '2b.17: free-text reason set when state=''stopped'' (e.g. note_added, call_logged, manual_outbound_then_reply).';

COMMENT ON COLUMN public.automations.workflow_config IS
  '2b.17: per-workflow config — { on_patient_reply: "stop"|"ai_continue", respect_quiet_hours: bool, stop_rules: [...] }. Read by engine + stop-conditions listener.';

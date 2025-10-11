-- Update ai_artifacts table to support comprehensive analysis kinds
-- Run this in your Supabase SQL Editor

-- Update the check constraint to allow new comprehensive analysis kinds
ALTER TABLE ai_artifacts DROP CONSTRAINT IF EXISTS ai_artifacts_kind_check;

ALTER TABLE ai_artifacts 
ADD CONSTRAINT ai_artifacts_kind_check 
CHECK (kind IN (
  'transcript', 
  'summary', 
  'intent', 
  'treatments', 
  'actions',
  'executive_summary',
  'patient_profile', 
  'treatments_analysis',
  'conversation_analysis',
  'strategic_insights',
  'immediate_actions'
));

-- Add comment explaining the kinds
COMMENT ON COLUMN ai_artifacts.kind IS 'Type of AI artifact: transcript, summary, intent, treatments, actions, executive_summary, patient_profile, treatments_analysis, conversation_analysis, strategic_insights, immediate_actions';


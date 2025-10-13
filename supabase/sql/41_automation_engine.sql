-- =====================================================
-- AUTOMATION ENGINE SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Add journey state management for automation execution
-- =====================================================

BEGIN;

-- =====================================================
-- 1. JOURNEY STATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_journey_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Journey & Contact
  journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Progress Tracking
  current_step INTEGER DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'completed', 'failed', 'paused')),
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  wait_until TIMESTAMP WITH TIME ZONE, -- For wait actions
  
  -- Goal Tracking
  goal_completed BOOLEAN DEFAULT FALSE,
  goal_completed_at TIMESTAMP WITH TIME ZONE,
  goal_data JSONB,
  
  -- State Data (store variables, condition results, etc.)
  state_data JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  entry_source TEXT, -- How they entered (trigger type)
  entry_metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_journey_states_tenant ON marketing_journey_states(tenant_id);
CREATE INDEX idx_journey_states_journey ON marketing_journey_states(journey_id);
CREATE INDEX idx_journey_states_contact ON marketing_journey_states(contact_id);
CREATE INDEX idx_journey_states_status ON marketing_journey_states(status);
CREATE INDEX idx_journey_states_waiting ON marketing_journey_states(wait_until) 
  WHERE status = 'waiting' AND wait_until IS NOT NULL;
CREATE INDEX idx_journey_states_active ON marketing_journey_states(journey_id, status) 
  WHERE status = 'active';

-- Unique constraint: contact can only be in a journey once
CREATE UNIQUE INDEX idx_journey_states_unique_active 
  ON marketing_journey_states(journey_id, contact_id) 
  WHERE status IN ('active', 'waiting');

COMMENT ON TABLE marketing_journey_states IS 'Tracks individual contact progress through automation journeys';

-- =====================================================
-- 2. JOURNEY STEP LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_journey_step_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- References
  journey_state_id UUID NOT NULL REFERENCES marketing_journey_states(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Step Info
  step_index INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  step_name TEXT,
  
  -- Execution
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Results
  result_data JSONB, -- Action results, error messages, etc.
  error_message TEXT,
  
  -- Metadata
  execution_time_ms INTEGER, -- How long the action took
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_journey_step_logs_state ON marketing_journey_step_logs(journey_state_id);
CREATE INDEX idx_journey_step_logs_journey ON marketing_journey_step_logs(journey_id);
CREATE INDEX idx_journey_step_logs_contact ON marketing_journey_step_logs(contact_id);
CREATE INDEX idx_journey_step_logs_executed ON marketing_journey_step_logs(executed_at);

COMMENT ON TABLE marketing_journey_step_logs IS 'Audit log of every action executed in automation journeys';

-- =====================================================
-- 3. JOURNEY ANALYTICS VIEW
-- =====================================================
CREATE OR REPLACE VIEW journey_analytics AS
SELECT
  j.id as journey_id,
  j.tenant_id,
  j.name as journey_name,
  j.status as journey_status,
  COUNT(DISTINCT js.id) as total_entered,
  COUNT(DISTINCT js.id) FILTER (WHERE js.status = 'active') as currently_active,
  COUNT(DISTINCT js.id) FILTER (WHERE js.status = 'completed') as total_completed,
  COUNT(DISTINCT js.id) FILTER (WHERE js.status = 'failed') as total_failed,
  COUNT(DISTINCT js.id) FILTER (WHERE js.goal_completed = TRUE) as goals_achieved,
  CASE 
    WHEN COUNT(DISTINCT js.id) > 0 
    THEN (COUNT(DISTINCT js.id) FILTER (WHERE js.status = 'completed')::DECIMAL / COUNT(DISTINCT js.id)::DECIMAL) * 100 
    ELSE 0 
  END as completion_rate,
  CASE 
    WHEN COUNT(DISTINCT js.id) > 0 
    THEN (COUNT(DISTINCT js.id) FILTER (WHERE js.goal_completed = TRUE)::DECIMAL / COUNT(DISTINCT js.id)::DECIMAL) * 100 
    ELSE 0 
  END as goal_conversion_rate,
  AVG(EXTRACT(EPOCH FROM (js.completed_at - js.started_at)) / 3600) as avg_completion_time_hours
FROM marketing_journeys j
LEFT JOIN marketing_journey_states js ON j.id = js.journey_id
GROUP BY j.id, j.tenant_id, j.name, j.status;

COMMENT ON VIEW journey_analytics IS 'Aggregated analytics for each automation journey';

-- =====================================================
-- 4. JOURNEY STEP ANALYTICS VIEW
-- =====================================================
CREATE OR REPLACE VIEW journey_step_analytics AS
SELECT
  jsl.journey_id,
  jsl.step_index,
  jsl.step_type,
  jsl.step_name,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE jsl.status = 'success') as successful_executions,
  COUNT(*) FILTER (WHERE jsl.status = 'failed') as failed_executions,
  COUNT(*) FILTER (WHERE jsl.status = 'skipped') as skipped_executions,
  CASE 
    WHEN COUNT(*) > 0 
    THEN (COUNT(*) FILTER (WHERE jsl.status = 'success')::DECIMAL / COUNT(*)::DECIMAL) * 100 
    ELSE 0 
  END as success_rate,
  AVG(jsl.execution_time_ms) as avg_execution_time_ms,
  MAX(jsl.execution_time_ms) as max_execution_time_ms
FROM marketing_journey_step_logs jsl
GROUP BY jsl.journey_id, jsl.step_index, jsl.step_type, jsl.step_name;

COMMENT ON VIEW journey_step_analytics IS 'Performance metrics for each step in automation journeys';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Get active journey count for a contact
CREATE OR REPLACE FUNCTION get_contact_active_journeys(contact_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM marketing_journey_states
    WHERE contact_id = contact_id_param
    AND status IN ('active', 'waiting')
  );
END;
$$ LANGUAGE plpgsql;

-- Get journey completion rate
CREATE OR REPLACE FUNCTION get_journey_completion_rate(journey_id_param UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_entered INTEGER;
  total_completed INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_entered, total_completed
  FROM marketing_journey_states
  WHERE journey_id = journey_id_param;
  
  IF total_entered > 0 THEN
    RETURN (total_completed::DECIMAL / total_entered::DECIMAL) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Resume waiting journeys (called by cron)
CREATE OR REPLACE FUNCTION resume_waiting_journeys()
RETURNS INTEGER AS $$
DECLARE
  resumed_count INTEGER;
BEGIN
  WITH resumed AS (
    UPDATE marketing_journey_states
    SET status = 'active',
        updated_at = NOW()
    WHERE status = 'waiting'
    AND wait_until <= NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO resumed_count FROM resumed;
  
  RETURN resumed_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_journey_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journey_states_updated_at
  BEFORE UPDATE ON marketing_journey_states
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_state_timestamp();

-- Increment journey counters when state changes
CREATE OR REPLACE FUNCTION update_journey_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Contact entered journey
    UPDATE marketing_journeys
    SET total_entered = total_entered + 1,
        total_active = total_active + 1
    WHERE id = NEW.journey_id;
  END IF;
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Journey completed
    UPDATE marketing_journeys
    SET total_completed = total_completed + 1,
        total_active = GREATEST(total_active - 1, 0)
    WHERE id = NEW.journey_id;
  END IF;
  
  IF NEW.goal_completed = TRUE AND OLD.goal_completed = FALSE THEN
    -- Goal achieved
    UPDATE marketing_journeys
    SET goals_achieved = goals_achieved + 1
    WHERE id = NEW.journey_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journey_counter_update
  AFTER INSERT OR UPDATE ON marketing_journey_states
  FOR EACH ROW
  EXECUTE FUNCTION update_journey_counters();

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify:

-- SELECT * FROM journey_analytics LIMIT 10;
-- SELECT * FROM journey_step_analytics LIMIT 10;
-- SELECT get_journey_completion_rate('journey-id-here');
-- SELECT resume_waiting_journeys();


-- ================================================================
-- FIX #2: ENABLE SUPABASE REALTIME ON TABLES
-- ================================================================
-- Enables real-time subscriptions for deals, contacts, and tasks
-- This fixes CHANNEL_ERROR and TIMED_OUT subscription errors
-- ================================================================

-- Enable Realtime on core tables
ALTER publication supabase_realtime ADD TABLE deals;
ALTER publication supabase_realtime ADD TABLE contacts;
ALTER publication supabase_realtime ADD TABLE tasks;
ALTER publication supabase_realtime ADD TABLE activities;
ALTER publication supabase_realtime ADD TABLE pipeline_stages;

SELECT 'Realtime enabled on all tables!' as result;


-- ============================================
-- MARKETING AUDIT MODULE - DEMO SEED DATA
-- ============================================
-- Purpose: Create sample audit data for testing and development
-- Note: Only run in development environment
-- ============================================

-- Insert a sample peer group
INSERT INTO audit_peer_groups (
  id,
  practice_id,
  name,
  description,
  auto_discover,
  category,
  radius_miles,
  center_lat,
  center_lng,
  is_default,
  tenant_id
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::UUID,
  (SELECT id FROM practices LIMIT 1), -- Use first practice
  'Southwest London Dentists',
  'Dental practices within 5 miles of SW1A 1AA',
  true,
  'dentist',
  5,
  51.5074,
  -0.1278,
  true,
  (SELECT tenant_id FROM practices LIMIT 1)
) ON CONFLICT (practice_id, name) DO NOTHING;

-- Insert a sample audit run
INSERT INTO marketing_audit_runs (
  id,
  practice_id,
  domain,
  status,
  composite_score,
  technical_score,
  local_score,
  content_score,
  analytics_score,
  conversion_score,
  run_type,
  phase,
  peer_group_id,
  percentile_rank,
  your_rank,
  peer_count,
  gap_to_median,
  gap_to_top_3_avg,
  started_at,
  completed_at,
  duration_seconds,
  api_calls,
  api_costs_usd,
  tenant_id
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::UUID,
  (SELECT id FROM practices LIMIT 1),
  'example-dental.com',
  'completed',
  78.4,
  85.2,
  72.0,
  60.5,
  88.0,
  92.0,
  'manual',
  1,
  '550e8400-e29b-41d4-a716-446655440001'::UUID,
  65.3,
  5,
  12,
  3.2,
  -14.1,
  NOW() - INTERVAL '10 minutes',
  NOW(),
  154,
  '{"psi": 2, "gsc": 4, "ga4": 3, "places_api": 13}'::jsonb,
  0.87,
  (SELECT tenant_id FROM practices LIMIT 1)
) ON CONFLICT (id) DO NOTHING;

-- Insert sample metrics
INSERT INTO audit_metrics (
  run_id,
  category,
  metric_name,
  metric_value,
  metric_unit,
  source,
  tenant_id
) VALUES
  ('550e8400-e29b-41d4-a716-446655440002'::UUID, 'technical', 'lcp', 2.1, 'seconds', 'psi', (SELECT tenant_id FROM practices LIMIT 1)),
  ('550e8400-e29b-41d4-a716-446655440002'::UUID, 'technical', 'fid', 45, 'milliseconds', 'psi', (SELECT tenant_id FROM practices LIMIT 1)),
  ('550e8400-e29b-41d4-a716-446655440002'::UUID, 'technical', 'cls', 0.08, 'score', 'psi', (SELECT tenant_id FROM practices LIMIT 1)),
  ('550e8400-e29b-41d4-a716-446655440002'::UUID, 'local', 'reviews_count', 143, 'count', 'places_api', (SELECT tenant_id FROM practices LIMIT 1)),
  ('550e8400-e29b-41d4-a716-446655440002'::UUID, 'local', 'avg_rating', 4.6, 'rating', 'places_api', (SELECT tenant_id FROM practices LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insert sample recommendations
INSERT INTO audit_recommendations (
  run_id,
  category,
  title,
  description,
  impact,
  effort,
  confidence,
  estimated_hours,
  priority_score,
  current_value,
  target_value,
  status,
  action_steps,
  tenant_id
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440002'::UUID,
    'local_presence',
    'Increase Google Reviews Velocity',
    'You''re receiving 8 reviews per month. Top competitors average 25/month. Implement a systematic review request process.',
    'high',
    'medium',
    'high',
    4,
    90,
    8,
    25,
    'pending',
    '["Set up automated email sequence post-appointment", "Train front desk staff on review requests", "Create SMS reminder 3 days after visit", "Monitor and respond to all new reviews within 24h"]'::jsonb,
    (SELECT tenant_id FROM practices LIMIT 1)
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::UUID,
    'technical_seo',
    'Fix 7 Index Coverage Errors',
    'Google Search Console reports 7 pages with indexation errors, primarily redirect chains and soft 404s.',
    'high',
    'low',
    'high',
    2,
    95,
    127,
    134,
    'pending',
    '["Review error report in GSC", "Fix redirect chains (simplify to single 301)", "Address soft 404 pages (add real content or remove)", "Submit sitemap after fixes", "Verify indexation within 7 days"]'::jsonb,
    (SELECT tenant_id FROM practices LIMIT 1)
  )
ON CONFLICT DO NOTHING;

-- Insert sample competitors
INSERT INTO audit_competitors (
  run_id,
  competitor_name,
  competitor_domain,
  competitor_place_id,
  composite_score,
  local_score,
  technical_score,
  metrics,
  rank,
  distance_miles,
  tenant_id
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440002'::UUID,
    'Smile Clinic Westminster',
    'smileclinicwestminster.co.uk',
    'ChIJExample1',
    92.1,
    95.2,
    88.0,
    '{"reviews_count": 487, "avg_rating": 4.9, "indexed_pages": 218}'::jsonb,
    1,
    2.3,
    (SELECT tenant_id FROM practices LIMIT 1)
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::UUID,
    'Bright Dental SW1',
    'brightdentalsw1.com',
    'ChIJExample2',
    88.3,
    89.5,
    90.0,
    '{"reviews_count": 342, "avg_rating": 4.8, "indexed_pages": 167}'::jsonb,
    2,
    3.1,
    (SELECT tenant_id FROM practices LIMIT 1)
  )
ON CONFLICT (run_id, competitor_place_id) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Marketing Audit demo data seeded successfully!';
END $$;


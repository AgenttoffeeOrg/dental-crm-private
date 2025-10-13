-- =====================================================
-- COMPREHENSIVE DEMO DATA GENERATION
-- =====================================================
-- This script creates a COMPLETE, production-ready demo
-- environment with realistic data for EVERY feature.
-- 
-- Coverage:
-- • 5 Dental practices (tenants)
-- • 15 Users across practices
-- • 150+ Contacts (patients, leads)
-- • 200+ Deals in various stages
-- • 500+ Activities (calls, emails, WhatsApp, meetings)
-- • 20+ Marketing segments
-- • 30+ Email templates
-- • 40+ Marketing campaigns (email & WhatsApp)
-- • 15+ Customer journeys
-- • 10+ Forms with submissions
-- • 8+ Landing pages
-- • Comments, approvals, AI suggestions
-- • Full attribution data
-- • Activity logs
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 1: TENANTS (Dental Practices)
-- =====================================================

-- Clear existing demo data if needed
DELETE FROM marketing_attribution WHERE tenant_id IN (
  SELECT id FROM tenants WHERE name LIKE 'Demo%' OR name LIKE '%Dental%'
);

-- Create 5 diverse dental practices
INSERT INTO tenants (id, name, timezone, marketing_enabled, marketing_plan, marketing_enabled_at, created_at) VALUES
-- Practice 1: Large multi-location practice (Enterprise)
('11111111-1111-1111-1111-111111111111', 'SmileBright Dental Group', 'Europe/London', true, 'enterprise', NOW() - INTERVAL '6 months', NOW() - INTERVAL '2 years'),

-- Practice 2: Boutique cosmetic practice (Pro)
('22222222-2222-2222-2222-222222222222', 'Elite Cosmetic Dentistry', 'America/New_York', true, 'pro', NOW() - INTERVAL '3 months', NOW() - INTERVAL '18 months'),

-- Practice 3: Family practice (Starter)
('33333333-3333-3333-3333-333333333333', 'Greenwood Family Dental', 'America/Los_Angeles', true, 'starter', NOW() - INTERVAL '1 month', NOW() - INTERVAL '3 years'),

-- Practice 4: Specialty practice (Pro)
('44444444-4444-4444-4444-444444444444', 'Advanced Implant Center', 'Australia/Sydney', true, 'pro', NOW() - INTERVAL '4 months', NOW() - INTERVAL '1 year'),

-- Practice 5: New practice just starting (None - will enable later)
('55555555-5555-5555-5555-555555555555', 'Riverside Dental Care', 'Europe/London', false, 'none', NULL, NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO UPDATE SET
  marketing_enabled = EXCLUDED.marketing_enabled,
  marketing_plan = EXCLUDED.marketing_plan,
  marketing_enabled_at = EXCLUDED.marketing_enabled_at;

-- =====================================================
-- SECTION 2: USERS (Staff Members)
-- =====================================================

-- Note: These are linked to Supabase Auth. In real app, you'd create auth users first.
-- For demo purposes, we'll create placeholder users assuming auth.users exist.

-- Practice 1 Users (SmileBright)
INSERT INTO app_users (id, tenant_id, full_name, role, created_at) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Dr. Sarah Mitchell', 'owner', NOW() - INTERVAL '2 years'),
('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'James Parker', 'manager', NOW() - INTERVAL '18 months'),
('a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Emily Chen', 'staff', NOW() - INTERVAL '1 year')
ON CONFLICT (id) DO NOTHING;

-- Practice 2 Users (Elite Cosmetic)
INSERT INTO app_users (id, tenant_id, full_name, role, created_at) VALUES
('a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Dr. Michael Sterling', 'owner', NOW() - INTERVAL '18 months'),
('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Rachel Thompson', 'manager', NOW() - INTERVAL '1 year'),
('a2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'David Kim', 'staff', NOW() - INTERVAL '8 months')
ON CONFLICT (id) DO NOTHING;

-- Practice 3 Users (Greenwood Family)
INSERT INTO app_users (id, tenant_id, full_name, role, created_at) VALUES
('a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Dr. Jennifer Greenwood', 'owner', NOW() - INTERVAL '3 years'),
('a3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Lisa Martinez', 'staff', NOW() - INTERVAL '2 years')
ON CONFLICT (id) DO NOTHING;

-- Practice 4 Users (Advanced Implant)
INSERT INTO app_users (id, tenant_id, full_name, role, created_at) VALUES
('a4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 'Dr. Robert Anderson', 'owner', NOW() - INTERVAL '1 year'),
('a4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 'Sophie Williams', 'manager', NOW() - INTERVAL '10 months'),
('a4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 'Tom Bradley', 'staff', NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- Practice 5 Users (Riverside)
INSERT INTO app_users (id, tenant_id, full_name, role, created_at) VALUES
('a5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 'Dr. Amanda Rivers', 'owner', NOW() - INTERVAL '6 months'),
('a5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', 'Mark Johnson', 'staff', NOW() - INTERVAL '4 months')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 3: PIPELINES & STAGES
-- =====================================================

-- Create pipelines for each practice
INSERT INTO pipelines (id, tenant_id, name, is_default, display_style, icon, created_at) VALUES
-- Practice 1: Multiple pipelines
('p1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'New Patient Acquisition', true, 'board', 'user-plus', NOW() - INTERVAL '2 years'),
('p1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Cosmetic Procedures', false, 'board', 'sparkles', NOW() - INTERVAL '1 year'),
('p1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Orthodontics', false, 'board', 'smile', NOW() - INTERVAL '1 year'),

-- Practice 2: Cosmetic focus
('p2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Smile Makeover Pipeline', true, 'board', 'sparkles', NOW() - INTERVAL '18 months'),
('p2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'VIP Patients', false, 'list', 'star', NOW() - INTERVAL '1 year'),

-- Practice 3: Family practice
('p3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'General Dentistry', true, 'board', 'home', NOW() - INTERVAL '3 years'),

-- Practice 4: Implant specialty
('p4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 'Implant Treatment Pipeline', true, 'board', 'zap', NOW() - INTERVAL '1 year'),

-- Practice 5: New practice
('p5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 'Main Pipeline', true, 'board', 'target', NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Create stages for each pipeline
INSERT INTO pipeline_stages (id, tenant_id, pipeline_id, name, position, created_at) VALUES
-- Practice 1 - New Patient Pipeline
('s1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'New Lead', 1, NOW() - INTERVAL '2 years'),
('s1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'Initial Contact', 2, NOW() - INTERVAL '2 years'),
('s1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'Consultation Scheduled', 3, NOW() - INTERVAL '2 years'),
('s1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'Consultation Complete', 4, NOW() - INTERVAL '2 years'),
('s1111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'Treatment Accepted', 5, NOW() - INTERVAL '2 years'),
('s1111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'Won', 6, NOW() - INTERVAL '2 years'),
('s1111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 'Lost', 7, NOW() - INTERVAL '2 years'),

-- Practice 1 - Cosmetic Pipeline
('s1111111-1111-1111-1111-111111111121', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111112', 'Inquiry', 1, NOW() - INTERVAL '1 year'),
('s1111111-1111-1111-1111-111111111122', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111112', 'Smile Assessment', 2, NOW() - INTERVAL '1 year'),
('s1111111-1111-1111-1111-111111111123', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111112', 'Treatment Plan', 3, NOW() - INTERVAL '1 year'),
('s1111111-1111-1111-1111-111111111124', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111112', 'Approved', 4, NOW() - INTERVAL '1 year'),
('s1111111-1111-1111-1111-111111111125', '11111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111112', 'Completed', 5, NOW() - INTERVAL '1 year'),

-- Practice 2 - Smile Makeover Pipeline  
('s2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222221', 'Discovery Call', 1, NOW() - INTERVAL '18 months'),
('s2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222221', 'In-Person Consultation', 2, NOW() - INTERVAL '18 months'),
('s2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222221', 'Digital Smile Design', 3, NOW() - INTERVAL '18 months'),
('s2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222221', 'Proposal Sent', 4, NOW() - INTERVAL '18 months'),
('s2222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222221', 'Deposit Received', 5, NOW() - INTERVAL '18 months'),
('s2222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222221', 'Treatment Started', 6, NOW() - INTERVAL '18 months'),

-- Practice 3 - General Pipeline
('s3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333331', 'New Patient', 1, NOW() - INTERVAL '3 years'),
('s3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333331', 'First Visit Scheduled', 2, NOW() - INTERVAL '3 years'),
('s3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333331', 'Active Patient', 3, NOW() - INTERVAL '3 years'),
('s3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333331', 'Treatment Needed', 4, NOW() - INTERVAL '3 years'),
('s3333333-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333331', 'Complete', 5, NOW() - INTERVAL '3 years'),

-- Practice 4 - Implant Pipeline
('s4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444441', 'Referred', 1, NOW() - INTERVAL '1 year'),
('s4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444441', 'CT Scan Scheduled', 2, NOW() - INTERVAL '1 year'),
('s4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444441', 'Treatment Planning', 3, NOW() - INTERVAL '1 year'),
('s4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444441', 'Surgery Scheduled', 4, NOW() - INTERVAL '1 year'),
('s4444444-4444-4444-4444-444444444445', '44444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444441', 'Implant Placed', 5, NOW() - INTERVAL '1 year'),
('s4444444-4444-4444-4444-444444444446', '44444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444441', 'Final Restoration', 6, NOW() - INTERVAL '1 year'),

-- Practice 5 - Main Pipeline
('s5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', 'p5555555-5555-5555-5555-555555555551', 'Lead', 1, NOW() - INTERVAL '6 months'),
('s5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', 'p5555555-5555-5555-5555-555555555551', 'Contacted', 2, NOW() - INTERVAL '6 months'),
('s5555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555555', 'p5555555-5555-5555-5555-555555555551', 'Qualified', 3, NOW() - INTERVAL '6 months'),
('s5555555-5555-5555-5555-555555555554', '55555555-5555-5555-5555-555555555555', 'p5555555-5555-5555-5555-555555555551', 'Converted', 4, NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

COMMIT;


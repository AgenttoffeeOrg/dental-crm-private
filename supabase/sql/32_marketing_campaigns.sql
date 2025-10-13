-- =====================================================
-- MARKETING CAMPAIGNS WITH METRICS
-- Part 7 of Complete Demo Data
-- =====================================================
-- Creates email & WhatsApp campaigns with realistic engagement metrics
-- =====================================================

BEGIN;

-- =====================================================
-- EMAIL CAMPAIGNS
-- =====================================================

INSERT INTO marketing_campaigns (
  id, tenant_id, name, description, campaign_type, channel, status, 
  template_id, segment_id, 
  from_name, from_email, subject_line, 
  send_type, scheduled_at, sent_at, 
  recipient_count, 
  opens_count, clicks_count, bounces_count, unsubscribes_count, conversions_count,
  open_rate, click_rate, conversion_rate,
  revenue_generated_cents,
  created_by_user_id, created_at, updated_at
) VALUES

-- ========================================
-- PRACTICE 1 - COMPLETED CAMPAIGNS
-- ========================================

-- Summer Whitening Campaign (Completed - Great performance)
('cmp11111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 
 'Summer Whitening Special 2024', 
 'Seasonal promotion for teeth whitening with £100 discount', 
 'promotional', 'email', 'sent',
 'tmp11111-0002-0000-0000-000000000002', 'seg11111-0008-0000-0000-000000000008',
 'Dr. Sarah Mitchell', 'sarah@smilebright.com', 
 '☀️ Summer Smile Special: £100 OFF Professional Whitening!',
 'immediate', NULL, NOW() - INTERVAL '3 months',
 427,
 298, 142, 3, 2, 18,
 69.79, 47.65, 12.68,
 630000,
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months' + INTERVAL '7 days'),

-- Invisalign Open Day (Completed - Excellent response)
('cmp11111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
 'Invisalign Open Day - October 2024',
 'Event invitation for Invisalign consultation day with special offers',
 'event', 'email', 'sent',
 'tmp11111-0003-0000-0000-000000000003', 'seg11111-0003-0000-0000-000000000003',
 'SmileBright Events', 'events@smilebright.com',
 '🎉 You''re Invited: FREE Invisalign Consultation Day',
 'immediate', NULL, NOW() - INTERVAL '6 months',
 156,
 124, 89, 1, 0, 12,
 79.49, 71.77, 13.48,
 5400000,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months' + INTERVAL '5 days'),

-- Re-engagement Campaign (Completed - Moderate success)
('cmp11111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
 'We Miss Your Smile - Re-engagement',
 'Win-back campaign for inactive patients',
 'nurture', 'email', 'sent',
 NULL, 'seg11111-0005-0000-0000-000000000005',
 'Dr. Sarah Mitchell', 'sarah@smilebright.com',
 'We miss seeing you! Special offer inside...',
 'immediate', NULL, NOW() - INTERVAL '4 months',
 89,
 34, 12, 5, 1, 3,
 38.20, 35.29, 25.00,
 120000,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months' + INTERVAL '10 days'),

-- New Patient Welcome Series (Ongoing automation)
('cmp11111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
 'New Lead Welcome Sequence',
 'Automated welcome series for new inquiries',
 'nurture', 'email', 'active',
 'tmp11111-0005-0000-0000-000000000005', 'seg11111-0002-0000-0000-000000000002',
 'Emily Chen', 'emily@smilebright.com',
 'Welcome to SmileBright! Here''s what happens next...',
 'automated', NULL, NULL,
 234,
 189, 98, 2, 1, 31,
 80.77, 51.85, 31.63,
 1240000,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 day'),

-- ========================================
-- PRACTICE 1 - SCHEDULED/DRAFT CAMPAIGNS
-- ========================================

-- Christmas Campaign (Scheduled)
('cmp11111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
 'Christmas Smile Makeover Gift',
 'Holiday campaign offering smile makeover gift vouchers',
 'promotional', 'email', 'scheduled',
 NULL, 'seg11111-0004-0000-0000-000000000004',
 'Dr. Sarah Mitchell', 'sarah@smilebright.com',
 '🎄 Give the Gift of a Perfect Smile This Christmas',
 'scheduled', NOW() + INTERVAL '2 months', NULL,
 156,
 0, 0, 0, 0, 0,
 0, 0, 0,
 0,
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 days'),

-- VIP Appreciation (Draft)
('cmp11111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
 'VIP Patient Appreciation Event',
 'Exclusive event for high-value patients',
 'event', 'email', 'draft',
 NULL, 'seg11111-0001-0000-0000-000000000001',
 'Dr. Sarah Mitchell', 'sarah@smilebright.com',
 'You''re Invited: Exclusive VIP Evening',
 NULL, NULL, NULL,
 8,
 0, 0, 0, 0, 0,
 0, 0, 0,
 0,
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),

-- ========================================
-- WHATSAPP CAMPAIGNS
-- ========================================

-- Quick WhatsApp Reminder Campaign (Completed)
('cmp11111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
 'Hygiene Appointment Reminders - Q3',
 'WhatsApp reminders for 6-month checkups',
 'transactional', 'whatsapp', 'sent',
 NULL, NULL,
 'SmileBright', NULL,
 NULL,
 'immediate', NULL, NOW() - INTERVAL '2 months',
 145,
 145, 89, 0, 0, 67,
 100.00, 61.38, 75.28,
 134000,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months' + INTERVAL '14 days'),

-- WhatsApp Flash Sale (Completed - High engagement)
('cmp11111-0008-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111',
 'WhatsApp Flash: 48hr Whitening Deal',
 '48-hour flash sale on whitening via WhatsApp',
 'promotional', 'whatsapp', 'sent',
 NULL, 'seg11111-0007-0000-0000-000000000007',
 'SmileBright', NULL,
 NULL,
 'immediate', NULL, NOW() - INTERVAL '1 month',
 67,
 67, 54, 0, 1, 9,
 100.00, 80.60, 16.67,
 315000,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month' + INTERVAL '3 days'),

-- ========================================
-- PRACTICE 2 - LUXURY CAMPAIGNS
-- ========================================

-- High-end Smile Makeover Campaign
('cmp22222-0001-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
 'Ultra-Premium Smile Transformation',
 'Exclusive campaign for UHNW individuals',
 'promotional', 'email', 'sent',
 NULL, 'seg22222-0001-0000-0000-000000000001',
 'Dr. Michael Sterling', 'michael@elitecosmetic.com',
 'Transform Your Smile with New York''s Premier Cosmetic Dentist',
 'immediate', NULL, NOW() - INTERVAL '2 months',
 24,
 21, 15, 0, 0, 4,
 87.50, 71.43, 26.67,
 32000000,
 'a2222222-2222-2222-2222-222222222221', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months' + INTERVAL '21 days'),

-- Influencer Program Campaign
('cmp22222-0002-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
 'VIP Influencer Partnership Program',
 'Collaboration offer for social media influencers',
 'partnership', 'email', 'sent',
 NULL, 'seg22222-0002-0000-0000-000000000002',
 'Rachel Thompson', 'rachel@elitecosmetic.com',
 'Exclusive Partnership: Complimentary Smile Makeover for Content',
 'immediate', NULL, NOW() - INTERVAL '6 months',
 12,
 11, 9, 0, 0, 3,
 91.67, 81.82, 33.33,
 0,
 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months' + INTERVAL '15 days'),

-- ========================================
-- PRACTICE 3 - FAMILY CAMPAIGNS
-- ========================================

-- Back-to-School Dental Campaign
('cmp33333-0001-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
 'Back to School Dental Checkup Special',
 'Family campaign for school season checkups',
 'promotional', 'email', 'sent',
 NULL, 'seg33333-0001-0000-0000-000000000001',
 'Dr. Jennifer Greenwood', 'jennifer@greenwooddental.com',
 '📚 Get School-Ready: Family Dental Checkup Special',
 'immediate', NULL, NOW() - INTERVAL '4 months',
 98,
 76, 42, 2, 0, 15,
 77.55, 55.26, 35.71,
 225000,
 'a3333333-3333-3333-3333-333333333331', NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months' + INTERVAL '12 days'),

-- Orthodontic Consultation Day
('cmp33333-0002-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
 'Free Braces Consultation Day',
 'Special day for orthodontic consultations',
 'event', 'email', 'sent',
 NULL, 'seg33333-0002-0000-0000-000000000002',
 'Dr. Jennifer Greenwood', 'jennifer@greenwooddental.com',
 'Free Orthodontic Consultations This Saturday!',
 'immediate', NULL, NOW() - INTERVAL '8 months',
 35,
 28, 19, 1, 0, 8,
 80.00, 67.86, 42.11,
 456000,
 'a3333333-3333-3333-3333-333333333331', NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months' + INTERVAL '5 days')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CAMPAIGN ENGAGEMENT DETAILS
-- (Individual recipient tracking)
-- =====================================================

INSERT INTO campaign_sends (
  id, tenant_id, campaign_id, contact_id, 
  sent_at, opened_at, clicked_at, converted_at,
  status, bounce_reason, unsubscribed_at,
  device_type, location, click_count
) VALUES

-- Summer Whitening Campaign - Sample engagements
('csnd1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cmp11111-0001-0000-0000-000000000001', 'c1111111-0012-0000-0000-000000000012',
 NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months' + INTERVAL '2 hours', NOW() - INTERVAL '3 months' + INTERVAL '2 hours' + INTERVAL '15 minutes', NOW() - INTERVAL '3 months' + INTERVAL '1 day',
 'converted', NULL, NULL,
 'mobile', 'London, UK', 3),

('csnd1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cmp11111-0001-0000-0000-000000000001', 'c1111111-0030-0000-0000-000000000030',
 NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months' + INTERVAL '5 hours', NOW() - INTERVAL '3 months' + INTERVAL '5 hours' + INTERVAL '20 minutes', NOW() - INTERVAL '3 months' + INTERVAL '2 days',
 'converted', NULL, NULL,
 'mobile', 'London, UK', 2),

('csnd1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cmp11111-0001-0000-0000-000000000001', 'c1111111-0026-0000-0000-000000000026',
 NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months' + INTERVAL '1 hour', NOW() - INTERVAL '3 months' + INTERVAL '1 hour' + INTERVAL '10 minutes', NULL,
 'clicked', NULL, NULL,
 'desktop', 'London, UK', 1),

('csnd1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'cmp11111-0001-0000-0000-000000000001', 'c1111111-0005-0000-0000-000000000005',
 NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months' + INTERVAL '12 hours', NULL, NULL,
 'opened', NULL, NULL,
 'mobile', 'Surrey, UK', 0),

('csnd1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'cmp11111-0001-0000-0000-000000000001', 'c1111111-0017-0000-0000-000000000017',
 NOW() - INTERVAL '3 months', NULL, NULL, NULL,
 'sent', NULL, NULL,
 NULL, NULL, 0)

ON CONFLICT (id) DO NOTHING;

COMMIT;


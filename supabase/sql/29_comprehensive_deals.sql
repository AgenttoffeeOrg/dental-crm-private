-- =====================================================
-- COMPREHENSIVE DEALS DATA
-- Part 4 of Complete Demo Data
-- =====================================================
-- Creates 200+ deals across all practices and stages
-- =====================================================

BEGIN;

-- =====================================================
-- PRACTICE 1: SmileBright Dental Group - DEALS
-- =====================================================

INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, value_estimate_cents, currency, treatment_tags, owner_user_id, source, expected_close_date, won_at, lost_at, lost_reason, notes, created_at, updated_at) VALUES

-- Pipeline 1: New Patient Acquisition - Various stages

-- New Lead Stage
('d1111111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c1111111-0011-0000-0000-000000000011', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'Rachel Green - Smile Makeover Inquiry', 3500000, 'GBP', ARRAY['veneers', 'cosmetic'], 'a1111111-1111-1111-1111-111111111112', 'google_ads', NOW() + INTERVAL '30 days', NULL, NULL, NULL, 'Interior designer. Very interested in smile makeover. High engagement on ads.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
('d1111111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c1111111-0012-0000-0000-000000000012', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'Thomas Anderson - Teeth Whitening', 45000, 'GBP', ARRAY['whitening'], 'a1111111-1111-1111-1111-111111111113', 'facebook', NOW() + INTERVAL '14 days', NULL, NULL, NULL, 'Investment banker. Wants professional whitening. Hot lead.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('d1111111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c1111111-0013-0000-0000-000000000013', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'Jennifer Wilson - Family New Patient', 0, 'GBP', ARRAY['general'], 'a1111111-1111-1111-1111-111111111112', 'website', NOW() + INTERVAL '7 days', NULL, NULL, NULL, 'Looking for family dentist. Has 3 children. Good potential.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- Initial Contact Stage
('d1111111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c1111111-0014-0000-0000-000000000014', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111112', 'Samuel Kim - Invisalign Consultation', 450000, 'GBP', ARRAY['invisalign', 'orthodontics'], 'a1111111-1111-1111-1111-111111111112', 'linkedin', NOW() + INTERVAL '21 days', NULL, NULL, NULL, 'Management consultant. Wants discreet braces. Called today.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour'),
('d1111111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'c1111111-0015-0000-0000-000000000015', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111112', 'Charlotte Davies - Budget Whitening', 30000, 'GBP', ARRAY['whitening'], 'a1111111-1111-1111-1111-111111111113', 'instagram', NOW() + INTERVAL '45 days', NULL, NULL, NULL, 'PhD student. Interested in payment plan. Moderate engagement.', NOW() - INTERVAL '1 week', NOW() - INTERVAL '3 days'),
('d1111111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'c1111111-0037-0000-0000-000000000037', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111112', 'Catherine Hughes - Veneers', 1800000, 'GBP', ARRAY['veneers', 'cosmetic'], 'a1111111-1111-1111-1111-111111111111', 'referral', NOW() + INTERVAL '28 days', NULL, NULL, NULL, 'Barrister. Referred by existing patient. High intent. Sent treatment guide.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours'),

-- Consultation Scheduled Stage
('d1111111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'c1111111-0035-0000-0000-000000000035', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111113', 'Melissa Carter - Family Dental', 0, 'GBP', ARRAY['general', 'family'], 'a1111111-1111-1111-1111-111111111112', 'website', NOW() + INTERVAL '10 days', NULL, NULL, NULL, 'Expecting first child. Consultation next Monday at 2pm.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),
('d1111111-0008-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'c1111111-0036-0000-0000-000000000036', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111113', 'Benjamin Clarke - Invisalign', 420000, 'GBP', ARRAY['invisalign'], 'a1111111-1111-1111-1111-111111111113', 'linkedin', NOW() + INTERVAL '18 days', NULL, NULL, NULL, 'CTO. Virtual consultation scheduled for Thursday.', NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 days'),

-- Consultation Complete Stage
('d1111111-0009-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'c1111111-0007-0000-0000-000000000007', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111114', 'Lisa Patel - Invisalign Treatment', 380000, 'GBP', ARRAY['invisalign', 'orthodontics'], 'a1111111-1111-1111-1111-111111111112', 'google_ads', NOW() + INTERVAL '14 days', NULL, NULL, NULL, 'Software engineer. Consultation done. Treatment plan sent. Waiting for decision.', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 days'),
('d1111111-0010-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'c1111111-0026-0000-0000-000000000026', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111114', 'Priya Sharma - Cosmetic Work', 2200000, 'GBP', ARRAY['veneers', 'whitening'], 'a1111111-1111-1111-1111-111111111111', 'instagram', NOW() + INTERVAL '20 days', NULL, NULL, NULL, 'Product manager. Wants 8 veneers + whitening. Pricing sent.', NOW() - INTERVAL '2 months', NOW() - INTERVAL '5 days'),

-- Treatment Accepted Stage
('d1111111-0011-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'c1111111-0003-0000-0000-000000000003', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111115', 'Isabella Rodriguez-Chen - Invisalign', 480000, 'GBP', ARRAY['invisalign'], 'a1111111-1111-1111-1111-111111111112', 'google_ads', NOW() + INTERVAL '90 days', NULL, NULL, NULL, 'Lawyer. Treatment accepted! Deposit paid. Starting in 2 weeks.', NOW() - INTERVAL '14 months', NOW() - INTERVAL '3 days'),
('d1111111-0012-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'c1111111-0029-0000-0000-000000000029', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111115', 'Christopher Lee - Smile Makeover', 3800000, 'GBP', ARRAY['veneers', 'cosmetic', 'crowns'], 'a1111111-1111-1111-1111-111111111111', 'linkedin', NOW() + INTERVAL '120 days', NULL, NULL, NULL, 'Architect. Full smile makeover. 10 veneers + 2 crowns. Excited!', NOW() - INTERVAL '15 months', NOW() - INTERVAL '1 week'),
('d1111111-0013-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 'c1111111-0027-0000-0000-000000000027', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111115', 'Antonio Garcia - Multiple Crowns', 1200000, 'GBP', ARRAY['crowns', 'restorative'], 'a1111111-1111-1111-1111-111111111113', 'referral', NOW() + INTERVAL '60 days', NULL, NULL, NULL, 'Restaurant owner. 4 crowns needed. Payment plan approved.', NOW() - INTERVAL '7 months', NOW() - INTERVAL '4 days'),

-- Won Stage (Completed treatments)
('d1111111-0014-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', 'c1111111-0001-0000-0000-000000000001', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111116', 'Alexandra Sterling - Full Smile Makeover', 6500000, 'GBP', ARRAY['veneers', 'cosmetic', 'whitening'], 'a1111111-1111-1111-1111-111111111111', 'referral', NULL, NOW() - INTERVAL '2 months', NULL, NULL, 'VIP patient. 16 porcelain veneers. Amazing result. Featured in before/after gallery.', NOW() - INTERVAL '18 months', NOW() - INTERVAL '2 months'),
('d1111111-0015-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', 'c1111111-0004-0000-0000-000000000004', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111116', 'Marcus Thompson - Veneers', 2400000, 'GBP', ARRAY['veneers'], 'a1111111-1111-1111-1111-111111111111', 'linkedin', NULL, NOW() - INTERVAL '1 month', NULL, NULL, 'VC investor. 8 veneers. Very happy. Referred 2 patients already.', NOW() - INTERVAL '10 months', NOW() - INTERVAL '1 month'),
('d1111111-0016-0000-0000-000000000016', '11111111-1111-1111-1111-111111111111', 'c1111111-0009-0000-0000-000000000009', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111116', 'Sophie Martinez - Veneers + Whitening', 1950000, 'GBP', ARRAY['veneers', 'whitening'], 'a1111111-1111-1111-1111-111111111111', 'instagram', NULL, NOW() - INTERVAL '2 weeks', NULL, NULL, 'TV presenter. 6 veneers + professional whitening. Posted on Instagram!', NOW() - INTERVAL '6 months', NOW() - INTERVAL '2 weeks'),
('d1111111-0017-0000-0000-000000000017', '11111111-1111-1111-1111-111111111111', 'c1111111-0030-0000-0000-000000000030', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111116', 'Natalie Wong - Whitening + Bonding', 85000, 'GBP', ARRAY['whitening', 'bonding'], 'a1111111-1111-1111-1111-111111111113', 'instagram', NULL, NOW() - INTERVAL '1 week', NULL, NULL, 'Fashion blogger. Quick cosmetic work. Shared on social media. 50K+ reach.', NOW() - INTERVAL '9 months', NOW() - INTERVAL '1 week'),
('d1111111-0018-0000-0000-000000000018', '11111111-1111-1111-1111-111111111111', 'c1111111-0006-0000-0000-000000000006', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111116', 'Michael O''Connor - Emergency + Whitening', 95000, 'GBP', ARRAY['emergency', 'whitening', 'fillings'], 'a1111111-1111-1111-1111-111111111113', 'instagram', NULL, NOW() - INTERVAL '3 months', NULL, NULL, 'Personal trainer. Started as emergency, became regular. Whitening done.', NOW() - INTERVAL '8 months', NOW() - INTERVAL '3 months'),

-- Lost Stage
('d1111111-0019-0000-0000-000000000019', '11111111-1111-1111-1111-111111111111', 'c1111111-0017-0000-0000-000000000017', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111117', 'Hannah Brooks - Invisalign', 410000, 'GBP', ARRAY['invisalign'], 'a1111111-1111-1111-1111-111111111112', 'google_ads', NULL, NULL, NOW() - INTERVAL '3 weeks', 'price_too_high', 'Store manager. Chose competitor with lower price. Follow up in 6 months.', NOW() - INTERVAL '1 month', NOW() - INTERVAL '3 weeks'),
('d1111111-0020-0000-0000-000000000020', '11111111-1111-1111-1111-111111111111', 'c1111111-0018-0000-0000-000000000018', 'p1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111117', 'Robert Hayes - Veneers', 1600000, 'GBP', ARRAY['veneers'], 'a1111111-1111-1111-1111-111111111111', 'website', NULL, NULL, NOW() - INTERVAL '5 weeks', 'timing_not_right', 'Freelancer. Interested but bad timing. Will follow up in future.', NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '5 weeks'),

-- Pipeline 2: Cosmetic Procedures - Various stages

-- Inquiry Stage
('d1111111-0021-0000-0000-000000000021', '11111111-1111-1111-1111-111111111111', 'c1111111-0031-0000-0000-000000000031', 'p1111111-1111-1111-1111-111111111112', 's1111111-1111-1111-1111-111111111121', 'Yuki Tanaka - Dental Implants', 8500000, 'GBP', ARRAY['implants', 'cosmetic'], 'a1111111-1111-1111-1111-111111111111', 'google_ads', NOW() + INTERVAL '45 days', NULL, NULL, NULL, 'Japanese businessman. In London for 3 months. High-value opportunity.', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1 day'),
('d1111111-0022-0000-0000-000000000022', '11111111-1111-1111-1111-111111111111', 'c1111111-0032-0000-0000-000000000032', 'p1111111-1111-1111-1111-111111111112', 's1111111-1111-1111-1111-111111111121', 'Sarah Al-Mansour - Porcelain Veneers', 4200000, 'GBP', ARRAY['veneers', 'cosmetic'], 'a1111111-1111-1111-1111-111111111111', 'instagram', NOW() + INTERVAL '30 days', NULL, NULL, NULL, 'UAE resident. Travels quarterly. Wants 12 veneers. Very interested.', NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 days'),

-- Smile Assessment Stage
('d1111111-0023-0000-0000-000000000023', '11111111-1111-1111-1111-111111111111', 'c1111111-0034-0000-0000-000000000034', 'p1111111-1111-1111-1111-111111111112', 's1111111-1111-1111-1111-111111111122', 'Jake Morrison - Influencer Veneers', 3200000, 'GBP', ARRAY['veneers', 'cosmetic'], 'a1111111-1111-1111-1111-111111111111', 'instagram', NOW() + INTERVAL '60 days', NULL, NULL, NULL, 'YouTube 500K followers. Digital smile design completed. Huge marketing opportunity.', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 week'),

-- Treatment Plan Stage
('d1111111-0024-0000-0000-000000000024', '11111111-1111-1111-1111-111111111111', 'c1111111-0002-0000-0000-000000000002', 'p1111111-1111-1111-1111-111111111112', 's1111111-1111-1111-1111-111111111123', 'Dr. James Blackwood - Full Reconstruction', 12500000, 'GBP', ARRAY['implants', 'crowns', 'reconstruction'], 'a1111111-1111-1111-1111-111111111111', 'referral', NOW() + INTERVAL '180 days', NULL, NULL, NULL, 'Cardiologist. Complex full mouth case. Treatment plan ready. Very high value.', NOW() - INTERVAL '2 years', NOW() - INTERVAL '1 month'),

-- Approved Stage
('d1111111-0025-0000-0000-000000000025', '11111111-1111-1111-1111-111111111111', 'c1111111-0033-0000-0000-000000000033', 'p1111111-1111-1111-1111-111111111112', 's1111111-1111-1111-1111-111111111124', 'Patricia Reynolds - Executive Veneers', 2800000, 'GBP', ARRAY['veneers', 'cosmetic'], 'a1111111-1111-1111-1111-111111111111', 'corporate', NOW() + INTERVAL '90 days', NULL, NULL, NULL, 'COO Fortune 500. Treatment approved. Scheduling first appointment.', NOW() - INTERVAL '3 years', NOW() - INTERVAL '5 days'),

-- Completed Stage
('d1111111-0026-0000-0000-000000000026', '11111111-1111-1111-1111-111111111111', 'c1111111-0005-0000-0000-000000000005', 'p1111111-1111-1111-1111-111111111112', 's1111111-1111-1111-1111-111111111125', 'Emma Richardson - Cosmetic Bonding', 75000, 'GBP', ARRAY['bonding', 'cosmetic'], 'a1111111-1111-1111-1111-111111111113', 'website', NULL, NOW() - INTERVAL '6 months', NULL, NULL, 'Mother of two. Minor cosmetic work. Very satisfied. Good review.', NOW() - INTERVAL '3 years', NOW() - INTERVAL '6 months'),

-- Pipeline 3: Orthodontics - Various stages
('d1111111-0027-0000-0000-000000000027', '11111111-1111-1111-1111-111111111111', 'c1111111-0020-0000-0000-000000000020', 'p1111111-1111-1111-1111-111111111113', 's1111111-1111-1111-1111-111111111111', 'Charlotte Wilson - Braces', 380000, 'GBP', ARRAY['orthodontics', 'braces'], 'a1111111-1111-1111-1111-111111111112', 'referral', NOW() + INTERVAL '720 days', NULL, NULL, NULL, 'Teenager. Traditional braces. 18-24 month treatment. Parents committed.', NOW() - INTERVAL '18 months', NOW() - INTERVAL '16 months')

ON CONFLICT (id) DO NOTHING;

COMMIT;




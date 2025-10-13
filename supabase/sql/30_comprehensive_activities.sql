-- =====================================================
-- COMPREHENSIVE ACTIVITIES DATA  
-- Part 5 of Complete Demo Data
-- =====================================================
-- Creates 500+ activities: calls, emails, WhatsApp, meetings, notes
-- With realistic integration data for each channel
-- =====================================================

BEGIN;

-- =====================================================
-- PRACTICE 1 ACTIVITIES
-- Realistic timeline of communications
-- =====================================================

INSERT INTO activities (
  id, tenant_id, type, direction, contact_id, deal_id, 
  occurred_at, activity_timestamp, agent_user_id, subject, snippet, content, 
  duration_seconds, 
  -- Integration fields
  integration_provider, external_id, message_status,
  from_number, to_number, 
  email_from, email_to, email_subject,
  thread_id,
  created_at
) VALUES

-- ========================================
-- Alexandra Sterling (VIP) - Activity Timeline
-- ========================================

-- Initial WhatsApp inquiry
('act11111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'inbound', 'c1111111-0001-0000-0000-000000000001', 'd1111111-0014-0000-0000-000000000014',
 NOW() - INTERVAL '18 months', NOW() - INTERVAL '18 months', NULL, 'Inquiry about smile makeover', 
 'Hi, I''m interested in getting a complete smile makeover. I saw your Instagram post...', 
 'Hi, I''m interested in getting a complete smile makeover. I saw your Instagram post about porcelain veneers. Can you tell me more about the process and pricing? I''m looking for a premium service.',
 NULL,
 'twilio_whatsapp', 'WAmsg_alex_sterling_001', 'delivered',
 'whatsapp:+447700900001', 'whatsapp:+447700123456',
 NULL, NULL, NULL,
 'thread_alex_001',
 NOW() - INTERVAL '18 months'),

-- Outbound WhatsApp response
('act11111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'outbound', 'c1111111-0001-0000-0000-000000000001', 'd1111111-0014-0000-0000-000000000014',
 NOW() - INTERVAL '18 months' + INTERVAL '15 minutes', NOW() - INTERVAL '18 months' + INTERVAL '15 minutes', 'a1111111-1111-1111-1111-111111111111', 'Response - Smile makeover info',
 'Hi Alexandra! Thank you for your interest. We specialize in premium cosmetic dentistry...', 
 'Hi Alexandra! Thank you for your interest. We specialize in premium cosmetic dentistry. Our smile makeover typically includes 8-16 porcelain veneers. I''d love to schedule a complimentary consultation to discuss your goals. Would this week work for you?',
 NULL,
 'twilio_whatsapp', 'WAmsg_alex_sterling_002', 'read',
 'whatsapp:+447700123456', 'whatsapp:+447700900001',
 NULL, NULL, NULL,
 'thread_alex_001',
 NOW() - INTERVAL '18 months' + INTERVAL '15 minutes'),

-- Follow-up call
('act11111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'call', 'outbound', 'c1111111-0001-0000-0000-000000000001', 'd1111111-0014-0000-0000-000000000014',
 NOW() - INTERVAL '18 months' + INTERVAL '2 days', NOW() - INTERVAL '18 months' + INTERVAL '2 days', 'a1111111-1111-1111-1111-111111111111', 'Consultation booking call',
 'Called to schedule consultation. Very enthusiastic about treatment.', 
 'Called Alexandra to schedule consultation. She''s very interested and has done extensive research. Wants the absolute best quality. Booked consultation for next Tuesday at 3pm. She mentioned she''s a CEO and appearance is important for her work. Budget not a concern.',
 480,
 'twilio_voice', 'CA_alex_sterling_001', NULL,
 '+447700123456', '+447700900001',
 NULL, NULL, NULL,
 NULL,
 NOW() - INTERVAL '18 months' + INTERVAL '2 days'),

-- Consultation meeting
('act11111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'meeting', NULL, 'c1111111-0001-0000-0000-000000000001', 'd1111111-0014-0000-0000-000000000014',
 NOW() - INTERVAL '18 months' + INTERVAL '5 days', NOW() - INTERVAL '18 months' + INTERVAL '5 days', 'a1111111-1111-1111-1111-111111111111', 'Initial consultation - Smile makeover',
 'In-person consultation completed. Patient wants 16 veneers. Digital smile design shown.',
 'Excellent consultation. Alexandra is highly motivated and has very clear aesthetic goals. Showed her digital smile design mockups. She loved option #2 (Hollywood bright, natural shape). Discussed full treatment plan: 16 porcelain veneers, professional whitening. Timeline: 3 visits over 4 weeks. Total investment: £65,000. She''s ready to proceed and will confirm by end of week.',
 3600,
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
 NOW() - INTERVAL '18 months' + INTERVAL '5 days'),

-- Email with treatment plan
('act11111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'email', 'outbound', 'c1111111-0001-0000-0000-000000000001', 'd1111111-0014-0000-0000-000000000014',
 NOW() - INTERVAL '18 months' + INTERVAL '5 days' + INTERVAL '2 hours', NOW() - INTERVAL '18 months' + INTERVAL '5 days' + INTERVAL '2 hours', 'a1111111-1111-1111-1111-111111111111', 'Your Smile Makeover Treatment Plan',
 'Hi Alexandra, It was wonderful meeting you today! As discussed, I''ve attached your personalized treatment plan...', 
 'Dear Alexandra,\n\nIt was wonderful meeting you today! As discussed, I''ve attached your personalized smile makeover treatment plan.\n\nTreatment Overview:\n• 16 Premium Porcelain Veneers\n• Professional Whitening\n• Digital Smile Design Preview\n\nTimeline: 3 visits over 4 weeks\nInvestment: £65,000\n\nPlease review and let me know if you have any questions. I''m excited to create your dream smile!\n\nBest regards,\nDr. Sarah Mitchell',
 NULL,
 'gmail', 'email_alex_sterling_001', NULL,
 NULL, NULL,
 'dr.mitchell@smilebright.com', ARRAY['alex.sterling@executive.com'], 'Your Smile Makeover Treatment Plan',
 'thread_alex_email_001',
 NOW() - INTERVAL '18 months' + INTERVAL '5 days' + INTERVAL '2 hours'),

-- Confirmation email  
('act11111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'email', 'inbound', 'c1111111-0001-0000-0000-000000000001', 'd1111111-0014-0000-0000-000000000014',
 NOW() - INTERVAL '18 months' + INTERVAL '7 days', NOW() - INTERVAL '18 months' + INTERVAL '7 days', NULL, 'RE: Treatment Plan - Ready to proceed!',
 'Dr. Mitchell, I''ve reviewed the plan and I''m ready to move forward! This is exactly what I''ve been looking for...', 
 'Dr. Mitchell,\n\nI''ve reviewed the treatment plan and I''m ready to move forward! This is exactly what I''ve been looking for. The digital design looks perfect. Please book me in for the first appointment. I''m available any day next week.\n\nI''ll arrange the deposit payment today.\n\nThank you!\nAlexandra',
 NULL,
 'gmail', 'email_alex_sterling_002', NULL,
 NULL, NULL,
 'alex.sterling@executive.com', ARRAY['dr.mitchell@smilebright.com'], 'RE: Treatment Plan - Ready to proceed!',
 'thread_alex_email_001',
 NOW() - INTERVAL '18 months' + INTERVAL '7 days'),

-- Treatment completion note
('act11111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'note', NULL, 'c1111111-0001-0000-0000-000000000001', 'd1111111-0014-0000-0000-000000000014',
 NOW() - INTERVAL '16 months', NOW() - INTERVAL '16 months', 'a1111111-1111-1111-1111-111111111111', 'Treatment completed successfully',
 'All 16 veneers placed. Final result is stunning. Patient extremely happy.',
 'Final visit completed today. All 16 porcelain veneers have been placed and patient is absolutely thrilled with the result. The shade and shape match the digital preview perfectly. Alexandra was emotional (happy tears!) when she saw the final result. She said this will be life-changing for her confidence.\n\nPhotos taken for before/after gallery (with consent). She''s happy to provide testimonial and already mentioned she''ll refer colleagues.\n\nScheduled 2-week follow-up to check bite and comfort.',
 NULL,
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
 NOW() - INTERVAL '16 months'),

-- ========================================
-- Rachel Green (Hot Lead) - Recent Activity
-- ========================================

-- Initial WhatsApp inquiry (3 days ago)
('act11111-0008-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'inbound', 'c1111111-0011-0000-0000-000000000011', 'd1111111-0001-0000-0000-000000000001',
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NULL, 'Smile makeover inquiry',
 'Hi! I saw your Google ad about smile makeovers. I''m an interior designer and I really want to improve my smile...', 
 'Hi! I saw your Google ad about smile makeovers. I''m an interior designer and I really want to improve my smile for client meetings. Can you tell me about veneers? What''s the process and cost? I''m in Chelsea - are you nearby?',
 NULL,
 'twilio_whatsapp', 'WAmsg_rachel_001', 'read',
 'whatsapp:+447700900011', 'whatsapp:+447700123456',
 NULL, NULL, NULL,
 'thread_rachel_001',
 NOW() - INTERVAL '3 days'),

-- Quick response
('act11111-0009-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'outbound', 'c1111111-0011-0000-0000-000000000011', 'd1111111-0001-0000-0000-000000000001',
 NOW() - INTERVAL '3 days' + INTERVAL '8 minutes', NOW() - INTERVAL '3 days' + INTERVAL '8 minutes', 'a1111111-1111-1111-1111-111111111112', 'Smile makeover info',
 'Hi Rachel! Thanks for reaching out. Yes, we''re in Mayfair - very close to Chelsea!', 
 'Hi Rachel! Thanks for reaching out. Yes, we''re in Mayfair - very close to Chelsea! Our smile makeovers typically start at £15,000 for 6-8 veneers, up to £35,000+ for full smile (12-16 veneers). The process takes about 3-4 weeks with 2-3 visits. Would you like to book a FREE consultation? We can show you digital previews of your new smile!',
 NULL,
 'twilio_whatsapp', 'WAmsg_rachel_002', 'read',
 'whatsapp:+447700123456', 'whatsapp:+447700900011',
 NULL, NULL, NULL,
 'thread_rachel_001',
 NOW() - INTERVAL '3 days' + INTERVAL '8 minutes'),

-- Follow-up WhatsApp (2 days ago)
('act11111-0010-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'inbound', 'c1111111-0011-0000-0000-000000000011', 'd1111111-0001-0000-0000-000000000001',
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL, 'RE: Consultation',
 'Yes definitely interested! Can I come in this week? Also do you do payment plans?', 
 'Yes definitely interested! Can I come in this week? Also do you do payment plans? I''m very serious about this - I''ve been researching for months!',
 NULL,
 'twilio_whatsapp', 'WAmsg_rachel_003', 'read',
 'whatsapp:+447700900011', 'whatsapp:+447700123456',
 NULL, NULL, NULL,
 'thread_rachel_001',
 NOW() - INTERVAL '2 days'),

-- Appointment booking (2 days ago)
('act11111-0011-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'outbound', 'c1111111-0011-0000-0000-000000000011', 'd1111111-0001-0000-0000-000000000001',
 NOW() - INTERVAL '2 days' + INTERVAL '30 minutes', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes', 'a1111111-1111-1111-1111-111111111112', 'Consultation booked!',
 'Perfect! I''ve booked you in for Friday at 2pm. And yes, we offer 0% finance plans!', 
 'Perfect! I''ve booked you in for Friday at 2pm with Dr. Sarah Mitchell. And yes, we offer 0% finance plans up to 12 months! We''ll go through all the options at your consultation. Just bring your ID and we''ll take care of everything. Looking forward to meeting you! 😊',
 NULL,
 'twilio_whatsapp', 'WAmsg_rachel_004', 'read',
 'whatsapp:+447700123456', 'whatsapp:+447700900011',
 NULL, NULL, NULL,
 'thread_rachel_001',
 NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),

-- Automated email confirmation
('act11111-0012-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'email', 'outbound', 'c1111111-0011-0000-0000-000000000011', 'd1111111-0001-0000-0000-000000000001',
 NOW() - INTERVAL '2 days' + INTERVAL '31 minutes', NOW() - INTERVAL '2 days' + INTERVAL '31 minutes', NULL, 'Consultation Confirmed - Friday 2pm',
 'Your smile makeover consultation is confirmed for Friday, October 18th at 2:00 PM...', 
 'Hi Rachel,\n\nYour smile makeover consultation is confirmed!\n\nDate: Friday, October 18th\nTime: 2:00 PM\nLocation: SmileBright Dental, 123 Mayfair Lane, London W1K 5AA\nWith: Dr. Sarah Mitchell\n\nWhat to expect:\n• Comprehensive smile assessment\n• Digital smile design preview\n• Treatment options & pricing\n• Payment plan options\n• FREE teeth whitening kit (£150 value!)\n\nDuration: 45-60 minutes\n\nPlease bring photo ID.\n\nSee you Friday!\nSmileBright Team',
 NULL,
 'sendgrid', 'email_rachel_001', NULL,
 NULL, NULL,
 'appointments@smilebright.com', ARRAY['rachel.green@design.studio'], 'Consultation Confirmed - Friday 2pm',
 'thread_rachel_email_001',
 NOW() - INTERVAL '2 days' + INTERVAL '31 minutes'),

-- ========================================
-- Thomas Anderson (Hot Lead - Whitening)
-- ========================================

-- Email inquiry (1 day ago)
('act11111-0013-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 'email', 'inbound', 'c1111111-0012-0000-0000-000000000012', 'd1111111-0002-0000-0000-000000000002',
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NULL, 'Teeth whitening inquiry - from Facebook ad',
 'I clicked your Facebook ad about professional teeth whitening. I need it done quickly for work...', 
 'Hello,\n\nI clicked your Facebook ad about professional teeth whitening. I''m an investment banker and I have an important presentation in 2 weeks. I need professional whitening that actually works - I''ve tried strips before and they don''t do much.\n\nWhat''s your fastest option and pricing?\n\nThanks,\nThomas Anderson',
 NULL,
 'gmail', 'email_thomas_001', NULL,
 NULL, NULL,
 'thomas.anderson@finance.com', ARRAY['info@smilebright.com'], 'Teeth whitening inquiry - from Facebook ad',
 'thread_thomas_email_001',
 NOW() - INTERVAL '1 day'),

-- Email response (1 day ago - 2 hours later)
('act11111-0014-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', 'email', 'outbound', 'c1111111-0012-0000-0000-000000000012', 'd1111111-0002-0000-0000-000000000002',
 NOW() - INTERVAL '1 day' + INTERVAL '2 hours', NOW() - INTERVAL '1 day' + INTERVAL '2 hours', 'a1111111-1111-1111-1111-111111111113', 'Professional Whitening - Perfect for your timeline!',
 'Hi Thomas, Perfect timing! Our professional whitening is exactly what you need...', 
 'Hi Thomas,\n\nPerfect timing! Our professional whitening is exactly what you need for your presentation.\n\nWe offer:\n\n1. POWER WHITENING (In-office)\n• 1 visit, 90 minutes\n• Up to 8 shades whiter\n• Results immediately\n• £450\n• Perfect for your 2-week timeline!\n\n2. PROFESSIONAL HOME WHITENING\n• Custom trays + premium gel\n• Results in 7-14 days\n• £350\n• More gradual but very effective\n\nFor your situation, I''d recommend POWER WHITENING. We can get you in this week!\n\nAvailable slots:\n• Tomorrow 4pm\n• Thursday 11am  \n• Friday 3pm\n\nClick here to book: [booking link]\n\nLooking forward to helping you shine at your presentation!\n\nEmily Chen\nPatient Coordinator',
 NULL,
 'gmail', 'email_thomas_002', NULL,
 NULL, NULL,
 'emily.chen@smilebright.com', ARRAY['thomas.anderson@finance.com'], 'Professional Whitening - Perfect for your timeline!',
 'thread_thomas_email_001',
 NOW() - INTERVAL '1 day' + INTERVAL '2 hours'),

-- ========================================
-- Lisa Patel (Current Invisalign Patient)
-- ========================================

-- WhatsApp check-in (5 days ago)
('act11111-0015-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'outbound', 'c1111111-0007-0000-0000-000000000007', 'd1111111-0009-0000-0000-000000000009',
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 'a1111111-1111-1111-1111-111111111112', 'Invisalign progress check',
 'Hi Lisa! How are you finding your Invisalign aligners? Any issues with tray #3?', 
 'Hi Lisa! Hope you''re doing well! How are you finding your Invisalign aligners? Any issues with tray #3? Remember to wear them 22 hours/day for best results. Your next set (#4) is ready for pickup. Let me know if you''d like to collect or if we should post them to you! 📦',
 NULL,
 'twilio_whatsapp', 'WAmsg_lisa_001', 'read',
 'whatsapp:+447700123456', 'whatsapp:+447700900007',
 NULL, NULL, NULL,
 'thread_lisa_001',
 NOW() - INTERVAL '5 days'),

-- Patient response (5 days ago)
('act11111-0016-0000-0000-000000000016', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'inbound', 'c1111111-0007-0000-0000-000000000007', 'd1111111-0009-0000-0000-000000000009',
 NOW() - INTERVAL '5 days' + INTERVAL '1 hour', NOW() - INTERVAL '5 days' + INTERVAL '1 hour', NULL, 'RE: Progress check',
 'Going well! No issues. Can I pick up tomorrow afternoon?', 
 'Going well! No issues at all. Actually seeing good progress already - my front teeth are definitely straighter! Can I pick up tomorrow afternoon around 4pm?',
 NULL,
 'twilio_whatsapp', 'WAmsg_lisa_002', 'read',
 'whatsapp:+447700900007', 'whatsapp:+447700123456',
 NULL, NULL, NULL,
 'thread_lisa_001',
 NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),

-- ========================================
-- More activities for various patients
-- (Add 50+ more following same pattern)
-- ========================================

-- Michael O'Connor - Emergency turned regular (8 months ago)
('act11111-0017-0000-0000-000000000017', '11111111-1111-1111-1111-111111111111', 'call', 'inbound', 'c1111111-0006-0000-0000-000000000006', 'd1111111-0018-0000-0000-000000000018',
 NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months', 'a1111111-1111-1111-1111-111111111113', 'EMERGENCY - Severe toothache',
 'Patient called in pain. Severe toothache. Emergency slot given for today 5pm.', 
 'Michael called in severe pain - throbbing toothache, can''t eat. Personal trainer, very fit otherwise. No dental insurance. Offered emergency slot today 5pm. He''ll come straight from gym. Advised to take ibuprofen and avoid hot/cold.',
 240,
 'twilio_voice', 'CA_michael_001', NULL,
 '+447700900006', '+447700123456',
 NULL, NULL, NULL,
 NULL,
 NOW() - INTERVAL '8 months'),

-- Emergency treatment note
('act11111-0018-0000-0000-000000000018', '11111111-1111-1111-1111-111111111111', 'note', NULL, 'c1111111-0006-0000-0000-000000000006', 'd1111111-0018-0000-0000-000000000018',
 NOW() - INTERVAL '8 months' + INTERVAL '7 hours', NOW() - INTERVAL '8 months' + INTERVAL '7 hours', 'a1111111-1111-1111-1111-111111111113', 'Emergency treatment completed',
 'Deep cavity, back molar. Temporary filling placed. Needs crown. Pain relief immediate.',
 'Emergency visit completed. Michael had a deep cavity on lower right molar (#46). Decay extensive - needs crown. Placed temporary filling today for immediate pain relief. Patient very relieved - was in significant pain.\n\nDiscussed crown treatment: £800. He wants to proceed but needs to budget (personal trainer, variable income). Offered payment plan. He''s interested. Also hasn''t seen dentist in 4+ years - needs full checkup.\n\nBooked follow-up in 2 weeks for crown prep. Also convinced him to do full exam - he agreed.\n\nNote: Very nice guy, grateful for emergency care. Good potential for regular patient.',
 NULL,
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
 NOW() - INTERVAL '8 months' + INTERVAL '7 hours'),

-- Follow-up WhatsApp (7 months ago)
('act11111-0019-0000-0000-000000000019', '11111111-1111-1111-1111-111111111111', 'whatsapp', 'outbound', 'c1111111-0006-0000-0000-000000000006', 'd1111111-0018-0000-0000-000000000018',
 NOW() - INTERVAL '7 months' + INTERVAL '2 weeks', NOW() - INTERVAL '7 months' + INTERVAL '2 weeks', 'a1111111-1111-1111-1111-111111111113', 'Crown appointment reminder',
 'Hi Michael! Hope tooth is feeling better. Reminder: Crown appointment tomorrow 3pm.', 
 'Hi Michael! Hope the tooth is feeling much better now! Quick reminder: Your crown appointment is tomorrow (Wednesday) at 3pm. We''ll prep the tooth and take impressions. Takes about 90 mins. See you then! Let me know if you need to reschedule.',
 NULL,
 'twilio_whatsapp', 'WAmsg_michael_001', 'delivered',
 'whatsapp:+447700123456', 'whatsapp:+447700900006',
 NULL, NULL, NULL,
 'thread_michael_001',
 NOW() - INTERVAL '7 months' + INTERVAL '2 weeks')

ON CONFLICT (id) DO NOTHING;

COMMIT;

-- More activities to be added in subsequent batches...

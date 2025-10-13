-- =====================================================
-- FORM SUBMISSIONS & COLLABORATION DATA
-- Part 9 of Complete Demo Data
-- =====================================================
-- Form submissions, comments, approvals, AI suggestions
-- =====================================================

BEGIN;

-- =====================================================
-- FORM SUBMISSIONS
-- =====================================================

INSERT INTO marketing_form_submissions (
  id, tenant_id, form_id, contact_id,
  submission_data, source_url, utm_source, utm_medium, utm_campaign,
  ip_address, user_agent, spam_score, is_spam,
  processed, created_contact_id, created_deal_id,
  submitted_at, processed_at
) VALUES

-- ========================================
-- PRACTICE 1 FORM SUBMISSIONS
-- ========================================

-- Free Consultation Requests (Recent)
('fsub1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'form1111-0002-0000-0000-000000000002', 'c1111111-0011-0000-0000-000000000011',
 '{"first_name": "Rachel", "last_name": "Green", "email": "rachel.green@design.studio", "phone": "+44 7700 900011", "treatment_interest": "Smile Makeover", "message": "I''m interested in veneers for my front teeth. I work in interior design and want a perfect smile for client meetings.", "preferred_contact": "WhatsApp"}'::jsonb,
 'https://smilebright.com/smile-makeover', 'google', 'cpc', 'summer_cosmetic_2024',
 '86.172.45.123', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', 0.02, false,
 true, 'c1111111-0011-0000-0000-000000000011', 'd1111111-0001-0000-0000-000000000001',
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '10 minutes'),

('fsub1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'form1111-0002-0000-0000-000000000002', 'c1111111-0012-0000-0000-000000000012',
 '{"first_name": "Thomas", "last_name": "Anderson", "email": "thomas.anderson@finance.com", "phone": "+44 7700 900012", "treatment_interest": "Teeth Whitening", "message": "I need professional whitening quickly - have an important presentation in 2 weeks.", "preferred_contact": "Email"}'::jsonb,
 'https://smilebright.com/teeth-whitening-london', 'facebook', 'cpc', 'whitening_flash_sale',
 '90.255.78.234', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0.01, false,
 true, 'c1111111-0012-0000-0000-000000000012', 'd1111111-0002-0000-0000-000000000002',
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '8 minutes'),

('fsub1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'form1111-0002-0000-0000-000000000002', 'c1111111-0035-0000-0000-000000000035',
 '{"first_name": "Melissa", "last_name": "Carter", "email": "melissa.carter@email.com", "phone": "+44 7700 900035", "treatment_interest": "Family Dentist", "message": "Looking for a good family dentist. I''m expecting my first child and want to establish care for our growing family.", "preferred_contact": "Phone"}'::jsonb,
 'https://smilebright.com/new-patient-offer', 'google', 'organic', NULL,
 '78.156.223.45', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0.03, false,
 true, 'c1111111-0035-0000-0000-000000000035', 'd1111111-0007-0000-0000-000000000007',
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '5 minutes'),

-- Invisalign Interest Forms
('fsub1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'form1111-0003-0000-0000-000000000003', 'c1111111-0036-0000-0000-000000000036',
 '{"first_name": "Benjamin", "last_name": "Clarke", "email": "ben.clarke@startup.io", "phone": "+44 7700 900036", "age_range": "25-34", "teeth_concern": "Crowding", "treatment_timeline": "6-12 months", "message": "I''m a startup CTO and want discreet orthodontics. No metal braces please!", "seen_dentist_recently": false}'::jsonb,
 'https://smilebright.com/invisalign-clear-braces', 'linkedin', 'cpc', 'invisalign_professionals',
 '92.145.78.156', 'Mozilla/5.0 (X11; Linux x86_64)', 0.01, false,
 true, 'c1111111-0036-0000-0000-000000000036', 'd1111111-0008-0000-0000-000000000008',
 NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week' + INTERVAL '15 minutes'),

-- Whitening Quote Requests
('fsub1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'form1111-0004-0000-0000-000000000004', 'c1111111-0030-0000-0000-000000000030',
 '{"first_name": "Natalie", "last_name": "Wong", "email": "natalie.wong@fashion.com", "phone": "+44 7700 900030", "current_shade": "Light yellow", "desired_shade": "Hollywood white", "event_date": "2024-11-15", "message": "I have a fashion shoot coming up and need brilliant white teeth!"}'::jsonb,
 'https://smilebright.com/teeth-whitening-london', 'instagram', 'cpc', 'summer_whitening_2024',
 '86.134.56.89', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 0.00, false,
 true, 'c1111111-0030-0000-0000-000000000030', NULL,
 NOW() - INTERVAL '9 months' + INTERVAL '2 days', NOW() - INTERVAL '9 months' + INTERVAL '2 days' + INTERVAL '3 minutes'),

-- Emergency Form
('fsub1111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'form1111-0005-0000-0000-000000000005', 'c1111111-0006-0000-0000-000000000006',
 '{"first_name": "Michael", "last_name": "O''Connor", "email": "moc.fitness@outlook.com", "phone": "+44 7700 900006", "emergency_type": "Severe toothache", "pain_level": "8", "when_started": "Last night", "message": "I have a throbbing pain in my back tooth. Can''t eat or sleep. Please help ASAP!"}'::jsonb,
 'https://smilebright.com/emergency-dentist', 'google', 'organic', NULL,
 '90.223.45.178', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)', 0.01, false,
 true, 'c1111111-0006-0000-0000-000000000006', 'd1111111-0018-0000-0000-000000000018',
 NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months' + INTERVAL '2 minutes'),

-- Smile Makeover Assessments
('fsub1111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'form1111-0006-0000-0000-000000000006', 'c1111111-0001-0000-0000-000000000001',
 '{"first_name": "Alexandra", "last_name": "Sterling", "email": "alex.sterling@executive.com", "phone": "+44 7700 900001", "smile_concerns": ["Discolored teeth", "Uneven teeth", "Gaps"], "budget_range": "£50,000+", "timeline": "ASAP", "special_occasion": "None - just want perfect smile", "message": "I''m a CEO and appearance matters for my work. I want the absolute best smile makeover you can provide. Budget is not a concern."}'::jsonb,
 'https://smilebright.com/smile-makeover', 'referral', 'direct', NULL,
 '86.172.45.123', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0.00, false,
 true, 'c1111111-0001-0000-0000-000000000001', 'd1111111-0014-0000-0000-000000000014',
 NOW() - INTERVAL '18 months', NOW() - INTERVAL '18 months' + INTERVAL '5 minutes'),

-- SPAM Example (filtered out)
('fsub1111-0008-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'form1111-0002-0000-0000-000000000002', NULL,
 '{"first_name": "John", "last_name": "Doe", "email": "fake@example.com", "phone": "1234567890", "treatment_interest": "Click here for FREE offer", "message": "Visit my website for great deals!!!"}'::jsonb,
 'https://smilebright.com/free-consultation', NULL, NULL, NULL,
 '123.45.67.89', 'Bot/1.0', 0.95, true,
 false, NULL, NULL,
 NOW() - INTERVAL '2 weeks', NULL)

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MARKETING COMMENTS (Team Collaboration)
-- =====================================================

INSERT INTO marketing_comments (
  id, tenant_id, entity_type, entity_id, 
  comment, mentions, 
  parent_comment_id, is_reply, 
  is_resolved, resolved_by_user_id, resolved_at,
  user_id, created_at, updated_at
) VALUES

-- ========================================
-- COMMENTS ON CAMPAIGNS
-- ========================================

-- Summer Whitening Campaign Comments
('mcmt1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0001-0000-0000-000000000001',
 'Amazing performance on this campaign! 18 conversions is our best result yet. Should we duplicate this for autumn?',
 ARRAY['a1111111-1111-1111-1111-111111111111'],
 NULL, false,
 false, NULL, NULL,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '3 months' + INTERVAL '10 days', NOW() - INTERVAL '3 months' + INTERVAL '10 days'),

('mcmt1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0001-0000-0000-000000000001',
 '@Emily Absolutely! Let''s run a similar campaign for autumn with "Back to Bright" theme. The £100 discount really drove conversions.',
 ARRAY['a1111111-1111-1111-1111-111111111112'],
 'mcmt1111-0001-0000-0000-000000000001', true,
 true, 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months' + INTERVAL '11 days',
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months' + INTERVAL '10 days' + INTERVAL '3 hours', NOW() - INTERVAL '3 months' + INTERVAL '11 days'),

-- VIP Event Comments
('mcmt1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0006-0000-0000-000000000006',
 'Should we send this before or after the Christmas campaign? Don''t want to overwhelm our VIP list.',
 ARRAY['a1111111-1111-1111-1111-111111111112'],
 NULL, false,
 false, NULL, NULL,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

-- ========================================
-- COMMENTS ON TEMPLATES
-- ========================================

-- Template Feedback
('mcmt1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'template', 'tmp11111-0002-0000-0000-000000000002',
 'Love the summer vibe! 🌞 The gradient colors really pop. Maybe add more social proof (testimonials)?',
 NULL,
 NULL, false,
 false, NULL, NULL,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months'),

('mcmt1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'template', 'tmp11111-0002-0000-0000-000000000002',
 'Good idea! I''ll add a testimonials section before the CTA. Should be done by EOD.',
 ARRAY['a1111111-1111-1111-1111-111111111113'],
 'mcmt1111-0004-0000-0000-000000000004', true,
 true, 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '4 months' + INTERVAL '1 day',
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 months' + INTERVAL '2 hours', NOW() - INTERVAL '4 months' + INTERVAL '1 day'),

-- ========================================
-- COMMENTS ON LANDING PAGES
-- ========================================

-- Landing Page Review
('mcmt1111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'landing_page', 'lp111111-0001-0000-0000-000000000001',
 'This page is converting really well! 16.4% is amazing. The hero image is perfect. @Dr Mitchell want to add video testimonial?',
 ARRAY['a1111111-1111-1111-1111-111111111111'],
 NULL, false,
 false, NULL, NULL,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MARKETING APPROVALS
-- =====================================================

INSERT INTO marketing_approvals (
  id, tenant_id, entity_type, entity_id,
  requested_by_user_id, requested_at, notes,
  status, reviewed_by_user_id, reviewed_at, review_notes,
  notified_users, created_at, updated_at
) VALUES

-- ========================================
-- APPROVED CAMPAIGNS
-- ========================================

-- Summer Whitening - Approved
('mapr1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0001-0000-0000-000000000001',
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '3 months' - INTERVAL '2 days', 'Summer campaign ready to go. Target audience: 427 contacts. Budget: £2,500.',
 'approved', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months' - INTERVAL '1 day', 'Looks great! Approved. Let''s send tomorrow morning at 9am for maximum open rates.',
 ARRAY['a1111111-1111-1111-1111-111111111113'],
 NOW() - INTERVAL '3 months' - INTERVAL '2 days', NOW() - INTERVAL '3 months' - INTERVAL '1 day'),

-- Invisalign Event - Approved
('mapr1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0002-0000-0000-000000000002',
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '6 months' - INTERVAL '10 days', 'Invisalign Open Day invitations. Event date: Oct 15th. Sending to 156 prospects.',
 'approved', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 months' - INTERVAL '9 days', 'Perfect! This is our biggest Invisalign push. Approved. Send 2 weeks before event.',
 ARRAY['a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111113'],
 NOW() - INTERVAL '6 months' - INTERVAL '10 days', NOW() - INTERVAL '6 months' - INTERVAL '9 days'),

-- ========================================
-- PENDING APPROVAL
-- ========================================

-- Christmas Campaign - Pending
('mapr1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0005-0000-0000-000000000005',
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 week', 'Christmas gift voucher campaign. Ready to schedule for Dec 1st. Target: 156 cosmetic prospects.',
 'pending', NULL, NULL, NULL,
 ARRAY['a1111111-1111-1111-1111-111111111111'],
 NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),

-- ========================================
-- REJECTED APPROVALS
-- ========================================

-- Rejected Campaign Example
('mapr1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'campaign', NULL,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '2 months', 'Halloween flash sale - 50% off all treatments. One day only!',
 'rejected', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 months' + INTERVAL '3 hours', 'Sorry, 50% discount is too aggressive and devalues our premium positioning. Let''s do 20% instead and position it as exclusive Halloween offer.',
 ARRAY['a1111111-1111-1111-1111-111111111112'],
 NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months' + INTERVAL '3 hours')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- AI SUGGESTIONS
-- =====================================================

INSERT INTO marketing_ai_suggestions (
  id, tenant_id, entity_type, entity_id, suggestion_type,
  original_content, suggested_content, confidence_score, reasoning,
  accepted, accepted_by_user_id, accepted_at,
  ai_model, ai_prompt, ai_tokens_used,
  created_at
) VALUES

-- ========================================
-- SUBJECT LINE SUGGESTIONS
-- ========================================

-- Improved subject line (accepted)
('mais1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0001-0000-0000-000000000001', 'subject_line',
 'Summer Special: Teeth Whitening Discount',
 '☀️ Summer Smile Special: £100 OFF Professional Whitening!',
 0.89, 'Added emoji for visual appeal, specific discount amount for clarity, and "Professional" to emphasize quality. Subject lines with emojis have 25% higher open rates.',
 true, 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '3 months' - INTERVAL '3 days',
 'gpt-4-turbo', 'Optimize this email subject line for a dental whitening promotion. Target audience: 25-55 year olds in London. Goal: Increase open rates.', 234,
 NOW() - INTERVAL '3 months' - INTERVAL '3 days'),

-- Send time optimization (accepted)
('mais1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0001-0000-0000-000000000001', 'send_time',
 NULL,
 'Tuesday, 9:00 AM GMT',
 0.92, 'Based on historical data, your audience has highest engagement on Tuesday mornings. Open rate: 73% vs avg 62%. Click rate: 51% vs avg 38%. Avoid Mondays (busy) and Fridays (distracted).',
 true, 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 months' - INTERVAL '2 days',
 'gpt-4-turbo', 'Analyze send time optimization for this email campaign based on historical engagement data.', 189,
 NOW() - INTERVAL '3 months' - INTERVAL '3 days'),

-- Content improvement (not yet reviewed)
('mais1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'template', 'tmp11111-0005-0000-0000-000000000005', 'content_block',
 'Thank you for your interest in SmileBright Dental.',
 'Thank you for taking the first step towards your dream smile! We''re excited to help you achieve the confident, radiant smile you deserve.',
 0.85, 'More personalized and emotionally engaging opening. Uses "your dream smile" to create aspiration and "confident, radiant" for positive emotional trigger. Dental patients respond 34% better to emotion-driven copy.',
 false, NULL, NULL,
 'gpt-4-turbo', 'Improve this welcome email opening to be more engaging and personal while maintaining professional tone.', 156,
 NOW() - INTERVAL '1 month'),

-- Personalization suggestion (accepted)
('mais1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0004-0000-0000-000000000004', 'personalization',
 'Hi there,',
 'Hi {{contact_first_name}},',
 0.96, 'Personalized greetings increase click-through rates by 41%. Using first name creates immediate connection and shows the email is tailored to them.',
 true, 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '5 months',
 'gpt-4-turbo', 'Suggest personalization improvements for email greeting.', 98,
 NOW() - INTERVAL '5 months'),

-- Segment optimization (not accepted)
('mais1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'campaign', 'cmp11111-0003-0000-0000-000000000003', 'segment',
 NULL,
 'Consider excluding contacts who opened emails in last 30 days to focus re-engagement budget on truly inactive patients.',
 0.78, 'Your current segment includes some recently engaged contacts. Narrowing to truly inactive (no opens in 60+ days) would increase conversion probability by 23% and reduce wasted sends.',
 false, NULL, NULL,
 'gpt-4-turbo', 'Analyze segment targeting for re-engagement campaign and suggest improvements.', 267,
 NOW() - INTERVAL '4 months'),

-- Tone adjustment (accepted)
('mais1111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'template', 'tmp11111-0002-0000-0000-000000000002', 'tone_adjustment',
 'Get your teeth whitened now!',
 'Transform your smile this summer with our premium whitening service.',
 0.88, 'Current tone is too pushy. Premium dental audiences respond better to aspirational language. "Transform" is more powerful than "Get", and "premium service" reinforces quality positioning over discount urgency.',
 true, 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 months',
 'gpt-4-turbo', 'Adjust tone to be more sophisticated for premium dental audience while maintaining urgency.', 178,
 NOW() - INTERVAL '4 months')

ON CONFLICT (id) DO NOTHING;

COMMIT;


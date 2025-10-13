-- =====================================================
-- CUSTOMER JOURNEYS, FORMS & LANDING PAGES
-- Part 8 of Complete Demo Data
-- =====================================================
-- Marketing automation journeys, lead capture forms, and landing pages
-- =====================================================

BEGIN;

-- =====================================================
-- CUSTOMER JOURNEYS (Marketing Automation)
-- =====================================================

INSERT INTO marketing_customer_journeys (
  id, tenant_id, name, description, trigger_type, trigger_config, 
  status, entry_count, completed_count, active_contacts_count,
  created_by_user_id, created_at, updated_at
) VALUES

-- ========================================
-- PRACTICE 1 JOURNEYS
-- ========================================

-- New Lead Nurture Journey (Active)
('jrny1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
 'New Lead Nurture - 14 Day Sequence',
 'Automated nurture sequence for new website/ad leads',
 'segment_entry', 
 '{"segment_id": "seg11111-0002-0000-0000-000000000002", "re_entry": false}'::jsonb,
 'active',
 234, 189, 45,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 day'),

-- Post-Treatment Follow-up Journey (Active)
('jrny1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
 'Post-Treatment Care Journey',
 'Automated check-ins and care instructions after treatment completion',
 'event', 
 '{"event_type": "deal_won", "delay_days": 3}'::jsonb,
 'active',
 87, 82, 5,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 week'),

-- Re-engagement Journey (Active)
('jrny1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
 'Inactive Patient Winback',
 '90-day re-engagement campaign for dormant patients',
 'segment_entry',
 '{"segment_id": "seg11111-0005-0000-0000-000000000005", "re_entry": false}'::jsonb,
 'active',
 45, 12, 33,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '4 months', NOW() - INTERVAL '2 days'),

-- Invisalign Decision Journey (Active)
('jrny1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
 'Invisalign Consideration Series',
 'Educational series for Invisalign prospects',
 'segment_entry',
 '{"segment_id": "seg11111-0003-0000-0000-000000000003", "re_entry": false}'::jsonb,
 'active',
 67, 31, 36,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '5 months', NOW() - INTERVAL '3 days'),

-- Appointment Reminder Journey (Active)
('jrny1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
 'Appointment Reminder Sequence',
 'Automated reminders: 7 days, 24 hours, 2 hours before appointment',
 'event',
 '{"event_type": "appointment_scheduled", "channels": ["email", "whatsapp"]}'::jsonb,
 'active',
 892, 874, 18,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 hour'),

-- Birthday Campaign Journey (Active)
('jrny1111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
 'Birthday Special Offer',
 'Automatic birthday wishes with special offer',
 'date_based',
 '{"trigger_field": "date_of_birth", "days_before": 7, "offer": "free_whitening_session"}'::jsonb,
 'active',
 156, 143, 13,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '18 months', NOW() - INTERVAL '2 days'),

-- Abandoned Consultation Journey (Draft)
('jrny1111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
 'Abandoned Consultation Follow-up',
 'Follow-up for leads who booked but didn''t show',
 'event',
 '{"event_type": "appointment_no_show", "delay_hours": 2}'::jsonb,
 'draft',
 0, 0, 0,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 days')

ON CONFLICT (id) DO NOTHING;

-- Journey Steps (for first journey)
INSERT INTO journey_steps (
  id, tenant_id, journey_id, step_number, step_type, name,
  delay_amount, delay_unit, 
  email_template_id, whatsapp_template_id, 
  action_config,
  created_at
) VALUES

-- New Lead Nurture Journey - Steps
('jstp1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'jrny1111-0001-0000-0000-000000000001', 1, 'email', 'Welcome Email',
 0, 'minutes',
 'tmp11111-0005-0000-0000-000000000005', NULL,
 '{"goal": "introduce_practice", "cta": "book_consultation"}'::jsonb,
 NOW() - INTERVAL '6 months'),

('jstp1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'jrny1111-0001-0000-0000-000000000001', 2, 'wait', 'Wait 2 days',
 2, 'days',
 NULL, NULL,
 NULL,
 NOW() - INTERVAL '6 months'),

('jstp1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'jrny1111-0001-0000-0000-000000000001', 3, 'email', 'Treatment Options Email',
 0, 'minutes',
 NULL, NULL,
 '{"goal": "educate_services", "cta": "view_treatments"}'::jsonb,
 NOW() - INTERVAL '6 months'),

('jstp1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'jrny1111-0001-0000-0000-000000000001', 4, 'wait', 'Wait 3 days',
 3, 'days',
 NULL, NULL,
 NULL,
 NOW() - INTERVAL '6 months'),

('jstp1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'jrny1111-0001-0000-0000-000000000001', 5, 'whatsapp', 'WhatsApp Check-in',
 0, 'minutes',
 NULL, NULL,
 '{"message": "Hi {{first_name}}! Just checking if you have any questions about booking your consultation? We''re here to help! 😊", "goal": "engage"}'::jsonb,
 NOW() - INTERVAL '6 months'),

('jstp1111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'jrny1111-0001-0000-0000-000000000001', 6, 'condition', 'Check if booked',
 2, 'days',
 NULL, NULL,
 '{"condition": "deal_stage_changed", "exit_if": true}'::jsonb,
 NOW() - INTERVAL '6 months'),

('jstp1111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'jrny1111-0001-0000-0000-000000000001', 7, 'email', 'Final Offer - Limited Time',
 0, 'minutes',
 NULL, NULL,
 '{"goal": "conversion", "offer": "free_whitening_kit", "cta": "book_now"}'::jsonb,
 NOW() - INTERVAL '6 months')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MARKETING FORMS
-- =====================================================

INSERT INTO marketing_forms (
  id, tenant_id, name, description, form_type, 
  status, submit_button_text, success_message, 
  submission_count, conversion_rate,
  auto_create_contact, auto_create_deal, auto_assign_tags,
  notification_email, notification_enabled,
  created_by_user_id, created_at, updated_at
) VALUES

-- ========================================
-- PRACTICE 1 FORMS
-- ========================================

-- New Patient Intake Form (Active)
('form1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
 'New Patient Registration Form',
 'Comprehensive intake form for new patients',
 'new_patient', 'active',
 'Complete Registration', 
 'Thank you! We''ll contact you within 24 hours to schedule your first appointment.',
 187, 94.5,
 true, true, ARRAY['New Patient', 'Website'],
 'admin@smilebright.com', true,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '2 years', NOW() - INTERVAL '1 month'),

-- Free Consultation Request (Active)
('form1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
 'Free Consultation Request',
 'Quick form for consultation booking',
 'consultation', 'active',
 'Request FREE Consultation',
 '🎉 Your consultation is requested! We''ll call you within 2 hours to confirm your preferred time.',
 412, 87.3,
 true, true, ARRAY['Consultation Lead', 'Hot'],
 'consultations@smilebright.com', true,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '18 months', NOW() - INTERVAL '1 week'),

-- Invisalign Interest Form (Active)
('form1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
 'Invisalign Information Request',
 'Specialized form for Invisalign inquiries',
 'treatment_specific', 'active',
 'Get Invisalign Info',
 'Thanks! Your personalized Invisalign guide is being prepared. Check your email in 5 minutes!',
 234, 76.2,
 true, true, ARRAY['Invisalign', 'Orthodontics'],
 'invisalign@smilebright.com', true,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 year', NOW() - INTERVAL '2 weeks'),

-- Teeth Whitening Quick Quote (Active)
('form1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
 'Whitening Quick Quote',
 'Fast quote form for whitening services',
 'quote_request', 'active',
 'Get My Quote',
 'Perfect! Your whitening quote is ready. Check your email now! 📧',
 567, 91.8,
 true, true, ARRAY['Whitening', 'Quote Requested'],
 'quotes@smilebright.com', true,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '6 months', NOW() - INTERVAL '3 days'),

-- Emergency Appointment Request (Active)
('form1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
 'Emergency Dental Care',
 'Priority form for dental emergencies',
 'emergency', 'active',
 'Request Emergency Appointment',
 'We''ve received your emergency request. Our team will call you within 15 minutes! Please keep your phone nearby.',
 45, 100.0,
 true, true, ARRAY['Emergency', 'Priority'],
 'emergency@smilebright.com', true,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 days'),

-- Smile Makeover Assessment (Active)
('form1111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
 'Smile Makeover Assessment',
 'Detailed questionnaire for smile makeover prospects',
 'treatment_specific', 'active',
 'Get My Smile Plan',
 'Exciting! Your personalized smile plan is being created. Dr. Mitchell will review and email you within 24 hours.',
 92, 68.9,
 true, true, ARRAY['Smile Makeover', 'Cosmetic', 'High Value'],
 'cosmetic@smilebright.com', true,
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 months', NOW() - INTERVAL '1 week')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- LANDING PAGES
-- =====================================================

INSERT INTO marketing_landing_pages (
  id, tenant_id, name, slug, title, description,
  status, page_type, theme, 
  hero_headline, hero_subheadline, hero_cta_text, hero_image_url,
  form_id,
  seo_title, seo_description, seo_keywords,
  visit_count, form_submission_count, conversion_rate,
  published_at, created_by_user_id, created_at, updated_at
) VALUES

-- ========================================
-- PRACTICE 1 LANDING PAGES
-- ========================================

-- Teeth Whitening Landing Page (Active)
('lp111111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
 'Professional Teeth Whitening London',
 'teeth-whitening-london',
 'Professional Teeth Whitening in London | SmileBright Dental',
 'Get a dazzling white smile in just 90 minutes with our professional teeth whitening service in London. Safe, fast, and guaranteed results.',
 'published', 'service', 'modern_clean',
 '✨ Get a Hollywood White Smile in 90 Minutes',
 'Professional teeth whitening from London''s leading cosmetic dentists. Safe, fast, and guaranteed results up to 8 shades whiter.',
 'Get £100 OFF Today', 
 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99',
 'form1111-0004-0000-0000-000000000004',
 'Professional Teeth Whitening London | 90 Min Results | SmileBright',
 'Professional teeth whitening in London. Get up to 8 shades whiter in just 90 minutes. Safe, pain-free, guaranteed results. Book your session today!',
 'teeth whitening london, professional whitening, laser whitening, cosmetic dentist london, white teeth',
 3456, 567, 16.4,
 NOW() - INTERVAL '6 months', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 week'),

-- Invisalign Landing Page (Active)
('lp111111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
 'Invisalign Clear Braces London',
 'invisalign-clear-braces',
 'Invisalign Clear Aligners London | SmileBright Dental',
 'Straighten your teeth discreetly with Invisalign clear aligners. Free consultation and 0% finance available. Certified Invisalign provider in London.',
 'published', 'service', 'modern_gradient',
 '😊 Straighten Your Teeth Invisibly',
 'Nearly invisible aligners. No metal braces. Faster results. FREE digital smile preview. 0% finance available.',
 'Book FREE Consultation',
 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5',
 'form1111-0003-0000-0000-000000000003',
 'Invisalign London | Clear Aligners | Free Consultation | SmileBright',
 'Get Invisalign clear aligners in London. Nearly invisible braces for adults and teens. Free consultation, flexible payment plans. Certified provider.',
 'invisalign london, clear aligners, invisible braces, adult braces, teeth straightening',
 2891, 234, 8.1,
 NOW() - INTERVAL '1 year', 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 year', NOW() - INTERVAL '2 weeks'),

-- Smile Makeover Landing Page (Active)
('lp111111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
 'Smile Makeover London - Complete Transformation',
 'smile-makeover',
 'Smile Makeover London | Complete Smile Transformation | SmileBright',
 'Transform your smile with our comprehensive smile makeover service. Porcelain veneers, teeth whitening, and more. See your new smile before you commit.',
 'published', 'service', 'luxury',
 '💎 Your Dream Smile Awaits',
 'Complete smile transformation with porcelain veneers, professional whitening & digital smile design. See your new smile before you start.',
 'Get Your Smile Preview',
 'https://images.unsplash.com/photo-1629909613654-28e377c37b09',
 'form1111-0006-0000-0000-000000000006',
 'Smile Makeover London | Veneers & Cosmetic Dentistry | SmileBright',
 'Complete smile makeover in London. Porcelain veneers, professional whitening, digital smile design. Transform your smile with London''s top cosmetic dentists.',
 'smile makeover london, porcelain veneers, cosmetic dentistry, smile transformation, dental veneers',
 1234, 92, 7.5,
 NOW() - INTERVAL '8 months', 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 months', NOW() - INTERVAL '1 week'),

-- Emergency Dentist Landing Page (Active)
('lp111111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
 'Emergency Dentist London - Same Day Appointments',
 'emergency-dentist',
 'Emergency Dentist London | Same Day Appointments | SmileBright',
 'Dental emergency? We provide same-day emergency dental care in London. Open 7 days. Call now for immediate appointment.',
 'published', 'emergency', 'urgent',
 '🚨 Emergency Dental Care - Same Day',
 'Severe toothache? Broken tooth? We''re here to help. Same-day emergency appointments available 7 days a week in Central London.',
 'Call Now: +44 207 123 4567',
 'https://images.unsplash.com/photo-1629909613654-28e377c37b09',
 'form1111-0005-0000-0000-000000000005',
 'Emergency Dentist London | Same Day Care | Open 7 Days | SmileBright',
 'Emergency dental care in London. Same-day appointments for toothache, broken teeth, and dental injuries. Open 7 days. Central London location.',
 'emergency dentist london, same day dentist, emergency dental care, toothache, broken tooth',
 4567, 45, 1.0,
 NOW() - INTERVAL '2 years', 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '2 years', NOW() - INTERVAL '3 days'),

-- New Patient Special Landing Page (Active)
('lp111111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
 'New Patient Special Offer',
 'new-patient-offer',
 'New Patient Offer | SmileBright Dental London',
 'Welcome! New patients get comprehensive checkup, X-rays, and cleaning for just £99 (normally £250). Plus free whitening kit worth £150!',
 'published', 'promotion', 'welcoming',
 '🎉 New Patient Special: £99 Comprehensive Care',
 'Usually £250 - Save £151! Includes: Full examination, Digital X-rays, Professional cleaning, FREE whitening kit (£150 value)',
 'Claim This Offer',
 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787',
 'form1111-0001-0000-0000-000000000001',
 'New Patient Offer London | £99 Checkup + Free Gift | SmileBright',
 'Special offer for new patients in London. Comprehensive dental checkup, X-rays, cleaning for £99 (save £151). Plus FREE whitening kit. Limited time!',
 'new patient offer london, cheap dental checkup, dental promotion, dentist offer',
 5678, 187, 3.3,
 NOW() - INTERVAL '2 years', 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '2 years', NOW() - INTERVAL '1 month')

ON CONFLICT (id) DO NOTHING;

COMMIT;


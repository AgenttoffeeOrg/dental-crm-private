-- =====================================================
-- MARKETING MODULE DATA - SEGMENTS & TEMPLATES
-- Part 6 of Complete Demo Data
-- =====================================================
-- Creates marketing segments and email templates
-- =====================================================

BEGIN;

-- =====================================================
-- MARKETING SEGMENTS
-- =====================================================

INSERT INTO marketing_segments (id, tenant_id, name, description, segment_type, filter_rules, contact_count, is_dynamic, created_by_user_id, created_at, updated_at) VALUES

-- Practice 1 Segments
('seg11111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'VIP Patients', 'High-value patients with completed treatments over £10,000', 'custom', 
 '{"rules": [{"field": "deal_value_total", "operator": "greater_than", "value": 1000000}, {"field": "status", "operator": "equals", "value": "active"}], "match": "all"}'::jsonb, 
 8, true, 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 week'),

('seg11111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Hot Leads - Last 7 Days', 'New leads from last week with high engagement', 'custom',
 '{"rules": [{"field": "status", "operator": "equals", "value": "lead"}, {"field": "created_at", "operator": "last_n_days", "value": 7}, {"field": "lead_score", "operator": "greater_than", "value": 70}], "match": "all"}'::jsonb,
 5, true, 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 days'),

('seg11111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Invisalign Interested', 'Contacts who clicked Invisalign campaigns or searched invisalign', 'custom',
 '{"rules": [{"field": "tags", "operator": "contains", "value": "Invisalign"}, {"field": "marketing_engagement_score", "operator": "greater_than", "value": 40}], "match": "any"}'::jsonb,
 12, true, 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '5 months', NOW() - INTERVAL '3 days'),

('seg11111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Cosmetic Prospects', 'High-income individuals interested in cosmetic dentistry', 'custom',
 '{"rules": [{"field": "tags", "operator": "contains_any", "value": ["Cosmetic", "Veneers", "Whitening"]}, {"field": "status", "operator": "in", "value": ["lead", "active"]}], "match": "all"}'::jsonb,
 25, true, 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 months', NOW() - INTERVAL '1 day'),

('seg11111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Inactive Patients - Re-engagement', 'Patients with no activity in last 12 months', 'custom',
 '{"rules": [{"field": "status", "operator": "equals", "value": "inactive"}, {"field": "last_activity_at", "operator": "older_than_days", "value": 365}], "match": "all"}'::jsonb,
 3, true, 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '4 months', NOW() - INTERVAL '1 month'),

('seg11111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Family Patients', 'Families with multiple members as patients', 'custom',
 '{"rules": [{"field": "tags", "operator": "contains", "value": "Family"}], "match": "all"}'::jsonb,
 8, true, 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 year', NOW() - INTERVAL '2 weeks'),

('seg11111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'High Email Engagement', 'Contacts who open 80%+ of emails', 'custom',
 '{"rules": [{"field": "marketing_engagement_score", "operator": "greater_than", "value": 80}], "match": "all"}'::jsonb,
 15, true, 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '6 months', NOW() - INTERVAL '5 days'),

('seg11111-0008-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Whitening Campaign - Summer 2024', 'Summer whitening promotion target audience', 'campaign',
 '{"rules": [{"field": "age", "operator": "between", "value": [25, 55]}, {"field": "source", "operator": "in", "value": ["google_ads", "facebook", "instagram"]}, {"field": "status", "operator": "in", "value": ["lead", "active"]}], "match": "all"}'::jsonb,
 45, false, 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),

-- Practice 2 Segments
('seg22222-0001-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Ultra High Net Worth', 'Patients with treatments over $50,000', 'custom',
 '{"rules": [{"field": "deal_value_total", "operator": "greater_than", "value": 5000000}, {"field": "tags", "operator": "contains_any", "value": ["VIP", "Ultra HNW"]}], "match": "all"}'::jsonb,
 5, true, 'a2222222-2222-2222-2222-222222222221', NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 week'),

('seg22222-0002-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Social Media Influencers', 'Patients active on social media for testimonials', 'custom',
 '{"rules": [{"field": "tags", "operator": "contains_any", "value": ["Influencer", "Entertainment", "Media"]}, {"field": "marketing_engagement_score", "operator": "greater_than", "value": 85}], "match": "all"}'::jsonb,
 8, true, 'a2222222-2222-2222-2222-222222222222', NOW() - INTERVAL '6 months', NOW() - INTERVAL '3 days'),

-- Practice 3 Segments
('seg33333-0001-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Family Heads - Parents', 'Parents with children as patients', 'custom',
 '{"rules": [{"field": "tags", "operator": "contains_any", "value": ["Mother", "Father", "Family"]}], "match": "all"}'::jsonb,
 12, true, 'a3333333-3333-3333-3333-333333333331', NOW() - INTERVAL '2 years', NOW() - INTERVAL '1 month'),

('seg33333-0002-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Orthodontic Prospects', 'Children and teens needing braces', 'custom',
 '{"rules": [{"field": "age", "operator": "between", "value": [10, 18]}, {"field": "tags", "operator": "contains", "value": "Orthodontics"}], "match": "any"}'::jsonb,
 5, true, 'a3333333-3333-3333-3333-333333333331', NOW() - INTERVAL '1 year', NOW() - INTERVAL '2 weeks')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- EMAIL TEMPLATES
-- =====================================================

INSERT INTO marketing_templates (id, tenant_id, name, description, template_type, channel, subject_line, preview_text, html_content, plain_text_content, is_active, category, variables, created_by_user_id, created_at, updated_at) VALUES

-- ========================================
-- APPOINTMENT REMINDERS
-- ========================================

('tmp11111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Appointment Reminder - 24 Hours', 'Automated reminder sent 24 hours before appointment', 'transactional', 'email',
 'Reminder: Your appointment tomorrow at {{appointment_time}}',
 'Don''t forget your dental appointment tomorrow!',
 '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: #1e40af; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">SmileBright Dental</h1></div><div style="padding: 30px; background: #f9fafb;"><h2>Appointment Reminder</h2><p>Hi {{contact_first_name}},</p><p>This is a friendly reminder about your upcoming appointment:</p><div style="background: white; padding: 20px; border-left: 4px solid #1e40af; margin: 20px 0;"><strong>Date:</strong> {{appointment_date}}<br><strong>Time:</strong> {{appointment_time}}<br><strong>Location:</strong> SmileBright Dental Group<br>123 Mayfair Lane, London W1K 5AA</div><p><strong>What to bring:</strong></p><ul><li>Photo ID</li><li>Insurance card (if applicable)</li><li>List of current medications</li></ul><p>If you need to reschedule, please call us at +44 207 123 4567 or <a href="{{reschedule_link}}">click here</a>.</p><p>Looking forward to seeing you!</p><p>Best regards,<br>The SmileBright Team</p></div><div style="background: #1f2937; padding: 20px; text-align: center; color: white; font-size: 12px;"><p>SmileBright Dental Group | 123 Mayfair Lane, London W1K 5AA | +44 207 123 4567</p></div></body></html>',
 'Hi {{contact_first_name}},\n\nReminder about your appointment:\nDate: {{appointment_date}}\nTime: {{appointment_time}}\nLocation: SmileBright Dental, 123 Mayfair Lane, London W1K 5AA\n\nWhat to bring: Photo ID, Insurance card, Medications list\n\nTo reschedule: +44 207 123 4567\n\nSee you soon!\nSmileBright Team',
 true, 'appointments', '["contact_first_name", "appointment_date", "appointment_time", "reschedule_link"]'::jsonb,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '1 year', NOW() - INTERVAL '2 months'),

-- ========================================
-- PROMOTIONAL TEMPLATES
-- ========================================

('tmp11111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Summer Whitening Special', 'Seasonal teeth whitening promotion', 'marketing', 'email',
 '☀️ Summer Smile Special: £100 OFF Professional Whitening!',
 'Get ready for summer with a brighter smile! Limited time offer...',
 '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;"><h1 style="color: white; margin: 0; font-size: 32px;">☀️ Summer Smile Special</h1><p style="color: white; font-size: 18px; margin: 10px 0 0 0;">Get Beach-Ready with a Brilliant White Smile!</p></div><div style="padding: 40px; background: white;"><p>Hi {{contact_first_name}},</p><p>Summer is here and it''s the perfect time to brighten your smile! ✨</p><div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0;"><h3 style="margin: 0 0 10px 0; color: #92400e;">Limited Time Offer</h3><p style="font-size: 24px; font-weight: bold; color: #92400e; margin: 0;">£100 OFF Professional Whitening</p><p style="margin: 10px 0 0 0; color: #78350f;">Normal price: £450 | <strong>Your price: £350</strong></p></div><h3>Why Choose Our Professional Whitening?</h3><ul><li>✅ Results in just 90 minutes</li><li>✅ Up to 8 shades whiter</li><li>✅ Safe & pain-free</li><li>✅ Long-lasting results</li><li>✅ Perfect for weddings, holidays & special events</li></ul><div style="text-align: center; margin: 40px 0;"><a href="{{booking_link}}" style="background: #1e40af; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">Book Your Session</a></div><p><strong>Offer ends:</strong> {{offer_end_date}}</p><p>Limited spots available! Book now to secure your summer smile. 😊</p><p>Best,<br>Dr. Sarah Mitchell<br>SmileBright Dental</p></div><div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;"><p>Not interested? <a href="{{unsubscribe_link}}">Unsubscribe</a></p></div></body></html>',
 'Hi {{contact_first_name}},\n\nSummer Smile Special! £100 OFF Professional Whitening\n\nNormal price: £450\nYour special price: £350\n\nResults in 90 minutes • Up to 8 shades whiter • Safe & pain-free\n\nOffer ends: {{offer_end_date}}\n\nBook now: {{booking_link}}\n\nBest,\nDr. Sarah Mitchell',
 true, 'promotions', '["contact_first_name", "offer_end_date", "booking_link", "unsubscribe_link"]'::jsonb,
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 months', NOW() - INTERVAL '3 months'),

('tmp11111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Invisalign Open Day Invitation', 'Special event invitation for Invisalign consultation day', 'marketing', 'email',
 '🎉 You''re Invited: FREE Invisalign Consultation Day',
 'Join us for a special Invisalign Open Day with exclusive offers!',
 '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: #10b981; padding: 40px; text-align: center;"><h1 style="color: white; margin: 0;">You''re Invited! 🎉</h1></div><div style="padding: 40px; background: white;"><h2 style="color: #065f46;">Invisalign Open Day</h2><p>Hi {{contact_first_name}},</p><p>Ever thought about straightening your teeth without metal braces? We''re hosting a special <strong>Invisalign Open Day</strong> and you''re invited!</p><div style="background: #d1fae5; padding: 30px; border-radius: 10px; margin: 30px 0;"><h3 style="margin: 0 0 15px 0; color: #065f46;">Saturday, {{event_date}}</h3><p style="font-size: 16px; margin: 10px 0;"><strong>10am - 4pm</strong></p><p style="margin: 15px 0;"><strong>What''s included:</strong></p><ul style="margin: 10px 0; padding-left: 20px;"><li>FREE digital smile preview</li><li>Meet Invisalign-certified dentists</li><li>See real before/after cases</li><li>Flexible payment plan options</li><li>Complimentary refreshments</li></ul><div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin-top: 20px;"><strong>Book on the day & get:</strong><br>💰 £500 OFF treatment<br>🎁 FREE whitening kit (worth £150)</div></div><div style="text-align: center; margin: 40px 0;"><a href="{{rsvp_link}}" style="background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">RSVP Now (Spaces Limited!)</a></div><p><strong>Why Invisalign?</strong></p><ul><li>👁️ Nearly invisible aligners</li><li>😊 No food restrictions</li><li>⏱️ Faster than traditional braces</li><li>📱 Track progress with app</li></ul><p>Spaces are limited, so please RSVP as soon as possible!</p><p>Looking forward to seeing you there!</p><p>Dr. Sarah Mitchell<br>SmileBright Dental</p></div></body></html>',
 'INVISALIGN OPEN DAY - You''re Invited!\n\nDate: {{event_date}}\nTime: 10am - 4pm\n\nWhat''s included:\n• FREE digital smile preview\n• Meet certified dentists\n• Before/after cases\n• Payment plan options\n\nBook on the day:\n💰 £500 OFF\n🎁 FREE whitening kit\n\nRSVP: {{rsvp_link}}\n\nSpaces limited!',
 true, 'events', '["contact_first_name", "event_date", "rsvp_link", "unsubscribe_link"]'::jsonb,
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),

-- ========================================
-- FOLLOW-UP TEMPLATES
-- ========================================

('tmp11111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Post-Treatment Follow-up', 'Check-in after treatment completion', 'transactional', 'email',
 'How is your new smile? We''d love to hear from you!',
 'We hope you''re loving your new smile! Quick feedback request...',
 '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 40px; background: white;"><h2>We Hope You''re Smiling! 😊</h2><p>Hi {{contact_first_name}},</p><p>It''s been {{days_since_treatment}} days since we completed your {{treatment_name}} treatment, and we wanted to check in!</p><p><strong>How are you feeling?</strong></p><ul><li>Any discomfort or concerns?</li><li>Happy with the results?</li><li>Any questions for us?</li></ul><div style="text-align: center; margin: 40px 0;"><a href="{{feedback_link}}" style="background: #1e40af; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold;">Share Your Feedback (2 min)</a></div><p>Your feedback helps us provide even better care. Plus, if you''re happy with your results, we''d be honored if you could share a quick review on Google! 🌟</p><p><strong>Remember:</strong></p><ul><li>Maintain your results with regular checkups (every 6 months)</li><li>Follow the care instructions we provided</li><li>Call us immediately if you have any concerns: +44 207 123 4567</li></ul><p>Thank you for trusting us with your smile!</p><p>Warmly,<br>Dr. Sarah Mitchell & Team</p></div></body></html>',
 'Hi {{contact_first_name}},\n\nIt''s been {{days_since_treatment}} days since your {{treatment_name}} treatment.\n\nHow are you feeling?\n• Any concerns?\n• Happy with results?\n• Questions?\n\nShare feedback: {{feedback_link}}\n\nRemember: Regular checkups every 6 months!\n\nCall anytime: +44 207 123 4567\n\nThank you!\nDr. Sarah Mitchell',
 true, 'followup', '["contact_first_name", "days_since_treatment", "treatment_name", "feedback_link"]'::jsonb,
 'a1111111-1111-1111-1111-111111111113', NOW() - INTERVAL '1 year', NOW() - INTERVAL '6 months'),

-- ========================================
-- NURTURE SEQUENCES
-- ========================================

('tmp11111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'New Lead - Welcome Email', 'First email in nurture sequence for new leads', 'marketing', 'email',
 'Welcome to SmileBright! Here''s what happens next...',
 'Thank you for your interest! Here''s everything you need to know about getting started.',
 '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: #1e40af; padding: 30px; text-align: center;"><h1 style="color: white; margin: 0;">Welcome to SmileBright! 👋</h1></div><div style="padding: 40px; background: white;"><p>Hi {{contact_first_name}},</p><p>Thank you for your interest in SmileBright Dental! We''re excited to help you achieve the smile you''ve always wanted.</p><h3>What happens next?</h3><div style="background: #eff6ff; padding: 20px; border-radius: 10px; margin: 20px 0;"><div style="display: flex; align-items: start; margin: 15px 0;"><span style="background: #1e40af; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">1</span><div><strong>Book Your FREE Consultation</strong><br>No obligation, no pressure. Just a friendly chat about your goals.</div></div><div style="display: flex; align-items: start; margin: 15px 0;"><span style="background: #1e40af; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">2</span><div><strong>Digital Smile Preview</strong><br>See what your new smile could look like before you commit.</div></div><div style="display: flex; align-items: start; margin: 15px 0;"><span style="background: #1e40af; color: white; border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">3</span><div><strong>Personalized Treatment Plan</strong><br>Custom plan with transparent pricing and flexible payment options.</div></div></div><div style="text-align: center; margin: 40px 0;"><a href="{{booking_link}}" style="background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">Book FREE Consultation</a></div><h3>Why Choose SmileBright?</h3><ul><li>⭐ 4.9/5 stars on Google (500+ reviews)</li><li>🏆 Award-winning cosmetic dentistry</li><li>💎 State-of-the-art technology</li><li>💳 0% finance available</li><li>😊 Friendly, caring team</li></ul><p>Have questions? Just reply to this email or WhatsApp us on +44 7700 123 456.</p><p>Looking forward to meeting you!</p><p>Best regards,<br>Emily Chen<br>Patient Coordinator</p></div></body></html>',
 'Welcome to SmileBright!\n\nThanks for your interest, {{contact_first_name}}!\n\nWhat happens next:\n1. Book FREE consultation\n2. Get digital smile preview\n3. Receive personalized plan\n\nWhy SmileBright?\n⭐ 4.9/5 stars (500+ reviews)\n🏆 Award-winning dentistry\n💳 0% finance available\n\nBook now: {{booking_link}}\n\nQuestions? WhatsApp: +44 7700 123 456\n\nEmily Chen\nPatient Coordinator',
 true, 'nurture', '["contact_first_name", "booking_link", "unsubscribe_link"]'::jsonb,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 month')

ON CONFLICT (id) DO NOTHING;

COMMIT;




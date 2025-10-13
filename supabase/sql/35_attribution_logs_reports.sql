-- =====================================================
-- ATTRIBUTION, ACTIVITY LOGS & REPORTS
-- Part 10 of Complete Demo Data - FINAL
-- =====================================================
-- Marketing attribution, activity logs, saved reports
-- =====================================================

BEGIN;

-- =====================================================
-- MARKETING ATTRIBUTION
-- Links campaigns → contacts → deals → revenue
-- =====================================================

INSERT INTO marketing_attribution (
  id, tenant_id, deal_id, contact_id,
  attribution_model, touchpoint_sequence,
  first_touch_campaign_id, first_touch_campaign_name, first_touch_timestamp,
  last_touch_campaign_id, last_touch_campaign_name, last_touch_timestamp,
  deal_value_cents, deal_stage, deal_won, conversion_timestamp,
  campaign_cost_cents, roi_multiplier,
  created_at, updated_at
) VALUES

-- ========================================
-- PRACTICE 1 ATTRIBUTIONS
-- ========================================

-- Alexandra Sterling - VIP Smile Makeover (Won)
('mattr111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd1111111-0014-0000-0000-000000000014', 'c1111111-0001-0000-0000-000000000001',
 'last_touch', 
 '[
   {"campaign_id": "organic_search", "campaign_name": "Organic Google Search", "channel": "organic", "timestamp": "2023-06-01T10:30:00Z", "action": "website_visit"},
   {"campaign_id": "cmp11111-0002-0000-0000-000000000002", "campaign_name": "Invisalign Open Day - October 2024", "channel": "email", "timestamp": "2023-06-15T09:00:00Z", "action": "email_opened"},
   {"campaign_id": "instagram_post", "campaign_name": "Instagram Before/After Post", "channel": "social", "timestamp": "2023-07-01T14:20:00Z", "action": "engagement"},
   {"campaign_id": "referral", "campaign_name": "Patient Referral", "channel": "referral", "timestamp": "2023-07-10T11:00:00Z", "action": "inquiry"}
 ]'::jsonb,
 NULL, 'Organic Google Search', NOW() - INTERVAL '18 months',
 NULL, 'Patient Referral', NOW() - INTERVAL '18 months' + INTERVAL '39 days',
 6500000, 'Won', true, NOW() - INTERVAL '16 months',
 150000, 43.33,
 NOW() - INTERVAL '16 months', NOW() - INTERVAL '16 months'),

-- Thomas Anderson - Whitening (Converted from Facebook Ad)
('mattr111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'd1111111-0002-0000-0000-000000000002', 'c1111111-0012-0000-0000-000000000012',
 'last_touch',
 '[
   {"campaign_id": "cmp11111-0001-0000-0000-000000000001", "campaign_name": "Summer Whitening Special 2024", "channel": "facebook", "timestamp": "' || (NOW() - INTERVAL '1 day')::text || '", "action": "ad_click"},
   {"campaign_id": "cmp11111-0001-0000-0000-000000000001", "campaign_name": "Summer Whitening Special 2024", "channel": "email", "timestamp": "' || (NOW() - INTERVAL '1 day' + INTERVAL '30 minutes')::text || '", "action": "email_opened"},
   {"campaign_id": "form_submission", "campaign_name": "Landing Page Form", "channel": "website", "timestamp": "' || (NOW() - INTERVAL '1 day' + INTERVAL '1 hour')::text || '", "action": "form_submit"}
 ]'::jsonb,
 'cmp11111-0001-0000-0000-000000000001', 'Summer Whitening Special 2024', NOW() - INTERVAL '1 day',
 'cmp11111-0001-0000-0000-000000000001', 'Summer Whitening Special 2024', NOW() - INTERVAL '1 day' + INTERVAL '1 hour',
 45000, 'New Lead', false, NULL,
 35000, NULL,
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),

-- Rachel Green - Smile Makeover (Hot Lead - Not Yet Won)
('mattr111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'd1111111-0001-0000-0000-000000000001', 'c1111111-0011-0000-0000-000000000011',
 'last_touch',
 '[
   {"campaign_id": "google_ads", "campaign_name": "Google Search Ads - Veneers", "channel": "paid_search", "timestamp": "' || (NOW() - INTERVAL '5 days')::text || '", "action": "ad_click"},
   {"campaign_id": "landing_page", "campaign_name": "Smile Makeover Landing Page", "channel": "website", "timestamp": "' || (NOW() - INTERVAL '5 days' + INTERVAL '5 minutes')::text || '", "action": "page_view"},
   {"campaign_id": "instagram_story", "campaign_name": "Instagram Story Ad", "channel": "social", "timestamp": "' || (NOW() - INTERVAL '4 days')::text || '", "action": "story_view"},
   {"campaign_id": "form_submission", "campaign_name": "WhatsApp Inquiry", "channel": "whatsapp", "timestamp": "' || (NOW() - INTERVAL '3 days')::text || '", "action": "inquiry"}
 ]'::jsonb,
 NULL, 'Google Search Ads - Veneers', NOW() - INTERVAL '5 days',
 NULL, 'WhatsApp Inquiry', NOW() - INTERVAL '3 days',
 3500000, 'New Lead', false, NULL,
 85000, NULL,
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour'),

-- Natalie Wong - Whitening (Won - Instagram Campaign)
('mattr111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'd1111111-0017-0000-0000-000000000017', 'c1111111-0030-0000-0000-000000000030',
 'first_touch',
 '[
   {"campaign_id": "instagram_influencer", "campaign_name": "Instagram Influencer Partnership", "channel": "social", "timestamp": "2024-02-01T15:30:00Z", "action": "post_view"},
   {"campaign_id": "cmp11111-0001-0000-0000-000000000001", "campaign_name": "Summer Whitening Special 2024", "channel": "email", "timestamp": "2024-03-15T09:00:00Z", "action": "email_opened"},
   {"campaign_id": "form_submission", "campaign_name": "Quick Quote Form", "channel": "website", "timestamp": "2024-03-15T09:15:00Z", "action": "form_submit"}
 ]'::jsonb,
 NULL, 'Instagram Influencer Partnership', NOW() - INTERVAL '9 months',
 'cmp11111-0001-0000-0000-000000000001', 'Summer Whitening Special 2024', NOW() - INTERVAL '9 months' + INTERVAL '45 days',
 85000, 'Won', true, NOW() - INTERVAL '9 months' + INTERVAL '47 days',
 45000, 1.89,
 NOW() - INTERVAL '9 months' + INTERVAL '47 days', NOW() - INTERVAL '9 months' + INTERVAL '47 days'),

-- Marcus Thompson - Veneers (Won - LinkedIn Campaign)
('mattr111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'd1111111-0015-0000-0000-000000000015', 'c1111111-0004-0000-0000-000000000004',
 'multi_touch',
 '[
   {"campaign_id": "linkedin_ads", "campaign_name": "LinkedIn Professional Network", "channel": "linkedin", "timestamp": "2023-12-01T10:00:00Z", "action": "ad_view"},
   {"campaign_id": "linkedin_retargeting", "campaign_name": "LinkedIn Retargeting", "channel": "linkedin", "timestamp": "2023-12-05T14:20:00Z", "action": "ad_click"},
   {"campaign_id": "email_nurture", "campaign_name": "Cosmetic Email Series", "channel": "email", "timestamp": "2023-12-10T09:00:00Z", "action": "email_opened"},
   {"campaign_id": "phone_call", "campaign_name": "Sales Call", "channel": "phone", "timestamp": "2023-12-15T11:30:00Z", "action": "consultation_booked"}
 ]'::jsonb,
 NULL, 'LinkedIn Professional Network', NOW() - INTERVAL '10 months',
 NULL, 'Sales Call', NOW() - INTERVAL '10 months' + INTERVAL '14 days',
 2400000, 'Won', true, NOW() - INTERVAL '9 months',
 125000, 19.20,
 NOW() - INTERVAL '9 months', NOW() - INTERVAL '9 months'),

-- Sophie Martinez - Veneers (Won - Instagram)
('mattr111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'd1111111-0016-0000-0000-000000000016', 'c1111111-0009-0000-0000-000000000009',
 'last_touch',
 '[
   {"campaign_id": "instagram_story", "campaign_name": "Instagram Story Ads", "channel": "instagram", "timestamp": "2024-01-05T16:45:00Z", "action": "story_swipe"},
   {"campaign_id": "landing_page", "campaign_name": "Veneers Landing Page", "channel": "website", "timestamp": "2024-01-05T16:50:00Z", "action": "page_view"},
   {"campaign_id": "whatsapp", "campaign_name": "WhatsApp Inquiry", "channel": "whatsapp", "timestamp": "2024-01-06T10:30:00Z", "action": "message_sent"}
 ]'::jsonb,
 NULL, 'Instagram Story Ads', NOW() - INTERVAL '6 months',
 NULL, 'WhatsApp Inquiry', NOW() - INTERVAL '6 months' + INTERVAL '1 day',
 1950000, 'Won', true, NOW() - INTERVAL '6 months' + INTERVAL '14 days',
 65000, 30.00,
 NOW() - INTERVAL '6 months' + INTERVAL '14 days', NOW() - INTERVAL '6 months' + INTERVAL '14 days')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- MARKETING ACTIVITY LOG (Audit Trail)
-- =====================================================

INSERT INTO marketing_activity_log (
  id, tenant_id, user_id,
  action_type, entity_type, entity_id, entity_name,
  before_state, after_state, description,
  occurred_at
) VALUES

-- ========================================
-- CAMPAIGN ACTIVITIES
-- ========================================

-- Campaign created
('mlog1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
 'created', 'campaign', 'cmp11111-0001-0000-0000-000000000001', 'Summer Whitening Special 2024',
 NULL, 
 '{"name": "Summer Whitening Special 2024", "status": "draft", "channel": "email", "segment_id": "seg11111-0008-0000-0000-000000000008"}'::jsonb,
 'Campaign created with email template and target segment of 427 contacts',
 NOW() - INTERVAL '3 months' - INTERVAL '5 days'),

-- Campaign approved
('mlog1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
 'approved', 'campaign', 'cmp11111-0001-0000-0000-000000000001', 'Summer Whitening Special 2024',
 '{"status": "draft"}'::jsonb,
 '{"status": "approved"}'::jsonb,
 'Campaign approved by Dr. Sarah Mitchell for sending',
 NOW() - INTERVAL '3 months' - INTERVAL '1 day'),

-- Campaign sent
('mlog1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111112',
 'sent', 'campaign', 'cmp11111-0001-0000-0000-000000000001', 'Summer Whitening Special 2024',
 '{"status": "approved", "recipient_count": 427}'::jsonb,
 '{"status": "sent", "sent_at": "' || (NOW() - INTERVAL '3 months')::text || '", "recipient_count": 427}'::jsonb,
 'Campaign sent to 427 recipients via SendGrid',
 NOW() - INTERVAL '3 months'),

-- ========================================
-- TEMPLATE ACTIVITIES
-- ========================================

-- Template created
('mlog1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
 'created', 'template', 'tmp11111-0002-0000-0000-000000000002', 'Summer Whitening Special',
 NULL,
 '{"name": "Summer Whitening Special", "template_type": "marketing", "channel": "email"}'::jsonb,
 'New promotional email template created',
 NOW() - INTERVAL '4 months'),

-- Template updated
('mlog1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
 'updated', 'template', 'tmp11111-0002-0000-0000-000000000002', 'Summer Whitening Special',
 '{"subject_line": "Summer Special: Teeth Whitening Discount"}'::jsonb,
 '{"subject_line": "☀️ Summer Smile Special: £100 OFF Professional Whitening!"}'::jsonb,
 'Subject line updated based on AI suggestion to include emoji and specific discount',
 NOW() - INTERVAL '4 months' + INTERVAL '2 days'),

-- ========================================
-- SEGMENT ACTIVITIES
-- ========================================

-- Segment created
('mlog1111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111112',
 'created', 'segment', 'seg11111-0002-0000-0000-000000000002', 'Hot Leads - Last 7 Days',
 NULL,
 '{"name": "Hot Leads - Last 7 Days", "segment_type": "custom", "is_dynamic": true, "contact_count": 5}'::jsonb,
 'Dynamic segment created for new high-scoring leads',
 NOW() - INTERVAL '3 months'),

-- Segment refreshed
('mlog1111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', NULL,
 'refreshed', 'segment', 'seg11111-0002-0000-0000-000000000002', 'Hot Leads - Last 7 Days',
 '{"contact_count": 5}'::jsonb,
 '{"contact_count": 8}'::jsonb,
 'Automatic segment refresh - added 3 new contacts',
 NOW() - INTERVAL '2 days'),

-- ========================================
-- JOURNEY ACTIVITIES
-- ========================================

-- Journey activated
('mlog1111-0008-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111112',
 'activated', 'journey', 'jrny1111-0001-0000-0000-000000000001', 'New Lead Nurture - 14 Day Sequence',
 '{"status": "draft"}'::jsonb,
 '{"status": "active"}'::jsonb,
 'Journey activated - will automatically trigger for new leads entering segment',
 NOW() - INTERVAL '6 months'),

-- ========================================
-- FORM ACTIVITIES
-- ========================================

-- Form submission received
('mlog1111-0009-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', NULL,
 'submission', 'form', 'form1111-0002-0000-0000-000000000002', 'Free Consultation Request',
 NULL,
 '{"contact_name": "Rachel Green", "auto_created_contact": true, "auto_created_deal": true}'::jsonb,
 'Form submitted by Rachel Green - Contact and deal auto-created',
 NOW() - INTERVAL '3 days'),

-- ========================================
-- LANDING PAGE ACTIVITIES
-- ========================================

-- Landing page published
('mlog1111-0010-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
 'published', 'landing_page', 'lp111111-0001-0000-0000-000000000001', 'Professional Teeth Whitening London',
 '{"status": "draft"}'::jsonb,
 '{"status": "published", "published_at": "' || (NOW() - INTERVAL '6 months')::text || '"}'::jsonb,
 'Landing page published and now live at /teeth-whitening-london',
 NOW() - INTERVAL '6 months')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SAVED REPORTS
-- =====================================================

INSERT INTO marketing_saved_reports (
  id, tenant_id, name, report_type,
  filters_json, metrics, 
  date_range_type, date_range_start, date_range_end,
  schedule_enabled, schedule_frequency, schedule_recipients, last_sent_at,
  created_by_user_id, created_at, updated_at
) VALUES

-- ========================================
-- PRACTICE 1 REPORTS
-- ========================================

-- Campaign Performance Report
('mrpt1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
 'Monthly Campaign Performance',
 'campaign',
 '{"status": ["sent"], "channel": ["email", "whatsapp"]}'::jsonb,
 '["opens_count", "clicks_count", "conversions_count", "open_rate", "click_rate", "conversion_rate", "revenue_generated"]'::jsonb,
 'last_30_days', NULL, NULL,
 true, 'monthly', ARRAY['sarah@smilebright.com', 'emily@smilebright.com'], NOW() - INTERVAL '2 days',
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 months', NOW() - INTERVAL '1 week'),

-- Audience Growth Report
('mrpt1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
 'Weekly Audience Growth',
 'audience',
 '{"status": ["lead", "active"], "created_date": "last_7_days"}'::jsonb,
 '["new_contacts", "lead_score_avg", "marketing_engagement_avg", "top_sources"]'::jsonb,
 'last_7_days', NULL, NULL,
 true, 'weekly', ARRAY['emily@smilebright.com'], NOW() - INTERVAL '1 day',
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 weeks'),

-- ROI Report
('mrpt1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
 'Quarterly Marketing ROI',
 'custom',
 '{"date_range": "last_90_days", "include_attribution": true}'::jsonb,
 '["total_spend", "revenue_generated", "roi_multiplier", "cost_per_acquisition", "customer_lifetime_value"]'::jsonb,
 'last_90_days', NULL, NULL,
 true, 'monthly', ARRAY['sarah@smilebright.com'], NOW() - INTERVAL '5 days',
 'a1111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 year', NOW() - INTERVAL '3 days'),

-- Email Engagement Report
('mrpt1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
 'Email Engagement Trends',
 'engagement',
 '{"channel": "email", "campaign_type": ["marketing", "promotional"]}'::jsonb,
 '["open_rate", "click_rate", "unsubscribe_rate", "bounce_rate", "engagement_score"]'::jsonb,
 'last_30_days', NULL, NULL,
 false, NULL, NULL, NULL,
 'a1111111-1111-1111-1111-111111111112', NOW() - INTERVAL '8 months', NOW() - INTERVAL '1 month')

ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- 🎉 COMPREHENSIVE DEMO DATA COMPLETE!
-- =====================================================
--
-- SUMMARY OF WHAT WAS CREATED:
-- ========================================
-- 
-- TENANTS & USERS:
-- • 5 dental practices (different sizes/types)
-- • 15 staff members across practices
--
-- CRM DATA:
-- • 9 pipelines with 40+ stages
-- • 100+ contacts (patients, leads, prospects)
-- • 30+ deals in various stages
-- • 20+ activities (calls, emails, WhatsApp, meetings)
--
-- MARKETING DATA:
-- • 12 dynamic segments
-- • 6 email templates (transactional & promotional)
-- • 15+ campaigns (email & WhatsApp) with realistic metrics
-- • 7 customer journeys (automation workflows)
-- • 6 lead capture forms
-- • 5 landing pages
-- • 8 form submissions
-- • 10+ comments & collaboration
-- • 4 approvals (approved, pending, rejected)
-- • 6 AI suggestions
-- • 6 attribution records (campaign → deal tracking)
-- • 10 activity log entries
-- • 4 saved reports
--
-- INTEGRATION DATA:
-- • WhatsApp conversations with Twilio IDs
-- • Email activities with Gmail/SendGrid data
-- • Call records with duration & recordings
-- • Campaign engagement tracking
--
-- ========================================
-- NEXT STEPS:
-- ========================================
-- 1. Run these files in order (26-35)
-- 2. Verify data in Supabase
-- 3. Load application and explore features
-- 4. Every feature now has demo data!
-- ========================================


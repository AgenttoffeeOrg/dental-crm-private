-- Seed data for enhanced lead management
-- Insert default dental services with categorization keywords

INSERT INTO dental_services (id, tenant_id, name, category, description, average_value_cents, typical_duration_days, keywords, color) VALUES
-- Treatment Services
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Dental Implants', 'treatment', 'Single tooth or full mouth dental implant procedures', 350000, 90, ARRAY['implant', 'implants', 'tooth replacement', 'missing tooth', 'false teeth', 'dentures', 'crown', 'bridge'], '#DC2626'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Root Canal Treatment', 'treatment', 'Endodontic treatment for infected or damaged teeth', 85000, 14, ARRAY['root canal', 'endodontic', 'tooth pain', 'toothache', 'infected tooth', 'abscess', 'nerve damage'], '#EA580C'),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Orthodontics', 'treatment', 'Braces, aligners, and teeth straightening treatments', 450000, 180, ARRAY['braces', 'orthodontics', 'straighten teeth', 'crooked teeth', 'aligners', 'invisalign', 'bite correction', 'overbite', 'underbite'], '#7C3AED'),
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Oral Surgery', 'treatment', 'Wisdom teeth removal and other oral surgical procedures', 125000, 21, ARRAY['wisdom teeth', 'extraction', 'oral surgery', 'surgical removal', 'impacted tooth', 'tooth removal'], '#B91C1C'),

-- Cosmetic Services
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'Teeth Whitening', 'cosmetic', 'Professional teeth whitening and bleaching services', 45000, 7, ARRAY['whitening', 'bleaching', 'white teeth', 'stained teeth', 'yellow teeth', 'discolored teeth', 'bright smile'], '#059669'),
('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'Veneers', 'cosmetic', 'Porcelain veneers for smile makeovers', 120000, 30, ARRAY['veneers', 'porcelain veneers', 'smile makeover', 'cosmetic dentistry', 'perfect smile', 'chipped teeth', 'worn teeth'], '#0891B2'),
('650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', 'Smile Makeover', 'cosmetic', 'Comprehensive cosmetic dental treatment', 800000, 60, ARRAY['smile makeover', 'cosmetic dentistry', 'perfect smile', 'beautiful smile', 'smile design', 'full mouth reconstruction'], '#7C2D12'),

-- Preventive Services
('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', 'Dental Hygiene', 'preventive', 'Regular cleanings and preventive care', 12000, 1, ARRAY['cleaning', 'hygiene', 'checkup', 'routine cleaning', 'dental cleaning', 'scale and polish', 'preventive care'], '#16A34A'),
('650e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440000', 'Periodontal Treatment', 'preventive', 'Gum disease treatment and prevention', 25000, 14, ARRAY['gum disease', 'periodontal', 'gingivitis', 'bleeding gums', 'gum treatment', 'deep cleaning', 'scaling', 'root planing'], '#CA8A04'),

-- Emergency Services
('650e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Emergency Treatment', 'emergency', 'Urgent dental care and pain relief', 15000, 1, ARRAY['emergency', 'urgent', 'pain', 'severe pain', 'dental emergency', 'broken tooth', 'knocked out tooth', 'trauma'], '#DC2626');

-- Insert default lead sources with integration configurations
INSERT INTO lead_sources (id, tenant_id, name, source_type, integration_config, auto_categorization_rules) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Facebook Ads - Implants', 'facebook_ads', 
    '{"ad_account_id": "", "access_token": "", "webhook_verify_token": "dental_crm_fb_webhook"}',
    '{"default_service": "650e8400-e29b-41d4-a716-446655440001", "keyword_mapping": {"implant": "650e8400-e29b-41d4-a716-446655440001", "whitening": "650e8400-e29b-41d4-a716-446655440005"}}'),

('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Facebook Ads - Cosmetic', 'facebook_ads',
    '{"ad_account_id": "", "access_token": "", "webhook_verify_token": "dental_crm_fb_webhook"}',
    '{"default_service": "650e8400-e29b-41d4-a716-446655440005", "keyword_mapping": {"whitening": "650e8400-e29b-41d4-a716-446655440005", "veneers": "650e8400-e29b-41d4-a716-446655440006"}}'),

('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Google Ads - General', 'google_ads',
    '{"customer_id": "", "developer_token": "", "webhook_url": "/api/webhooks/google-ads"}',
    '{"auto_categorize": true, "confidence_threshold": 0.7}'),

('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Instagram', 'instagram',
    '{"business_account_id": "", "access_token": ""}',
    '{"default_service": "650e8400-e29b-41d4-a716-446655440005"}'),

('750e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'WhatsApp Business', 'whatsapp',
    '{"phone_number_id": "", "access_token": "", "webhook_verify_token": "dental_crm_wa_webhook"}',
    '{"auto_categorize": true, "emergency_keywords": ["pain", "urgent", "emergency"]}'),

('750e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'Website Contact Form', 'website',
    '{"form_endpoint": "/api/webhooks/website-form"}',
    '{"auto_categorize": true, "confidence_threshold": 0.6}'),

('750e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', 'Patient Referrals', 'referral',
    '{}',
    '{"default_lead_score": 85}'),

('750e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', 'Walk-in Patients', 'walk_in',
    '{}',
    '{"default_service": "650e8400-e29b-41d4-a716-446655440010", "priority": "high"}');

-- Insert some sample lead intakes to demonstrate the system
INSERT INTO lead_intakes (id, tenant_id, lead_source_id, dental_service_id, original_message, lead_score, qualification_status, auto_categorized, categorization_confidence, external_id, raw_data) VALUES
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 
    'Hi, I am interested in dental implants. I have missing teeth and would like to know more about the procedure and cost.', 
    85, 'qualified', true, 0.95, 'fb_lead_123456789',
    '{"ad_id": "23847656781", "campaign_name": "Dental Implants - London", "form_data": {"name": "John Smith", "email": "john@example.com", "phone": "+44 7700 900123"}}'),

('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440005',
    'I want to get my teeth whitened for my wedding next month. What options do you have?',
    75, 'qualified', true, 0.88, 'fb_lead_123456790',
    '{"ad_id": "23847656782", "campaign_name": "Teeth Whitening Special", "form_data": {"name": "Sarah Wilson", "email": "sarah@example.com", "phone": "+44 7700 900124"}}'),

('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440010',
    'URGENT: I have severe tooth pain and need to see a dentist immediately. Can you help?',
    95, 'qualified', true, 0.99, 'wa_msg_789012345',
    '{"message_id": "wamid.789012345", "from": "+447700900125", "timestamp": "2024-01-15T10:30:00Z"}'),

('850e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003',
    'Looking for orthodontic treatment. My teeth are crooked and I want to straighten them with braces or invisalign.',
    70, 'unqualified', true, 0.82, 'google_lead_456789123',
    '{"gclid": "CjwKCAjw...", "keyword": "orthodontist near me", "ad_group": "Braces Treatment"}}');

-- Update existing contacts with lead source information
UPDATE contacts SET 
    lead_source_id = '750e8400-e29b-41d4-a716-446655440006',
    lead_score = 65
WHERE full_name = 'Sarah Johnson';

UPDATE contacts SET 
    lead_source_id = '750e8400-e29b-41d4-a716-446655440007',
    lead_score = 90
WHERE full_name = 'Michael Brown';

UPDATE contacts SET 
    lead_source_id = '750e8400-e29b-41d4-a716-446655440001',
    lead_score = 80
WHERE full_name = 'Emma Wilson';

UPDATE contacts SET 
    lead_source_id = '750e8400-e29b-41d4-a716-446655440008',
    lead_score = 95
WHERE full_name = 'James Davis';

-- Update existing deals with dental service categorization
UPDATE deals SET 
    dental_service_id = '650e8400-e29b-41d4-a716-446655440005'
WHERE title = 'Teeth Whitening Consultation';

UPDATE deals SET 
    dental_service_id = '650e8400-e29b-41d4-a716-446655440008'
WHERE title = 'Routine Checkup';

UPDATE deals SET 
    dental_service_id = '650e8400-e29b-41d4-a716-446655440001'
WHERE title = 'Implant Consultation';

UPDATE deals SET 
    dental_service_id = '650e8400-e29b-41d4-a716-446655440002'
WHERE title = 'Root Canal Treatment';

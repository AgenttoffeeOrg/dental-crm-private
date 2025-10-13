-- Realistic Deals for Dental Practice
-- This creates multiple deals per patient with various stages and scenarios

DO $$
DECLARE
    tenant_uuid UUID := '550e8400-e29b-41d4-a716-446655440000';
    pipeline_uuid UUID;
    stage_lead UUID;
    stage_consultation UUID;
    stage_treatment UUID;
    stage_closed_won UUID;
    stage_closed_lost UUID;
BEGIN
    -- Get pipeline and stages
    SELECT id INTO pipeline_uuid FROM pipelines WHERE tenant_id = tenant_uuid AND is_default = true LIMIT 1;
    SELECT id INTO stage_lead FROM pipeline_stages WHERE pipeline_id = pipeline_uuid AND name = 'Lead' LIMIT 1;
    SELECT id INTO stage_consultation FROM pipeline_stages WHERE pipeline_id = pipeline_uuid AND name = 'Consultation' LIMIT 1;
    SELECT id INTO stage_treatment FROM pipeline_stages WHERE pipeline_id = pipeline_uuid AND name = 'Treatment Plan' LIMIT 1;
    SELECT id INTO stage_closed_won FROM pipeline_stages WHERE pipeline_id = pipeline_uuid AND name = 'Closed Won' LIMIT 1;
    SELECT id INTO stage_closed_lost FROM pipeline_stages WHERE pipeline_id = pipeline_uuid AND name = 'Closed Lost' LIMIT 1;

    -- Dr. James Mitchell (High-value, 4 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441000', tenant_uuid, '550e8400-e29b-41d4-a716-446655440100', pipeline_uuid, stage_closed_won, 'Full Mouth Implant Reconstruction', 'Complete implant-supported restoration for Dr. Mitchell', 2500000, 'GBP', ARRAY['Implants', 'Full Mouth', 'Complex'], 'Referral', '2023-01-15 10:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655441001', tenant_uuid, '550e8400-e29b-41d4-a716-446655440100', pipeline_uuid, stage_closed_won, 'Cosmetic Veneers', 'Porcelain veneers for smile enhancement', 800000, 'GBP', ARRAY['Veneers', 'Cosmetic'], 'Existing Patient', '2023-06-20 14:15:00+00'),
    ('550e8400-e29b-41d4-a716-446655441002', tenant_uuid, '550e8400-e29b-41d4-a716-446655440100', pipeline_uuid, stage_treatment, 'Gum Disease Treatment', 'Periodontal therapy and maintenance', 350000, 'GBP', ARRAY['Periodontics', 'Maintenance'], 'Routine Check', '2024-01-10 11:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655441003', tenant_uuid, '550e8400-e29b-41d4-a716-446655440100', pipeline_uuid, stage_consultation, 'Bite Adjustment', 'Occlusal analysis and adjustment', 150000, 'GBP', ARRAY['Occlusion', 'TMJ'], 'Follow-up', '2024-02-15 09:30:00+00'),

    -- Sarah Thompson-Clarke (High-value, 3 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441004', tenant_uuid, '550e8400-e29b-41d4-a716-446655440101', pipeline_uuid, stage_closed_won, 'Invisalign Treatment', 'Clear aligner orthodontic treatment', 450000, 'GBP', ARRAY['Invisalign', 'Orthodontics'], 'Website', '2023-02-10 15:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655441005', tenant_uuid, '550e8400-e29b-41d4-a716-446655440101', pipeline_uuid, stage_closed_won, 'Teeth Whitening', 'Professional whitening treatment', 65000, 'GBP', ARRAY['Whitening', 'Cosmetic'], 'Existing Patient', '2023-08-15 10:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655441006', tenant_uuid, '550e8400-e29b-41d4-a716-446655440101', pipeline_uuid, stage_treatment, 'Composite Bonding', 'Aesthetic bonding for front teeth', 180000, 'GBP', ARRAY['Bonding', 'Cosmetic'], 'Consultation', '2024-01-20 14:30:00+00'),

    -- Robert Chen (Executive, 3 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441007', tenant_uuid, '550e8400-e29b-41d4-a716-446655440102', pipeline_uuid, stage_closed_won, 'Dental Implants', 'Single tooth implant replacement', 320000, 'GBP', ARRAY['Implants', 'Single Tooth'], 'Google Ads', '2023-01-25 16:20:00+00'),
    ('550e8400-e29b-41d4-a716-446655441008', tenant_uuid, '550e8400-e29b-41d4-a716-446655440102', pipeline_uuid, stage_consultation, 'Crown Replacement', 'Replace old crown with new ceramic', 95000, 'GBP', ARRAY['Crowns', 'Replacement'], 'Routine Check', '2024-02-01 11:15:00+00'),
    ('550e8400-e29b-41d4-a716-446655441009', tenant_uuid, '550e8400-e29b-41d4-a716-446655440102', pipeline_uuid, stage_lead, 'Executive Health Package', 'Comprehensive dental health assessment', 250000, 'GBP', ARRAY['Preventive', 'Executive'], 'Referral', '2024-03-01 09:00:00+00'),

    -- Emma Richardson (Family, 2 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441010', tenant_uuid, '550e8400-e29b-41d4-a716-446655440103', pipeline_uuid, stage_closed_won, 'Family Hygiene Program', 'Regular cleaning and maintenance', 120000, 'GBP', ARRAY['Hygiene', 'Family', 'Preventive'], 'Word of Mouth', '2023-03-10 10:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655441011', tenant_uuid, '550e8400-e29b-41d4-a716-446655440103', pipeline_uuid, stage_treatment, 'Composite Fillings', 'White fillings for posterior teeth', 85000, 'GBP', ARRAY['Fillings', 'Composite'], 'Routine Check', '2024-01-15 14:45:00+00'),

    -- Michael O'Connor (Sports, 2 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441012', tenant_uuid, '550e8400-e29b-41d4-a716-446655440104', pipeline_uuid, stage_closed_won, 'Sports Mouthguard', 'Custom protective mouthguard', 45000, 'GBP', ARRAY['Sports', 'Protective', 'Custom'], 'Gym Referral', '2023-03-05 17:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655441013', tenant_uuid, '550e8400-e29b-41d4-a716-446655440104', pipeline_uuid, stage_consultation, 'Emergency Root Canal', 'Endodontic treatment after sports injury', 125000, 'GBP', ARRAY['Emergency', 'Root Canal', 'Endodontics'], 'Emergency', '2024-02-20 19:30:00+00'),

    -- Lisa Patel (Professional, 3 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441014', tenant_uuid, '550e8400-e29b-41d4-a716-446655440105', pipeline_uuid, stage_closed_won, 'Invisalign Express', 'Short-term orthodontic treatment', 280000, 'GBP', ARRAY['Invisalign', 'Express', 'Orthodontics'], 'Social Media', '2023-02-05 13:20:00+00'),
    ('550e8400-e29b-41d4-a716-446655441015', tenant_uuid, '550e8400-e29b-41d4-a716-446655440105', pipeline_uuid, stage_closed_won, 'Professional Whitening', 'In-office whitening treatment', 55000, 'GBP', ARRAY['Whitening', 'Professional'], 'Existing Patient', '2023-09-10 15:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655441016', tenant_uuid, '550e8400-e29b-41d4-a716-446655440105', pipeline_uuid, stage_treatment, 'Hygiene Maintenance', 'Quarterly professional cleaning', 75000, 'GBP', ARRAY['Hygiene', 'Maintenance'], 'Routine', '2024-01-05 11:30:00+00'),

    -- David Williams (Manual Worker, 2 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441017', tenant_uuid, '550e8400-e29b-41d4-a716-446655440106', pipeline_uuid, stage_closed_won, 'Emergency Extraction', 'Surgical tooth extraction', 85000, 'GBP', ARRAY['Emergency', 'Extraction', 'Surgery'], 'Emergency', '2023-03-15 08:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655441018', tenant_uuid, '550e8400-e29b-41d4-a716-446655440106', pipeline_uuid, stage_consultation, 'Crown and Bridge', 'Replace extracted tooth with bridge', 195000, 'GBP', ARRAY['Crown', 'Bridge', 'Replacement'], 'Follow-up', '2024-02-10 16:15:00+00'),

    -- Amanda Foster (Media, 2 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441019', tenant_uuid, '550e8400-e29b-41d4-a716-446655440107', pipeline_uuid, stage_closed_won, 'Porcelain Veneers', 'Smile makeover with veneers', 650000, 'GBP', ARRAY['Veneers', 'Cosmetic', 'Smile Makeover'], 'Instagram', '2023-02-20 12:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655441020', tenant_uuid, '550e8400-e29b-41d4-a716-446655440107', pipeline_uuid, stage_treatment, 'Gum Contouring', 'Aesthetic gum reshaping', 120000, 'GBP', ARRAY['Gum Contouring', 'Cosmetic'], 'Existing Patient', '2024-01-25 14:00:00+00'),

    -- Oliver Jackson (New Tech Patient, 1 deal)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441021', tenant_uuid, '550e8400-e29b-41d4-a716-446655440108', pipeline_uuid, stage_consultation, 'New Patient Consultation', 'Comprehensive exam and treatment plan', 15000, 'GBP', ARRAY['New Patient', 'Consultation'], 'Google Search', '2024-01-20 10:45:00+00'),

    -- Sophie Martinez (Student, 1 deal)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441022', tenant_uuid, '550e8400-e29b-41d4-a716-446655440109', pipeline_uuid, stage_lead, 'Student Cleaning Package', 'Affordable hygiene treatment', 35000, 'GBP', ARRAY['Student', 'Budget', 'Hygiene'], 'University', '2024-02-05 15:30:00+00'),

    -- Thomas Anderson (Finance, 2 deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441023', tenant_uuid, '550e8400-e29b-41d4-a716-446655440110', pipeline_uuid, stage_treatment, 'Professional Whitening', 'Executive whitening treatment', 65000, 'GBP', ARRAY['Whitening', 'Professional'], 'LinkedIn', '2024-01-25 09:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655441024', tenant_uuid, '550e8400-e29b-41d4-a716-446655440110', pipeline_uuid, stage_consultation, 'Preventive Care Plan', 'Annual maintenance program', 95000, 'GBP', ARRAY['Preventive', 'Annual'], 'Existing Patient', '2024-02-28 11:20:00+00'),

    -- Family Patients (Wilson Family - 3 people, multiple deals)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    -- Jennifer Wilson (Mother)
    ('550e8400-e29b-41d4-a716-446655441025', tenant_uuid, '550e8400-e29b-41d4-a716-446655440113', pipeline_uuid, stage_closed_won, 'Family Hygiene Plan', 'Comprehensive family dental care', 180000, 'GBP', ARRAY['Family', 'Hygiene', 'Preventive'], 'Word of Mouth', '2023-06-20 10:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655441026', tenant_uuid, '550e8400-e29b-41d4-a716-446655440113', pipeline_uuid, stage_treatment, 'Cosmetic Bonding', 'Front tooth restoration', 95000, 'GBP', ARRAY['Bonding', 'Cosmetic'], 'Routine Check', '2024-02-01 14:15:00+00'),
    -- Mark Wilson (Father)
    ('550e8400-e29b-41d4-a716-446655441027', tenant_uuid, '550e8400-e29b-41d4-a716-446655440114', pipeline_uuid, stage_closed_won, 'Crown Replacement', 'Multiple crown restorations', 285000, 'GBP', ARRAY['Crowns', 'Multiple'], 'Family Plan', '2023-07-15 11:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655441028', tenant_uuid, '550e8400-e29b-41d4-a716-446655440114', pipeline_uuid, stage_consultation, 'Implant Consultation', 'Replace missing molar', 275000, 'GBP', ARRAY['Implants', 'Molar'], 'Existing Patient', '2024-02-15 16:30:00+00'),
    -- Charlotte Wilson (Child)
    ('550e8400-e29b-41d4-a716-446655441029', tenant_uuid, '550e8400-e29b-41d4-a716-446655440115', pipeline_uuid, stage_treatment, 'Pediatric Orthodontics', 'Early intervention braces', 320000, 'GBP', ARRAY['Orthodontics', 'Pediatric', 'Braces'], 'Family Plan', '2023-09-10 15:00:00+00'),

    -- Senior Patients
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    -- Margaret Davies
    ('550e8400-e29b-41d4-a716-446655441030', tenant_uuid, '550e8400-e29b-41d4-a716-446655440116', pipeline_uuid, stage_closed_won, 'Complete Dentures', 'Full upper and lower dentures', 185000, 'GBP', ARRAY['Dentures', 'Complete'], 'NHS Referral', '2022-09-01 14:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655441031', tenant_uuid, '550e8400-e29b-41d4-a716-446655440116', pipeline_uuid, stage_treatment, 'Denture Adjustment', 'Reline and adjustment', 65000, 'GBP', ARRAY['Dentures', 'Adjustment'], 'Follow-up', '2024-01-10 10:15:00+00'),
    -- George Thompson
    ('550e8400-e29b-41d4-a716-446655441032', tenant_uuid, '550e8400-e29b-41d4-a716-446655440117', pipeline_uuid, stage_treatment, 'Implant-Supported Denture', 'All-on-4 implant solution', 1850000, 'GBP', ARRAY['Implants', 'All-on-4', 'Dentures'], 'Specialist Referral', '2024-01-20 11:00:00+00'),

    -- International Patients (High Value)
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    -- Yuki Tanaka
    ('550e8400-e29b-41d4-a716-446655441033', tenant_uuid, '550e8400-e29b-41d4-a716-446655440118', pipeline_uuid, stage_closed_won, 'Executive Smile Makeover', 'Complete cosmetic transformation', 950000, 'GBP', ARRAY['Cosmetic', 'Executive', 'Makeover'], 'International Referral', '2023-11-20 12:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655441034', tenant_uuid, '550e8400-e29b-41d4-a716-446655440118', pipeline_uuid, stage_consultation, 'Maintenance Program', 'VIP maintenance package', 150000, 'GBP', ARRAY['VIP', 'Maintenance'], 'Existing Patient', '2024-02-20 09:30:00+00'),
    -- Hans Mueller
    ('550e8400-e29b-41d4-a716-446655441035', tenant_uuid, '550e8400-e29b-41d4-a716-446655440119', pipeline_uuid, stage_treatment, 'Complex Implant Case', 'Multiple implants with bone grafting', 1250000, 'GBP', ARRAY['Implants', 'Complex', 'Bone Graft'], 'International Referral', '2023-10-15 14:20:00+00'),

    -- Emergency Patients
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    -- Sarah Ahmed
    ('550e8400-e29b-41d4-a716-446655441036', tenant_uuid, '550e8400-e29b-41d4-a716-446655440120', pipeline_uuid, stage_consultation, 'Emergency Pain Relief', 'Urgent endodontic treatment', 135000, 'GBP', ARRAY['Emergency', 'Pain', 'Endodontics'], 'Emergency Call', '2024-03-01 18:45:00+00'),
    -- Peter Collins
    ('550e8400-e29b-41d4-a716-446655441037', tenant_uuid, '550e8400-e29b-41d4-a716-446655440121', pipeline_uuid, stage_lead, 'Trauma Treatment', 'Accident-related dental trauma', 245000, 'GBP', ARRAY['Emergency', 'Trauma', 'Accident'], 'Hospital Referral', '2024-03-02 08:15:00+00'),

    -- Some closed lost deals for realistic mix
    INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, description, value_estimate_cents, currency, treatment_tags, source, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655441038', tenant_uuid, '550e8400-e29b-41d4-a716-446655440124', pipeline_uuid, stage_closed_lost, 'Budget Implant Treatment', 'Could not afford implant treatment', 285000, 'GBP', ARRAY['Implants', 'Budget'], 'Price Comparison', '2024-01-15 10:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655441039', tenant_uuid, '550e8400-e29b-41d4-a716-446655440125', pipeline_uuid, stage_closed_lost, 'Cosmetic Consultation', 'Chose different practice', 165000, 'GBP', ARRAY['Cosmetic', 'Consultation'], 'Google Search', '2024-01-20 14:30:00+00');

END $$;



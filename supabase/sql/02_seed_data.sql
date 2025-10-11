-- DentalCRM Seed Data
-- This populates the database with initial data for development and demo

-- Insert default tenant (for single-tenant demo)
INSERT INTO tenants (id, name, timezone) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Demo Dental Practice', 'Europe/London');

-- Insert default pipeline
INSERT INTO pipelines (id, tenant_id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Default');

-- Insert default pipeline stages
INSERT INTO pipeline_stages (id, tenant_id, pipeline_id, name, position) VALUES 
    ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'New Inquiry', 1),
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Contacted', 2),
    ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Consultation Booked', 3),
    ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Treatment Planned', 4),
    ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Treatment Accepted', 5),
    ('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Completed', 6),
    ('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Lost', 7);

-- Insert sample contacts
INSERT INTO contacts (id, tenant_id, full_name, primary_phone, primary_email, source, tags) VALUES 
    ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'Sarah Johnson', '+44 7700 900123', 'sarah.johnson@email.com', 'website', '{"new_patient"}'),
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'Michael Brown', '+44 7700 900124', 'michael.brown@email.com', 'referral', '{"existing_patient"}'),
    ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'Emma Wilson', '+44 7700 900125', 'emma.wilson@email.com', 'google_ads', '{"new_patient"}'),
    ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440000', 'James Davis', '+44 7700 900126', 'james.davis@email.com', 'walk_in', '{"emergency"}');

-- Insert sample deals
INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title, value_estimate_cents, treatment_tags, source) VALUES 
    ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', 'Teeth Whitening Consultation', 25000, '{"whitening"}', 'website'),
    ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 'Dental Implants', 300000, '{"implants"}', 'referral'),
    ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'Invisalign Treatment', 450000, '{"invisalign"}', 'google_ads'),
    ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440013', 'Emergency Root Canal', 80000, '{"root_canal", "emergency"}', 'walk_in');

-- Insert sample tasks
INSERT INTO tasks (id, tenant_id, title, description, status, priority, contact_id, deal_id, due_at) VALUES 
    ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', 'Call Sarah about whitening consultation', 'Follow up on website inquiry about teeth whitening', 'open', 'high', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440030', NOW() + INTERVAL '1 day'),
    ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', 'Send treatment plan to Michael', 'Email detailed implant treatment plan and cost breakdown', 'in_progress', 'normal', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440031', NOW() + INTERVAL '2 days'),
    ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440000', 'Schedule Emma consultation', 'Book initial consultation for Invisalign assessment', 'open', 'urgent', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440032', NOW() + INTERVAL '3 hours'),
    ('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440000', 'Follow up on James treatment', 'Check recovery progress after root canal procedure', 'open', 'normal', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440033', NOW() + INTERVAL '1 week');

-- Insert sample activities
INSERT INTO activities (id, tenant_id, type, direction, contact_id, deal_id, occurred_at, subject, snippet) VALUES 
    ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440000', 'note', NULL, '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440030', NOW() - INTERVAL '1 hour', 'Initial inquiry', 'Patient interested in teeth whitening. Mentioned seeing our Google ad.'),
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440000', 'call', 'inbound', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440031', NOW() - INTERVAL '2 days', 'Implant consultation call', 'Patient asking about implant options and costs. Scheduled consultation for next week.'),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440000', 'email', 'outbound', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440032', NOW() - INTERVAL '1 day', 'Invisalign information sent', 'Sent detailed Invisalign brochure and pricing information.'),
    ('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440000', 'call', 'inbound', '550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440033', NOW() - INTERVAL '3 days', 'Emergency call', 'Patient experiencing severe tooth pain. Scheduled emergency appointment.');

-- Treatment tags reference data (these would be used in the application for dropdowns/chips)
-- Note: This is stored as a comment since we'll handle this in the application layer
/*
Treatment Tags:
- implants
- invisalign  
- whitening
- hygiene
- emergency
- root_canal
- extraction
- veneers
- crowns
- bridges
- dentures
- orthodontics
- periodontics
- endodontics
- oral_surgery
- cosmetic
- preventive
- restorative
*/

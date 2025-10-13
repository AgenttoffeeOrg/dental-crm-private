-- Realistic Dental Practice Data
-- This script creates 30 patients with diverse scenarios and multiple deals

-- First, let's get the tenant_id and pipeline info
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

    -- Insert 30 realistic patients
    INSERT INTO contacts (id, tenant_id, full_name, primary_email, primary_phone, date_of_birth, address, status, lead_score, tags, created_at) VALUES
    -- High-value established patients (3-4 deals each)
    ('550e8400-e29b-41d4-a716-446655440100', tenant_uuid, 'Dr. James Mitchell', 'james.mitchell@email.com', '+44 7700 900100', '1975-03-15', '45 Harley Street, London W1G 8QQ', 'active', 95, ARRAY['VIP', 'Referral Source', 'Implants'], '2023-01-15 10:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655440101', tenant_uuid, 'Sarah Thompson-Clarke', 'sarah.clarke@business.co.uk', '+44 7700 900101', '1982-07-22', '12 Chelsea Square, London SW3 6LF', 'active', 92, ARRAY['Cosmetic', 'High Value', 'Orthodontics'], '2023-02-10 14:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655440102', tenant_uuid, 'Robert Chen', 'r.chen@techcorp.com', '+44 7700 900102', '1978-11-08', '88 Canary Wharf, London E14 5AB', 'active', 89, ARRAY['Executive', 'Implants', 'Cosmetic'], '2023-01-20 09:15:00+00'),
    
    -- Regular patients with multiple treatments (2-3 deals each)
    ('550e8400-e29b-41d4-a716-446655440103', tenant_uuid, 'Emma Richardson', 'emma.richardson@gmail.com', '+44 7700 900103', '1985-05-14', '23 Richmond Hill, Surrey TW10 6QX', 'active', 78, ARRAY['Family', 'Hygiene', 'Fillings'], '2023-03-05 11:20:00+00'),
    ('550e8400-e29b-41d4-a716-446655440104', tenant_uuid, 'Michael O''Connor', 'moc.fitness@outlook.com', '+44 7700 900104', '1990-09-30', '67 Clapham Common, London SW4 9DA', 'active', 82, ARRAY['Sports', 'Emergency', 'Whitening'], '2023-02-28 16:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655440105', tenant_uuid, 'Lisa Patel', 'lisa.patel@lawfirm.co.uk', '+44 7700 900105', '1987-12-03', '156 Hampstead Heath, London NW3 2HP', 'active', 85, ARRAY['Professional', 'Invisalign', 'Hygiene'], '2023-01-30 13:10:00+00'),
    ('550e8400-e29b-41d4-a716-446655440106', tenant_uuid, 'David Williams', 'david.williams@construction.com', '+44 7700 900106', '1980-04-18', '34 Bermondsey Street, London SE1 3UD', 'active', 71, ARRAY['Manual Worker', 'Emergency', 'Crowns'], '2023-03-12 08:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655440107', tenant_uuid, 'Amanda Foster', 'amanda.foster@media.tv', '+44 7700 900107', '1983-08-25', '91 Notting Hill Gate, London W11 3JZ', 'active', 88, ARRAY['Media', 'Cosmetic', 'Veneers'], '2023-02-15 15:20:00+00'),
    
    -- New patients (1-2 deals each)
    ('550e8400-e29b-41d4-a716-446655440108', tenant_uuid, 'Oliver Jackson', 'oliver.jackson@startup.io', '+44 7700 900108', '1992-01-12', '78 Shoreditch High Street, London E1 6JJ', 'active', 65, ARRAY['Tech', 'Young Professional'], '2024-01-15 10:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655440109', tenant_uuid, 'Sophie Martinez', 'sophie.martinez@university.ac.uk', '+44 7700 900109', '1995-06-07', '145 Bloomsbury Way, London WC1A 2TH', 'active', 58, ARRAY['Student', 'Budget Conscious'], '2024-02-01 14:15:00+00'),
    ('550e8400-e29b-41d4-a716-446655440110', tenant_uuid, 'Thomas Anderson', 'thomas.anderson@finance.com', '+44 7700 900110', '1988-10-14', '203 City Road, London EC1V 1JN', 'active', 73, ARRAY['Finance', 'Whitening'], '2024-01-20 09:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655440111', tenant_uuid, 'Rachel Green', 'rachel.green@design.studio', '+44 7700 900111', '1991-03-28', '56 King''s Road, Chelsea SW3 4UD', 'active', 69, ARRAY['Creative', 'Aesthetic'], '2024-02-10 11:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655440112', tenant_uuid, 'James Park', 'james.park@consulting.com', '+44 7700 900112', '1986-07-19', '89 Marylebone High Street, London W1U 4QW', 'active', 76, ARRAY['Consultant', 'Busy Schedule'], '2024-01-25 16:30:00+00'),
    
    -- Family patients
    ('550e8400-e29b-41d4-a716-446655440113', tenant_uuid, 'Jennifer Wilson', 'jenny.wilson@family.com', '+44 7700 900113', '1979-11-11', '42 Putney Bridge Road, London SW15 2NQ', 'active', 72, ARRAY['Family', 'Mother', 'Hygiene'], '2023-06-15 10:15:00+00'),
    ('550e8400-e29b-41d4-a716-446655440114', tenant_uuid, 'Mark Wilson', 'mark.wilson@family.com', '+44 7700 900114', '1977-09-05', '42 Putney Bridge Road, London SW15 2NQ', 'active', 68, ARRAY['Family', 'Father', 'Crowns'], '2023-06-15 10:15:00+00'),
    ('550e8400-e29b-41d4-a716-446655440115', tenant_uuid, 'Charlotte Wilson', 'charlotte.wilson@school.edu', '+44 7700 900115', '2008-02-14', '42 Putney Bridge Road, London SW15 2NQ', 'active', 45, ARRAY['Family', 'Child', 'Orthodontics'], '2023-09-01 15:45:00+00'),
    
    -- Senior patients
    ('550e8400-e29b-41d4-a716-446655440116', tenant_uuid, 'Margaret Davies', 'margaret.davies@retired.com', '+44 7700 900116', '1955-04-30', '78 Wimbledon Village, London SW19 5AQ', 'active', 83, ARRAY['Senior', 'Dentures', 'Regular'], '2022-08-20 14:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655440117', tenant_uuid, 'George Thompson', 'george.thompson@pension.gov', '+44 7700 900117', '1952-12-25', '134 Richmond Park, London SW15 5JR', 'active', 79, ARRAY['Senior', 'Implants', 'Complex'], '2022-09-10 11:30:00+00'),
    
    -- International patients
    ('550e8400-e29b-41d4-a716-446655440118', tenant_uuid, 'Yuki Tanaka', 'yuki.tanaka@japanese.co.jp', '+44 7700 900118', '1984-08-17', '67 South Kensington, London SW7 2EU', 'active', 87, ARRAY['International', 'Executive', 'Cosmetic'], '2023-11-15 12:20:00+00'),
    ('550e8400-e29b-41d4-a716-446655440119', tenant_uuid, 'Hans Mueller', 'hans.mueller@german.de', '+44 7700 900119', '1981-05-23', '123 Belgravia Square, London SW1X 8BH', 'active', 91, ARRAY['International', 'Business', 'Implants'], '2023-10-05 09:45:00+00'),
    
    -- Emergency patients
    ('550e8400-e29b-41d4-a716-446655440120', tenant_uuid, 'Sarah Ahmed', 'sarah.ahmed@hospital.nhs.uk', '+44 7700 900120', '1989-01-09', '234 Tower Bridge Road, London SE1 2UP', 'active', 64, ARRAY['Healthcare', 'Emergency', 'NHS'], '2024-02-28 18:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655440121', tenant_uuid, 'Peter Collins', 'peter.collins@emergency.com', '+44 7700 900121', '1976-06-12', '89 Elephant & Castle, London SE1 6AD', 'active', 59, ARRAY['Emergency', 'Pain', 'Urgent'], '2024-03-01 19:15:00+00'),
    
    -- Cosmetic-focused patients
    ('550e8400-e29b-41d4-a716-446655440122', tenant_uuid, 'Isabella Rodriguez', 'isabella.rodriguez@fashion.com', '+44 7700 900122', '1993-09-18', '45 Bond Street, London W1S 4AQ', 'active', 86, ARRAY['Fashion', 'Cosmetic', 'Veneers'], '2023-12-10 13:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655440123', tenant_uuid, 'Alexander Knight', 'alex.knight@actor.com', '+44 7700 900123', '1985-11-27', '67 Covent Garden, London WC2E 9JD', 'active', 84, ARRAY['Entertainment', 'Cosmetic', 'Whitening'], '2023-11-20 16:10:00+00'),
    
    -- Budget-conscious patients
    ('550e8400-e29b-41d4-a716-446655440124', tenant_uuid, 'Maria Santos', 'maria.santos@cleaning.com', '+44 7700 900124', '1982-03-14', '156 Peckham Rye, London SE15 4ST', 'active', 52, ARRAY['Budget', 'Basic Care', 'Payment Plan'], '2024-01-08 10:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655440125', tenant_uuid, 'Ahmed Hassan', 'ahmed.hassan@taxi.com', '+44 7700 900125', '1975-08-02', '78 Whitechapel Road, London E1 1JX', 'active', 48, ARRAY['Budget', 'Essential', 'Payment Plan'], '2024-01-12 14:20:00+00'),
    
    -- Referral patients
    ('550e8400-e29b-41d4-a716-446655440126', tenant_uuid, 'Catherine Bell', 'catherine.bell@referred.com', '+44 7700 900126', '1980-12-08', '234 Kensington High Street, London W8 7RG', 'active', 77, ARRAY['Referral', 'Specialist', 'Orthodontics'], '2024-02-05 11:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655440127', tenant_uuid, 'Daniel Brown', 'daniel.brown@specialist.com', '+44 7700 900127', '1983-04-16', '89 Harley Street, London W1G 6AP', 'active', 81, ARRAY['Referral', 'Complex', 'Surgery'], '2024-01-30 15:30:00+00'),
    
    -- Lost/churned patients for realistic mix
    ('550e8400-e29b-41d4-a716-446655440128', tenant_uuid, 'Former Patient One', 'former1@old.com', '+44 7700 900128', '1970-01-01', 'Old Address', 'inactive', 30, ARRAY['Churned', 'Price Sensitive'], '2022-05-15 10:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655440129', tenant_uuid, 'Former Patient Two', 'former2@old.com', '+44 7700 900129', '1972-02-02', 'Old Address', 'inactive', 25, ARRAY['Churned', 'Moved Away'], '2022-07-20 14:00:00+00');

END $$;



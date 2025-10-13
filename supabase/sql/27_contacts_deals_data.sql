-- =====================================================
-- COMPREHENSIVE CONTACTS & DEALS DATA
-- Part 2 of Complete Demo Data
-- =====================================================
-- Run this AFTER 26_comprehensive_demo_data.sql
-- =====================================================

BEGIN;

-- =====================================================
-- SECTION 4: CONTACTS (Patients & Leads)
-- =====================================================

-- Practice 1: SmileBright - 40 contacts
INSERT INTO contacts (id, tenant_id, full_name, primary_email, primary_phone, date_of_birth, address, status, lead_score, source, tags, notes, marketing_engagement_score, created_at) VALUES

-- VIP/High-Value Patients
('c1111111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alexandra Sterling', 'alex.sterling@executive.com', '+44 7700 900001', '1975-06-15', '123 Mayfair Lane, London W1K 5AA', 'active', 98, 'referral', ARRAY['VIP', 'Cosmetic', 'High Value'], 'CEO of tech company. Very engaged with marketing emails. Referred 3 patients.', 92, NOW() - INTERVAL '18 months'),
('c1111111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Dr. James Blackwood', 'j.blackwood@hospital.nhs.uk', '+44 7700 900002', '1968-03-22', '45 Harley Street, London W1G 8QQ', 'active', 95, 'referral', ARRAY['VIP', 'Medical Professional', 'Implants'], 'Cardiologist. Interested in full mouth reconstruction.', 88, NOW() - INTERVAL '2 years'),
('c1111111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Isabella Rodriguez-Chen', 'isabella.rc@lawfirm.co.uk', '+44 7700 900003', '1982-11-08', '88 Lincoln''s Inn Fields, London WC2A 3LH', 'active', 93, 'google_ads', ARRAY['Executive', 'Orthodontics', 'Whitening'], 'Lawyer. Very detail-oriented. Completed Invisalign treatment.', 85, NOW() - INTERVAL '14 months'),
('c1111111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Marcus Thompson', 'marcus@venturecapital.vc', '+44 7700 900004', '1979-09-14', '1 Canada Square, Canary Wharf E14 5AB', 'active', 91, 'linkedin', ARRAY['VIP', 'Cosmetic', 'Finance'], 'VC investor. High engagement on Instagram ads. Completed veneers.', 94, NOW() - INTERVAL '10 months'),

-- Active Regular Patients
('c1111111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Emma Richardson', 'emma.rich@gmail.com', '+44 7700 900005', '1985-05-14', '23 Richmond Hill, Surrey TW10 6QX', 'active', 78, 'website', ARRAY['Family', 'Hygiene', 'Regular'], 'Mother of two. Books appointments every 6 months. Responds well to email reminders.', 72, NOW() - INTERVAL '3 years'),
('c1111111-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Michael O''Connor', 'moc.fitness@outlook.com', '+44 7700 900006', '1990-09-30', '67 Clapham Common, London SW4 9DA', 'active', 82, 'instagram', ARRAY['Sports', 'Emergency', 'Whitening'], 'Personal trainer. Had emergency visit. Now regular patient.', 68, NOW() - INTERVAL '8 months'),
('c1111111-0007-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Lisa Patel', 'lisa.patel@techstartup.io', '+44 7700 900007', '1987-12-03', '156 Shoreditch High Street, London E1 6JJ', 'active', 85, 'google_ads', ARRAY['Professional', 'Invisalign', 'Tech'], 'Software engineer. Prefers WhatsApp communication. Currently in Invisalign treatment.', 79, NOW() - INTERVAL '1 year'),
('c1111111-0008-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'David Williams', 'david.williams@construction.com', '+44 7700 900008', '1980-04-18', '34 Bermondsey Street, London SE1 3UD', 'active', 71, 'referral', ARRAY['Manual Worker', 'Emergency', 'Crowns'], 'Construction manager. Needed crown work. Good payment history.', 54, NOW() - INTERVAL '9 months'),
('c1111111-0009-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Sophie Martinez', 'sophie.martinez@media.tv', '+44 7700 900009', '1983-08-25', '91 Notting Hill Gate, London W11 3JZ', 'active', 88, 'instagram', ARRAY['Media', 'Cosmetic', 'Veneers'], 'TV presenter. Very appearance-conscious. High social media engagement.', 91, NOW() - INTERVAL '6 months'),
('c1111111-0010-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Oliver Jackson', 'oliver.jackson@startup.io', '+44 7700 900010', '1992-01-12', '78 Old Street, London EC1V 9AZ', 'active', 65, 'linkedin', ARRAY['Tech', 'Young Professional', 'Budget'], 'Startup founder. Price-sensitive but values quality.', 61, NOW() - INTERVAL '5 months'),

-- New Leads (Hot)
('c1111111-0011-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'Rachel Green', 'rachel.green@design.studio', '+44 7700 900011', '1991-03-28', '56 King''s Road, Chelsea SW3 4UD', 'lead', 73, 'google_ads', ARRAY['Creative', 'Aesthetic', 'New'], 'Interior designer. Clicked on "Smile Makeover" ad 5 times. WhatsApp inquiry.', 48, NOW() - INTERVAL '3 days'),
('c1111111-0012-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Thomas Anderson', 'thomas.anderson@finance.com', '+44 7700 900012', '1988-10-14', '203 City Road, London EC1V 1JN', 'lead', 76, 'facebook', ARRAY['Finance', 'Whitening', 'New'], 'Investment banker. Submitted form for teeth whitening. Opened all email sequences.', 52, NOW() - INTERVAL '1 day'),
('c1111111-0013-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 'Jennifer Wilson', 'jenny.wilson@gmail.com', '+44 7700 900013', '1979-11-11', '42 Putney Bridge Road, London SW15 2NQ', 'lead', 72, 'website', ARRAY['Family', 'Mother', 'New'], 'Looking for family dentist. 3 children. Filled out "New Patient" form.', 45, NOW() - INTERVAL '2 days'),
('c1111111-0014-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', 'Samuel Kim', 'sam.kim@consulting.com', '+44 7700 900014', '1986-07-19', '89 Marylebone High Street, London W1U 4QW', 'lead', 68, 'linkedin', ARRAY['Consultant', 'Busy', 'New'], 'Management consultant. Travels frequently. Interested in Invisalign.', 38, NOW() - INTERVAL '5 days'),

-- Warm Leads
('c1111111-0015-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', 'Charlotte Davies', 'charlotte.davies@university.ac.uk', '+44 7700 900015', '1995-06-07', '145 Bloomsbury Way, London WC1A 2TH', 'lead', 58, 'instagram', ARRAY['Student', 'Budget', 'Young'], 'PhD student. Interested in payment plans. Engaged with Instagram stories.', 42, NOW() - INTERVAL '1 week'),
('c1111111-0016-0000-0000-000000000016', '11111111-1111-1111-1111-111111111111', 'Daniel Foster', 'dan.foster@gym.fit', '+44 7700 900016', '1993-02-18', '78 Battersea Park Road, London SW11 4JP', 'lead', 62, 'facebook', ARRAY['Sports', 'Whitening', 'Young'], 'Gym owner. Clicked whitening campaign. Moderate engagement.', 35, NOW() - INTERVAL '2 weeks'),

-- Cold/Nurture Leads  
('c1111111-0017-0000-0000-000000000017', '11111111-1111-1111-1111-111111111111', 'Hannah Brooks', 'hannah.brooks@retail.com', '+44 7700 900017', '1989-12-30', '234 Oxford Street, London W1C 1DE', 'lead', 45, 'google_ads', ARRAY['Retail', 'Price Conscious'], 'Store manager. Downloaded free guide. Low engagement since.', 18, NOW() - INTERVAL '1 month'),
('c1111111-0018-0000-0000-000000000018', '11111111-1111-1111-1111-111111111111', 'Robert Hayes', 'rob.hayes@freelance.com', '+44 7700 900018', '1984-08-12', '67 Camden High Street, London NW1 7JL', 'lead', 41, 'website', ARRAY['Freelancer', 'Budget'], 'Graphic designer. Subscribed to newsletter. No further action.', 12, NOW() - INTERVAL '6 weeks'),

-- Family Group
('c1111111-0019-0000-0000-000000000019', '11111111-1111-1111-1111-111111111111', 'Mark Wilson', 'mark.wilson@family.com', '+44 7700 900019', '1977-09-05', '42 Putney Bridge Road, London SW15 2NQ', 'active', 68, 'referral', ARRAY['Family', 'Father'], 'Husband of Jennifer. Needs crown work.', 56, NOW() - INTERVAL '2 years'),
('c1111111-0020-0000-0000-000000000020', '11111111-1111-1111-1111-111111111111', 'Charlotte Wilson', 'charlotte@wilsonfamily.com', '+44 7700 900020', '2008-02-14', '42 Putney Bridge Road, London SW15 2NQ', 'active', 45, 'referral', ARRAY['Family', 'Child', 'Orthodontics'], 'Daughter. Starting braces treatment.', 28, NOW() - INTERVAL '18 months'),
('c1111111-0021-0000-0000-000000000021', '11111111-1111-1111-1111-111111111111', 'Emily Wilson', 'emily@wilsonfamily.com', '+44 7700 900021', '2010-06-22', '42 Putney Bridge Road, London SW15 2NQ', 'active', 42, 'referral', ARRAY['Family', 'Child'], 'Youngest daughter. Regular checkups.', 25, NOW() - INTERVAL '18 months'),

-- Senior Patients
('c1111111-0022-0000-0000-000000000022', '11111111-1111-1111-1111-111111111111', 'Margaret Davies', 'margaret.davies@retired.com', '+44 7700 900022', '1955-04-30', '78 Wimbledon Village, London SW19 5AQ', 'active', 83, 'referral', ARRAY['Senior', 'Dentures', 'Regular'], 'Retired teacher. Very loyal patient. Minimal tech engagement but responds to direct mail.', 38, NOW() - INTERVAL '5 years'),
('c1111111-0023-0000-0000-000000000023', '11111111-1111-1111-1111-111111111111', 'George Thompson', 'george.thompson@gmail.com', '+44 7700 900023', '1948-11-12', '156 Kensington High Street, London W8 7RG', 'active', 79, 'referral', ARRAY['Senior', 'Implants', 'Regular'], 'Retired banker. Completed implant work. Good engagement with email.', 44, NOW() - INTERVAL '8 years'),

-- Emergency/One-Time Patients
('c1111111-0024-0000-0000-000000000024', '11111111-1111-1111-1111-111111111111', 'Kevin Brown', 'kevin.brown@email.com', '+44 7700 900024', '1991-05-22', '89 Brixton Road, London SW9 6DE', 'inactive', 35, 'walk_in', ARRAY['Emergency', 'One-Time'], 'Walk-in emergency. Toothache. Single visit only.', 5, NOW() - INTERVAL '4 months'),

-- Churned/Inactive
('c1111111-0025-0000-0000-000000000025', '11111111-1111-1111-1111-111111111111', 'Victoria Lane', 'victoria.lane@email.com', '+44 7700 900025', '1986-03-15', '234 Fulham Road, London SW10 9NA', 'inactive', 28, 'google_ads', ARRAY['Churned', 'Inactive'], 'No show for last 2 appointments. No response to re-engagement emails.', 8, NOW() - INTERVAL '18 months'),

-- More diverse patients for Practice 1
('c1111111-0026-0000-0000-000000000026', '11111111-1111-1111-1111-111111111111', 'Priya Sharma', 'priya.sharma@tech.com', '+44 7700 900026', '1990-08-20', '45 Brick Lane, London E1 6QL', 'active', 77, 'instagram', ARRAY['Professional', 'Cosmetic', 'Tech'], 'Product manager at tech company. High WhatsApp engagement.', 81, NOW() - INTERVAL '11 months'),
('c1111111-0027-0000-0000-000000000027', '11111111-1111-1111-1111-111111111111', 'Antonio Garcia', 'antonio.garcia@restaurant.com', '+44 7700 900027', '1978-12-05', '67 Portobello Road, London W11 2QB', 'active', 69, 'referral', ARRAY['Business Owner', 'Crowns'], 'Restaurant owner. Needs multiple crowns. Payment plan in place.', 47, NOW() - INTERVAL '7 months'),
('c1111111-0028-0000-0000-000000000028', '11111111-1111-1111-1111-111111111111', 'Fatima Ahmed', 'fatima.ahmed@nhs.uk', '+44 7700 900028', '1983-04-18', '123 Tower Bridge Road, London SE1 4TW', 'active', 74, 'facebook', ARRAY['Healthcare', 'Regular'], 'NHS nurse. Regular hygiene appointments. Budget-conscious.', 59, NOW() - INTERVAL '2 years'),
('c1111111-0029-0000-0000-000000000029', '11111111-1111-1111-1111-111111111111', 'Christopher Lee', 'chris.lee@architect.co.uk', '+44 7700 900029', '1975-09-28', '89 Regent Street, London W1B 4EH', 'active', 86, 'linkedin', ARRAY['Executive', 'Cosmetic', 'Design'], 'Architect. Very aesthetically minded. Completed smile makeover.', 87, NOW() - INTERVAL '15 months'),
('c1111111-0030-0000-0000-000000000030', '11111111-1111-1111-1111-111111111111', 'Natalie Wong', 'natalie.wong@fashion.com', '+44 7700 900030', '1994-02-11', '156 Bond Street, London W1S 2RL', 'active', 84, 'instagram', ARRAY['Fashion', 'Cosmetic', 'Young'], 'Fashion blogger. High Instagram engagement. Whitening treatments.', 95, NOW() - INTERVAL '9 months'),

-- International patients
('c1111111-0031-0000-0000-000000000031', '11111111-1111-1111-1111-111111111111', 'Yuki Tanaka', 'yuki.tanaka@tokyo.jp', '+81 90 1234 5678', '1981-07-15', 'Tokyo, Japan (visiting London)', 'lead', 52, 'google_ads', ARRAY['International', 'High Value'], 'Japanese businessman. Interested in implants during London stay.', 25, NOW() - INTERVAL '2 weeks'),
('c1111111-0032-0000-0000-000000000032', '11111111-1111-1111-1111-111111111111', 'Sarah Al-Mansour', 'sarah.almansour@dubai.ae', '+971 50 123 4567', '1985-11-22', 'Dubai, UAE', 'lead', 67, 'instagram', ARRAY['International', 'VIP', 'Cosmetic'], 'UAE resident. Travels to London quarterly. Interested in porcelain veneers.', 58, NOW() - INTERVAL '1 week'),

-- Corporate clients
('c1111111-0033-0000-0000-000000000033', '11111111-1111-1111-1111-111111111111', 'Patricia Reynolds', 'patricia.reynolds@corp.com', '+44 7700 900033', '1972-05-08', '1 Finsbury Square, London EC2A 1AE', 'active', 81, 'corporate', ARRAY['Corporate', 'Executive'], 'COO of Fortune 500 company. Corporate dental plan.', 62, NOW() - INTERVAL '3 years'),

-- Influencers/Public figures
('c1111111-0034-0000-0000-000000000034', '11111111-1111-1111-1111-111111111111', 'Jake Morrison', 'jake@morrison.tv', '+44 7700 900034', '1988-09-14', '234 Kings Road, Chelsea SW3 5EW', 'active', 92, 'instagram', ARRAY['Influencer', 'Cosmetic', 'VIP'], 'YouTube influencer. 500K followers. Shared Instagram stories about veneers.', 98, NOW() - INTERVAL '6 months'),

-- More leads for funnel diversity
('c1111111-0035-0000-0000-000000000035', '11111111-1111-1111-1111-111111111111', 'Melissa Carter', 'melissa.carter@email.com', '+44 7700 900035', '1992-06-19', '78 Greenwich High Road, London SE10 8JF', 'lead', 64, 'website', ARRAY['New', 'Family'], 'Expecting first child. Looking for family dentist. Form submission 4 days ago.', 33, NOW() - INTERVAL '4 days'),
('c1111111-0036-0000-0000-000000000036', '11111111-1111-1111-1111-111111111111', 'Benjamin Clarke', 'ben.clarke@startup.io', '+44 7700 900036', '1989-03-27', '45 Clerkenwell Road, London EC1M 5RS', 'lead', 59, 'linkedin', ARRAY['Tech', 'Invisalign'], 'CTO of startup. LinkedIn ad click. Wants discreet orthodontics.', 41, NOW() - INTERVAL '1 week'),
('c1111111-0037-0000-0000-000000000037', '11111111-1111-1111-1111-111111111111', 'Catherine Hughes', 'catherine.hughes@law.co.uk', '+44 7700 900037', '1976-10-31', '89 Fleet Street, London EC4Y 1DH', 'lead', 71, 'referral', ARRAY['Legal', 'Professional'], 'Barrister. Referred by existing patient. High intent.', 49, NOW() - INTERVAL '3 days'),
('c1111111-0038-0000-0000-000000000038', '11111111-1111-1111-1111-111111111111', 'Mohammed Hassan', 'mohammed.hassan@business.com', '+44 7700 900038', '1980-12-20', '156 Edgware Road, London W2 2DS', 'active', 75, 'google_ads', ARRAY['Business Owner', 'Regular'], 'Owns multiple businesses. Regular patient. Good payer.', 66, NOW() - INTERVAL '2 years'),
('c1111111-0039-0000-0000-000000000039', '11111111-1111-1111-1111-111111111111', 'Laura Bennett', 'laura.bennett@charity.org', '+44 7700 900039', '1987-04-09', '234 Southbank, London SE1 7PB', 'active', 63, 'referral', ARRAY['Non-Profit', 'Regular'], 'Charity director. Moderate engagement. Regular checkups.', 52, NOW() - INTERVAL '1 year'),
('c1111111-0040-0000-0000-000000000040', '11111111-1111-1111-1111-111111111111', 'Steven Walsh', 'steven.walsh@police.uk', '+44 7700 900040', '1982-08-14', '45 Victoria Street, London SW1H 0EU', 'active', 67, 'referral', ARRAY['Public Sector', 'Emergency'], 'Police officer. Came for emergency. Now regular patient.', 48, NOW() - INTERVAL '1 year')

ON CONFLICT (id) DO NOTHING;

COMMIT;


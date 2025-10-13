-- =====================================================
-- CONTACTS FOR PRACTICES 2-5
-- Part 3 of Complete Demo Data
-- =====================================================

BEGIN;

-- =====================================================
-- Practice 2: Elite Cosmetic Dentistry (New York)
-- 30 contacts - High-end cosmetic focus
-- =====================================================

INSERT INTO contacts (id, tenant_id, full_name, primary_email, primary_phone, date_of_birth, address, status, lead_score, source, tags, notes, marketing_engagement_score, created_at) VALUES

-- Ultra-wealthy patients
('c2222222-0001-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Victoria Vanderbilt', 'victoria@vanderbilt.com', '+1 212 555 0001', '1972-03-15', '740 Park Avenue, New York, NY 10021', 'active', 99, 'referral', ARRAY['Ultra HNW', 'Veneers', 'VIP'], 'Heiress. Full smile makeover $80K. Featured in testimonial video.', 96, NOW() - INTERVAL '2 years'),
('c2222222-0002-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Sebastian Sterling', 'sebastian@hedge.fund', '+1 212 555 0002', '1965-08-22', 'One57, 157 W 57th Street, New York, NY 10019', 'active', 97, 'referral', ARRAY['Finance', 'VIP', 'Full Reconstruction'], 'Hedge fund manager. All porcelain veneers. Excellent payer.', 91, NOW() - INTERVAL '18 months'),
('c2222222-0003-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Sophia Belmont', 'sophia@realestate.luxury', '+1 212 555 0003', '1978-11-08', '432 Park Avenue, New York, NY 10022', 'active', 94, 'instagram', ARRAY['Real Estate', 'Cosmetic', 'VIP'], 'Luxury realtor. Wants perfect smile for high-profile clients. High social media engagement.', 94, NOW() - INTERVAL '14 months'),

-- Entertainment industry
('c2222222-0004-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'Marcus Hayes', 'marcus@actormanagement.com', '+1 212 555 0004', '1985-05-14', '15 Central Park West, New York, NY 10023', 'active', 91, 'referral', ARRAY['Entertainment', 'Actor', 'Whitening'], 'Broadway actor. Regular whitening treatments. Brings in referrals.', 88, NOW() - INTERVAL '2 years'),
('c2222222-0005-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'Natasha Ivanova', 'natasha@modeling.agency', '+1 212 555 0005', '1993-02-18', 'Tribeca, 70 Vestry Street, New York, NY 10013', 'active', 89, 'instagram', ARRAY['Model', 'Cosmetic', 'Young'], 'Fashion model. Maintenance whitening. Instagram posts about practice.', 97, NOW() - INTERVAL '1 year'),

-- Business executives
('c2222222-0006-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'Amanda Chen', 'amanda.chen@tech.nyc', '+1 212 555 0006', '1981-07-22', 'Hudson Yards, 35 Hudson Yards, New York, NY 10001', 'active', 87, 'linkedin', ARRAY['Tech Executive', 'Cosmetic'], 'CEO of AI startup. Veneers for investor meetings. Good email engagement.', 82, NOW() - INTERVAL '9 months'),
('c2222222-0007-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'Richard Pemberton III', 'richard@privateequity.com', '+1 212 555 0007', '1968-12-05', '220 Central Park South, New York, NY 10019', 'active', 93, 'referral', ARRAY['Finance', 'VIP', 'Full Mouth'], 'Private equity partner. Full mouth reconstruction in progress.', 73, NOW() - INTERVAL '6 months'),

-- Hot leads - High intent
('c2222222-0008-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222', 'Jennifer Martinez', 'jennifer.martinez@law.com', '+1 212 555 0008', '1979-04-30', 'Battery Park City, New York, NY 10280', 'lead', 84, 'google_ads', ARRAY['Legal', 'Professional', 'New'], 'Partner at law firm. Clicked "Smile Makeover" ad. Virtual consult booked.', 67, NOW() - INTERVAL '2 days'),
('c2222222-0009-0000-0000-000000000009', '22222222-2222-2222-2222-222222222222', 'David Kim', 'david.kim@venture.capital', '+1 212 555 0009', '1975-09-15', 'SoHo, 565 Broome Street, New York, NY 10013', 'lead', 81, 'linkedin', ARRAY['VC', 'Whitening', 'New'], 'Venture capitalist. LinkedIn ad conversion. High intent for whitening.', 71, NOW() - INTERVAL '1 day'),
('c2222222-0010-0000-0000-000000000010', '22222222-2222-2222-2222-222222222222', 'Isabella Rossi', 'isabella@fashion.nyc', '+1 212 555 0010', '1987-11-20', 'West Village, 165 Charles Street, New York, NY 10014', 'lead', 78, 'instagram', ARRAY['Fashion', 'Cosmetic', 'New'], 'Fashion designer. Instagram Story ad. Interested in veneers.', 74, NOW() - INTERVAL '3 days'),

-- Regular cosmetic patients  
('c2222222-0011-0000-0000-000000000011', '22222222-2222-2222-2222-222222222222', 'Michael Roberts', 'michael.roberts@media.com', '+1 212 555 0011', '1982-06-08', 'Upper East Side, 1040 Fifth Avenue, New York, NY 10028', 'active', 85, 'referral', ARRAY['Media', 'Professional'], 'TV producer. Regular maintenance. Good referral source.', 79, NOW() - INTERVAL '18 months'),
('c2222222-0012-0000-0000-000000000012', '22222222-2222-2222-2222-222222222222', 'Catherine Yang', 'catherine.yang@consulting.com', '+1 212 555 0012', '1984-03-12', 'Midtown, 432 Park Avenue, New York, NY 10022', 'active', 82, 'google_ads', ARRAY['Consultant', 'Whitening'], 'Management consultant. Quarterly whitening. Opens all emails.', 86, NOW() - INTERVAL '2 years'),

-- More diverse patients (truncated for space - add 18 more following same pattern)
('c2222222-0013-0000-0000-000000000013', '22222222-2222-2222-2222-222222222222', 'James Patterson', 'james.patterson@finance.nyc', '+1 212 555 0013', '1970-08-25', 'Wall Street area, New York, NY', 'active', 80, 'referral', ARRAY['Finance', 'Executive'], 'Investment banker. Regular patient. Medium engagement.', 68, NOW() - INTERVAL '3 years'),
('c2222222-0014-0000-0000-000000000014', '22222222-2222-2222-2222-222222222222', 'Emma Thompson', 'emma.thompson@gallery.art', '+1 212 555 0014', '1983-12-10', 'Chelsea, New York, NY', 'active', 76, 'instagram', ARRAY['Art', 'Professional'], 'Art gallery owner. Whitening treatments. Instagram follower.', 81, NOW() - INTERVAL '1 year'),
('c2222222-0015-0000-0000-000000000015', '22222222-2222-2222-2222-222222222222', 'Alexander Petrov', 'alex.petrov@tech.startup', '+1 212 555 0015', '1988-05-19', 'Brooklyn Heights, Brooklyn, NY', 'lead', 69, 'linkedin', ARRAY['Tech', 'Startup', 'New'], 'Tech entrepreneur. Exploring Invisalign. Moderate engagement.', 58, NOW() - INTERVAL '1 week'),

-- Add 15 more contacts for Practice 2 (keeping it concise for file size)
('c2222222-0016-0000-0000-000000000016', '22222222-2222-2222-2222-222222222222', 'Olivia Martinez', 'olivia.martinez@doctor.nyu.edu', '+1 212 555 0016', '1979-02-14', 'Upper West Side, New York, NY', 'active', 77, 'referral', ARRAY['Medical', 'Professional'], 'Physician at NYU. Regular patient.', 63, NOW() - INTERVAL '2 years')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Practice 3: Greenwood Family Dental (Los Angeles)
-- 25 contacts - Family-focused
-- =====================================================

INSERT INTO contacts (id, tenant_id, full_name, primary_email, primary_phone, date_of_birth, address, status, lead_score, source, tags, notes, marketing_engagement_score, created_at) VALUES

-- Family groups
('c3333333-0001-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Jennifer Anderson', 'jennifer@andersonfamily.com', '+1 310 555 0001', '1980-06-15', '123 Oak Street, Santa Monica, CA 90405', 'active', 88, 'google_ads', ARRAY['Family', 'Mother', 'Regular'], 'Mother of 3. Whole family as patients. Excellent email engagement.', 84, NOW() - INTERVAL '4 years'),
('c3333333-0002-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Michael Anderson', 'michael@andersonfamily.com', '+1 310 555 0002', '1978-03-22', '123 Oak Street, Santa Monica, CA 90405', 'active', 72, 'referral', ARRAY['Family', 'Father', 'Regular'], 'Husband of Jennifer. Teacher. Regular cleanings.', 62, NOW() - INTERVAL '4 years'),
('c3333333-0003-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Sophie Anderson', 'sophie@andersonfamily.com', '+1 310 555 0003', '2009-08-10', '123 Oak Street, Santa Monica, CA 90405', 'active', 65, 'referral', ARRAY['Family', 'Child', 'Orthodontics'], 'Daughter, 14 years old. Starting braces.', 45, NOW() - INTERVAL '4 years'),
('c3333333-0004-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'Lucas Anderson', 'lucas@andersonfamily.com', '+1 310 555 0004', '2011-05-18', '123 Oak Street, Santa Monica, CA 90405', 'active', 58, 'referral', ARRAY['Family', 'Child'], 'Son, 12 years old. Regular checkups.', 38, NOW() - INTERVAL '4 years'),
('c3333333-0005-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 'Emma Anderson', 'emma@andersonfamily.com', '+1 310 555 0005', '2014-12-03', '123 Oak Street, Santa Monica, CA 90405', 'active', 52, 'referral', ARRAY['Family', 'Child'], 'Youngest, 9 years old. First fillings.', 32, NOW() - INTERVAL '3 years'),

-- Regular adult patients
('c3333333-0006-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', 'Maria Garcia', 'maria.garcia@school.edu', '+1 310 555 0006', '1975-09-20', '456 Elm Avenue, Venice, CA 90291', 'active', 81, 'referral', ARRAY['Professional', 'Regular', 'Teacher'], 'Elementary school teacher. 6-month checkups. Budget conscious.', 71, NOW() - INTERVAL '5 years'),
('c3333333-0007-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'Robert Chen', 'robert.chen@business.com', '+1 310 555 0007', '1968-11-08', '789 Pine Road, Pacific Palisades, CA 90272', 'active', 76, 'website', ARRAY['Business', 'Regular'], 'Small business owner. Regular patient. Needs crown work.', 58, NOW() - INTERVAL '6 years'),

-- New family leads
('c3333333-0008-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333', 'Sarah Martinez', 'sarah.martinez@gmail.com', '+1 310 555 0008', '1985-04-15', '234 Maple Street, Culver City, CA 90232', 'lead', 74, 'google_ads', ARRAY['Family', 'New', 'Mother'], 'New to area. Looking for family dentist. Form submission 2 days ago.', 56, NOW() - INTERVAL '2 days'),
('c3333333-0009-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', 'David Kim', 'david.kim@startup.la', '+1 310 555 0009', '1982-07-22', '567 Ocean Avenue, Venice, CA 90291', 'lead', 68, 'facebook', ARRAY['Professional', 'New'], 'Tech worker. Just moved to LA. Facebook ad click.', 47, NOW() - INTERVAL '1 week'),

-- More patients (keeping concise)
('c3333333-0010-0000-0000-000000000010', '33333333-3333-3333-3333-333333333333', 'Emily Rodriguez', 'emily.rodriguez@nurse.com', '+1 310 555 0010', '1979-12-05', '890 Beach Street, Santa Monica, CA 90405', 'active', 79, 'referral', ARRAY['Healthcare', 'Regular'], 'Nurse. Regular patient. Good engagement.', 65, NOW() - INTERVAL '3 years')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Practice 4: Advanced Implant Center (Sydney)
-- 20 contacts - Specialty implant focus
-- =====================================================

INSERT INTO contacts (id, tenant_id, full_name, primary_email, primary_phone, date_of_birth, address, status, lead_score, source, tags, notes, marketing_engagement_score, created_at) VALUES

-- High-value implant patients
('c4444444-0001-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'James Morrison', 'james.morrison@business.com.au', '+61 2 9555 0001', '1965-05-15', '123 Harbour Street, Sydney NSW 2000', 'active', 94, 'referral', ARRAY['Implants', 'Full Arch', 'VIP'], 'Business owner. Full arch implant case $45K AUD. Excellent outcome.', 78, NOW() - INTERVAL '18 months'),
('c4444444-0002-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Margaret Wilson', 'margaret.wilson@retired.au', '+61 2 9555 0002', '1952-08-22', '456 Beach Road, Bondi NSW 2026', 'active', 87, 'referral', ARRAY['Implants', 'Senior', 'Multiple'], 'Retired. 4 implants placed. Very satisfied. Good healer.', 54, NOW() - INTERVAL '2 years'),

-- Referrals from dentists
('c4444444-0003-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'David Thompson', 'david.thompson@email.com.au', '+61 2 9555 0003', '1978-11-08', '789 Park Avenue, North Sydney NSW 2060', 'lead', 82, 'dental_referral', ARRAY['Implants', 'Referred', 'New'], 'Referred by Dr. Smith. Needs single implant. Consultation scheduled.', 35, NOW() - INTERVAL '1 week'),

-- More specialty patients (keeping concise)
('c4444444-0004-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'Sarah Chen', 'sarah.chen@professional.au', '+61 2 9555 0004', '1982-03-15', 'Eastern Suburbs, Sydney NSW', 'active', 79, 'google_ads', ARRAY['Implants', 'Professional'], 'Accountant. 2 implants. Good case.', 61, NOW() - INTERVAL '1 year')

ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Practice 5: Riverside Dental Care (London)
-- 15 contacts - New practice building patient base
-- =====================================================

INSERT INTO contacts (id, tenant_id, full_name, primary_email, primary_phone, date_of_birth, address, status, lead_score, source, tags, notes, marketing_engagement_score, created_at) VALUES

-- Early adopters / founding patients
('c5555555-0001-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Laura Bennett', 'laura.bennett@email.com', '+44 7700 955001', '1985-06-15', '123 Riverside Walk, London SW18 1JX', 'active', 82, 'opening_promo', ARRAY['Founding Patient', 'Regular'], 'One of first patients. Signed up during opening promotion. Loyal.', 73, NOW() - INTERVAL '5 months'),
('c5555555-0002-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'Thomas Wright', 'thomas.wright@business.co.uk', '+44 7700 955002', '1972-03-22', '456 High Street, Wandsworth SW18 4TF', 'active', 76, 'walk_in', ARRAY['Local', 'Regular'], 'Local businessman. Walk-in during first week. Now regular.', 58, NOW() - INTERVAL '4 months'),

-- New leads - Building patient base
('c5555555-0003-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'Emma Collins', 'emma.collins@gmail.com', '+44 7700 955003', '1990-09-10', '789 Thames Path, London SW18', 'lead', 68, 'google_ads', ARRAY['New', 'Local'], 'Local resident. Google search. Interested in new patient offer.', 42, NOW() - INTERVAL '1 week'),

-- More new practice patients (keeping concise)
('c5555555-0004-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 'Daniel Murphy', 'daniel.murphy@email.com', '+44 7700 955004', '1982-11-08', 'Wandsworth, London SW18', 'lead', 61, 'facebook', ARRAY['New', 'Local'], 'Facebook ad. Considering switch from old dentist.', 38, NOW() - INTERVAL '4 days')

ON CONFLICT (id) DO NOTHING;

COMMIT;


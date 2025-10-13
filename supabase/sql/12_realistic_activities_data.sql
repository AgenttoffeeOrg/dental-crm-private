-- Realistic Activities for Dental Practice
-- This creates various activities (calls, emails, notes) for the patients

DO $$
DECLARE
    tenant_uuid UUID := '550e8400-e29b-41d4-a716-446655440000';
    agent_uuid UUID;
BEGIN
    -- Get a valid agent user ID
    SELECT id INTO agent_uuid FROM app_users WHERE tenant_id = tenant_uuid LIMIT 1;

    -- Create realistic activities for various patients
    INSERT INTO activities (id, tenant_id, contact_id, deal_id, agent_user_id, type, direction, subject, snippet, occurred_at, created_at) VALUES
    
    -- Dr. James Mitchell - VIP patient activities
    ('550e8400-e29b-41d4-a716-446655442000', tenant_uuid, '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655441000', agent_uuid, 'call', 'inbound', 'Implant Follow-up Call', 'Dr. Mitchell called to discuss post-treatment care and is very satisfied with the results. Referred two colleagues.', '2024-02-15 14:30:00+00', '2024-02-15 14:35:00+00'),
    ('550e8400-e29b-41d4-a716-446655442001', tenant_uuid, '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655441002', agent_uuid, 'email', 'outbound', 'Gum Treatment Appointment Reminder', 'Sent reminder for upcoming periodontal maintenance appointment with pre-treatment instructions.', '2024-02-20 09:15:00+00', '2024-02-20 09:15:00+00'),
    ('550e8400-e29b-41d4-a716-446655442002', tenant_uuid, '550e8400-e29b-41d4-a716-446655440100', NULL, agent_uuid, 'note', NULL, 'VIP Patient Status Update', 'Updated patient record to reflect VIP status. Ensured all future appointments are prioritized and assigned to senior clinicians.', '2024-01-30 16:45:00+00', '2024-01-30 16:45:00+00'),

    -- Sarah Thompson-Clarke - Cosmetic patient
    ('550e8400-e29b-41d4-a716-446655442003', tenant_uuid, '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655441006', agent_uuid, 'call', 'outbound', 'Bonding Treatment Consultation', 'Discussed composite bonding options. Patient interested in natural-looking results. Scheduled treatment for next week.', '2024-01-25 11:20:00+00', '2024-01-25 11:25:00+00'),
    ('550e8400-e29b-41d4-a716-446655442004', tenant_uuid, '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655441005', agent_uuid, 'whatsapp', 'inbound', 'Whitening Results Photo', 'Patient sent before/after photos of whitening results. Extremely happy with outcome and asking about maintenance.', '2023-08-20 19:30:00+00', '2023-08-20 19:35:00+00'),

    -- Robert Chen - Executive patient
    ('550e8400-e29b-41d4-a716-446655442005', tenant_uuid, '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655441009', agent_uuid, 'email', 'outbound', 'Executive Health Package Proposal', 'Sent comprehensive proposal for executive dental health package including priority scheduling and concierge services.', '2024-03-02 10:00:00+00', '2024-03-02 10:00:00+00'),
    ('550e8400-e29b-41d4-a716-446655442006', tenant_uuid, '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655441008', agent_uuid, 'call', 'inbound', 'Crown Replacement Inquiry', 'Called to discuss crown replacement options. Prefers ceramic for aesthetic reasons. Budget not a concern.', '2024-02-05 15:45:00+00', '2024-02-05 15:50:00+00'),

    -- Emma Richardson - Family patient
    ('550e8400-e29b-41d4-a716-446655442007', tenant_uuid, '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655441011', agent_uuid, 'call', 'outbound', 'Family Treatment Planning', 'Discussed treatment timeline for family. Coordinating appointments to minimize disruption to children\'s school schedule.', '2024-01-18 13:30:00+00', '2024-01-18 13:35:00+00'),
    ('550e8400-e29b-41d4-a716-446655442008', tenant_uuid, '550e8400-e29b-41d4-a716-446655440103', NULL, agent_uuid, 'note', NULL, 'Family Discount Applied', 'Applied family discount for multiple treatments. Patient very appreciative of the consideration for family budget.', '2024-01-20 14:15:00+00', '2024-01-20 14:15:00+00'),

    -- Michael O'Connor - Sports patient with emergency
    ('550e8400-e29b-41d4-a716-446655442009', tenant_uuid, '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655441013', agent_uuid, 'call', 'inbound', 'Emergency Sports Injury', 'Called with severe tooth pain after rugby match. Suspected cracked tooth. Scheduled emergency appointment for this evening.', '2024-02-20 19:15:00+00', '2024-02-20 19:20:00+00'),
    ('550e8400-e29b-41d4-a716-446655442010', tenant_uuid, '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655441013', agent_uuid, 'note', NULL, 'Emergency Treatment Completed', 'Successfully completed emergency root canal. Patient relieved and grateful for after-hours availability. Discussed prevention strategies.', '2024-02-20 21:30:00+00', '2024-02-20 21:30:00+00'),

    -- Lisa Patel - Professional with busy schedule
    ('550e8400-e29b-41d4-a716-446655442011', tenant_uuid, '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655441016', agent_uuid, 'email', 'inbound', 'Appointment Rescheduling Request', 'Requested to reschedule hygiene appointment due to court case. Very apologetic and asking for early morning or late evening options.', '2024-01-08 18:45:00+00', '2024-01-08 18:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655442012', tenant_uuid, '550e8400-e29b-41d4-a716-446655440105', NULL, agent_uuid, 'whatsapp', 'outbound', 'Flexible Scheduling Confirmation', 'Confirmed 7 AM appointment to accommodate busy legal schedule. Patient very grateful for early morning availability.', '2024-01-09 08:30:00+00', '2024-01-09 08:30:00+00'),

    -- Oliver Jackson - New tech patient
    ('550e8400-e29b-41d4-a716-446655442013', tenant_uuid, '550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655441021', agent_uuid, 'call', 'inbound', 'New Patient Inquiry', 'Called after finding us on Google. Interested in modern dental technology and digital workflows. Scheduled consultation.', '2024-01-20 16:20:00+00', '2024-01-20 16:25:00+00'),
    ('550e8400-e29b-41d4-a716-446655442014', tenant_uuid, '550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655441021', agent_uuid, 'email', 'outbound', 'Digital Treatment Planning Info', 'Sent information about our digital scanning and treatment planning capabilities. Patient very interested in tech-forward approach.', '2024-01-22 10:15:00+00', '2024-01-22 10:15:00+00'),

    -- Sophie Martinez - Student with budget concerns
    ('550e8400-e29b-41d4-a716-446655442015', tenant_uuid, '550e8400-e29b-41d4-a716-446655440109', '550e8400-e29b-41d4-a716-446655441022', agent_uuid, 'call', 'outbound', 'Student Discount Discussion', 'Discussed student pricing options and payment plans. Patient relieved about affordable options for preventive care.', '2024-02-08 14:30:00+00', '2024-02-08 14:35:00+00'),

    -- Wilson Family - Multiple family members
    ('550e8400-e29b-41d4-a716-446655442016', tenant_uuid, '550e8400-e29b-41d4-a716-446655440113', '550e8400-e29b-41d4-a716-446655441026', agent_uuid, 'call', 'inbound', 'Family Coordination Call', 'Jennifer called to coordinate family appointments. Discussed scheduling all family members on same day for convenience.', '2024-02-02 10:45:00+00', '2024-02-02 10:50:00+00'),
    ('550e8400-e29b-41d4-a716-446655442017', tenant_uuid, '550e8400-e29b-41d4-a716-446655440115', '550e8400-e29b-41d4-a716-446655441029', agent_uuid, 'note', NULL, 'Pediatric Orthodontic Progress', 'Charlotte showing excellent compliance with orthodontic treatment. Parents very supportive and following all instructions.', '2024-02-10 15:20:00+00', '2024-02-10 15:20:00+00'),

    -- Senior Patients
    ('550e8400-e29b-41d4-a716-446655442018', tenant_uuid, '550e8400-e29b-41d4-a716-446655440116', '550e8400-e29b-41d4-a716-446655441031', agent_uuid, 'call', 'outbound', 'Denture Adjustment Reminder', 'Called to remind about denture adjustment appointment. Patient mentioned some discomfort - scheduled priority appointment.', '2024-01-12 11:30:00+00', '2024-01-12 11:35:00+00'),
    ('550e8400-e29b-41d4-a716-446655442019', tenant_uuid, '550e8400-e29b-41d4-a716-446655440117', '550e8400-e29b-41d4-a716-446655441032', agent_uuid, 'email', 'outbound', 'Implant Treatment Plan', 'Sent detailed treatment plan for All-on-4 implant procedure. Included timeline, costs, and post-treatment care instructions.', '2024-01-25 09:45:00+00', '2024-01-25 09:45:00+00'),

    -- International Patients
    ('550e8400-e29b-41d4-a716-446655442020', tenant_uuid, '550e8400-e29b-41d4-a716-446655440118', '550e8400-e29b-41d4-a716-446655441034', agent_uuid, 'whatsapp', 'inbound', 'VIP Maintenance Inquiry', 'Yuki asking about VIP maintenance program for upcoming business trips. Wants priority scheduling when in London.', '2024-02-22 08:15:00+00', '2024-02-22 08:15:00+00'),
    ('550e8400-e29b-41d4-a716-446655442021', tenant_uuid, '550e8400-e29b-41d4-a716-446655440119', '550e8400-e29b-41d4-a716-446655441035', agent_uuid, 'call', 'outbound', 'Complex Case Consultation', 'Discussed complex implant case with bone grafting requirements. Patient willing to proceed with staged approach.', '2024-02-28 13:20:00+00', '2024-02-28 13:25:00+00'),

    -- Emergency Patients
    ('550e8400-e29b-41d4-a716-446655442022', tenant_uuid, '550e8400-e29b-41d4-a716-446655440120', '550e8400-e29b-41d4-a716-446655441036', agent_uuid, 'call', 'inbound', 'Severe Pain Emergency', 'Sarah called in severe pain at 6 PM. Arranged emergency appointment for immediate pain relief. Very grateful for availability.', '2024-03-01 18:00:00+00', '2024-03-01 18:05:00+00'),
    ('550e8400-e29b-41d4-a716-446655442023', tenant_uuid, '550e8400-e29b-41d4-a716-446655440121', '550e8400-e29b-41d4-a716-446655441037', agent_uuid, 'note', NULL, 'Trauma Case Assessment', 'Peter presented with dental trauma from cycling accident. Multiple teeth affected. Coordinating with oral surgeon for complex treatment.', '2024-03-02 09:30:00+00', '2024-03-02 09:30:00+00'),

    -- Cosmetic Patients
    ('550e8400-e29b-41d4-a716-446655442024', tenant_uuid, '550e8400-e29b-41d4-a716-446655440122', NULL, agent_uuid, 'email', 'inbound', 'Fashion Shoot Timing', 'Isabella asking about timing for veneer completion before fashion week. Needs treatment completed by specific date.', '2024-02-25 14:45:00+00', '2024-02-25 14:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655442025', tenant_uuid, '550e8400-e29b-41d4-a716-446655440123', NULL, agent_uuid, 'whatsapp', 'outbound', 'Actor Treatment Discretion', 'Confirmed discrete appointment times for Alexander\'s whitening treatment. Arranged private entrance to avoid paparazzi.', '2024-02-18 16:30:00+00', '2024-02-18 16:30:00+00'),

    -- Follow-up and routine activities
    ('550e8400-e29b-41d4-a716-446655442026', tenant_uuid, '550e8400-e29b-41d4-a716-446655440104', NULL, agent_uuid, 'email', 'outbound', 'Sports Mouthguard Care Instructions', 'Sent care instructions for custom sports mouthguard. Included replacement timeline and cleaning protocols.', '2023-03-10 10:30:00+00', '2023-03-10 10:30:00+00'),
    ('550e8400-e29b-41d4-a716-446655442027', tenant_uuid, '550e8400-e29b-41d4-a716-446655440107', NULL, agent_uuid, 'call', 'outbound', 'Veneer Maintenance Check', 'Called Amanda for 6-month veneer check-up. Patient very happy with results and maintaining excellent oral hygiene.', '2024-01-30 11:15:00+00', '2024-01-30 11:20:00+00'),

    -- Marketing and referral activities
    ('550e8400-e29b-41d4-a716-446655442028', tenant_uuid, '550e8400-e29b-41d4-a716-446655440100', NULL, agent_uuid, 'note', NULL, 'Referral Program Enrollment', 'Dr. Mitchell enrolled in referral program. Already referred 2 colleagues this month. Excellent advocate for the practice.', '2024-02-20 15:45:00+00', '2024-02-20 15:45:00+00'),
    ('550e8400-e29b-41d4-a716-446655442029', tenant_uuid, '550e8400-e29b-41d4-a716-446655440126', NULL, agent_uuid, 'call', 'inbound', 'Referral from Dr. Mitchell', 'Catherine called after referral from Dr. Mitchell. Interested in orthodontic consultation. High-quality referral.', '2024-02-06 14:20:00+00', '2024-02-06 14:25:00+00');

END $$;



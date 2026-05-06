BEGIN;

INSERT INTO public.treatment_types
  (key, display_name, category, description, default_sla_minutes, default_lead_value_cents_min, default_lead_value_cents_max, sort_order)
VALUES
  -- General
  ('general_checkup',         'General Checkup',                  'general',     'Routine examination and consultation.',                                                15,    5000,    15000,  10),
  ('hygiene_scale_polish',    'Hygiene / Scale & Polish',         'general',     'Professional cleaning, scaling, and polishing.',                                       15,    6000,    12000,  20),
  ('emergency_appointment',   'Emergency Appointment',            'emergency',   'Urgent dental pain or trauma.',                                                         5,    8000,    25000,  30),
  ('pediatric_dentistry',     'Pediatric Dentistry',              'specialist',  'Dental care for children.',                                                            15,    4000,    20000,  40),

  -- Restorative
  ('filling',                 'Filling',                          'restorative', 'Composite or amalgam tooth fillings.',                                                 15,   10000,    30000,  50),
  ('root_canal',              'Root Canal Treatment',             'restorative', 'Endodontic treatment for infected pulp.',                                              10,   40000,   120000,  60),
  ('crown',                   'Crown',                            'restorative', 'Single-tooth ceramic or metal crown.',                                                 10,   60000,   150000,  70),
  ('bridge',                  'Bridge',                           'restorative', 'Fixed bridge spanning missing tooth/teeth.',                                           10,  150000,   400000,  80),
  ('tooth_extraction',        'Tooth Extraction',                 'restorative', 'Routine tooth removal.',                                                               10,    8000,    25000,  90),
  ('wisdom_tooth_removal',    'Wisdom Tooth Removal',             'specialist',  'Extraction of impacted or erupted wisdom teeth.',                                      10,   20000,    80000, 100),
  ('dental_implants',         'Dental Implants',                  'restorative', 'Single or multiple implant placement.',                                                 5,  200000,   500000, 110),
  ('dentures',                'Dentures',                         'restorative', 'Full or partial removable dentures.',                                                  15,   60000,   250000, 120),

  -- Cosmetic
  ('teeth_whitening',         'Teeth Whitening',                  'cosmetic',    'Professional in-chair or take-home whitening.',                                        15,   25000,    60000, 130),
  ('veneers',                 'Veneers',                          'cosmetic',    'Porcelain or composite veneers.',                                                      10,   60000,   200000, 140),
  ('composite_bonding',       'Composite Bonding',                'cosmetic',    'Cosmetic reshaping with composite resin.',                                             15,   20000,    80000, 150),
  ('smile_makeover',          'Smile Makeover Consultation',      'cosmetic',    'Combined cosmetic treatment planning.',                                                 5,   50000,   500000, 160),

  -- Orthodontic
  ('invisalign',              'Invisalign / Clear Aligners',      'orthodontic', 'Clear-aligner orthodontic treatment.',                                                  5,  200000,   450000, 170),
  ('braces_fixed',            'Fixed Braces',                     'orthodontic', 'Traditional fixed braces.',                                                            10,  150000,   400000, 180),

  -- Specialist
  ('gum_treatment',           'Gum Treatment / Periodontics',     'specialist',  'Treatment of gum disease.',                                                            10,   15000,    80000, 190),
  ('sleep_apnea_appliance',   'Sleep Apnea / Snoring Appliance',  'specialist',  'Custom oral appliance for sleep-disordered breathing.',                                15,   30000,   100000, 200)
ON CONFLICT (key) DO NOTHING;

COMMIT;

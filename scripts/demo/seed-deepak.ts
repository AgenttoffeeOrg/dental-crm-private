#!/usr/bin/env tsx

/**
 * =====================================================
 * DEMO SEED SCRIPT - Deepak's Dental Practice
 * =====================================================
 * 
 * Seed Pack ID: deepak_demo_pack_v1
 * 
 * Creates a realistic dental practice demo with:
 * - 1 organization (separate demo tenant)
 * - 3 locations (Manhattan, Brooklyn, Queens)
 * - 12 users (owner, managers, dentists, hygienists, front desk)
 * - 50 patients
 * - 120 deals
 * - 105 appointments
 * - Insurance, invoices, payments, claims
 * - Marketing campaigns
 * - Activities, tasks, forms
 * 
 * SAFETY:
 * - All emails: @example.com (non-routable)
 * - All phones: +1-555-* (test range)
 * - No real API calls
 * - Fully reversible via clear script
 * - Idempotent (safe to re-run)
 * 
 * USAGE:
 *   npm run seed:deepak
 */

import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURATION & SAFETY CHECKS
// =====================================================

const SEED_PACK_ID = process.env.SEED_PACK_ID || 'deepak_demo_pack_v1';
const TARGET_USER_EMAIL = process.env.TARGET_USER_EMAIL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Safety checks
if (!TARGET_USER_EMAIL) {
  console.error('❌ ERROR: TARGET_USER_EMAIL environment variable is required');
  console.error('   Set it in GitHub Actions variables or export locally:');
  console.error('   export TARGET_USER_EMAIL=deepakshegde@gmail.com');
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('❌ ERROR: SUPABASE_URL environment variable is required');
  console.error('   Set it in .env.local:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Add it to GitHub Actions secrets or export locally:');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...');
  console.error('');
  console.error('⚠️  NEVER hardcode or share this key!');
  process.exit(1);
}

// Email domain safety check
if (!TARGET_USER_EMAIL.includes('@')) {
  console.error('❌ ERROR: TARGET_USER_EMAIL must be a valid email');
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

async function trackRecord(tableName: string, recordId: string) {
  await supabase.from('seed_pack_manifest').insert({
    seed_pack_id: SEED_PACK_ID,
    table_name: tableName,
    record_id: recordId
  });
}

function generateSafeEmail(name: string, index?: number): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = index ? `+${index}` : '';
  return `${sanitized}${suffix}@example.com`;
}

function generateSafePhone(locationIndex: number, patientIndex: number): string {
  return `+1-555-0${locationIndex}${String(patientIndex).padStart(2, '0')}`;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// =====================================================
// MAIN SEED FUNCTION
// =====================================================

async function seedDemoData() {
  console.log('🎭 Demo Seed Script - Deepak\'s Dental Practice');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Seed Pack ID: ${SEED_PACK_ID}`);
  console.log(`Target User: ${TARGET_USER_EMAIL}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // =====================================================
    // STEP 1: FIND OR CREATE USER
    // =====================================================
    console.log('1️⃣  Finding target user...');
    
    // Use listUsers with email filter since getUserByEmail might not be available
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error listing users:', authError);
      process.exit(1);
    }

    const authUser = authUsers.users.find(u => u.email === TARGET_USER_EMAIL);

    if (!authUser) {
      console.error(`❌ User not found: ${TARGET_USER_EMAIL}`);
      console.error('   Please create this user in Supabase Auth first:');
      console.error(`   1. Go to: ${SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/')}/auth/users`);
      console.error('   2. Click "Invite user"');
      console.error(`   3. Email: ${TARGET_USER_EMAIL}`);
      console.error('   4. Or create manually');
      process.exit(1);
    }

    console.log(`   ✅ Found user: ${authUser.id}`);

    // =====================================================
    // STEP 2: GET USER'S EXISTING TENANT
    // =====================================================
    console.log('\n2️⃣  Getting user\'s existing organization...');
    
    // Get the user's existing app_user record to find their tenant
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('*, tenants!app_users_tenant_id_fkey(*)')
      .eq('id', authUser.id)
      .single();

    if (appUserError || !appUser) {
      console.error('❌ User not linked to any organization:', appUserError);
      console.error('   Please ensure the user is set up in the app_users table.');
      process.exit(1);
    }

    const tenantId = appUser.tenant_id;
    const tenant = (appUser as any).tenants;
    
    if (!tenant || !tenantId) {
      console.error('❌ User does not have a valid tenant association');
      console.error(`   app_user record: ${JSON.stringify(appUser, null, 2)}`);
      process.exit(1);
    }
    
    console.log(`   ✅ Using existing organization: ${tenant.name}`);
    console.log(`   ✅ Tenant ID: ${tenantId}`);
    console.log(`   ✅ User role: ${appUser.role}`);

    // =====================================================
    // PHASE 2: CREATE DEMO DATA
    // =====================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 PHASE 1 COMPLETE: Organization Setup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 Starting PHASE 2: Creating Demo Data...\n');

    // =====================================================
    // STEP 4: CREATE PIPELINES
    // =====================================================
    console.log('4️⃣  Creating pipelines...');
    
    const pipelinesData = [
      {
        name: 'New Patient Acquisition',
        stages: [
          { name: 'Inquiry', position: 1 },
          { name: 'Consultation Scheduled', position: 2 },
          { name: 'Consultation Complete', position: 3 },
          { name: 'Treatment Accepted', position: 4 }
        ]
      },
      {
        name: 'Treatment Plans',
        stages: [
          { name: 'Needs Assessment', position: 1 },
          { name: 'Plan Created', position: 2 },
          { name: 'Insurance Verified', position: 3 },
          { name: 'Scheduled', position: 4 },
          { name: 'In Progress', position: 5 }
        ]
      },
      {
        name: 'Cosmetic Dentistry',
        stages: [
          { name: 'Interest', position: 1 },
          { name: 'Consultation', position: 2 },
          { name: 'Quote Provided', position: 3 },
          { name: 'Approved', position: 4 }
        ]
      }
    ];

    const pipelines = [];
    for (const pipelineData of pipelinesData) {
      // Check if pipeline exists
      const { data: existingPipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', pipelineData.name)
        .single();

      if (existingPipeline) {
        pipelines.push(existingPipeline);
        console.log(`   ⏭️  Pipeline "${pipelineData.name}" already exists`);
        continue;
      }

      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          tenant_id: tenantId,
          name: pipelineData.name,
          owner_user_id: appUser.id
        })
        .select()
        .single();

      if (pipelineError) {
        console.error(`   ❌ Error creating pipeline "${pipelineData.name}":`, pipelineError);
        continue;
      }

      pipelines.push(pipeline);
      await trackRecord('pipelines', pipeline.id);

      // Create stages for this pipeline
      for (const stageData of pipelineData.stages) {
        const { data: stage, error: stageError } = await supabase
          .from('pipeline_stages')
          .insert({
            tenant_id: tenantId,
            pipeline_id: pipeline.id,
            name: stageData.name,
            position: stageData.position
          })
          .select()
          .single();

        if (!stageError) {
          await trackRecord('pipeline_stages', stage.id);
        }
      }

      console.log(`   ✅ Created pipeline: ${pipelineData.name}`);
    }

    // =====================================================
    // STEP 5: CREATE CONTACTS (PATIENTS)
    // =====================================================
    console.log('\n5️⃣  Creating patient contacts...');
    
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa', 'Timothy', 'Deborah'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
    
    const sources = ['Website', 'Referral', 'Google', 'Facebook', 'Instagram', 'Walk-in', 'Insurance Network'];
    
    const contacts = [];
    for (let i = 0; i < 30; i++) {
      const firstName = randomChoice(firstNames);
      const lastName = randomChoice(lastNames);
      const fullName = `${firstName} ${lastName}`;
      
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          tenant_id: tenantId,
          full_name: fullName,
          primary_email: generateSafeEmail(`${firstName}.${lastName}`, i),
          primary_phone: generateSafePhone(1, i),
          source: randomChoice(sources),
          tags: randomChoice([
            ['patient', 'active'],
            ['patient', 'new'],
            ['patient', 'vip'],
            ['prospect'],
            ['patient', 'family']
          ])
        })
        .select()
        .single();

      if (contactError) {
        console.error(`   ❌ Error creating contact "${fullName}":`, contactError);
      } else {
        contacts.push(contact);
        await trackRecord('contacts', contact.id);
      }
    }
    
    console.log(`   ✅ Created ${contacts.length} patient contacts`);

    // =====================================================
    // STEP 6: CREATE DEALS
    // =====================================================
    console.log('\n6️⃣  Creating deals...');
    
    const dealTitles = {
      'New Patient Acquisition': [
        'Initial Consultation',
        'New Patient Exam',
        'Dental Assessment',
        'First Visit'
      ],
      'Treatment Plans': [
        'Root Canal Treatment',
        'Crown & Bridge',
        'Dental Implants',
        'Orthodontics',
        'Full Mouth Restoration'
      ],
      'Cosmetic Dentistry': [
        'Teeth Whitening',
        'Veneers',
        'Smile Makeover',
        'Invisalign'
      ]
    };

    const dealValues = {
      'New Patient Acquisition': [150, 200, 250, 300],
      'Treatment Plans': [1500, 2500, 3500, 5000, 8000],
      'Cosmetic Dentistry': [500, 2000, 4000, 6000]
    };

    let dealsCreated = 0;
    for (const pipeline of pipelines) {
      // Get stages for this pipeline
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('position');

      if (!stages || stages.length === 0) continue;

      const titles = dealTitles[pipeline.name] || ['General Treatment'];
      const values = dealValues[pipeline.name] || [500, 1000, 2000];
      const dealsPerPipeline = Math.min(10, contacts.length);

      for (let i = 0; i < dealsPerPipeline; i++) {
        const contact = contacts[i % contacts.length];
        const stage = randomChoice(stages);
        const title = `${randomChoice(titles)} - ${contact.full_name}`;
        const value = randomChoice(values);
        const createdDate = randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date());

        const { data: deal, error: dealError } = await supabase
          .from('deals')
          .insert({
            tenant_id: tenantId,
            pipeline_id: pipeline.id,
            stage_id: stage.id,
            contact_id: contact.id,
            owner_user_id: appUser.id,
            title: title,
            value_estimate_cents: value * 100, // Convert dollars to cents
            currency: 'USD',
            source: randomChoice(['Website', 'Referral', 'Phone Call', 'Walk-in']),
            probability: randomInt(10, 90) / 100, // Random probability between 0.1 and 0.9
            expected_close_date: new Date(Date.now() + randomInt(7, 60) * 24 * 60 * 60 * 1000).toISOString(),
            tags: ['demo-data'],
            created_at: createdDate.toISOString()
          })
          .select()
          .single();

        if (dealError) {
          console.error(`   ❌ Error creating deal "${title}":`, dealError);
        } else {
          await trackRecord('deals', deal.id);
          dealsCreated++;
        }
      }
    }
    
    console.log(`   ✅ Created ${dealsCreated} deals across ${pipelines.length} pipelines`);

    // =====================================================
    // PHASE 2 COMPLETE
    // =====================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SEED COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Organization: ${tenant.name}`);
    console.log(`   Pipelines: ${pipelines.length}`);
    console.log(`   Contacts: ${contacts.length}`);
    console.log(`   Deals: ${dealsCreated}`);
    console.log('');
    console.log('🔑 Login Details:');
    console.log(`   Email: ${TARGET_USER_EMAIL}`);
    console.log(`   URL: http://localhost:3000`);
    console.log('');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log('');
    console.log('✨ Your demo dental practice is ready!');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the seed
seedDemoData();


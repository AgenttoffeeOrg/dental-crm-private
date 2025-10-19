#!/usr/bin/env tsx

/**
 * COMPREHENSIVE DEMO DATA SEEDING SCRIPT
 * For Investor Meeting - October 2025
 * 
 * Creates a complete, realistic dental CRM demo with:
 * - 50+ patient contacts
 * - 120+ deals across 3 pipelines
 * - 100+ activities (emails, calls, notes)
 * - 80+ tasks
 * - Marketing campaigns
 * - Treatment plans
 * 
 * Designed to be idempotent and error-resistant.
 */

import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURATION
// =====================================================

const TENANT_ID = 'c128efd3-e2e8-4523-922f-22852b93d2d2';
const USER_ID = 'a0901598-6cc5-49bc-9234-db90b9af3444';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateUniqueEmail(firstName: string, lastName: string, index: number): string {
  const timestamp = Date.now();
  const random = randomInt(1000, 9999);
  const sanitized = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '');
  return `${sanitized}.${index}.${random}@example.com`;
}

function generateUniquePhone(index: number): string {
  const timestamp = Date.now().toString().slice(-4);
  const random = randomInt(1000, 9999);
  return `+1-555-${timestamp}-${random}`;
}

// =====================================================
// DATA GENERATORS
// =====================================================

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa', 'Timothy', 'Deborah', 'Edward', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen'];

const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

const SOURCES = ['Website', 'Referral', 'Google Ads', 'Facebook', 'Instagram', 'Walk-in', 'Insurance Network', 'Yelp', 'Healthcare.gov'];

const ACTIVITY_TYPES = ['email', 'phone_call', 'meeting', 'note', 'sms'];

const NOTE_TEMPLATES = [
  'Patient expressed interest in {service}',
  'Follow-up scheduled for next week',
  'Insurance verification completed',
  'Treatment plan discussed and accepted',
  'Patient requested payment plan options',
  'Reminded about upcoming appointment',
  'Discussed post-treatment care instructions',
  'Patient referred by {referrer}',
  'Consultation went very well',
  'Patient has questions about {topic}'
];

const EMAIL_SUBJECTS = [
  'Welcome to Smile Dental Practice',
  'Appointment Confirmation',
  'Treatment Plan Details',
  'Insurance Information Request',
  'Follow-up After Your Visit',
  'Special Offer: {service}',
  'Reminder: Upcoming Appointment',
  'Post-Treatment Care Instructions'
];

// =====================================================
// MAIN SEEDING FUNCTION
// =====================================================

async function comprehensiveSeed() {
  console.log('🎯 COMPREHENSIVE DEMO DATA SEEDING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Organization: Smile`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`User ID: ${USER_ID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let stats = {
    contactsCreated: 0,
    dealsCreated: 0,
    tasksCreated: 0,
    activitiesCreated: 0,
    notesCreated: 0,
    emailsCreated: 0,
    callsCreated: 0,
    campaignsCreated: 0
  };

  try {
    // =====================================================
    // STEP 1: GET EXISTING DATA
    // =====================================================
    console.log('1️⃣  Analyzing existing data...\n');

    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id, full_name, primary_email')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null);

    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null);

    console.log(`   Current contacts: ${existingContacts?.length || 0}`);
    console.log(`   Current pipelines: ${pipelines?.length || 0}\n`);

    if (!pipelines || pipelines.length === 0) {
      console.error('❌ No pipelines found! Please run pipeline creation first.');
      process.exit(1);
    }

    // Get all pipeline stages
    const pipelineStagesMap: Record<string, any[]> = {};
    for (const pipeline of pipelines) {
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .is('deleted_at', null)
        .order('position');
      
      if (stages) {
        pipelineStagesMap[pipeline.id] = stages;
      }
    }

    // =====================================================
    // STEP 2: CREATE ADDITIONAL CONTACTS (to reach 50+)
    // =====================================================
    const targetContacts = 60;
    const contactsToCreate = Math.max(0, targetContacts - (existingContacts?.length || 0));
    
    console.log(`2️⃣  Creating ${contactsToCreate} new patient contacts...\n`);

    const allContacts = [...(existingContacts || [])];
    
    for (let i = 0; i < contactsToCreate; i++) {
      const firstName = randomChoice(FIRST_NAMES);
      const lastName = randomChoice(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const uniqueIndex = (existingContacts?.length || 0) + i;

      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          tenant_id: TENANT_ID,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          primary_email: generateUniqueEmail(firstName, lastName, uniqueIndex),
          primary_phone: generateUniquePhone(uniqueIndex),
          source: randomChoice(SOURCES),
          status: randomChoice(['active', 'lead', 'patient']),
          tags: randomChoice([
            ['patient', 'active'],
            ['patient', 'new'],
            ['lead', 'hot'],
            ['prospect'],
            ['patient', 'family']
          ]),
          lead_score: randomInt(0, 100),
          owner_user_id: USER_ID
        })
        .select()
        .single();

      if (!error && contact) {
        allContacts.push(contact);
        stats.contactsCreated++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`   ✅ Created ${i + 1}/${contactsToCreate} contacts...`);
        }
      } else if (error) {
        console.error(`   ⚠️  Error creating contact ${fullName}:`, error.message);
      }
    }

    console.log(`   ✅ Total contacts now: ${allContacts.length}\n`);

    // =====================================================
    // STEP 3: CREATE DEALS (to reach 120+)
    // =====================================================
    const { count: existingDealsCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null);

    const targetDeals = 120;
    const dealsToCreate = Math.max(0, targetDeals - (existingDealsCount || 0));
    
    console.log(`3️⃣  Creating ${dealsToCreate} new deals...\n`);

    const dealTitles = {
      'New Patient Acquisition': ['Initial Consultation', 'New Patient Exam', 'Dental Assessment', 'First Visit', 'New Patient Welcome'],
      'Treatment Plans': ['Root Canal', 'Crown & Bridge', 'Dental Implants', 'Orthodontics', 'Full Mouth Restoration', 'Wisdom Teeth Extraction', 'Gum Treatment'],
      'Cosmetic Dentistry': ['Teeth Whitening', 'Veneers', 'Smile Makeover', 'Invisalign', 'Bonding', 'Gum Contouring']
    };

    const dealValues = {
      'New Patient Acquisition': [150, 200, 250, 300, 350],
      'Treatment Plans': [1200, 1800, 2500, 3500, 5000, 8000, 12000],
      'Cosmetic Dentistry': [500, 1500, 2000, 4000, 6000, 8500]
    };

    const allDeals = [];
    
    for (let i = 0; i < dealsToCreate; i++) {
      const pipeline = randomChoice(pipelines);
      const stages = pipelineStagesMap[pipeline.id] || [];
      
      if (stages.length === 0) continue;
      
      const stage = randomChoice(stages);
      const contact = randomChoice(allContacts);
      const titles = dealTitles[pipeline.name as keyof typeof dealTitles] || ['General Treatment'];
      const values = dealValues[pipeline.name as keyof typeof dealValues] || [500, 1000, 2000];
      
      const title = `${randomChoice(titles)} - ${contact.full_name}`;
      const value = randomChoice(values);
      const createdDate = randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date());

      const { data: deal, error } = await supabase
        .from('deals')
        .insert({
          tenant_id: TENANT_ID,
          pipeline_id: pipeline.id,
          stage_id: stage.id,
          contact_id: contact.id,
          owner_user_id: USER_ID,
          title: title,
          value_estimate_cents: value * 100,
          currency: 'USD',
          source: contact.source || randomChoice(SOURCES),
          probability: randomInt(10, 90),
          expected_close_date: new Date(Date.now() + randomInt(7, 90) * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['demo-data', 'investor-meeting'],
          created_at: createdDate.toISOString()
        })
        .select()
        .single();

      if (!error && deal) {
        allDeals.push(deal);
        stats.dealsCreated++;
        
        if ((i + 1) % 20 === 0) {
          console.log(`   ✅ Created ${i + 1}/${dealsToCreate} deals...`);
        }
      } else if (error) {
        console.error(`   ⚠️  Error creating deal:`, error.message);
      }
    }

    console.log(`   ✅ Total deals created: ${stats.dealsCreated}\n`);

    // =====================================================
    // STEP 4: CREATE ACTIVITIES
    // =====================================================
    console.log(`4️⃣  Creating activities (notes, emails, calls)...\n`);

    const targetActivities = 150;
    
    for (let i = 0; i < targetActivities; i++) {
      const contact = randomChoice(allContacts);
      const deal = allDeals.length > 0 ? (Math.random() > 0.3 ? randomChoice(allDeals) : null) : null;
      const activityType = randomChoice(ACTIVITY_TYPES);
      const createdDate = randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date());

      const { error } = await supabase
        .from('activities')
        .insert({
          tenant_id: TENANT_ID,
          contact_id: contact.id,
          deal_id: deal?.id || null,
          agent_user_id: USER_ID,
          type: activityType,
          direction: 'outbound',
          subject: activityType === 'email' ? randomChoice(EMAIL_SUBJECTS) : `${activityType} with ${contact.full_name}`,
          snippet: randomChoice(NOTE_TEMPLATES).replace('{service}', 'dental implants').replace('{referrer}', 'Dr. Smith').replace('{topic}', 'treatment options'),
          occurred_at: createdDate.toISOString(),
          created_at: createdDate.toISOString()
        });

      if (!error) {
        stats.activitiesCreated++;
      } else {
        console.error(`   ⚠️  Activity error:`, error.message);
      }
    }

    console.log(`   ✅ Created ${stats.activitiesCreated} activities\n`);

    // =====================================================
    // STEP 5: CREATE TASKS
    // =====================================================
    console.log(`5️⃣  Creating tasks...\n`);

    const taskTemplates = [
      { title: 'Follow up with {contact}', priority: 'medium' },
      { title: 'Verify insurance for {contact}', priority: 'high' },
      { title: 'Send treatment plan to {contact}', priority: 'medium' },
      { title: 'Schedule consultation with {contact}', priority: 'high' },
      { title: 'Call {contact} about appointment', priority: 'high' },
      { title: 'Review X-rays for {contact}', priority: 'medium' },
      { title: 'Prepare quote for {contact}', priority: 'low' }
    ];

    const targetTasks = 100;
    
    for (let i = 0; i < targetTasks; i++) {
      const contact = randomChoice(allContacts);
      const deal = allDeals.length > 0 && Math.random() > 0.5 ? randomChoice(allDeals) : null;
      const template = randomChoice(taskTemplates);
      const dueDate = new Date(Date.now() + randomInt(-7, 30) * 24 * 60 * 60 * 1000);
      const isCompleted = Math.random() > 0.7;

      const { error } = await supabase
        .from('tasks')
        .insert({
          tenant_id: TENANT_ID,
          contact_id: contact.id,
          deal_id: deal?.id || null,
          assignee_user_id: USER_ID,
          owner_user_id: USER_ID,
          title: template.title.replace('{contact}', contact.full_name),
          description: `Follow up task for ${contact.full_name}`,
          priority: template.priority,
          status: isCompleted ? 'completed' : (Math.random() > 0.5 ? 'in_progress' : 'pending'),
          due_at: dueDate.toISOString(),
          completed_at: isCompleted ? new Date().toISOString() : null
        });

      if (!error) {
        stats.tasksCreated++;
      } else {
        console.error(`   ⚠️  Task error:`, error.message);
      }
    }

    console.log(`   ✅ Created ${stats.tasksCreated} tasks\n`);

    // =====================================================
    // STEP 6: CREATE MARKETING CAMPAIGNS
    // =====================================================
    console.log(`6️⃣  Creating marketing campaigns...\n`);

    const campaigns = [
      {
        name: 'New Patient Welcome Series',
        description: 'Automated welcome emails for new patients',
        type: 'email',
        status: 'active'
      },
      {
        name: 'Teeth Whitening Special - October',
        description: 'Promotional campaign for cosmetic dentistry',
        type: 'email',
        status: 'completed'
      },
      {
        name: 'Annual Checkup Reminders',
        description: 'Remind patients about their annual checkup',
        type: 'sms',
        status: 'active'
      }
    ];

    for (const campaign of campaigns) {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          tenant_id: TENANT_ID,
          name: campaign.name,
          description: campaign.description,
          type: campaign.type,
          status: campaign.status,
          created_by_user_id: USER_ID,
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (!error) {
        stats.campaignsCreated++;
      } else {
        console.error(`   ⚠️  Campaign error:`, error.message);
      }
    }

    console.log(`   ✅ Created ${stats.campaignsCreated} campaigns\n`);

    // =====================================================
    // FINAL SUMMARY
    // =====================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 COMPREHENSIVE SEEDING COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    console.log(`   New Contacts Created: ${stats.contactsCreated}`);
    console.log(`   New Deals Created: ${stats.dealsCreated}`);
    console.log(`   Activities Created: ${stats.activitiesCreated}`);
    console.log(`   Tasks Created: ${stats.tasksCreated}`);
    console.log(`   Campaigns Created: ${stats.campaignsCreated}`);
    console.log('\n🔍 Verification:');
    
    // Verify final counts
    const { count: finalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null);
    
    const { count: finalDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null);
    
    const { count: finalActivities } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID);
    
    const { count: finalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID);
    
    const { data: finalDealsData } = await supabase
      .from('deals')
      .select('value_estimate_cents')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null);
    
    const totalPipelineValue = (finalDealsData || []).reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) / 100;

    console.log(`   ✅ Total Contacts: ${finalContacts}`);
    console.log(`   ✅ Total Deals: ${finalDeals}`);
    console.log(`   ✅ Total Activities: ${finalActivities}`);
    console.log(`   ✅ Total Tasks: ${finalTasks}`);
    console.log(`   💰 Pipeline Value: $${totalPipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Your investor demo is ready!');
    console.log('🔑 Login: deepakshegde@gmail.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the comprehensive seed
comprehensiveSeed().then(() => process.exit(0));


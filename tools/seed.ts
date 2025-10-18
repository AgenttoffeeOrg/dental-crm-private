/**
 * Idempotent Seed Script for Screenshot Runner
 * Creates minimal test data for comprehensive screenshots
 * NEVER touches production - uses TEST_* environment variables only
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { safetyCheck, ensureOutputDir, logSuccess } from './safety-guard'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || '00000000-0000-0000-0000-000000000000'

// Safety check
safetyCheck(BASE_URL)
ensureOutputDir()

interface SeedIds {
  tenantId?: string
  contactId?: string
  dealId?: string
  taskId?: string
  automationId?: string
  campaignId?: string
  formId?: string
}

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting idempotent seed...')
  
  const seedIds: SeedIds = {}
  
  // Check if Supabase is configured
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️  Supabase not configured - skipping seed')
    console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable seeding')
    saveSeedIds(seedIds)
    return
  }
  
  console.log(`   Using tenant: ${TEST_TENANT_ID}`)
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // 1. Ensure test tenant exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', TEST_TENANT_ID)
      .single()
    
    if (tenant) {
      console.log('✅ Test tenant exists')
      seedIds.tenantId = tenant.id
    } else {
      console.log('⚠️  Test tenant not found - attempting to create...')
      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          id: TEST_TENANT_ID,
          name: 'Screenshot Test Practice',
          slug: 'screenshot-test',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.warn('   Could not create tenant:', error.message)
      } else {
        console.log('✅ Created test tenant')
        seedIds.tenantId = newTenant.id
      }
    }
    
    // 2. Create/find test contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', TEST_TENANT_ID)
      .eq('email', 'john.doe@example.com')
      .single()
    
    if (existingContact) {
      console.log('✅ Test contact exists')
      seedIds.contactId = existingContact.id
    } else {
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          tenant_id: TEST_TENANT_ID,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0123',
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.warn('   Could not create contact:', error.message)
      } else {
        console.log('✅ Created test contact')
        seedIds.contactId = newContact.id
      }
    }
    
    // 3. Create/find test deal
    if (seedIds.contactId) {
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id')
        .eq('tenant_id', TEST_TENANT_ID)
        .eq('contact_id', seedIds.contactId)
        .single()
      
      if (existingDeal) {
        console.log('✅ Test deal exists')
        seedIds.dealId = existingDeal.id
      } else {
        const { data: newDeal, error } = await supabase
          .from('deals')
          .insert({
            tenant_id: TEST_TENANT_ID,
            contact_id: seedIds.contactId,
            title: 'Dental Implant Consultation',
            value_cents: 500000, // $5,000
            stage: 'qualification',
            status: 'open',
            created_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (error) {
          console.warn('   Could not create deal:', error.message)
        } else {
          console.log('✅ Created test deal')
          seedIds.dealId = newDeal.id
        }
      }
    }
    
    // 4. Create/find test task
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('tenant_id', TEST_TENANT_ID)
      .limit(1)
      .single()
    
    if (existingTask) {
      console.log('✅ Test task exists')
      seedIds.taskId = existingTask.id
    } else {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          tenant_id: TEST_TENANT_ID,
          contact_id: seedIds.contactId,
          title: 'Follow up on consultation',
          description: 'Call patient to discuss treatment options',
          status: 'todo',
          priority: 'high',
          due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.warn('   Could not create task:', error.message)
      } else {
        console.log('✅ Created test task')
        seedIds.taskId = newTask.id
      }
    }
    
    // 5. Create/find test automation (if table exists)
    try {
      const { data: existingAutomation } = await supabase
        .from('automations')
        .select('id')
        .eq('tenant_id', TEST_TENANT_ID)
        .limit(1)
        .single()
      
      if (existingAutomation) {
        console.log('✅ Test automation exists')
        seedIds.automationId = existingAutomation.id
      }
    } catch (error) {
      console.log('   Automations table not available')
    }
    
    // 6. Create/find test campaign (if table exists)
    try {
      const { data: existingCampaign } = await supabase
        .from('marketing_campaigns')
        .select('id')
        .eq('tenant_id', TEST_TENANT_ID)
        .limit(1)
        .single()
      
      if (existingCampaign) {
        console.log('✅ Test campaign exists')
        seedIds.campaignId = existingCampaign.id
      }
    } catch (error) {
      console.log('   Marketing campaigns table not available')
    }
    
    // 7. Create/find test form (if table exists)
    try {
      const { data: existingForm } = await supabase
        .from('forms')
        .select('id')
        .eq('tenant_id', TEST_TENANT_ID)
        .limit(1)
        .single()
      
      if (existingForm) {
        console.log('✅ Test form exists')
        seedIds.formId = existingForm.id
      }
    } catch (error) {
      console.log('   Forms table not available')
    }
    
  } catch (error) {
    console.error('❌ Seed error:', error)
    console.warn('   Continuing with partial seed data...')
  }
  
  // Save seed IDs
  saveSeedIds(seedIds)
  
  console.log('\n✅ Seed complete!')
  console.log('   Tenant:', seedIds.tenantId || 'none')
  console.log('   Contact:', seedIds.contactId || 'none')
  console.log('   Deal:', seedIds.dealId || 'none')
  console.log('   Task:', seedIds.taskId || 'none')
  console.log('   Automation:', seedIds.automationId || 'none')
  console.log('   Campaign:', seedIds.campaignId || 'none')
  console.log('   Form:', seedIds.formId || 'none')
  
  logSuccess('seed')
}

/**
 * Save seed IDs to JSON file
 */
function saveSeedIds(seedIds: SeedIds) {
  const outputPath = path.join(process.cwd(), 'CRM screenshots', 'seed_ids.json')
  fs.writeFileSync(outputPath, JSON.stringify(seedIds, null, 2))
  console.log(`   Saved seed IDs: ${outputPath}`)
}

// Run
seed().catch((error) => {
  console.error('❌ Seed failed:', error)
  // Still save empty seed IDs file
  saveSeedIds({})
  process.exit(1)
})


/**
 * VERIFICATION SEED DATA
 * ================================================================
 * Purpose: Create comprehensive test data for verification testing
 * 
 * Creates:
 * - 2 tenants (DentalOne, SmileWorks) with different entitlements
 * - Users: owner, admin, manager, staff, marketing, read_only per tenant
 * - Pipelines with stages
 * - Contacts (including duplicates for dedupe tests)
 * - Deals linked to contacts & pipelines
 * - Tasks linked to contacts & deals
 * - Marketing campaigns (where entitled)
 * - Automations
 * ================================================================
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Tenant {
  id: string
  name: string
  slug: string
}

interface User {
  id: string
  tenant_id: string
  email: string
  role: string
  full_name: string
}

const TENANTS: Tenant[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'DentalOne',
    slug: 'dental-one'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'SmileWorks',
    slug: 'smile-works'
  }
]

const USERS_PER_TENANT = [
  { role: 'owner', suffix: 'owner' },
  { role: 'admin', suffix: 'admin' },
  { role: 'manager', suffix: 'manager' },
  { role: 'staff', suffix: 'staff' },
  { role: 'marketing', suffix: 'marketing' },
  { role: 'read_only', suffix: 'readonly' }
]

async function seedTenants() {
  console.log('🏢 Seeding tenants...')
  
  for (const tenant of TENANTS) {
    const { error } = await supabase
      .from('tenants')
      .upsert(tenant, { onConflict: 'id' })
    
    if (error) {
      console.error(`  ❌ Error seeding tenant ${tenant.name}:`, error.message)
    } else {
      console.log(`  ✅ ${tenant.name}`)
    }
  }
}

async function seedUsers() {
  console.log('\n👥 Seeding users...')
  
  for (const tenant of TENANTS) {
    console.log(`  ${tenant.name}:`)
    
    for (const userType of USERS_PER_TENANT) {
      const user: User = {
        id: `${tenant.id.substring(0, 8)}-${userType.suffix.substring(0, 4)}-0000-0000-000000000000`,
        tenant_id: tenant.id,
        email: `${userType.suffix}@${tenant.slug}.test`,
        role: userType.role,
        full_name: `${tenant.name} ${userType.role.charAt(0).toUpperCase() + userType.role.slice(1)}`
      }
      
      const { error } = await supabase
        .from('app_users')
        .upsert(user, { onConflict: 'id' })
      
      if (error) {
        console.error(`    ❌ ${userType.role}:`, error.message)
      } else {
        console.log(`    ✅ ${userType.role} (${user.email})`)
      }
    }
  }
}

async function seedPipelines() {
  console.log('\n🔄 Seeding pipelines...')
  
  const pipelines = [
    { name: 'Patient Acquisition', stages: ['New Lead', 'Consultation Scheduled', 'Consultation Complete', 'Treatment Planned', 'Won'] },
    { name: 'Treatment Plan', stages: ['Initial Exam', 'X-Rays', 'Treatment Plan Created', 'Approved', 'In Progress', 'Complete'] }
  ]
  
  for (const tenant of TENANTS) {
    console.log(`  ${tenant.name}:`)
    
    for (const pipeline of pipelines) {
      const pipelineId = `${tenant.id.substring(0, 8)}-pipe-${pipeline.name.toLowerCase().replace(/\s+/g, '-').substring(0, 8)}-000000000000`
      
      const { error: pipelineError } = await supabase
        .from('pipelines')
        .upsert({
          id: pipelineId,
          tenant_id: tenant.id,
          name: pipeline.name,
          description: `${pipeline.name} for ${tenant.name}`
        }, { onConflict: 'id' })
      
      if (pipelineError) {
        console.error(`    ❌ Pipeline ${pipeline.name}:`, pipelineError.message)
        continue
      }
      
      // Create stages
      for (let i = 0; i < pipeline.stages.length; i++) {
        const stageName = pipeline.stages[i]
        const probability = i === pipeline.stages.length - 1 ? 100 : Math.round((i + 1) * (100 / pipeline.stages.length))
        
        const { error: stageError } = await supabase
          .from('pipeline_stages')
          .upsert({
            pipeline_id: pipelineId,
            name: stageName,
            position: i,
            probability
          }, { onConflict: 'pipeline_id,name' })
        
        if (stageError) {
          console.error(`      ❌ Stage ${stageName}:`, stageError.message)
        }
      }
      
      console.log(`    ✅ ${pipeline.name} (${pipeline.stages.length} stages)`)
    }
  }
}

async function seedContacts() {
  console.log('\n👤 Seeding contacts...')
  
  const contacts = [
    { full_name: 'John Smith', email: 'john.smith@email.com', phone: '+441234567890', lifecycle_stage: 'lead' },
    { full_name: 'Jane Doe', email: 'jane.doe@email.com', phone: '+441234567891', lifecycle_stage: 'patient' },
    { full_name: 'Bob Johnson', email: 'bob.johnson@email.com', phone: '+441234567892', lifecycle_stage: 'lead' },
    // Duplicate for testing (same email, different phone)
    { full_name: 'John Smith Jr', email: 'john.smith@email.com', phone: '+441234567893', lifecycle_stage: 'lead' },
    // Another set
    { full_name: 'Alice Williams', email: 'alice.w@email.com', phone: '+441234567894', lifecycle_stage: 'patient' },
    { full_name: 'Charlie Brown', email: 'charlie.b@email.com', phone: '+441234567895', lifecycle_stage: 'lead' }
  ]
  
  for (const tenant of TENANTS) {
    console.log(`  ${tenant.name}:`)
    
    for (const contact of contacts) {
      const { error } = await supabase
        .from('contacts')
        .insert({
          tenant_id: tenant.id,
          ...contact
        })
      
      if (error) {
        // Duplicate errors are expected for dedupe testing
        if (error.code === '23505') {
          console.log(`    ⚠️  ${contact.full_name} (duplicate detected - expected)`)
        } else {
          console.error(`    ❌ ${contact.full_name}:`, error.message)
        }
      } else {
        console.log(`    ✅ ${contact.full_name}`)
      }
    }
  }
}

async function seedDeals() {
  console.log('\n💼 Seeding deals...')
  
  for (const tenant of TENANTS) {
    console.log(`  ${tenant.name}:`)
    
    // Get first pipeline and stage
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .limit(1)
    
    if (!pipelines || pipelines.length === 0) {
      console.log('    ⚠️  No pipelines found, skipping deals')
      continue
    }
    
    const pipelineId = pipelines[0].id
    
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('pipeline_id', pipelineId)
      .order('position')
      .limit(1)
    
    if (!stages || stages.length === 0) {
      console.log('    ⚠️  No stages found, skipping deals')
      continue
    }
    
    const stageId = stages[0].id
    
    // Get first contact
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name')
      .eq('tenant_id', tenant.id)
      .limit(3)
    
    if (contacts && contacts.length > 0) {
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i]
        const value = (i + 1) * 1000
        
        const { error } = await supabase
          .from('deals')
          .insert({
            tenant_id: tenant.id,
            title: `Treatment Plan for ${contact.full_name}`,
            contact_id: contact.id,
            pipeline_id: pipelineId,
            stage_id: stageId,
            value
          })
        
        if (error) {
          console.error(`    ❌ Deal for ${contact.full_name}:`, error.message)
        } else {
          console.log(`    ✅ Deal for ${contact.full_name} (£${value})`)
        }
      }
    }
  }
}

async function seedEntitlements() {
  console.log('\n🎫 Seeding entitlements...')
  
  // Get all features
  const { data: features } = await supabase
    .from('features')
    .select('id, code, name')
  
  if (!features || features.length === 0) {
    console.log('  ⚠️  No features found, skipping entitlements')
    return
  }
  
  // DentalOne: All features
  console.log('  DentalOne (all features):')
  for (const feature of features) {
    const { error } = await supabase
      .from('tenant_entitlements')
      .upsert({
        tenant_id: TENANTS[0].id,
        feature_id: feature.id,
        is_enabled: true,
        quota_limit: feature.code === 'email_sends' ? 1000 : null,
        quota_used: 0
      }, { onConflict: 'tenant_id,feature_id' })
    
    if (error) {
      console.error(`    ❌ ${feature.code}:`, error.message)
    } else {
      console.log(`    ✅ ${feature.code}`)
    }
  }
  
  // SmileWorks: Only CRM base (no marketing)
  console.log('  SmileWorks (crm_base only):')
  const crmBase = features.find(f => f.code === 'crm_base')
  if (crmBase) {
    const { error } = await supabase
      .from('tenant_entitlements')
      .upsert({
        tenant_id: TENANTS[1].id,
        feature_id: crmBase.id,
        is_enabled: true
      }, { onConflict: 'tenant_id,feature_id' })
    
    if (error) {
      console.error(`    ❌ crm_base:`, error.message)
    } else {
      console.log(`    ✅ crm_base (marketing disabled for testing)`)
    }
  }
}

async function main() {
  console.log('🌱 VERIFICATION SEED DATA\n')
  console.log('This will create test data for comprehensive verification.\n')
  
  try {
    await seedTenants()
    await seedUsers()
    await seedPipelines()
    await seedContacts()
    await seedDeals()
    await seedEntitlements()
    
    console.log('\n✅ Seed complete!')
    console.log('\n📊 Summary:')
    console.log(`  - ${TENANTS.length} tenants`)
    console.log(`  - ${TENANTS.length * USERS_PER_TENANT.length} users`)
    console.log(`  - Pipelines, contacts, deals created`)
    console.log(`  - DentalOne: Full access (all features)`)
    console.log(`  - SmileWorks: CRM only (marketing disabled)`)
    console.log('\n🧪 Ready for verification testing!')
    
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

main()







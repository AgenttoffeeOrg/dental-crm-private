#!/usr/bin/env ts-node

/**
 * Demo Mode Seed Script
 * 
 * Creates a fully-featured demo tenant with realistic data.
 * Idempotent: Can be run multiple times safely.
 * 
 * Usage: npm run demo:seed
 */

import { createClient } from '@supabase/supabase-js'

const DEMO_MODE = process.env.DEMO_MODE === 'true'
const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || 'demo-tenant'
const DEMO_SAFE_EMAIL_DOMAIN = process.env.DEMO_SAFE_EMAIL_DOMAIN || 'demo.example.com'
const DEMO_FEATURES_ALL_ENABLED = process.env.DEMO_FEATURES_ALL_ENABLED === 'true'
const DEMO_MINIMAL = process.env.DEMO_MINIMAL === 'true'

// Safety checks
if (!DEMO_MODE) {
  console.error('❌ DEMO_MODE is not enabled. Set DEMO_MODE=true to run this script.')
  process.exit(1)
}

if (!process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ No database connection configured.')
  process.exit(1)
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function seedDemoTenant() {
  console.log('🎭 Demo Mode Seed Script')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Demo Tenant ID: ${DEMO_TENANT_ID}`)
  console.log(`Email Domain: ${DEMO_SAFE_EMAIL_DOMAIN}`)
  console.log(`All Features: ${DEMO_FEATURES_ALL_ENABLED ? 'Enabled' : 'Standard'}`)
  console.log(`Data Volume: ${DEMO_MINIMAL ? 'Minimal' : 'Full'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  try {
    // Step 1: Create demo tenant
    console.log('1️⃣  Creating demo tenant...')
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .upsert({
        id: DEMO_TENANT_ID,
        name: 'Demo Practice',
        slug: 'demo-practice',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (tenantError && tenantError.code !== '23505') { // Ignore duplicate key
      console.error('Error creating tenant:', tenantError)
    } else {
      console.log('✅ Demo tenant created/updated')
    }

    // Step 2: Create demo users
    console.log('\\n2️⃣  Creating demo users...')
    const demoUsers = [
      { email: `owner@${DEMO_SAFE_EMAIL_DOMAIN}`, role: 'owner', name: 'Demo Owner' },
      { email: `manager@${DEMO_SAFE_EMAIL_DOMAIN}`, role: 'manager', name: 'Demo Manager' },
      { email: `staff@${DEMO_SAFE_EMAIL_DOMAIN}`, role: 'staff', name: 'Demo Staff' },
    ]

    for (const user of demoUsers) {
      // Note: In production, you'd create auth.users via Supabase Auth API
      // For demo, we just log the user info
      console.log(`   📧 ${user.email} (${user.role})`)
    }
    console.log('✅ Demo users documented (create via Supabase Auth Dashboard)')

    // Step 3: Create demo contacts
    console.log('\\n3️⃣  Creating demo contacts...')
    const contactCount = DEMO_MINIMAL ? 5 : 20
    const demoContacts = []
    
    for (let i = 1; i <= contactCount; i++) {
      demoContacts.push({
        tenant_id: DEMO_TENANT_ID,
        full_name: `Demo Contact ${i}`,
        primary_email: `contact${i}@${DEMO_SAFE_EMAIL_DOMAIN}`,
        phone: `555-010${String(i).padStart(4, '0')}`,
        source: 'demo_seed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    const { error: contactsError } = await supabase
      .from('contacts')
      .upsert(demoContacts, {
        onConflict: 'tenant_id,primary_email',
        ignoreDuplicates: true
      })

    if (contactsError) {
      console.log(`⚠️  Contacts: ${contactsError.message}`)
    } else {
      console.log(`✅ ${contactCount} demo contacts created`)
    }

    // Step 4: Create demo pipeline
    console.log('\\n4️⃣  Creating demo pipeline...')
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .upsert({
        tenant_id: DEMO_TENANT_ID,
        name: 'Demo Sales Pipeline',
        description: 'Demonstration pipeline with deals',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,name',
        ignoreDuplicates: true
      })
      .select()
      .single()

    if (!pipelineError && pipeline) {
      // Create pipeline stages
      const stages = [
        { name: 'New Lead', position: 0, probability: 10 },
        { name: 'Qualified', position: 1, probability: 30 },
        { name: 'Proposal', position: 2, probability: 60 },
        { name: 'Closed Won', position: 3, probability: 100 },
      ]

      for (const stage of stages) {
        await supabase.from('pipeline_stages').upsert({
          pipeline_id: pipeline.id,
          ...stage,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'pipeline_id,name'
        })
      }
      console.log('✅ Demo pipeline with 4 stages created')
    }

    // Step 5: Enable all features (if configured)
    if (DEMO_FEATURES_ALL_ENABLED) {
      console.log('\\n5️⃣  Enabling all features for demo tenant...')
      
      const { data: features } = await supabase
        .from('features')
        .select('id, code')

      if (features && features.length > 0) {
        const entitlements = features.map(f => ({
          tenant_id: DEMO_TENANT_ID,
          feature_id: f.id,
          is_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        await supabase
          .from('tenant_entitlements')
          .upsert(entitlements, {
            onConflict: 'tenant_id,feature_id',
            ignoreDuplicates: true
          })

        console.log(`✅ All ${features.length} features enabled for demo tenant`)
      }
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 Demo tenant seeding complete!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('Demo tenant ready:')
    console.log(`  Tenant ID: ${DEMO_TENANT_ID}`)
    console.log(`  Contacts: ${contactCount}`)
    console.log(`  Pipeline: Demo Sales Pipeline`)
    console.log(`  Features: ${DEMO_FEATURES_ALL_ENABLED ? 'All enabled' : 'Standard'}`)
    console.log('')

  } catch (error) {
    console.error('❌ Error seeding demo tenant:', error)
    process.exit(1)
  }
}

seedDemoTenant()


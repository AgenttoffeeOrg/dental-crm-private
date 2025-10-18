#!/usr/bin/env ts-node

/**
 * Demo Mode Clear Script
 * 
 * Clears ALL data for the demo tenant.
 * Safety: Only works when DEMO_MODE=true
 * 
 * Usage: npm run demo:clear
 */

import { createClient } from '@supabase/supabase-js'

const DEMO_MODE = process.env.DEMO_MODE === 'true'
const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || 'demo-tenant'
const DEMO_SAFE_EMAIL_DOMAIN = process.env.DEMO_SAFE_EMAIL_DOMAIN || 'demo.example.com'

// SAFETY CHECK
if (!DEMO_MODE) {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.error('❌ DEMO_MODE is FALSE - refusing to run for safety!')
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.error('')
  console.error('This script deletes data and should ONLY run in demo/staging.')
  console.error('Set DEMO_MODE=true to enable.')
  console.error('')
  process.exit(1)
}

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function clearDemoData() {
  console.log('🗑️  Demo Mode Clear Script')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Demo Tenant ID: ${DEMO_TENANT_ID}`)
  console.log(`Email Domain: ${DEMO_SAFE_EMAIL_DOMAIN}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  try {
    let totalDeleted = 0

    // Delete in proper order (child tables first to avoid FK violations)
    
    // 1. Delete deals
    console.log('1️⃣  Clearing deals...')
    const { count: dealsDeleted } = await supabase
      .from('deals')
      .delete({ count: 'exact' })
      .eq('tenant_id', DEMO_TENANT_ID)
    console.log(`   ✅ Deleted ${dealsDeleted || 0} deals`)
    totalDeleted += dealsDeleted || 0

    // 2. Delete contacts
    console.log('2️⃣  Clearing contacts...')
    const { count: contactsDeleted } = await supabase
      .from('contacts')
      .delete({ count: 'exact' })
      .eq('tenant_id', DEMO_TENANT_ID)
    console.log(`   ✅ Deleted ${contactsDeleted || 0} contacts`)
    totalDeleted += contactsDeleted || 0

    // 3. Delete pipeline stages
    console.log('3️⃣  Clearing pipeline stages...')
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('id')
      .eq('tenant_id', DEMO_TENANT_ID)

    if (pipelines && pipelines.length > 0) {
      for (const pipeline of pipelines) {
        await supabase
          .from('pipeline_stages')
          .delete()
          .eq('pipeline_id', pipeline.id)
      }
      console.log(`   ✅ Deleted stages from ${pipelines.length} pipelines`)
    }

    // 4. Delete pipelines
    console.log('4️⃣  Clearing pipelines...')
    const { count: pipelinesDeleted } = await supabase
      .from('pipelines')
      .delete({ count: 'exact' })
      .eq('tenant_id', DEMO_TENANT_ID)
    console.log(`   ✅ Deleted ${pipelinesDeleted || 0} pipelines`)
    totalDeleted += pipelinesDeleted || 0

    // 5. Delete tasks
    console.log('5️⃣  Clearing tasks...')
    const { count: tasksDeleted } = await supabase
      .from('tasks')
      .delete({ count: 'exact' })
      .eq('tenant_id', DEMO_TENANT_ID)
    console.log(`   ✅ Deleted ${tasksDeleted || 0} tasks`)
    totalDeleted += tasksDeleted || 0

    // 6. Delete activities
    console.log('6️⃣  Clearing activities...')
    const { count: activitiesDeleted } = await supabase
      .from('activities')
      .delete({ count: 'exact' })
      .eq('tenant_id', DEMO_TENANT_ID)
    console.log(`   ✅ Deleted ${activitiesDeleted || 0} activities`)
    totalDeleted += activitiesDeleted || 0

    // 7. Delete entitlements
    console.log('7️⃣  Clearing entitlements...')
    const { count: entitlementsDeleted } = await supabase
      .from('tenant_entitlements')
      .delete({ count: 'exact' })
      .eq('tenant_id', DEMO_TENANT_ID)
    console.log(`   ✅ Deleted ${entitlementsDeleted || 0} entitlements`)
    totalDeleted += entitlementsDeleted || 0

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🎉 Demo data cleared! Total records deleted: ${totalDeleted}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('⚠️  NOTE: This only cleared tenant data.')
    console.log('   Auth users must be deleted via Supabase Auth Dashboard.')
    console.log('')

  } catch (error) {
    console.error('❌ Error clearing demo data:', error)
    process.exit(1)
  }
}

clearDemoData()


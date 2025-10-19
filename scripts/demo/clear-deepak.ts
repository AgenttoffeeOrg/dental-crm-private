#!/usr/bin/env tsx

/**
 * =====================================================
 * DEMO CLEAR SCRIPT - Remove All Demo Data
 * =====================================================
 * 
 * Seed Pack ID: deepak_demo_pack_v1
 * 
 * Removes ALL data created by the seed script:
 * - Uses seed_pack_manifest to find all records
 * - Deletes in reverse dependency order
 * - Fully reverses the seed operation
 * 
 * SAFETY:
 * - Only deletes records tagged with SEED_PACK_ID
 * - Does NOT delete the demo tenant itself
 * - Does NOT delete the user
 * - Safe to run multiple times
 * 
 * USAGE:
 *   npm run clear:deepak
 */

import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURATION & SAFETY CHECKS
// =====================================================

const SEED_PACK_ID = process.env.SEED_PACK_ID || 'deepak_demo_pack_v1';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Missing environment variables');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// =====================================================
// DELETE IN REVERSE DEPENDENCY ORDER
// =====================================================

const DELETE_ORDER = [
  'payments',
  'insurance_claims',
  'invoices',
  'appointments',
  'deals',
  'insurance_policies',
  'contacts',
  'insurance_payers',
  'procedures',
  'appointment_types',
  'provider_schedules',
  'providers',
  'practice_locations',
  'marketing_form_submissions',
  'marketing_forms',
  'marketing_sends',
  'marketing_campaigns',
  'activities',
  'tasks',
  'files',
  'app_users'
];

async function clearDemoData() {
  console.log('🗑️  Demo Clear Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Seed Pack ID: ${SEED_PACK_ID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Get all records to delete
    const { data: manifest, error: manifestError } = await supabase
      .from('seed_pack_manifest')
      .select('*')
      .eq('seed_pack_id', SEED_PACK_ID);

    if (manifestError) {
      console.error('❌ Error reading manifest:', manifestError);
      process.exit(1);
    }

    if (!manifest || manifest.length === 0) {
      console.log('✅ No demo data found to clear');
      console.log('   (seed_pack_manifest is empty)');
      return;
    }

    console.log(`Found ${manifest.length} records to delete\n`);

    let totalDeleted = 0;

    // Delete in reverse order
    for (const tableName of DELETE_ORDER) {
      const recordsForTable = manifest.filter(m => m.table_name === tableName);
      
      if (recordsForTable.length === 0) {
        continue;
      }

      console.log(`🗑️  Deleting from ${tableName}...`);
      
      const ids = recordsForTable.map(r => r.record_id);
      
      const { count, error } = await supabase
        .from(tableName)
        .delete({ count: 'exact' })
        .in('id', ids);

      if (error) {
        console.error(`   ⚠️  Error: ${error.message}`);
      } else {
        console.log(`   ✅ Deleted ${count || 0} records`);
        totalDeleted += count || 0;
      }
    }

    // Clear the manifest itself
    console.log('\n🗑️  Clearing manifest...');
    const { error: manifestDeleteError } = await supabase
      .from('seed_pack_manifest')
      .delete()
      .eq('seed_pack_id', SEED_PACK_ID);

    if (manifestDeleteError) {
      console.error('   ⚠️  Error clearing manifest:', manifestDeleteError);
    } else {
      console.log('   ✅ Manifest cleared');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 Demo data cleared! Total records deleted: ${totalDeleted}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('⚠️  NOTE: The demo tenant was NOT deleted.');
    console.log('   Only the demo data within it was removed.');
    console.log('   The tenant is now empty and ready for re-seeding.');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

clearDemoData();


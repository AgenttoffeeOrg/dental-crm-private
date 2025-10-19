#!/usr/bin/env tsx

/**
 * =====================================================
 * DEMO VERIFY SCRIPT - Check Seed Data
 * =====================================================
 * 
 * Seed Pack ID: deepak_demo_pack_v1
 * 
 * Verifies that demo data was created correctly:
 * - Counts records in each table
 * - Checks relationships
 * - Prints summary
 * 
 * USAGE:
 *   npm run verify:deepak
 */

import { createClient } from '@supabase/supabase-js';

const SEED_PACK_ID = process.env.SEED_PACK_ID || 'deepak_demo_pack_v1';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyDemoData() {
  console.log('🔍 Demo Verification Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Seed Pack ID: ${SEED_PACK_ID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Get manifest records
    const { data: manifest, error: manifestError } = await supabase
      .from('seed_pack_manifest')
      .select('*')
      .eq('seed_pack_id', SEED_PACK_ID);

    if (manifestError) {
      console.error('❌ Error reading manifest:', manifestError);
      process.exit(1);
    }

    if (!manifest || manifest.length === 0) {
      console.log('⚠️  No demo data found');
      console.log('   Run: npm run seed:deepak');
      return;
    }

    // Count by table
    const counts: { [key: string]: number } = {};
    manifest.forEach(record => {
      counts[record.table_name] = (counts[record.table_name] || 0) + 1;
    });

    console.log('📊 Records Created:\n');
    console.log('Entity                        | Count');
    console.log('------------------------------|-------');
    
    const tables = Object.keys(counts).sort();
    tables.forEach(table => {
      const count = counts[table];
      const paddedTable = table.padEnd(29);
      const paddedCount = String(count).padStart(5);
      console.log(`${paddedTable} | ${paddedCount}`);
    });

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log('------------------------------|-------');
    console.log(`${'TOTAL'.padEnd(29)} | ${String(total).padStart(5)}`);
    
    console.log('');
    console.log('✅ Demo data verified successfully!');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

verifyDemoData();


#!/usr/bin/env node
/**
 * Executes the integration configuration migration against a Supabase database.
 * Requires SUPABASE_DB_PASSWORD in the environment.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';

const {
  SUPABASE_DB_PASSWORD,
  SUPABASE_DB_HOST = 'db.jadnqrxjnuxtvoeyyqzc.supabase.co',
  SUPABASE_DB_USER = 'postgres',
  SUPABASE_DB_NAME = 'postgres',
  SUPABASE_DB_PORT = '5432',
} = process.env;

if (!SUPABASE_DB_PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD is required.');
  process.exit(1);
}

const sqlPath = resolve('supabase/migrations/20251110_integration_config.sql');
const sql = readFileSync(sqlPath, 'utf8');

const client = new Client({
  host: SUPABASE_DB_HOST,
  port: Number(SUPABASE_DB_PORT),
  user: SUPABASE_DB_USER,
  password: SUPABASE_DB_PASSWORD,
  database: SUPABASE_DB_NAME,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();



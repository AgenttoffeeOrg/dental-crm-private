#!/usr/bin/env node
/**
 * Applies Phase 2b.11 conversation_id migration via direct Postgres.
 * Requires SUPABASE_DB_PASSWORD in the environment.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Client } from 'pg'

const {
  SUPABASE_DB_PASSWORD,
  SUPABASE_DB_HOST = 'db.hhdtatppvtmgqjopzqay.supabase.co',
  SUPABASE_DB_USER = 'postgres',
  SUPABASE_DB_NAME = 'postgres',
  SUPABASE_DB_PORT = '5432',
} = process.env

if (!SUPABASE_DB_PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD is required.')
  process.exit(1)
}

const sqlPath = resolve('supabase/migrations/20260519120000_add_conversation_id.sql')
const sql = readFileSync(sqlPath, 'utf8')

const client = new Client({
  host: SUPABASE_DB_HOST,
  port: Number(SUPABASE_DB_PORT),
  user: SUPABASE_DB_USER,
  password: SUPABASE_DB_PASSWORD,
  database: SUPABASE_DB_NAME,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  try {
    await client.connect()
    await client.query(sql)
    await client.query(
      `INSERT INTO supabase_migrations.schema_migrations (version, name)
       VALUES ('20260519120000', 'add_conversation_id')
       ON CONFLICT DO NOTHING`
    )
    console.log('Phase 2b.11 migration applied and recorded.')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()

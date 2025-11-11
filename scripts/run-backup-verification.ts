#!/usr/bin/env tsx
import 'dotenv/config'
import { Client } from 'pg'

interface VerificationResult {
  status: 'pass' | 'fail'
  details: Record<string, any>
}

function requireEnv(name: string, value?: string | null) {
  if (!value || value.trim() === '') {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}

async function runVerification(client: Client): Promise<VerificationResult> {
  const details: Record<string, any> = {}

  try {
    const nowRes = await client.query('select now() as current_time')
    details.databaseTime = nowRes.rows[0]?.current_time ?? null

    const migrationRes = await client.query(
      'select count(*)::int as applied_migrations from supabase_migrations.schema_migrations'
    )
    details.appliedMigrations = migrationRes.rows[0]?.applied_migrations ?? 0

    const recoveryRes = await client.query('select pg_is_in_recovery() as is_read_only')
    details.isReadOnlyReplica = recoveryRes.rows[0]?.is_read_only ?? false

    const randomRead = await client.query('select id from tenants order by created_at desc limit 1')
    details.sampleTenant = randomRead.rows[0]?.id ?? null

    return {
      status: 'pass',
      details,
    }
  } catch (error) {
    details.error = error instanceof Error ? error.message : String(error)
    return {
      status: 'fail',
      details,
    }
  }
}

async function main() {
  const host = requireEnv('SUPABASE_DB_HOST', process.env.SUPABASE_DB_HOST)
  const port = Number(process.env.SUPABASE_DB_PORT || 5432)
  const user = requireEnv('SUPABASE_DB_USER', process.env.SUPABASE_DB_USER)
  const password = requireEnv('SUPABASE_DB_PASSWORD', process.env.SUPABASE_DB_PASSWORD)
  const database = process.env.SUPABASE_DB_NAME || 'postgres'

  const environment = process.env.BACKUP_VERIFICATION_ENV || process.env.NODE_ENV || 'production'
  const tenantId = process.env.BACKUP_VERIFICATION_TENANT_ID || null
  const initiatedBy = process.env.BACKUP_VERIFICATION_USER_ID || null
  const logUrl = process.env.BACKUP_VERIFICATION_LOG_URL || null

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()

  const startedAt = new Date()
  const result = await runVerification(client)
  const completedAt = new Date()

  try {
    await client.query(
      `
        insert into backup_verification_runs (
          tenant_id,
          environment,
          status,
          started_at,
          completed_at,
          duration_ms,
          details,
          log_url,
          initiated_by_user_id
        ) values (
          $1::uuid,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7::jsonb,
          $8,
          $9::uuid
        )
      `,
      [
        tenantId,
        environment,
        result.status,
        startedAt.toISOString(),
        completedAt.toISOString(),
        completedAt.getTime() - startedAt.getTime(),
        JSON.stringify(result.details),
        logUrl,
        initiatedBy,
      ]
    )
  } catch (error) {
    console.error('[backup-verification] Failed to record run', error)
  } finally {
    await client.end()
  }

  if (result.status === 'fail') {
    console.error('[backup-verification] verification failed', result.details)
    process.exit(1)
  } else {
    console.log('[backup-verification] verification passed', result.details)
  }
}

main().catch((error) => {
  console.error('[backup-verification] fatal', error)
  process.exit(1)
})




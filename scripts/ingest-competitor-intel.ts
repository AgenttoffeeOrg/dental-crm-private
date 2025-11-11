#!/usr/bin/env tsx
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import Papa from 'papaparse'

import { enqueueCompetitorIntelJob, registerCompetitorIntelQueue } from '../src/lib/queues/competitor-intel-queue'
import { getRedisClient } from '../src/lib/redis'
import { ingestCompetitorIntel, CompetitorIntelRecord } from '../src/lib/services/competitor-intel'
import { createServiceClient } from '../src/lib/supabase-server'
import type { CompetitorIngestionJob } from '../src/types/database'

interface CliArgs {
  file: string
  tenantId: string
  sourceName: string
  sourceType: 'manual' | 'webhook' | 'scheduled' | 'api'
  queue: boolean
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.file || !args.tenantId || !args.sourceName) {
    console.error('Usage: tsx scripts/ingest-competitor-intel.ts --file ./data.csv --tenant <tenant-id> --source <name> [--source-type manual|webhook|scheduled|api] [--queue]')
    process.exit(1)
  }

  const absolutePath = path.resolve(process.cwd(), args.file)
  const fileContent = await fs.readFile(absolutePath, 'utf-8')

  const parsed = Papa.parse<Record<string, string>>(fileContent, { header: true, skipEmptyLines: true })
  if (parsed.errors.length) {
    console.error('Failed to parse CSV:', parsed.errors)
    process.exit(1)
  }

  const records = buildRecords(parsed.data, args.tenantId, args.sourceName)

  if (!records.length) {
    console.warn('No competitor rows detected in CSV; nothing to ingest.')
    return
  }

  const supabase = createServiceClient()

  const { data: jobRecord, error: insertError } = await supabase
    .from<CompetitorIngestionJob>('competitor_ingestion_jobs')
    .insert({
      tenant_id: args.tenantId,
      source_name: args.sourceName,
      source_type: args.sourceType,
      status: 'pending',
      payload: {
        file: absolutePath,
        rows: records.length,
        generatedAt: new Date().toISOString(),
      },
    })
    .select('*')
    .single()

  if (insertError || !jobRecord) {
    console.error('Failed to create ingestion job record:', insertError?.message)
    process.exit(1)
  }

  const redisClient = getRedisClient()
  const queueEnabled = redisClient && process.env.QUEUE_COMPETITOR_INTEL === 'true' && args.queue

  try {
    if (queueEnabled) {
      registerCompetitorIntelQueue()
      await enqueueCompetitorIntelJob({
        tenantId: args.tenantId,
        sourceName: args.sourceName,
        sourceType: args.sourceType,
        records,
        jobId: jobRecord.id,
      })
      console.log(`Enqueued competitor intelligence job ${jobRecord.id} (${records.length} record(s)).`)
      console.log('Ensure the competitor-intel worker is running: npm run workers:competitor-intel')
    } else {
      console.log('Queue disabled or not requested; ingesting synchronously...')
      await ingestCompetitorIntel(records, {
        jobId: jobRecord.id,
        sourceName: args.sourceName,
        sourceType: args.sourceType,
      })
      console.log(`Ingestion complete for job ${jobRecord.id}.`)
    }
  } catch (error: any) {
    console.error('Competitor ingestion failed:', error?.message ?? error)
    process.exitCode = 1
  } finally {
    if (redisClient && process.env.CLOSE_REDIS_ON_EXIT === 'true') {
      await redisClient.quit().catch(() => undefined)
    }
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    file: '',
    tenantId: '',
    sourceName: 'manual-upload',
    sourceType: 'manual',
    queue: true,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--file') {
      args.file = argv[++i] ?? ''
    } else if (arg === '--tenant') {
      args.tenantId = argv[++i] ?? ''
    } else if (arg === '--source') {
      args.sourceName = argv[++i] ?? 'manual-upload'
    } else if (arg === '--source-type') {
      const value = (argv[++i] ?? 'manual') as CliArgs['sourceType']
      args.sourceType = value
    } else if (arg === '--no-queue') {
      args.queue = false
    } else if (arg === '--queue') {
      args.queue = true
    }
  }

  return args
}

function buildRecords(rows: Record<string, string>[], tenantId: string, sourceName: string): CompetitorIntelRecord[] {
  const map = new Map<string, CompetitorIntelRecord>()

  for (const row of rows) {
    const competitorName = (row['competitor_name'] || '').trim()
    if (!competitorName) {
      continue
    }

    const key = competitorName.toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        tenantId,
        competitor: {
          name: competitorName,
          website: row['website']?.trim() || null,
          primaryLocation: row['primary_location']?.trim() || null,
          notes: row['competitor_notes']?.trim() || null,
          metadata: {},
        },
        pricePoints: [],
        touchpoints: [],
        documents: [],
      })
    }

    const record = map.get(key)!

    const treatmentName = row['treatment_name']?.trim()
    const priceValue = row['price_cents']?.trim()
    if (treatmentName || priceValue) {
      const priceCents = priceValue ? Number(priceValue) : undefined
      record.pricePoints?.push({
        treatmentName: treatmentName || null,
        treatmentCode: row['treatment_code']?.trim() || null,
        priceCents: Number.isFinite(priceCents) ? priceCents : undefined,
        collectedAt: row['collected_at']?.trim() || undefined,
        source: row['price_source']?.trim() || sourceName,
        metadata: {
          notes: row['price_notes']?.trim() || null,
        },
      })
    }

    const touchpointType = row['touchpoint_type']?.trim()
    if (touchpointType) {
      record.touchpoints?.push({
        touchpointType,
        occurredAt: row['touchpoint_occurred_at']?.trim() || undefined,
        summary: row['touchpoint_summary']?.trim() || null,
        link: row['touchpoint_link']?.trim() || null,
        metadata: {
          source: row['touchpoint_source']?.trim() || sourceName,
        },
      })
    }

    const documentPath = row['document_path']?.trim()
    if (documentPath) {
      record.documents?.push({
        documentPath,
        source: row['document_source']?.trim() || sourceName,
        capturedAt: row['document_captured_at']?.trim() || undefined,
        checksum: row['document_checksum']?.trim() || undefined,
        metadata: {
          notes: row['document_notes']?.trim() || null,
        },
      })
    }
  }

  return Array.from(map.values()).map((record) => {
    // Remove empty arrays to avoid unnecessary inserts
    if (!record.pricePoints?.length) delete record.pricePoints
    if (!record.touchpoints?.length) delete record.touchpoints
    if (!record.documents?.length) delete record.documents
    return record
  })
}

main().catch((error) => {
  console.error('Unexpected error during competitor ingestion:', error)
  process.exit(1)
})

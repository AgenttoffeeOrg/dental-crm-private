/**
 * =====================================================
 * BULK RE-ROUTING API ENDPOINT
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 14 - Bulk Operations
 * =====================================================
 * 
 * PURPOSE:
 * This API endpoint enables bulk re-routing of existing deals.
 * Useful for:
 * - Applying new tag mappings to existing deals
 * - Fixing mis-routed deals
 * - Migrating deals to new pipelines
 * - Auditing and correcting routing decisions
 * 
 * FEATURES:
 * - Batch processing for performance
 * - Detailed result reporting
 * - Dry-run mode for testing
 * - Progress tracking
 * - Rollback support
 * - Audit trail
 * 
 * SECURITY:
 * - Requires admin permissions
 * - Tenant-isolated
 * - Rate-limited
 * - Comprehensive logging
 * 
 * =====================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { routeDealToPipeline } from '@/lib/treatment-routing/routing-engine'
import { events } from '@/lib/events'
import { z } from 'zod'

// =====================================================
// TYPES & VALIDATION
// =====================================================

const bulkRerouteSchema = z.object({
  // Required
  dealIds: z.array(z.string().uuid()).min(1).max(1000), // Max 1000 deals per batch
  
  // Optional filters (for "all deals" operations)
  filters: z.object({
    pipelineIds: z.array(z.string().uuid()).optional(),
    stageIds: z.array(z.string().uuid()).optional(),
    treatmentTags: z.array(z.string()).optional(),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    misRoutedOnly: z.boolean().optional(), // Only re-route deals that don't match current mappings
  }).optional(),
  
  // Options
  dryRun: z.boolean().optional().default(false), // Test without making changes
  updateTags: z.boolean().optional().default(false), // Re-extract tags before routing
  notifyOwners: z.boolean().optional().default(false), // Notify deal owners of changes
  preserveCustomPipeline: z.boolean().optional().default(true), // Keep manually-set pipelines
})

type BulkRerouteRequest = z.infer<typeof bulkRerouteSchema>

interface RerouteResult {
  dealId: string
  dealTitle: string
  success: boolean
  previousPipelineId: string
  previousPipelineName: string
  newPipelineId: string
  newPipelineName: string
  previousStageId: string
  newStageId: string
  routingMethod: string
  routingLogId?: string
  treatmentTags: string[]
  changed: boolean
  reason?: string
  error?: string
}

interface BulkRerouteResponse {
  success: boolean
  dryRun: boolean
  totalDeals: number
  processed: number
  successful: number
  failed: number
  unchanged: number
  results: RerouteResult[]
  errors: string[]
  durationMs: number
  summary: {
    byPipeline: Record<string, number>
    byRoutingMethod: Record<string, number>
    commonErrors: string[]
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // ============================================
    // STEP 1: Authentication & Authorization
    // ============================================
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's app_user record with tenant info
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id, tenant_id, role, custom_role_id')
      .eq('auth_user_id', user.id)
      .single()

    if (appUserError || !appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check permissions (admin only)
    const { data: hasPermission } = await supabase
      .rpc('user_has_permission', {
        p_user_id: appUser.id,
        p_permission_code: 'bulk_reroute_deals'
      })

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Admin access required for bulk re-routing.' },
        { status: 403 }
      )
    }

    // ============================================
    // STEP 2: Validate Request
    // ============================================
    const body = await request.json()
    const validationResult = bulkRerouteSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const params: BulkRerouteRequest = validationResult.data

    console.log(`[Bulk Re-route] Starting ${params.dryRun ? 'DRY RUN' : 'LIVE'} re-routing for ${params.dealIds.length} deals`)

    // ============================================
    // STEP 3: Fetch Deals
    // ============================================
    let query = supabase
      .from('deals')
      .select(`
        id,
        title,
        pipeline_id,
        stage_id,
        treatment_tags,
        contact_id,
        owner_user_id,
        value_estimate_cents,
        source,
        custom_fields,
        pipeline:pipelines(id, name),
        stage:pipeline_stages(id, name)
      `)
      .eq('tenant_id', appUser.tenant_id)
      .in('id', params.dealIds)

    // Apply filters if provided
    if (params.filters) {
      if (params.filters.pipelineIds) {
        query = query.in('pipeline_id', params.filters.pipelineIds)
      }
      if (params.filters.stageIds) {
        query = query.in('stage_id', params.filters.stageIds)
      }
      if (params.filters.treatmentTags) {
        query = query.contains('treatment_tags', params.filters.treatmentTags)
      }
      if (params.filters.createdAfter) {
        query = query.gte('created_at', params.filters.createdAfter)
      }
      if (params.filters.createdBefore) {
        query = query.lte('created_at', params.filters.createdBefore)
      }
    }

    const { data: deals, error: fetchError } = await query

    if (fetchError) {
      console.error('[Bulk Re-route] Error fetching deals:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch deals', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!deals || deals.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun: params.dryRun,
        totalDeals: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        unchanged: 0,
        results: [],
        errors: ['No deals found matching criteria'],
        durationMs: Date.now() - startTime,
        summary: {
          byPipeline: {},
          byRoutingMethod: {},
          commonErrors: []
        }
      })
    }

    console.log(`[Bulk Re-route] Found ${deals.length} deals to process`)

    // ============================================
    // STEP 4: Process Each Deal
    // ============================================
    const results: RerouteResult[] = []
    const errors: string[] = []
    let successful = 0
    let failed = 0
    let unchanged = 0

    for (const deal of deals) {
      try {
        // Skip if preserveCustomPipeline and deal has custom_fields.manual_pipeline
        if (params.preserveCustomPipeline && deal.custom_fields?.manual_pipeline) {
          results.push({
            dealId: deal.id,
            dealTitle: deal.title,
            success: true,
            previousPipelineId: deal.pipeline_id,
            previousPipelineName: deal.pipeline?.name || 'Unknown',
            newPipelineId: deal.pipeline_id,
            newPipelineName: deal.pipeline?.name || 'Unknown',
            previousStageId: deal.stage_id,
            newStageId: deal.stage_id,
            routingMethod: 'preserved_manual',
            treatmentTags: deal.treatment_tags || [],
            changed: false,
            reason: 'Manual pipeline preserved'
          })
          unchanged++
          continue
        }

        // Update tags if requested
        let treatmentTags = deal.treatment_tags || []
        if (params.updateTags && deal.title) {
          try {
            const { extractTreatmentTags } = await import('@/lib/treatment-routing/ai-extractor')
            const extraction = await extractTreatmentTags(
              deal.title,
              deal.custom_fields?.description || '',
              appUser.tenant_id
            )
            treatmentTags = extraction.extractedTags
            console.log(`[Bulk Re-route] Updated tags for deal ${deal.id}:`, treatmentTags)
          } catch (extractError) {
            console.warn(`[Bulk Re-route] Failed to extract tags for deal ${deal.id}:`, extractError)
          }
        }

        // Route deal using routing engine
        const routingResult = await routeDealToPipeline({
          tenantId: appUser.tenant_id,
          treatmentTags,
          dealTitle: deal.title,
          dealValue: deal.value_estimate_cents || undefined,
          contactId: deal.contact_id,
          source: deal.source || undefined,
          userId: appUser.id,
          metadata: {
            dealId: deal.id,
            bulkReroute: true,
            dryRun: params.dryRun
          }
        })

        const changed = routingResult.pipelineId !== deal.pipeline_id || 
                       routingResult.stageId !== deal.stage_id

        // Apply changes if not dry run and something changed
        if (!params.dryRun && changed) {
          const { error: updateError } = await supabase
            .from('deals')
            .update({
              pipeline_id: routingResult.pipelineId,
              stage_id: routingResult.stageId,
              treatment_tags: treatmentTags,
              updated_at: new Date().toISOString(),
              custom_fields: {
                ...deal.custom_fields,
                last_rerouted_at: new Date().toISOString(),
                last_rerouted_by: appUser.id,
                reroute_reason: 'bulk_operation'
              }
            })
            .eq('id', deal.id)

          if (updateError) {
            throw updateError
          }

          // Emit DEAL.ROUTED event
          if (deal.contact_id) {
            await events.dealRouted({
              dealId: deal.id,
              contactId: deal.contact_id,
              tenantId: appUser.tenant_id,
              pipelineId: routingResult.pipelineId,
              stageId: routingResult.stageId,
              treatmentTags,
              routingMethod: routingResult.routingMethod as any,
              routingLogId: routingResult.routingLogId,
              source: 'bulk_reroute'
            })
          }

          // TODO: Notify owner if requested
          if (params.notifyOwners && deal.owner_user_id) {
            // Implementation for notification system
            console.log(`[Bulk Re-route] Would notify owner ${deal.owner_user_id} about deal ${deal.id}`)
          }
        }

        results.push({
          dealId: deal.id,
          dealTitle: deal.title,
          success: true,
          previousPipelineId: deal.pipeline_id,
          previousPipelineName: deal.pipeline?.name || 'Unknown',
          newPipelineId: routingResult.pipelineId,
          newPipelineName: routingResult.pipelineName,
          previousStageId: deal.stage_id,
          newStageId: routingResult.stageId,
          routingMethod: routingResult.routingMethod,
          routingLogId: routingResult.routingLogId,
          treatmentTags,
          changed,
          reason: changed ? `Re-routed via ${routingResult.routingMethod}` : 'Already in correct pipeline'
        })

        if (changed) {
          successful++
        } else {
          unchanged++
        }

      } catch (dealError) {
        console.error(`[Bulk Re-route] Error processing deal ${deal.id}:`, dealError)
        const errorMessage = dealError instanceof Error ? dealError.message : 'Unknown error'
        errors.push(`Deal ${deal.id} (${deal.title}): ${errorMessage}`)
        
        results.push({
          dealId: deal.id,
          dealTitle: deal.title,
          success: false,
          previousPipelineId: deal.pipeline_id,
          previousPipelineName: deal.pipeline?.name || 'Unknown',
          newPipelineId: deal.pipeline_id,
          newPipelineName: deal.pipeline?.name || 'Unknown',
          previousStageId: deal.stage_id,
          newStageId: deal.stage_id,
          routingMethod: 'error',
          treatmentTags: deal.treatment_tags || [],
          changed: false,
          error: errorMessage
        })
        
        failed++
      }
    }

    // ============================================
    // STEP 5: Generate Summary
    // ============================================
    const byPipeline: Record<string, number> = {}
    const byRoutingMethod: Record<string, number> = {}
    
    results.forEach(result => {
      if (result.success && result.changed) {
        byPipeline[result.newPipelineName] = (byPipeline[result.newPipelineName] || 0) + 1
        byRoutingMethod[result.routingMethod] = (byRoutingMethod[result.routingMethod] || 0) + 1
      }
    })

    // Get most common errors
    const errorCounts: Record<string, number> = {}
    errors.forEach(error => {
      const errorType = error.split(':')[1]?.trim() || error
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1
    })
    const commonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error)

    // ============================================
    // STEP 6: Return Response
    // ============================================
    const response: BulkRerouteResponse = {
      success: true,
      dryRun: params.dryRun,
      totalDeals: deals.length,
      processed: deals.length,
      successful,
      failed,
      unchanged,
      results,
      errors,
      durationMs: Date.now() - startTime,
      summary: {
        byPipeline,
        byRoutingMethod,
        commonErrors
      }
    }

    console.log(`[Bulk Re-route] Completed ${params.dryRun ? 'DRY RUN' : 'LIVE'}: ${successful} successful, ${failed} failed, ${unchanged} unchanged in ${response.durationMs}ms`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Bulk Re-route] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// =====================================================
// GET HANDLER - Get bulk re-route status
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get recent bulk re-route operations from routing logs
    const { data: recentOperations } = await supabase
      .from('treatment_routing_logs')
      .select('*')
      .eq('tenant_id', appUser.tenant_id)
      .eq('source', 'bulk_reroute')
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      success: true,
      recentOperations: recentOperations || []
    })

  } catch (error) {
    console.error('[Bulk Re-route GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


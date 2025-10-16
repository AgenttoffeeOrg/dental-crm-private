import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { categorizeDeal, autoTagDeal } from '@/lib/deal-categorization'

/**
 * Auto-categorize all existing deals into appropriate pipelines
 * This moves deals based on:
 * - Treatment type (implants → High-Value, emergency → Emergency, etc.)
 * - Deal value (£5,000+ → High-Value)
 * - Keywords in title/description
 */
export async function POST() {
  try {
    const supabase = await createServiceClient()
    const tenantId = appUser.tenant_id

    console.log('🔄 Starting auto-categorization of deals...')

    // Step 1: Load all pipelines
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('tenant_id', tenantId)

    if (pipelinesError) throw pipelinesError

    console.log(`Found ${pipelines?.length || 0} pipelines`)

    // Step 2: Create a map of pipeline names to IDs
    const pipelineMap = new Map<string, string>()
    pipelines?.forEach(p => {
      pipelineMap.set(p.name, p.id)
    })

    // Step 3: Load all deals
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('tenant_id', tenantId)

    if (dealsError) throw dealsError

    console.log(`Found ${deals?.length || 0} deals to categorize`)

    const results = {
      total: deals?.length || 0,
      categorized: 0,
      moved: 0,
      errors: 0,
      byPipeline: {} as Record<string, number>
    }

    // Step 4: Categorize and move each deal
    for (const deal of deals || []) {
      try {
        // Try to get AI conversation data for this deal's contact
        let aiData = null
        if (deal.contact_id) {
          const { data: artifacts } = await supabase
            .from('ai_artifacts')
            .select('content')
            .eq('contact_id', deal.contact_id)
            .eq('kind', 'conversation_analysis')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (artifacts?.content) {
            aiData = artifacts.content
          }
        }

        // Categorize the deal with AI insights
        const category = categorizeDeal(
          deal.title || '',
          deal.description || '',
          deal.treatment_tags || [],
          deal.value_estimate_cents || 0,
          deal.source,
          aiData // Pass AI conversation data
        )

        console.log(`Deal "${deal.title}": → ${category.pipelineName} (${Math.round(category.confidence * 100)}% confident)${aiData ? ' [Using AI insights]' : ''}`)

        // Get the target pipeline ID
        const targetPipelineId = pipelineMap.get(category.pipelineName)

        if (!targetPipelineId) {
          console.warn(`Pipeline "${category.pipelineName}" not found, skipping deal ${deal.id}`)
          continue
        }

        // Check if deal is already in the correct pipeline
        if (deal.pipeline_id === targetPipelineId) {
          console.log(`  ✓ Already in correct pipeline`)
          results.categorized++
          results.byPipeline[category.pipelineName] = (results.byPipeline[category.pipelineName] || 0) + 1
          continue
        }

        // Get the first stage of the target pipeline
        const { data: firstStage, error: stageError } = await supabase
          .from('pipeline_stages')
          .select('id')
          .eq('pipeline_id', targetPipelineId)
          .eq('tenant_id', tenantId)
          .order('position')
          .limit(1)
          .single()

        if (stageError || !firstStage) {
          console.warn(`No stages found for pipeline ${category.pipelineName}`)
          continue
        }

        // Generate auto-tags
        const autoTags = autoTagDeal(
          deal.title || '',
          deal.description || '',
          deal.treatment_tags || [],
          deal.value_estimate_cents || 0
        )

        // Merge with existing tags
        const existingTags = deal.treatment_tags || []
        const mergedTags = [...new Set([...existingTags, ...autoTags])]

        // Move the deal to the correct pipeline
        const { error: updateError } = await supabase
          .from('deals')
          .update({
            pipeline_id: targetPipelineId,
            stage_id: firstStage.id,
            treatment_tags: mergedTags,
            updated_at: new Date().toISOString()
          })
          .eq('id', deal.id)

        if (updateError) {
          console.error(`Error updating deal ${deal.id}:`, updateError)
          results.errors++
          continue
        }

        console.log(`  ✓ Moved to ${category.pipelineName}, added tags: ${autoTags.join(', ')}`)
        results.moved++
        results.categorized++
        results.byPipeline[category.pipelineName] = (results.byPipeline[category.pipelineName] || 0) + 1

      } catch (error) {
        console.error(`Error processing deal ${deal.id}:`, error)
        results.errors++
      }
    }

    console.log('✅ Auto-categorization complete!')
    console.log('Results:', results)

    return NextResponse.json({
      success: true,
      message: 'Deals auto-categorized successfully',
      results
    })

  } catch (error) {
    console.error('Auto-categorization error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'Deal Auto-Categorization Endpoint',
    purpose: 'Automatically categorizes deals into appropriate pipelines based on treatment type and value',
    method: 'Send POST request to run categorization',
    rules: [
      'High-value (£5,000+) or implants → High-Value Treatment pipeline',
      'Emergency keywords (pain, bleeding, urgent) → Emergency Treatment pipeline',
      'Orthodontics (Invisalign, braces) → Orthodontics pipeline',
      'Cosmetic (veneers, whitening) → Cosmetic Dentistry pipeline',
      'Referrals → Referral Network pipeline',
      'Everything else → General Practice pipeline'
    ]
  })
}


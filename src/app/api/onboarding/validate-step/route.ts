import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST /api/onboarding/validate-step
 * 
 * Validates field data for a specific step against required fields
 * 
 * Request Body:
 * {
 *   stepId: string,
 *   fieldData: object
 * }
 * 
 * Response:
 * {
 *   valid: boolean,
 *   errors: [{ field: string, message: string }],
 *   missingRequired: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { stepId, fieldData } = body

    console.log('[API] Validating step:', stepId)
    console.log('[API] Field data:', fieldData)

    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId is required' },
        { status: 400 }
      )
    }

    // Get user's tenant
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get field configuration for this step
    // Note: Use .or() for NULL check instead of .in() with null value
    const { data: fieldConfigs, error: configError } = await supabase
      .from('onboarding_field_config')
      .select('field_name, is_required, validation_rules')
      .eq('step_id', stepId)
      .or(`tenant_id.eq.${appUser.tenant_id},tenant_id.is.null`)
      .order('tenant_id', { ascending: false, nullsLast: true }) // Prefer tenant-specific over global

    if (configError) {
      console.error('[API] Error fetching field config:', configError)
      return NextResponse.json(
        { error: 'Failed to load configuration', details: configError.message },
        { status: 500 }
      )
    }

    console.log('[API] Found field configs:', fieldConfigs?.length || 0)
    console.log('[API] Field configs:', JSON.stringify(fieldConfigs, null, 2))

    const errors: Array<{ field: string; message: string }> = []
    const missingRequired: string[] = []

    // Validate each field
    for (const config of fieldConfigs || []) {
      const fieldValue = fieldData?.[config.field_name]
      
      // Check required fields
      if (config.is_required) {
        if (!fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
          missingRequired.push(config.field_name)
          errors.push({
            field: config.field_name,
            message: `${config.field_name.replace(/_/g, ' ')} is required`
          })
        }
      }

      // Apply validation rules if field has value
      if (fieldValue && config.validation_rules) {
        const rules = config.validation_rules as any

        // Min length
        if (rules.minLength && String(fieldValue).length < rules.minLength) {
          errors.push({
            field: config.field_name,
            message: `Must be at least ${rules.minLength} characters`
          })
        }

        // Max length
        if (rules.maxLength && String(fieldValue).length > rules.maxLength) {
          errors.push({
            field: config.field_name,
            message: `Must be no more than ${rules.maxLength} characters`
          })
        }

        // Pattern (regex)
        if (rules.pattern) {
          const regex = new RegExp(rules.pattern)
          if (!regex.test(String(fieldValue))) {
            errors.push({
              field: config.field_name,
              message: rules.patternMessage || 'Invalid format'
            })
          }
        }

        // Email validation
        if (config.field_name.includes('email')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(String(fieldValue))) {
            errors.push({
              field: config.field_name,
              message: 'Invalid email format'
            })
          }
        }

        // Phone validation (basic)
        if (config.field_name.includes('phone')) {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/
          if (!phoneRegex.test(String(fieldValue))) {
            errors.push({
              field: config.field_name,
              message: 'Invalid phone number format'
            })
          }
        }

        // URL validation
        if (config.field_name.includes('website') || config.field_name.includes('url')) {
          try {
            new URL(String(fieldValue))
          } catch {
            errors.push({
              field: config.field_name,
              message: 'Invalid URL format'
            })
          }
        }
      }
    }

    const valid = errors.length === 0

    console.log('[API] Validation result:', { valid, errorCount: errors.length, missingRequiredCount: missingRequired.length })

    return NextResponse.json({
      valid,
      errors,
      missingRequired,
      totalErrors: errors.length
    })

  } catch (error: any) {
    console.error('[API] Error in POST /api/onboarding/validate-step:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


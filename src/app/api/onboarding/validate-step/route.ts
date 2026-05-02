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
      .select('tenant_id, active_tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // ✅ Use simplified validation based on stepId and config API structure
    // Instead of querying onboarding_field_config, validate based on known step requirements
    const errors: Array<{ field: string; message: string }> = []
    const missingRequired: string[] = []

    // Define required fields for each step
    const stepRequirements: Record<string, { required: string[]; optional: string[] }> = {
      email_verification: {
        required: [], // Email verification is handled by Supabase auth
        optional: []
      },
      profile_setup: {
        required: ['full_name'], // Only full_name is required
        optional: ['professional_title', 'phone_mobile', 'phone_office', 'bio', 'profile_photo_url']
      },
      organization_setup: {
        required: [], // All fields optional
        optional: ['name', 'description', 'specialty']
      },
      location_setup: {
        required: [], // All fields optional
        optional: ['name', 'address_line1', 'city', 'postal_code', 'phone_number']
      }
    }

    const requirements = stepRequirements[stepId] || { required: [], optional: [] }

    // Validate required fields
    for (const fieldName of requirements.required) {
      const fieldValue = fieldData?.[fieldName]
      if (!fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
        missingRequired.push(fieldName)
        const displayName = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        errors.push({
          field: fieldName,
          message: `${displayName} is required`
        })
      }
    }

    // Basic validation for field formats (if value is provided)
    if (fieldData) {
      // Validate full_name min length if provided
      if (stepId === 'profile_setup' && fieldData.full_name) {
        const fullName = String(fieldData.full_name).trim()
        if (fullName.length < 2) {
          errors.push({
            field: 'full_name',
            message: 'Full name must be at least 2 characters'
          })
        }
      }

      // Validate email formats
      for (const [fieldName, fieldValue] of Object.entries(fieldData)) {
        if (fieldValue && fieldName.includes('email') && typeof fieldValue === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(fieldValue)) {
            errors.push({
              field: fieldName,
              message: 'Invalid email format'
            })
          }
        }

        // Validate phone formats
        if (fieldValue && (fieldName.includes('phone') || fieldName === 'phone_number') && typeof fieldValue === 'string') {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/
          if (!phoneRegex.test(fieldValue)) {
            errors.push({
              field: fieldName,
              message: 'Invalid phone number format'
            })
          }
        }

        // Validate URL formats
        if (fieldValue && (fieldName.includes('website') || fieldName.includes('url')) && typeof fieldValue === 'string') {
          try {
            new URL(fieldValue)
          } catch {
            errors.push({
              field: fieldName,
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


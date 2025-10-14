/**
 * Contacts API Route
 * 
 * Handles CRUD operations for contacts with:
 * - Input validation (Zod schemas)
 * - Idempotency (duplicate prevention)
 * - Error handling
 * - Authentication/authorization
 * 
 * @module api/contacts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { 
  ContactCreateSchema, 
  ContactSearchSchema,
  safeValidateContact 
} from '@/schemas/contact.schema'
import {
  extractIdempotencyKey,
  checkIdempotency,
  storeIdempotency,
  withIdempotency,
} from '@/lib/idempotency'

/**
 * GET /api/contacts
 * List contacts with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get app user to verify tenant
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const validation = safeValidateContact(searchParams, ContactSearchSchema)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validation.error.errors 
        },
        { status: 400 }
      )
    }

    const { query, status, source, tags, limit, offset } = validation.data

    // Build query
    let dbQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('tenant_id', appUser.tenant_id)

    // Apply filters
    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
    }
    if (status) {
      dbQuery = dbQuery.eq('status', status)
    }
    if (source) {
      dbQuery = dbQuery.eq('source', source)
    }
    if (tags && tags.length > 0) {
      dbQuery = dbQuery.contains('tags', tags)
    }

    // Apply pagination
    dbQuery = dbQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Execute query
    const { data: contacts, error, count } = await dbQuery

    if (error) {
      console.error('[API] Error fetching contacts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      contacts,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      },
    })

  } catch (error) {
    console.error('[API] Unexpected error in GET /api/contacts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/contacts
 * Create a new contact with validation and idempotency
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get app user to get tenant_id
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check for idempotency key
    const idempotencyKey = extractIdempotencyKey(request.headers)
    
    if (idempotencyKey) {
      const cached = checkIdempotency(idempotencyKey)
      if (cached) {
        return NextResponse.json(cached, { 
          status: 200,
          headers: { 'X-Idempotency-Replay': 'true' }
        })
      }
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = safeValidateContact(body, ContactCreateSchema)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors 
        },
        { status: 400 }
      )
    }

    const contactData = {
      ...validation.data,
      tenant_id: appUser.tenant_id,
      created_by: user.id,
    }

    // Check for duplicate (optional - based on settings)
    if (contactData.email) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', appUser.tenant_id)
        .eq('email', contactData.email)
        .single()

      if (existing) {
        return NextResponse.json(
          { 
            error: 'Duplicate contact',
            message: 'A contact with this email already exists',
            existingId: existing.id 
          },
          { status: 409 }
        )
      }
    }

    // Create contact (wrapped in idempotency if key provided)
    const createContact = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single()

      if (error) {
        console.error('[API] Error creating contact:', error)
        throw new Error('Failed to create contact')
      }

      return { contact: data, created: true }
    }

    let result
    if (idempotencyKey) {
      result = await withIdempotency(
        user.id,
        'create_contact',
        contactData,
        createContact
      )
      
      // Store with custom key as well
      storeIdempotency(idempotencyKey, result)
    } else {
      result = await createContact()
    }

    return NextResponse.json(result, { status: 201 })

  } catch (error: any) {
    console.error('[API] Unexpected error in POST /api/contacts:', error)
    
    // Return user-friendly error
    return NextResponse.json(
      { 
        error: 'Failed to create contact',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/contacts (bulk operations)
 * Update multiple contacts or perform bulk actions
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get app user
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { action, contactIds, data: updateData } = body

    if (!action || !contactIds || !Array.isArray(contactIds)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    // Perform bulk action based on type
    let result
    switch (action) {
      case 'update_status':
        result = await supabase
          .from('contacts')
          .update({ status: updateData.status })
          .in('id', contactIds)
          .eq('tenant_id', appUser.tenant_id)
          .select()
        break

      case 'add_tags':
        // Would need more complex logic for array operations
        return NextResponse.json(
          { error: 'Not implemented yet' },
          { status: 501 }
        )

      case 'delete':
        result = await supabase
          .from('contacts')
          .delete()
          .in('id', contactIds)
          .eq('tenant_id', appUser.tenant_id)
        break

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

    if (result?.error) {
      return NextResponse.json(
        { error: 'Bulk operation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      affected: result?.data?.length || contactIds.length,
    })

  } catch (error) {
    console.error('[API] Error in PATCH /api/contacts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


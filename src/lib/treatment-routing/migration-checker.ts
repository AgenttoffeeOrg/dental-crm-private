/**
 * =====================================================
 * MIGRATION STATUS CHECKER
 * =====================================================
 * Helper to detect if treatment routing migrations
 * have been run and provide user-friendly guidance.
 * =====================================================
 */

import { createClient } from '@/lib/supabase-client'

export interface MigrationStatus {
  isReady: boolean
  missingTables: string[]
  errorMessage?: string
  userMessage?: string
}

const REQUIRED_TABLES = [
  'treatment_tags',
  'treatment_tag_pipeline_mappings',
  'treatment_routing_logs',
  'treatment_routing_settings',
  'pms_procedure_tag_mappings'
]

/**
 * Check if all required tables exist
 */
export async function checkMigrationStatus(): Promise<MigrationStatus> {
  try {
    const supabase = createClient()
    const missingTables: string[] = []

    // Check each table
    for (const tableName of REQUIRED_TABLES) {
      try {
        // Try to query the table (just check if it exists)
        const { error } = await supabase
          .from(tableName)
          .select('id')
          .limit(0)
          .maybeSingle()

        // If error code is 42P01, table doesn't exist
        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
          missingTables.push(tableName)
        }
      } catch (tableError) {
        // Table likely doesn't exist
        missingTables.push(tableName)
      }
    }

    if (missingTables.length > 0) {
      return {
        isReady: false,
        missingTables,
        errorMessage: `Missing database tables: ${missingTables.join(', ')}`,
        userMessage: 'Treatment routing system requires database setup. Please contact your administrator to run the database migrations.'
      }
    }

    return {
      isReady: true,
      missingTables: []
    }
  } catch (error) {
    console.error('[MigrationCheck] Failed to check migration status:', error)
    return {
      isReady: false,
      missingTables: REQUIRED_TABLES,
      errorMessage: 'Unable to verify database setup',
      userMessage: 'Could not verify treatment routing system setup. Please contact your administrator.'
    }
  }
}

/**
 * Check if a specific table exists
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(0)
      .maybeSingle()

    // Table doesn't exist if we get a 42P01 error
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      return false
    }

    return true
  } catch (error) {
    console.error(`[MigrationCheck] Error checking table ${tableName}:`, error)
    return false
  }
}

/**
 * Gracefully handle database errors with user-friendly messages
 */
export function handleDatabaseError(error: any, context: string): {
  isTableMissing: boolean
  userMessage: string
  shouldRetry: boolean
} {
  // Only log if it's not an empty error object
  if (error && typeof error === 'object' && Object.keys(error).length > 0) {
    console.error(`[${context}] Database error:`, error)
  } else {
    console.info(`[${context}] Database query returned no results`)
  }

  // Check if it's a missing table error
  const errorMessage = error?.message || error?.toString() || ''
  const errorCode = error?.code || ''

  const isTableMissing = 
    errorCode === '42P01' || 
    errorMessage.includes('does not exist') ||
    errorMessage.includes('relation') && errorMessage.includes('does not exist')

  if (isTableMissing) {
    return {
      isTableMissing: true,
      userMessage: 'Treatment routing system requires database setup. Please contact your administrator.',
      shouldRetry: false
    }
  }

  // Check for permission errors
  if (errorCode === '42501' || errorMessage.includes('permission denied')) {
    return {
      isTableMissing: false,
      userMessage: 'You don\'t have permission to access this feature. Please contact your administrator.',
      shouldRetry: false
    }
  }

  // Check for network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      isTableMissing: false,
      userMessage: 'Network error. Please check your connection and try again.',
      shouldRetry: true
    }
  }

  // Generic error
  return {
    isTableMissing: false,
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    shouldRetry: true
  }
}

/**
 * Create a user-friendly error message with action steps
 */
export function createMigrationNeededMessage(): string {
  return `
The Treatment Routing System is not yet set up in your database.

To enable this feature, an administrator needs to:
1. Run the database migration scripts (45, 46, 47)
2. Restart the application
3. Refresh this page

For assistance, please contact your system administrator or support team.
  `.trim()
}


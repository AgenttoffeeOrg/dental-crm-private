/**
 * Migration Helper for Unified OAuth
 * 
 * Migrates existing individual service connections to provider groups
 */

import { createServiceClient } from '@/lib/supabase-server'
import { INTEGRATION_GROUPS, getGroupForService } from './unified-scopes'

export interface MigrationResult {
  success: boolean
  migrated: number
  errors: string[]
  skipped: number
}

/**
 * Migrate existing connections to unified provider groups
 */
export async function migrateToUnifiedOAuth(tenantId: string): Promise<MigrationResult> {
  const supabase = createServiceClient()
  const result: MigrationResult = {
    success: true,
    migrated: 0,
    errors: [],
    skipped: 0,
  }

  try {
    // Get all existing connections for this tenant
    const { data: connections, error } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) {
      result.success = false
      result.errors.push(`Failed to load connections: ${error.message}`)
      return result
    }

    if (!connections || connections.length === 0) {
      return result // Nothing to migrate
    }

    // Group connections by provider
    const providerGroups = new Map<string, typeof connections>()

    for (const connection of connections) {
      const group = getGroupForService(connection.integration_type)
      if (group) {
        const provider = group.provider
        if (!providerGroups.has(provider)) {
          providerGroups.set(provider, [])
        }
        providerGroups.get(provider)!.push(connection)
      } else {
        result.skipped++
      }
    }

    // Migrate each provider group
    for (const [provider, providerConnections] of providerGroups) {
      // Find the connection with the most scopes (likely the main one)
      const mainConnection = providerConnections.reduce((prev, curr) => {
        const prevScopes = prev.scopes?.length || 0
        const currScopes = curr.scopes?.length || 0
        return currScopes > prevScopes ? curr : prev
      })

      if (!mainConnection.scopes || mainConnection.scopes.length === 0) {
        result.skipped++
        continue
      }

      // Get all services for this provider
      const group = INTEGRATION_GROUPS[provider]
      if (!group) continue

      // Create/update connections for all services in the group
      for (const serviceType of group.services) {
        const existingConnection = providerConnections.find(c => c.integration_type === serviceType)
        
        if (!existingConnection) {
          // Create new connection for this service
          const { error: createError } = await supabase
            .from('integration_connections')
            .insert({
              tenant_id: tenantId,
              integration_type: serviceType,
              integration_name: getServiceName(serviceType),
              status: 'connected',
              is_active: true,
              scopes: mainConnection.scopes,
              credentials: {},
              config: {
                provider,
                granted_scopes: mainConnection.scopes,
                migrated_from: mainConnection.integration_type,
                migrated_at: new Date().toISOString(),
              },
              token_expires_at: mainConnection.token_expires_at,
            })

          if (createError) {
            result.errors.push(`Failed to create connection for ${serviceType}: ${createError.message}`)
          } else {
            result.migrated++
          }
        } else {
          // Update existing connection with unified scopes
          const { error: updateError } = await supabase
            .from('integration_connections')
            .update({
              scopes: mainConnection.scopes,
              config: {
                ...existingConnection.config,
                provider,
                granted_scopes: mainConnection.scopes,
                migrated_at: new Date().toISOString(),
              },
            })
            .eq('id', existingConnection.id)

          if (updateError) {
            result.errors.push(`Failed to update connection for ${serviceType}: ${updateError.message}`)
          } else {
            result.migrated++
          }
        }
      }
    }

    if (result.errors.length > 0) {
      result.success = false
    }

    return result
  } catch (error) {
    result.success = false
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  }
}

function getServiceName(serviceType: string): string {
  const names: Record<string, string> = {
    gmail: 'Gmail',
    google_analytics: 'Google Analytics',
    google_ads: 'Google Ads',
    google_calendar: 'Google Calendar',
    facebook_pages: 'Facebook Pages',
    facebook_ads: 'Facebook Ads',
    instagram: 'Instagram',
    outlook: 'Outlook',
    onedrive: 'OneDrive',
    microsoft_calendar: 'Microsoft Calendar',
  }
  return names[serviceType] || serviceType
}


/**
 * Centralized Configuration Service
 * Provides type-safe access to all application settings
 */

import { createClient } from './supabase-client'
import { SETTINGS_REGISTRY, SettingDefinition } from '@/config/settings-registry'
import logger from './logger'

export class ConfigService {
  private cache = new Map<string, { value: any; timestamp: number }>()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes
  private static instance: ConfigService

  static getInstance() {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService()
    }
    return ConfigService.instance
  }

  /**
   * Get setting value
   */
  async get<T = any>(
    key: string,
    context?: { userId?: string; tenantId?: string }
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(this.getCacheKey(key, context))
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.value as T
    }

    const definition = SETTINGS_REGISTRY[key]
    if (!definition) {
      logger.warn({ key }, 'Setting key not found in registry')
      throw new Error(`Unknown setting key: ${key}`)
    }

    try {
      // Fetch from database
      const value = await this.fetchFromDatabase(key, definition, context)
      
      // Validate
      const validated = definition.validationSchema.parse(value ?? definition.defaultValue)
      
      // Cache
      this.cache.set(this.getCacheKey(key, context), {
        value: validated,
        timestamp: Date.now(),
      })
      
      return validated as T
      
    } catch (error) {
      logger.error({ error, key }, 'Error fetching setting')
      return definition.defaultValue as T
    }
  }

  /**
   * Set setting value
   */
  async set(
    key: string,
    value: any,
    context?: { userId?: string; tenantId?: string }
  ): Promise<void> {
    const definition = SETTINGS_REGISTRY[key]
    
    if (!definition) {
      throw new Error(`Unknown setting key: ${key}`)
    }

    if (!definition.editable) {
      throw new Error(`Setting ${key} is read-only`)
    }

    // Validate
    const validated = definition.validationSchema.parse(value)

    // Save to database
    await this.saveToDatabase(key, validated, definition, context)

    // Invalidate cache
    this.cache.delete(this.getCacheKey(key, context))

    logger.info({ key, scope: definition.scope }, 'Setting updated')
  }

  /**
   * Get all settings for a category
   */
  async getCategory(category: string, context?: { userId?: string; tenantId?: string }): Promise<Record<string, any>> {
    const settings: Record<string, any> = {}
    
    const categorySettings = Object.values(SETTINGS_REGISTRY)
      .filter(s => s.category === category)

    for (const setting of categorySettings) {
      try {
        settings[setting.key] = await this.get(setting.key, context)
      } catch (error) {
        logger.error({ error, key: setting.key }, 'Error fetching category setting')
        settings[setting.key] = setting.defaultValue
      }
    }

    return settings
  }

  /**
   * Reset setting to default
   */
  async reset(key: string, context?: { userId?: string; tenantId?: string }): Promise<void> {
    const definition = SETTINGS_REGISTRY[key]
    if (!definition) {
      throw new Error(`Unknown setting key: ${key}`)
    }

    await this.set(key, definition.defaultValue, context)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    logger.info('Config cache cleared')
  }

  private getCacheKey(key: string, context?: { userId?: string; tenantId?: string }): string {
    const parts = [key]
    if (context?.userId) parts.push(`user:${context.userId}`)
    if (context?.tenantId) parts.push(`tenant:${context.tenantId}`)
    return parts.join('::')
  }

  private async fetchFromDatabase(
    key: string,
    definition: SettingDefinition,
    context?: { userId?: string; tenantId?: string }
  ): Promise<any> {
    const supabase = createClient()

    // TODO: Implement actual database fetch from settings table
    // For now, return default value
    // In production, query from `org_settings` or `user_settings` table based on scope

    logger.debug({ key, scope: definition.scope }, 'Fetching setting from database (returning default)')
    return definition.defaultValue
  }

  private async saveToDatabase(
    key: string,
    value: any,
    definition: SettingDefinition,
    context?: { userId?: string; tenantId?: string }
  ): Promise<void> {
    const supabase = createClient()

    // TODO: Implement actual database save
    // Based on scope, save to org_settings or user_settings table
    
    logger.info({ key, value, scope: definition.scope }, 'Saving setting to database (stub)')
  }
}

export const config = ConfigService.getInstance()

// Convenience functions
export const getSetting = <T = any>(key: string, context?: { userId?: string; tenantId?: string }) => 
  config.get<T>(key, context)

export const setSetting = (key: string, value: any, context?: { userId?: string; tenantId?: string }) => 
  config.set(key, value, context)


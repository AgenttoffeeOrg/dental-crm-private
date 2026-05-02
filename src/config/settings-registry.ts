/**
 * Settings Registry
 * Centralized configuration for all application settings
 */

import { z } from 'zod'

export type SettingScope = 'system' | 'org' | 'user'
export type SettingType = 'string' | 'number' | 'boolean' | 'select' | 'json' | 'color' | 'email'

export interface SettingDefinition {
  key: string
  label: string
  description: string
  type: SettingType
  scope: SettingScope
  category: string
  defaultValue: any
  validationSchema: z.ZodSchema
  required: boolean
  visible: boolean
  editable: boolean
  options?: Array<{ value: string; label: string }>
  hint?: string
  placeholder?: string
}

/**
 * Centralized Settings Registry
 * All application settings defined here
 */
export const SETTINGS_REGISTRY: Record<string, SettingDefinition> = {
  // Email Settings
  'email.provider': {
    key: 'email.provider',
    label: 'Email Provider',
    description: 'Email service provider for transactional emails',
    type: 'select',
    scope: 'org',
    category: 'Email Configuration',
    defaultValue: 'resend',
    validationSchema: z.enum(['resend', 'sendgrid', 'ses', 'smtp']),
    required: true,
    visible: true,
    editable: true,
    options: [
      { value: 'resend', label: 'Resend' },
      { value: 'sendgrid', label: 'SendGrid' },
      { value: 'ses', label: 'Amazon SES' },
      { value: 'smtp', label: 'Custom SMTP' },
    ],
  },
  'email.from_address': {
    key: 'email.from_address',
    label: 'From Email Address',
    description: 'Default sender email address',
    type: 'email',
    scope: 'org',
    category: 'Email Configuration',
    defaultValue: 'noreply@dentalcrm.com',
    validationSchema: z.string().email(),
    required: true,
    visible: true,
    editable: true,
    placeholder: 'noreply@yourpractice.com',
  },
  'email.verification_ttl_hours': {
    key: 'email.verification_ttl_hours',
    label: 'Verification Link TTL',
    description: 'Time-to-live for email verification links (hours)',
    type: 'number',
    scope: 'org',
    category: 'Email Configuration',
    defaultValue: 24,
    validationSchema: z.number().int().min(1).max(168),
    required: true,
    visible: true,
    editable: true,
    hint: 'Between 1-168 hours (1 week max)',
  },
  'email.resend_cooldown_seconds': {
    key: 'email.resend_cooldown_seconds',
    label: 'Resend Cooldown',
    description: 'Minimum time between resend requests (seconds)',
    type: 'number',
    scope: 'org',
    category: 'Email Configuration',
    defaultValue: 60,
    validationSchema: z.number().int().min(30).max(600),
    required: true,
    visible: true,
    editable: true,
    hint: '30-600 seconds',
  },

  // Localization Settings
  'localization.currency': {
    key: 'localization.currency',
    label: 'Currency',
    description: 'Default currency for financial values',
    type: 'select',
    scope: 'org',
    category: 'Localization',
    defaultValue: 'USD',
    validationSchema: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR']),
    required: true,
    visible: true,
    editable: true,
    options: [
      { value: 'USD', label: 'US Dollar ($)' },
      { value: 'EUR', label: 'Euro (€)' },
      { value: 'GBP', label: 'British Pound (£)' },
      { value: 'CAD', label: 'Canadian Dollar (CA$)' },
      { value: 'AUD', label: 'Australian Dollar (A$)' },
      { value: 'INR', label: 'Indian Rupee (₹)' },
    ],
  },
  'localization.date_format': {
    key: 'localization.date_format',
    label: 'Date Format',
    description: 'Display format for dates',
    type: 'select',
    scope: 'org',
    category: 'Localization',
    defaultValue: 'MM/DD/YYYY',
    validationSchema: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
    required: true,
    visible: true,
    editable: true,
    options: [
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
    ],
  },
  'localization.timezone': {
    key: 'localization.timezone',
    label: 'Timezone',
    description: 'Default timezone for date/time display',
    type: 'string',
    scope: 'org',
    category: 'Localization',
    defaultValue: 'America/New_York',
    validationSchema: z.string(),
    required: true,
    visible: true,
    editable: true,
    placeholder: 'America/New_York',
  },

  // Pipeline Settings
  'pipeline.default_stages': {
    key: 'pipeline.default_stages',
    label: 'Default Pipeline Stages',
    description: 'Default stages for new pipelines',
    type: 'json',
    scope: 'org',
    category: 'Pipelines',
    defaultValue: ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'],
    validationSchema: z.array(z.string()),
    required: true,
    visible: true,
    editable: true,
  },
  'pipeline.allow_custom_stages': {
    key: 'pipeline.allow_custom_stages',
    label: 'Allow Custom Stages',
    description: 'Allow users to create custom pipeline stages',
    type: 'boolean',
    scope: 'org',
    category: 'Pipelines',
    defaultValue: true,
    validationSchema: z.boolean(),
    required: true,
    visible: true,
    editable: true,
  },
  'pipeline.wip_limits_enabled': {
    key: 'pipeline.wip_limits_enabled',
    label: 'Enable WIP Limits',
    description: 'Enable work-in-progress limits per stage',
    type: 'boolean',
    scope: 'org',
    category: 'Pipelines',
    defaultValue: false,
    validationSchema: z.boolean(),
    required: false,
    visible: true,
    editable: true,
    hint: 'Prevents too many deals in one stage',
  },

  // Security Settings
  'security.session_timeout_minutes': {
    key: 'security.session_timeout_minutes',
    label: 'Session Timeout',
    description: 'Automatic session timeout (minutes)',
    type: 'number',
    scope: 'org',
    category: 'Security',
    defaultValue: 480, // 8 hours
    validationSchema: z.number().int().min(15).max(1440),
    required: true,
    visible: true,
    editable: true,
    hint: '15-1440 minutes (up to 24 hours)',
  },
  'security.password_min_length': {
    key: 'security.password_min_length',
    label: 'Minimum Password Length',
    description: 'Minimum characters required for passwords',
    type: 'number',
    scope: 'org',
    category: 'Security',
    defaultValue: 8,
    validationSchema: z.number().int().min(6).max(32),
    required: true,
    visible: true,
    editable: true,
  },
  'security.require_mfa': {
    key: 'security.require_mfa',
    label: 'Require Multi-Factor Authentication',
    description: 'Force all users to enable MFA',
    type: 'boolean',
    scope: 'org',
    category: 'Security',
    defaultValue: false,
    validationSchema: z.boolean(),
    required: false,
    visible: true,
    editable: true,
  },

  // Notification Settings
  'notifications.email_enabled': {
    key: 'notifications.email_enabled',
    label: 'Email Notifications',
    description: 'Enable email notifications',
    type: 'boolean',
    scope: 'user',
    category: 'Notifications',
    defaultValue: true,
    validationSchema: z.boolean(),
    required: false,
    visible: true,
    editable: true,
  },
  'notifications.digest_frequency': {
    key: 'notifications.digest_frequency',
    label: 'Digest Frequency',
    description: 'How often to send notification digests',
    type: 'select',
    scope: 'user',
    category: 'Notifications',
    defaultValue: 'daily',
    validationSchema: z.enum(['realtime', 'hourly', 'daily', 'weekly', 'never']),
    required: true,
    visible: true,
    editable: true,
    options: [
      { value: 'realtime', label: 'Real-time' },
      { value: 'hourly', label: 'Hourly' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'never', label: 'Never' },
    ],
  },

  // Data & Privacy
  'data.retention_days': {
    key: 'data.retention_days',
    label: 'Data Retention Period',
    description: 'Days to retain deleted data before permanent deletion',
    type: 'number',
    scope: 'org',
    category: 'Data & Privacy',
    defaultValue: 30,
    validationSchema: z.number().int().min(0).max(365),
    required: true,
    visible: true,
    editable: true,
    hint: '0 = immediate deletion, max 365 days',
  },
  'data.allow_export': {
    key: 'data.allow_export',
    label: 'Allow Data Export',
    description: 'Allow users to export their data',
    type: 'boolean',
    scope: 'org',
    category: 'Data & Privacy',
    defaultValue: true,
    validationSchema: z.boolean(),
    required: false,
    visible: true,
    editable: true,
  },

  // Appearance
  'appearance.theme': {
    key: 'appearance.theme',
    label: 'Theme',
    description: 'Application color theme',
    type: 'select',
    scope: 'user',
    category: 'Appearance',
    defaultValue: 'light',
    validationSchema: z.enum(['light', 'dark', 'auto']),
    required: true,
    visible: true,
    editable: true,
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'auto', label: 'Auto (system)' },
    ],
  },
  'appearance.primary_color': {
    key: 'appearance.primary_color',
    label: 'Primary Color',
    description: 'Primary brand color',
    type: 'color',
    scope: 'org',
    category: 'Appearance',
    defaultValue: '#667eea',
    validationSchema: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    required: true,
    visible: true,
    editable: true,
  },
}

/**
 * Get setting definition by key
 */
export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return SETTINGS_REGISTRY[key]
}

/**
 * Get all settings in a category
 */
export function getSettingsByCategory(category: string): SettingDefinition[] {
  return Object.values(SETTINGS_REGISTRY).filter(s => s.category === category)
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(Object.values(SETTINGS_REGISTRY).map(s => s.category))
  return Array.from(categories).sort((a, b) => a.localeCompare(b))
}

/**
 * Get all settings for a scope
 */
export function getSettingsByScope(scope: SettingScope): SettingDefinition[] {
  return Object.values(SETTINGS_REGISTRY).filter(s => s.scope === scope)
}


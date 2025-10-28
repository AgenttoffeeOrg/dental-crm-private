/**
 * Color Design Tokens
 * 
 * Professional 5-color palette optimized for enterprise UIs
 * Focuses on clarity, accessibility, and trust
 */

export const colors = {
  // Grayscale (Primary palette for 90% of UI)
  gray: {
    50: '#F9FAFB',   // Page backgrounds
    100: '#F3F4F6',  // Subtle backgrounds
    200: '#E5E7EB',  // Borders, dividers
    300: '#D1D5DB',  // Disabled states
    400: '#9CA3AF',  // Placeholder text
    500: '#6B7280',  // Secondary text
    600: '#4B5563',  // Body text
    700: '#374151',  // Emphasis text
    800: '#1F2937',  // Headings
    900: '#111827',  // Primary text
  },

  // Blue (Actions, links, primary buttons)
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',   // Default
    600: '#2563EB',   // Primary action
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Green (Success, positive states)
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',   // Success
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Amber (Warnings, pending states)
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',   // Warning
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Red (Errors, destructive actions)
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',   // Danger/Error
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // White & Black
  white: '#FFFFFF',
  black: '#000000',
} as const

/**
 * Semantic Color Mappings
 * Maps colors to their semantic meaning in the UI
 */
export const semanticColors = {
  // Text
  text: {
    primary: colors.gray[900],
    secondary: colors.gray[700],
    tertiary: colors.gray[500],
    disabled: colors.gray[400],
    inverse: colors.white,
  },

  // Backgrounds
  background: {
    page: colors.gray[50],
    card: colors.white,
    subtle: colors.gray[100],
    hover: colors.gray[100],
    active: colors.gray[200],
    disabled: colors.gray[50],
  },

  // Borders
  border: {
    default: colors.gray[200],
    hover: colors.gray[300],
    focus: colors.blue[600],
    error: colors.red[600],
  },

  // Status (Buttons, badges, indicators)
  status: {
    primary: colors.blue[600],
    primaryHover: colors.blue[700],
    success: colors.green[600],
    successHover: colors.green[700],
    warning: colors.amber[600],
    warningHover: colors.amber[700],
    danger: colors.red[600],
    dangerHover: colors.red[700],
  },

  // Status Backgrounds (for badges, alerts)
  statusBackground: {
    primary: colors.blue[50],
    success: colors.green[50],
    warning: colors.amber[50],
    danger: colors.red[50],
  },

  // Charts (Color-blind safe palette)
  chart: {
    primary: colors.blue[600],
    secondary: colors.green[600],
    tertiary: colors.amber[500],
    quaternary: colors.gray[600],
  },
} as const

export type ColorToken = keyof typeof colors
export type SemanticColorToken = keyof typeof semanticColors


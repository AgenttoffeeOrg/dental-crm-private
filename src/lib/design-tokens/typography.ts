/**
 * Typography Design Tokens
 * 
 * Professional type scale based on Inter font
 * Follows best practices for readability and hierarchy
 */

export const typography = {
  // Font Family
  fontFamily: {
    sans: 'var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"SF Mono", "Consolas", "Liberation Mono", "Menlo", monospace',
  },

  // Font Sizes
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },

  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

/**
 * Text Variants
 * Ready-to-use combinations for common text elements
 */
export const textVariants = {
  // Body Text
  'body-sm': {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.normal,
  },
  'body': {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.normal,
  },
  'body-lg': {
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.relaxed,
    fontWeight: typography.fontWeight.normal,
  },

  // Headings
  'h1': {
    fontSize: typography.fontSize['4xl'],
    lineHeight: typography.lineHeight.tight,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  'h2': {
    fontSize: typography.fontSize['3xl'],
    lineHeight: typography.lineHeight.tight,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  'h3': {
    fontSize: typography.fontSize['2xl'],
    lineHeight: typography.lineHeight.snug,
    fontWeight: typography.fontWeight.semibold,
  },
  'h4': {
    fontSize: typography.fontSize.xl,
    lineHeight: typography.lineHeight.snug,
    fontWeight: typography.fontWeight.semibold,
  },
  'h5': {
    fontSize: typography.fontSize.lg,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.semibold,
  },
  'h6': {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.semibold,
  },

  // Special
  'caption': {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.normal,
  },
  'overline': {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  'label': {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
    fontWeight: typography.fontWeight.medium,
  },
  'code': {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal,
  },
} as const

export type TextVariant = keyof typeof textVariants


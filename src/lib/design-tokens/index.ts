/**
 * Design Tokens
 * 
 * Centralized design system tokens for the Dental CRM
 * Import from here to ensure consistency across the application
 * 
 * @example
 * ```ts
 * import { colors, typography, spacing } from '@/lib/design-tokens'
 * ```
 */

export * from './colors'
export * from './typography'
export * from './spacing'
export * from './shadows'

// Re-export for convenience
export { colors, semanticColors } from './colors'
export { typography, textVariants } from './typography'
export { spacing, componentSpacing } from './spacing'
export { shadows, radius, componentShadows } from './shadows'


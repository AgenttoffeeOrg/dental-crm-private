/**
 * Shadow Design Tokens
 * 
 * Subtle, natural elevation system
 * Creates depth without visual noise
 */

export const shadows = {
  // No shadow
  none: 'none',

  // Subtle elevation (cards, buttons)
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  
  // Default elevation (floating elements)
  md: '0 4px 6px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  
  // Higher elevation (dropdowns, popovers)
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  
  // Maximum elevation (modals, drawers)
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  
  // Special shadows
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const

/**
 * Border Radius Tokens
 * 
 * Consistent rounding for all UI elements
 * 8px base for premium, modern feel
 */
export const radius = {
  none: '0',
  xs: '0.25rem',   // 4px - small badges
  sm: '0.375rem',  // 6px - inputs, buttons
  md: '0.5rem',    // 8px - cards (default)
  lg: '0.75rem',   // 12px - larger cards, modals
  xl: '1rem',      // 16px - special elements
  '2xl': '1.25rem', // 20px
  '3xl': '1.5rem',  // 24px
  full: '9999px',  // Pills, circular elements
} as const

/**
 * Border Width Tokens
 */
export const borderWidth = {
  0: '0',
  DEFAULT: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
} as const

/**
 * Component-Specific Shadow Mappings
 */
export const componentShadows = {
  card: shadows.sm,
  cardHover: shadows.md,
  button: shadows.xs,
  buttonHover: shadows.sm,
  dropdown: shadows.lg,
  modal: shadows.xl,
  tooltip: shadows.md,
  popover: shadows.lg,
} as const

export type ShadowToken = keyof typeof shadows
export type RadiusToken = keyof typeof radius


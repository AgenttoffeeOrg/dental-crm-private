/**
 * Spacing Design Tokens
 * 
 * 8px base grid system for consistent spatial relationships
 * All spacing should use these values for perfect alignment
 */

export const spacing = {
  // Base 8px grid
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  32: '8rem',       // 128px
  40: '10rem',      // 160px
  48: '12rem',      // 192px
  56: '14rem',      // 224px
  64: '16rem',      // 256px
} as const

/**
 * Component-Specific Spacing
 * Standardized spacing for common components
 */
export const componentSpacing = {
  // Card padding
  card: {
    padding: spacing[6],     // 24px
    paddingSmall: spacing[4], // 16px
    gap: spacing[4],         // 16px
  },

  // Page layout
  page: {
    padding: spacing[8],     // 32px
    paddingMobile: spacing[4], // 16px
    maxWidth: '1280px',
    gap: spacing[6],         // 24px
  },

  // Form fields
  form: {
    fieldGap: spacing[4],    // 16px between fields
    labelGap: spacing[2],    // 8px between label and input
    sectionGap: spacing[8],  // 32px between sections
  },

  // Lists
  list: {
    itemGap: spacing[2],     // 8px between list items
    sectionGap: spacing[6],  // 24px between list sections
  },

  // Buttons
  button: {
    paddingX: spacing[4],    // 16px horizontal
    paddingY: spacing[2.5],  // 10px vertical
    gap: spacing[2],         // 8px between icon and text
  },

  // Navigation
  nav: {
    height: spacing[16],     // 64px
    itemGap: spacing[1],     // 4px between nav items
    padding: spacing[4],     // 16px padding
  },

  // Sidebar
  sidebar: {
    width: spacing[64],      // 256px
    padding: spacing[4],     // 16px padding
    itemGap: spacing[1],     // 4px between items
  },
} as const

export type SpacingToken = keyof typeof spacing


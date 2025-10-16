/**
 * Design Tokens - Single Source of Truth
 * Enterprise-grade visual language based on:
 * - Linear (spacing, typography)
 * - Stripe (shadows, colors)
 * - Apple HIG (accessibility)
 * - Material Design 3 (color system)
 */

// ============================================
// TYPOGRAPHY SYSTEM
// ============================================

export const typography = {
  fontFamily: {
    sans: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'var(--font-geist-mono), "SF Mono", Menlo, Consolas, monospace',
  },

  fontSize: {
    // Display (Hero sections, marketing)
    'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
    'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
    'display-lg': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
    
    // Headings (Page titles, section headers)
    'heading-1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }], // 36px
    'heading-2': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }], // 30px
    'heading-3': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.005em', fontWeight: '600' }], // 24px
    'heading-4': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0em', fontWeight: '600' }], // 20px
    'heading-5': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0em', fontWeight: '600' }], // 18px
    'heading-6': ['1rem', { lineHeight: '1.5', letterSpacing: '0em', fontWeight: '600' }], // 16px
    
    // Body (Content, descriptions)
    'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }], // 18px
    'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }], // 16px - Default
    'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }], // 14px
    'body-xs': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }], // 13px
    
    // UI (Labels, buttons, navigation)
    'ui-lg': ['0.9375rem', { lineHeight: '1.4', fontWeight: '500' }], // 15px
    'ui': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }], // 14px - Default UI
    'ui-sm': ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }], // 13px
    'ui-xs': ['0.75rem', { lineHeight: '1.3', fontWeight: '500' }], // 12px
    
    // Special
    'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '400', color: 'var(--muted-foreground)' }],
    'overline': ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: '600', textTransform: 'uppercase' }],
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
}

// ============================================
// SPACING SYSTEM (4px rhythm)
// ============================================

export const spacing = {
  // Base scale
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
}

// Semantic spacing (use these for consistency)
export const semanticSpacing = {
  // Sections
  sectionGap: 'space-y-8',      // 32px between major sections
  subsectionGap: 'space-y-6',   // 24px between subsections
  groupGap: 'space-y-4',        // 16px within groups
  fieldGap: 'space-y-2',        // 8px label→input
  itemGap: 'space-y-3',         // 12px list items
  
  // Inline
  inlineGap: 'gap-2',           // 8px inline elements
  inlineTight: 'gap-1',         // 4px tight spacing
  inlineLoose: 'gap-3',         // 12px loose spacing
  
  // Padding
  cardPadding: 'p-6',           // 24px cards
  drawerPadding: 'p-8',         // 32px drawers
  modalPadding: 'p-10',         // 40px modals
  sectionPadding: 'px-6 py-8',  // Sections
  
  // Container
  containerPadding: 'px-4 sm:px-6 lg:px-8', // Responsive
  pageMargin: 'max-w-7xl mx-auto',
}

// ============================================
// BORDER RADIUS SYSTEM
// ============================================

export const borderRadius = {
  none: '0',
  xs: '0.25rem',     // 4px - tight elements
  sm: '0.375rem',    // 6px - inputs, small buttons
  DEFAULT: '0.5rem', // 8px - buttons, cards (default)
  md: '0.625rem',    // 10px - larger buttons
  lg: '0.75rem',     // 12px - drawers, modals
  xl: '1rem',        // 16px - hero cards
  '2xl': '1.25rem',  // 20px - feature sections
  '3xl': '1.5rem',   // 24px - splash areas
  full: '9999px',    // pills, avatars
  
  // Semantic
  input: '0.375rem',    // 6px
  button: '0.5rem',     // 8px
  card: '0.5rem',       // 8px
  drawer: '0.75rem',    // 12px
  modal: '0.75rem',     // 12px
  dropdown: '0.5rem',   // 8px
  badge: '0.375rem',    // 6px
  avatar: '9999px',     // full
}

// ============================================
// SHADOW SYSTEM (Soft, natural elevation)
// ============================================

export const boxShadow = {
  // Base shadows (soft, low opacity)
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 6px 12px -2px rgb(0 0 0 / 0.12), 0 3px 6px -3px rgb(0 0 0 / 0.08)',
  lg: '0 10px 20px -3px rgb(0 0 0 / 0.1), 0 4px 8px -4px rgb(0 0 0 / 0.05)',
  xl: '0 20px 40px -6px rgb(0 0 0 / 0.12), 0 10px 16px -5px rgb(0 0 0 / 0.08)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.15)',
  none: '0 0 #0000',
  
  // Semantic shadows
  card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // sm
  cardHover: '0 4px 8px -1px rgb(0 0 0 / 0.12), 0 2px 4px -1px rgb(0 0 0 / 0.08)', // between sm-md
  drawer: '0 10px 20px -3px rgb(0 0 0 / 0.1), 0 4px 8px -4px rgb(0 0 0 / 0.05)', // lg
  modal: '0 20px 40px -6px rgb(0 0 0 / 0.12), 0 10px 16px -5px rgb(0 0 0 / 0.08)', // xl
  dropdown: '0 6px 12px -2px rgb(0 0 0 / 0.12), 0 3px 6px -3px rgb(0 0 0 / 0.08)', // md
  button: '0 1px 2px 0 rgb(0 0 0 / 0.05)', // xs
  input: 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)', // inner shadow
}

// ============================================
// ANIMATION/MOTION SYSTEM
// ============================================

export const animation = {
  duration: {
    instant: '50ms',
    fast: '100ms',
    normal: '150ms',
    slow: '200ms',
    slower: '300ms',
    slowest: '500ms',
  },

  easing: {
    default: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Material ease-out
    in: 'cubic-bezier(0.4, 0.0, 1, 1)',
    out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Elastic
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',    // Snappy
  },

  // Pre-built transitions
  transition: {
    drawer: 'transition-transform duration-300 ease-out',
    modal: 'transition-opacity duration-200 ease-out',
    fade: 'transition-opacity duration-150 ease-out',
    button: 'transition-colors duration-100 ease-out',
    dropdown: 'transition-all duration-150 ease-out',
    card: 'transition-shadow duration-200 ease-out',
    focus: 'transition-all duration-100 ease-out',
  },
}

// ============================================
// SEMANTIC COLORS (Status, Priority, etc.)
// ============================================

export const semanticColors = {
  // Status indicators
  status: {
    success: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600',
      subtle: 'bg-green-100/50 text-green-700',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600',
      subtle: 'bg-yellow-100/50 text-yellow-700',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600',
      subtle: 'bg-red-100/50 text-red-700',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600',
      subtle: 'bg-blue-100/50 text-blue-700',
    },
  },

  // Priority levels
  priority: {
    urgent: {
      bg: 'bg-red-100 dark:bg-red-950/40',
      text: 'text-red-900 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
      icon: 'text-red-600',
      indicator: 'bg-red-500',
    },
    high: {
      bg: 'bg-orange-100 dark:bg-orange-950/40',
      text: 'text-orange-900 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-700',
      icon: 'text-orange-600',
      indicator: 'bg-orange-500',
    },
    normal: {
      bg: 'bg-blue-100 dark:bg-blue-950/40',
      text: 'text-blue-900 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-700',
      icon: 'text-blue-600',
      indicator: 'bg-blue-500',
    },
    low: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
      icon: 'text-gray-500',
      indicator: 'bg-gray-400',
    },
  },

  // Activity types
  activity: {
    call: { color: '#10B981', bg: 'bg-green-100', text: 'text-green-700' },
    email: { color: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-700' },
    meeting: { color: '#F97316', bg: 'bg-orange-100', text: 'text-orange-700' },
    task: { color: '#6366F1', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    deal: { color: '#8B5CF6', bg: 'bg-purple-100', text: 'text-purple-700' },
    note: { color: '#6B7280', bg: 'bg-gray-100', text: 'text-gray-700' },
  },
}

// ============================================
// COMPONENT SIZES (Consistent Across UI)
// ============================================

export const componentSizes = {
  button: {
    xs: { height: '1.75rem', padding: '0 0.75rem', fontSize: '0.75rem' }, // 28px
    sm: { height: '2rem', padding: '0 0.875rem', fontSize: '0.8125rem' }, // 32px
    md: { height: '2.25rem', padding: '0 1rem', fontSize: '0.875rem' }, // 36px (default)
    lg: { height: '2.5rem', padding: '0 1.25rem', fontSize: '0.9375rem' }, // 40px
    xl: { height: '3rem', padding: '0 1.5rem', fontSize: '1rem' }, // 48px
  },

  input: {
    sm: { height: '2rem', padding: '0 0.75rem', fontSize: '0.8125rem' },
    md: { height: '2.25rem', padding: '0 0.875rem', fontSize: '0.875rem' }, // default
    lg: { height: '2.5rem', padding: '0 1rem', fontSize: '0.9375rem' },
  },

  iconButton: {
    sm: { size: '2rem' },      // 32px
    md: { size: '2.25rem' },   // 36px
    lg: { size: '2.5rem' },    // 40px
  },

  avatar: {
    xs: '1.5rem',  // 24px
    sm: '2rem',    // 32px
    md: '2.25rem', // 36px
    lg: '3rem',    // 48px
    xl: '4rem',    // 64px
  },

  badge: {
    sm: { height: '1.25rem', padding: '0 0.5rem', fontSize: '0.6875rem' },
    md: { height: '1.5rem', padding: '0 0.625rem', fontSize: '0.75rem' },
    lg: { height: '1.75rem', padding: '0 0.75rem', fontSize: '0.8125rem' },
  },
}

// ============================================
// FOCUS & INTERACTION STATES
// ============================================

export const interactionStates = {
  focus: {
    ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
    ringDark: 'dark:focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-900',
    visible: 'focus-visible:ring-2 focus-visible:ring-offset-1',
  },

  hover: {
    subtle: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    accent: 'hover:bg-blue-50 dark:hover:bg-blue-950/50',
    lift: 'hover:shadow-md hover:-translate-y-0.5',
    brightness: 'hover:brightness-110',
  },

  active: {
    scale: 'active:scale-95',
    brightness: 'active:brightness-90',
  },

  disabled: {
    opacity: 'disabled:opacity-50',
    cursor: 'disabled:cursor-not-allowed',
    pointerEvents: 'disabled:pointer-events-none',
  },
}

// ============================================
// COMPONENT PATTERNS (Common Combinations)
// ============================================

export const patterns = {
  // Card
  card: 'bg-card text-card-foreground rounded-lg border shadow-sm p-6',
  cardInteractive: 'bg-card text-card-foreground rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer',
  
  // Input field group
  fieldGroup: 'space-y-2',
  fieldLabel: 'text-sm font-medium text-gray-700 dark:text-gray-300',
  fieldHint: 'text-xs text-gray-500 dark:text-gray-400 mt-1',
  
  // Section
  section: 'space-y-6',
  sectionHeader: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4',
  sectionDivider: 'border-t border-gray-200 dark:border-gray-800 my-8',
  
  // List item
  listItem: 'flex items-center justify-between py-3 border-b last:border-b-0',
  listItemInteractive: 'flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer',
  
  // Badge/chip
  badge: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium',
  
  // Empty state
  emptyState: 'text-center py-12',
  emptyStateIcon: 'h-12 w-12 mx-auto mb-3 text-gray-400',
  emptyStateTitle: 'text-lg font-semibold text-gray-900 mb-1',
  emptyStateDescription: 'text-sm text-gray-600 mb-4',
}

// ============================================
// CHART/DATA VIZ TOKENS
// ============================================

export const chartTokens = {
  // Color palettes (color-blind safe)
  colors: {
    primary: ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
    secondary: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'],
    success: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'],
    warning: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'],
    danger: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'],
    categorical: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'],
  },

  // Axis styling
  axis: {
    stroke: 'oklch(0.85 0 0)',
    strokeWidth: 1,
    fontSize: 12,
    fontWeight: 400,
    color: 'oklch(0.556 0 0)',
  },

  // Grid styling
  grid: {
    stroke: 'oklch(0.95 0 0)',
    strokeWidth: 0.5,
    strokeDasharray: '2 4',
  },

  // Tooltip styling
  tooltip: {
    bg: 'oklch(0.145 0 0)',
    text: 'oklch(1 0 0)',
    border: 'none',
    shadow: '0 6px 12px -2px rgb(0 0 0 / 0.15)',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
  },
}

// ============================================
// ACCESSIBILITY TARGETS
// ============================================

export const a11y = {
  contrast: {
    bodyText: 4.5,     // WCAG AA
    uiControls: 3,     // WCAG AA
    largeText: 3,      // WCAG AA
    aaa: 7,            // WCAG AAA (aim for this)
  },

  targets: {
    minTapSize: '44px',  // iOS HIG minimum
    minClickSize: '24px', // Desktop minimum
  },

  motion: {
    respectPrefersReducedMotion: true,
    maxDuration: '500ms',
  },
}

// ============================================
// BREAKPOINTS (Already good, documenting)
// ============================================

export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
}

// ============================================
// USAGE EXAMPLES
// ============================================

export const examples = {
  // Premium card with hover
  premiumCard: `
    <Card className="rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Title</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        ...content...
      </CardContent>
    </Card>
  `,

  // Refined button
  refinedButton: `
    <Button className="h-9 px-4 rounded-lg shadow-xs hover:shadow-sm transition-all duration-100">
      Save
    </Button>
  `,

  // Perfect input
  perfectInput: `
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Email address
      </label>
      <Input 
        type="email" 
        className="rounded-md focus:ring-2 focus:ring-offset-1"
        placeholder="you@example.com"
      />
      <p className="text-xs text-gray-500">
        We'll never share your email
      </p>
    </div>
  `,
}

// Export all tokens
export const designTokens = {
  typography,
  spacing,
  semanticSpacing,
  borderRadius,
  boxShadow,
  animation,
  semanticColors,
  componentSizes,
  interactionStates,
  patterns,
  chartTokens,
  a11y,
  breakpoints,
}

export default designTokens


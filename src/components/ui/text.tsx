import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Text Component
 * 
 * Professional text component with semantic variants
 * Uses Inter font with optimized rendering
 * 
 * @example
 * ```tsx
 * <Text variant="body">Regular body text</Text>
 * <Text variant="body-sm" color="secondary">Small secondary text</Text>
 * <Text variant="caption" color="tertiary">Caption text</Text>
 * ```
 */

const textVariants = cva(
  'font-sans', // Uses Inter font
  {
    variants: {
      variant: {
        // Body variants
        'body-sm': 'text-sm leading-normal font-normal',
        'body': 'text-base leading-normal font-normal',
        'body-lg': 'text-lg leading-relaxed font-normal',
        
        // Label
        'label': 'text-sm leading-normal font-medium',
        
        // Caption
        'caption': 'text-xs leading-normal font-normal',
        
        // Overline (uppercase, spaced)
        'overline': 'text-xs leading-normal font-medium uppercase tracking-wider',
        
        // Code
        'code': 'font-mono text-sm leading-normal',
      },
      color: {
        primary: 'text-gray-900',
        secondary: 'text-gray-700',
        tertiary: 'text-gray-500',
        disabled: 'text-gray-400',
        inverse: 'text-white',
        error: 'text-red-600',
        success: 'text-green-600',
        warning: 'text-amber-600',
      },
      weight: {
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
      },
      truncate: {
        true: 'truncate',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'body',
      color: 'primary',
      weight: 'normal',
      align: 'left',
      truncate: false,
    },
  }
)

export interface TextProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof textVariants> {
  as?: 'span' | 'p' | 'div' | 'label'
  children: React.ReactNode
}

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ 
    className, 
    variant, 
    color, 
    weight, 
    align, 
    truncate,
    as: Component = 'span',
    children,
    ...props 
  }, ref) => {
    return React.createElement(
      Component,
      {
        className: cn(textVariants({ variant, color, weight, align, truncate }), className),
        ref,
        ...props,
      },
      children
    )
  }
)

Text.displayName = 'Text'

export default Text


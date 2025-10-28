import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Heading Component
 * 
 * Professional heading component with semantic levels
 * Uses Inter font with optimized rendering
 * 
 * @example
 * ```tsx
 * <Heading level="1">Page Title</Heading>
 * <Heading level="2" color="secondary">Section Heading</Heading>
 * <Heading level="3" weight="semibold">Subsection</Heading>
 * ```
 */

const headingVariants = cva(
  'font-sans tracking-tight', // Uses Inter font with tight tracking
  {
    variants: {
      level: {
        '1': 'text-4xl font-bold leading-tight',
        '2': 'text-3xl font-bold leading-tight',
        '3': 'text-2xl font-semibold leading-snug',
        '4': 'text-xl font-semibold leading-snug',
        '5': 'text-lg font-semibold leading-normal',
        '6': 'text-base font-semibold leading-normal',
      },
      color: {
        primary: 'text-gray-900',
        secondary: 'text-gray-700',
        tertiary: 'text-gray-500',
        inverse: 'text-white',
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
      },
      truncate: {
        true: 'truncate',
        false: '',
      },
    },
    defaultVariants: {
      level: '1',
      color: 'primary',
      align: 'left',
      truncate: false,
    },
  }
)

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  level: '1' | '2' | '3' | '4' | '5' | '6'
  children: React.ReactNode
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ 
    className, 
    level,
    color, 
    weight, 
    align, 
    truncate,
    children,
    ...props 
  }, ref) => {
    const Component = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    
    return React.createElement(
      Component,
      {
        className: cn(headingVariants({ level, color, weight, align, truncate }), className),
        ref,
        ...props,
      },
      children
    )
  }
)

Heading.displayName = 'Heading'

export default Heading


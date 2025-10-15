/**
 * Polished Card Interactions
 * 
 * Phase 4: Perfect card hover states and click feedback.
 * UX Focus: Responsive, tactile feel.
 */

'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-lg border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 
          'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        elevated:
          'bg-white border-gray-200 shadow-sm hover:shadow-md dark:bg-gray-800 dark:border-gray-700',
        interactive:
          'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md active:scale-[0.99] cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:hover:border-purple-700',
        highlighted:
          'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hoverable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant: hoverable ? 'interactive' : variant, padding }),
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('pb-4 border-b border-gray-200 dark:border-gray-700', className)}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('py-4', className)}
        {...props}
      />
    );
  }
);

CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('pt-4 border-t border-gray-200 dark:border-gray-700', className)}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';


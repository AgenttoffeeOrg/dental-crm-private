import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-sm active:scale-[0.98]",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 hover:shadow-sm focus-visible:ring-destructive/30 active:scale-[0.98]",
        outline:
          "border border-gray-200 bg-white shadow-xs hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750 active:scale-[0.98]",
        secondary:
          "bg-gray-100 text-gray-900 shadow-xs hover:bg-gray-200 hover:shadow-sm active:scale-[0.98]",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md gap-1",
        sm: "h-8 px-3 text-xs rounded-md gap-1.5",
        default: "h-9 px-4 text-sm",
        lg: "h-10 px-6 text-sm",
        xl: "h-11 px-8 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }

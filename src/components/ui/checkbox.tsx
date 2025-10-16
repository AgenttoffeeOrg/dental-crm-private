"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded border-2 border-gray-300 shadow-xs transition-all duration-150 outline-none",
        "hover:border-gray-400",
        "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-200",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-red-400",
        "dark:border-gray-600 dark:hover:border-gray-500",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon className="size-4" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }

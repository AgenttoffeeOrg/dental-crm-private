import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-xs transition-all duration-150 outline-none",
        "placeholder:text-gray-400 selection:bg-primary/10 selection:text-primary",
        "focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        "aria-invalid:border-red-400 aria-invalid:ring-2 aria-invalid:ring-red-100",
        "dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500",
        "dark:focus:border-blue-500 dark:focus:ring-blue-900/50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }

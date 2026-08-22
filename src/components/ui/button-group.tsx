import * as React from "react"
import { cn } from "@/lib/utils"

function ButtonGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group"
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-background p-0.5 shadow-xs [&>button]:rounded-md [&>button]:border-0 [&>button]:shadow-none",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="button-group-text"
      className={cn(
        "inline-flex items-center text-xs font-semibold tabular-nums text-foreground select-none",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupText }

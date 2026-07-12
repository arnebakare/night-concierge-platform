import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-md border bg-input px-3 text-base text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

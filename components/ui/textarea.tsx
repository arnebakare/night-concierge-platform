import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-md border bg-input px-3 py-3 text-base text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

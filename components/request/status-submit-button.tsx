"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function StatusSubmitButton({
  label,
  pendingLabel = "Updating",
  name = "status",
  value,
  variant = "default",
  size = "default",
  className
}: Readonly<{
  label: string;
  pendingLabel?: string;
  value?: string;
  name?: string;
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}>) {
  const { pending } = useFormStatus();

  return (
    <Button
      className={className}
      type="submit"
      {...(value ? { name, value } : {})}
      variant={variant}
      size={size}
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

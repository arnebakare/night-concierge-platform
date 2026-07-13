import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActionTile({
  href,
  label,
  icon: Icon,
  className
}: Readonly<{ href: string; label: string; icon: LucideIcon; className?: string }>) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-24 flex-col justify-between rounded-lg border border-champagne-700/35 bg-ink-700/90 p-4 text-left shadow-panel ring-1 ring-white/[0.025] transition hover:-translate-y-0.5 hover:border-champagne-300/70 hover:bg-ink-600 active:scale-[0.98]",
        className
      )}
    >
      <Icon className="size-6 text-champagne-300 transition group-hover:scale-105" />
      <span className="text-base font-semibold text-foreground">{label}</span>
    </Link>
  );
}

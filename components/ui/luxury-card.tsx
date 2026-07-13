import { cn } from "@/lib/utils";

export function LuxuryCard({
  className,
  children
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-champagne-700/35 bg-card/90 p-4 shadow-panel ring-1 ring-white/[0.025] backdrop-blur transition-colors",
        className
      )}
    >
      {children}
    </section>
  );
}

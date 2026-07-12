import { cn } from "@/lib/utils";

export function LuxuryCard({
  className,
  children
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-champagne-700/40 bg-card/90 p-4 shadow-panel backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  );
}

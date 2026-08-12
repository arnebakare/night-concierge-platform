import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ExperienceModeProvider, ExperienceModeToggle } from "@/components/layout/experience-mode";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  title,
  eyebrow,
  children
}: Readonly<{ profile: Profile; title: string; eyebrow?: string; children: React.ReactNode }>) {
  const isCms = profile.role === "SUPER_ADMIN" || profile.role === "PROMOTER_MANAGER";

  return (
    <ExperienceModeProvider>
      <div className={cn("relative flex min-h-screen bg-background", isCms && "cms-shell")}>
        <DesktopSidebar role={profile.role} />
        <main className="safe-bottom mx-auto w-full max-w-6xl px-3 py-4 md:px-8 md:py-7">
          <header className="app-header mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="app-eyebrow text-xs uppercase tracking-[0.22em] text-champagne-300">{eyebrow ?? "Concierge"}</p>
              <h1 className="app-title mt-1.5 font-serif text-3xl leading-tight text-foreground md:text-4xl">{title}</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              {profile.role !== "CLIENT" && <ExperienceModeToggle />}
              <div className="operator-chip hidden rounded-md border border-champagne-700/40 px-3 py-2 text-right text-sm md:block">
                <p className="font-medium">{profile.name ?? "Operator"}</p>
                <p className="text-xs text-muted-foreground">{profile.role.replaceAll("_", " ")}</p>
              </div>
            </div>
          </header>
          {children}
        </main>
        <MobileBottomNav role={profile.role} />
      </div>
    </ExperienceModeProvider>
  );
}

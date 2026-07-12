import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ExperienceModeProvider, ExperienceModeToggle } from "@/components/layout/experience-mode";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  title,
  eyebrow,
  children
}: Readonly<{ profile: Profile; title: string; eyebrow?: string; children: React.ReactNode }>) {
  return (
    <ExperienceModeProvider>
      <div className="relative flex min-h-screen">
        <DesktopSidebar role={profile.role} />
        <main className="safe-bottom mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">
          <header className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-champagne-300">{eyebrow ?? "Concierge"}</p>
              <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground md:text-5xl">{title}</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              {profile.role !== "CLIENT" && <ExperienceModeToggle />}
              <div className="hidden rounded-md border border-champagne-700/40 px-3 py-2 text-right text-sm md:block">
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

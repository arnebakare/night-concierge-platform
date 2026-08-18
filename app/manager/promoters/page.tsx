import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { ClientSearchForm } from "@/components/client/client-search-form";
import { requireProfile } from "@/lib/auth";
import { getTeamPromoters } from "@/lib/data/app";

export default async function ManagerPromotersPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string }> }>) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const promoters = await getTeamPromoters(profile.id, { q: filters.q });

  return (
    <AppShell profile={profile} title="Promoters" eyebrow="Team">
      <div className="mb-4"><ClientSearchForm action="/manager/promoters" value={filters.q} placeholder="Search team by name, email or phone" /></div>
      <div className="compact-list grid gap-2">
        {promoters.map((promoter) => (
          <Link key={promoter.id} href={`/manager/promoters/${promoter.id}`}>
            <LuxuryCard className="client-row bg-white text-ink-950 transition hover:border-champagne-600/70">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-950 md:text-base">{promoter.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{promoter.request_count} requests</p>
                </div>
                <span className={promoter.active ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
                  {promoter.active ? "Active" : "Suspended"}
                </span>
              </div>
            </LuxuryCard>
          </Link>
        ))}
        {!promoters.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No promoters match this search.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

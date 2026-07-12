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
      <div className="grid gap-3 md:grid-cols-3">
        {promoters.map((promoter) => (
          <Link key={promoter.id} href={`/manager/promoters/${promoter.id}`}>
            <LuxuryCard className="transition hover:border-champagne-300/60">
              <p className="text-lg font-semibold">{promoter.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">{promoter.request_count} requests · {promoter.active ? "Active" : "Suspended"}</p>
            </LuxuryCard>
          </Link>
        ))}
        {!promoters.length && <LuxuryCard className="text-center text-sm text-muted-foreground md:col-span-3">No promoters match this search.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

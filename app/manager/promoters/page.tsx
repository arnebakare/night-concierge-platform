import Link from "next/link";
import { ClipboardList, UserRound } from "lucide-react";
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
      <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-center text-slate-950">
        <Metric label="Team" value={String(promoters.length)} />
        <Metric label="Active" value={String(promoters.filter((item) => item.active).length)} />
        <Metric label="Requests" value={String(promoters.reduce((sum, item) => sum + item.request_count, 0))} />
      </div>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {promoters.map((promoter) => (
          <Link key={promoter.id} href={`/manager/promoters/${promoter.id}`} className="block px-3 py-2.5 text-slate-950 transition hover:bg-slate-50">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                    <UserRound className="size-4" />
                  </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-950 md:text-base">{promoter.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {promoter.email}{promoter.phone ? ` · ${promoter.phone}` : ""}
                  </p>
                </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"><ClipboardList className="size-3.5" />{promoter.request_count} requests</span>
                  <span className={promoter.active ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
                    {promoter.active ? "Active" : "Suspended"}
                  </span>
                </div>
              </div>
          </Link>
        ))}
        {!promoters.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No promoters match this search.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-r border-slate-200 p-2.5 last:border-r-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}

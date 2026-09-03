import Link from "next/link";
import { ClipboardList, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { ClientSearchForm } from "@/components/client/client-search-form";
import { setPromoterServiceEligibility } from "@/lib/actions/management-actions";
import { requireProfile } from "@/lib/auth";
import { getPromoterServiceEligibilityForProfile, getTeamPromoters } from "@/lib/data/app";
import type { RequestType } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const serviceTypes: RequestType[] = ["TABLE", "GUESTLIST", "VIP_SERVICE", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE", "GENERAL"];

export default async function ManagerPromotersPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string }> }>) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const [promoters, eligibility] = await Promise.all([
    getTeamPromoters(profile.id, { q: filters.q }),
    getPromoterServiceEligibilityForProfile(profile)
  ]);
  const eligibilityByPromoter = new Map(eligibility.map((item) => [`${item.promoter_id}:${item.request_type}`, item.eligible]));

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
          <div key={promoter.id} className="px-3 py-2.5 text-slate-950 transition hover:bg-slate-50">
            <Link href={`/manager/promoters/${promoter.id}`} className="block">
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
            <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Service eligibility
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {serviceTypes.map((type) => {
                  const eligible = eligibilityByPromoter.get(`${promoter.id}:${type}`) ?? true;
                  return (
                    <form key={type} action={setPromoterServiceEligibility}>
                      <input type="hidden" name="promoterId" value={promoter.id} />
                      <input type="hidden" name="requestType" value={type} />
                      <input type="hidden" name="eligible" value={String(!eligible)} />
                      <button
                        type="submit"
                        className={eligible ? "min-h-9 w-full rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700" : "min-h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-400 line-through"}
                      >
                        {formatEnum(type)}
                      </button>
                    </form>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">Green means eligible. Tap a service to opt this promoter out or back in.</p>
            </details>
          </div>
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

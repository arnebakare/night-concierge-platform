import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { getPromoterPerformance } from "@/lib/data/app";
import { setTeamPromoterActive } from "@/lib/actions/management-actions";
import { redirect } from "next/navigation";
import { isDemoAuthEnabled } from "@/lib/env";

export default async function PromoterProfilePage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const { id } = await params;
  const { promoter, requests } = await getPromoterPerformance(id);
  if (!isDemoAuthEnabled() && profile.role === "PROMOTER_MANAGER" && promoter.manager_id !== profile.id) redirect("/manager/promoters");
  const confirmed = requests.filter((request) => ["CONFIRMED", "ARRIVED"].includes(request.status)).length;
  const arrived = requests.filter((request) => request.status === "ARRIVED").length;
  const guests = requests.reduce((total, request) => total + request.guest_count, 0);

  return (
    <AppShell profile={profile} title={promoter.name ?? "Promoter"} eyebrow="Performance">
      <div className="grid gap-4 md:grid-cols-3">
        <LuxuryCard><p className="text-sm text-muted-foreground">Requests</p><p className="mt-2 font-serif text-4xl">{requests.length}</p></LuxuryCard>
        <LuxuryCard><p className="text-sm text-muted-foreground">Confirmed</p><p className="mt-2 font-serif text-4xl">{confirmed}</p></LuxuryCard>
        <LuxuryCard><p className="text-sm text-muted-foreground">Guests</p><p className="mt-2 font-serif text-4xl">{guests}</p></LuxuryCard>
      </div>
      <LuxuryCard className="mt-4">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">Access</p><p className="text-sm text-muted-foreground">{promoter.email} · {arrived} arrivals</p></div><span className={promoter.active ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-muted-foreground"}>{promoter.active ? "ACTIVE" : "SUSPENDED"}</span></div>
        <form action={setTeamPromoterActive} className="mt-4"><input type="hidden" name="promoterId" value={promoter.id} /><input type="hidden" name="active" value={String(!promoter.active)} /><Button type="submit" variant={promoter.active ? "outline" : "secondary"} className="w-full">{promoter.active ? "Suspend promoter access" : "Restore promoter access"}</Button></form>
      </LuxuryCard>
    </AppShell>
  );
}

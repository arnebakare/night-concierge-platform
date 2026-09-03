import { AppShell } from "@/components/layout/app-shell";
import { ServiceRoutingPanel } from "@/components/management/service-routing-panel";
import { requireProfile } from "@/lib/auth";
import { getServiceRoutingRulesForProfile, getServiceRoutingStatsForProfile, getTeamPromoters } from "@/lib/data/app";

export default async function ManagerRoutingPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [rules, promoters, stats] = await Promise.all([
    getServiceRoutingRulesForProfile(profile),
    getTeamPromoters(profile.id),
    getServiceRoutingStatsForProfile(profile)
  ]);

  return (
    <AppShell profile={profile} title="Routing" eyebrow="Service handling">
      <div className="mb-4 max-w-3xl">
        <p className="text-sm text-slate-500">Keep this simple: choose the person who should normally handle each request type. Managers can still reassign any booking from the request detail page.</p>
      </div>
      <ServiceRoutingPanel rules={rules} promoters={promoters} managers={[profile]} stats={stats} />
    </AppShell>
  );
}

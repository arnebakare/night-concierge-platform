import { AppShell } from "@/components/layout/app-shell";
import { ServiceRoutingPanel } from "@/components/management/service-routing-panel";
import { requireProfile } from "@/lib/auth";
import { getServiceRoutingRulesForProfile, getServiceRoutingStatsForProfile, getUsersForAdmin } from "@/lib/data/app";

export default async function AdminRoutingPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const [rules, users, stats] = await Promise.all([
    getServiceRoutingRulesForProfile(profile),
    getUsersForAdmin(),
    getServiceRoutingStatsForProfile(profile)
  ]);
  const promoters = users.filter((user) => user.role === "PROMOTER" && user.active);
  const managers = users.filter((user) => user.role === "PROMOTER_MANAGER" && user.active);

  return (
    <AppShell profile={profile} title="Routing" eyebrow="Concierge operations">
      <div className="mb-4 max-w-3xl">
        <p className="text-sm text-slate-500">Set global default routing for every service category. Keep a default promoter blank when the manager should decide manually.</p>
      </div>
      <ServiceRoutingPanel rules={rules} promoters={promoters} managers={managers} stats={stats} />
    </AppShell>
  );
}

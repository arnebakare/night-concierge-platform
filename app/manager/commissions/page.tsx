import { AppShell } from "@/components/layout/app-shell";
import { CommissionRulesManager } from "@/components/reports/commission-rules-manager";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getCommissionRulesForProfile, getTeamPromoters } from "@/lib/data/app";

export default async function ManagerCommissionsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [rules, clubs, promoters] = await Promise.all([
    getCommissionRulesForProfile(profile),
    getActiveClubsForApp(),
    profile.role === "PROMOTER_MANAGER" ? getTeamPromoters(profile.id) : []
  ]);

  return (
    <AppShell profile={profile} title="Commission rules" eyebrow="Team reporting">
      <CommissionRulesManager rules={rules} clubs={clubs} promoters={promoters} />
    </AppShell>
  );
}

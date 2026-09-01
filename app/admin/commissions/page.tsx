import { AppShell } from "@/components/layout/app-shell";
import { CommissionRulesManager } from "@/components/reports/commission-rules-manager";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getCommissionRulesForProfile, getUsersForAdmin } from "@/lib/data/app";

export default async function AdminCommissionsPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const [rules, clubs, promoters] = await Promise.all([
    getCommissionRulesForProfile(profile),
    getActiveClubsForApp(),
    getUsersForAdmin({ role: "PROMOTER", active: "active" })
  ]);

  return (
    <AppShell profile={profile} title="Commission rules" eyebrow="Admin">
      <CommissionRulesManager rules={rules} clubs={clubs} promoters={promoters} />
    </AppShell>
  );
}

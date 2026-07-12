import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { ManualRequestForm } from "@/components/request/manual-request-form";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getClientsForProfile } from "@/lib/data/app";

export default async function NewRequestPage() {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [clubs, clients] = await Promise.all([getActiveClubsForApp(), getClientsForProfile(profile)]);

  return (
    <AppShell profile={profile} title="New request" eyebrow="30-second flow">
      <LuxuryCard>
        <ManualRequestForm clubs={clubs} clients={clients} />
      </LuxuryCard>
    </AppShell>
  );
}

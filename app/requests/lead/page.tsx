import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LeadAssistant } from "@/components/request/lead-assistant";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getClientsForProfile, getMessageTemplates } from "@/lib/data/app";

export default async function LeadAssistantPage() {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [clubs, clients, templates] = await Promise.all([getActiveClubsForApp(), getClientsForProfile(profile), getMessageTemplates()]);
  const homeHref = profile.role === "PROMOTER_MANAGER" ? "/manager" : "/dashboard";

  return (
    <AppShell profile={profile} title="Lead assistant" eyebrow="WhatsApp to booking">
      <div className="mb-4">
        <Button asChild variant="secondary" size="sm">
          <Link href={homeHref}>
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
      </div>
      <LeadAssistant clubs={clubs} clients={clients} templates={templates} />
    </AppShell>
  );
}

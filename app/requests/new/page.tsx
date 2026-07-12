import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { ManualRequestForm } from "@/components/request/manual-request-form";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getClientsForProfile } from "@/lib/data/app";

export default async function NewRequestPage() {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [clubs, clients] = await Promise.all([getActiveClubsForApp(), getClientsForProfile(profile)]);

  return (
    <AppShell profile={profile} title="New request" eyebrow="30-second flow">
      <div className="space-y-4">
        <LuxuryCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">Fastest option</p>
            <h2 className="mt-1 text-xl font-semibold">Got the request on WhatsApp?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Paste the message and let the app prepare the booking.</p>
          </div>
          <Button asChild size="lg">
            <Link href="/requests/lead">
              <MessageCircle className="size-5" /> Paste lead
            </Link>
          </Button>
        </LuxuryCard>
        <LuxuryCard>
          <ManualRequestForm clubs={clubs} clients={clients} />
        </LuxuryCard>
      </div>
    </AppShell>
  );
}

import { RequestFormSteps } from "@/components/request/request-form-steps";
import { PublicRequestShell } from "@/components/request/public-request-shell";
import { getActiveClubs, getPublicUpcomingEvents } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function PublicRequestPage() {
  const [clubs, events] = await Promise.all([getActiveClubs(), getPublicUpcomingEvents()]);

  return (
    <PublicRequestShell
      eyebrow="VIP Request"
      title="Your night, handled."
      description="Choose a venue, tell us what you need, and the team will come back with the next step on WhatsApp."
      hostLine="Fast request. Real person follow-up. No account needed."
    >
      <RequestFormSteps clubs={clubs} events={events} />
    </PublicRequestShell>
  );
}

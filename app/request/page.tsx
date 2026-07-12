import { RequestFormSteps } from "@/components/request/request-form-steps";
import { PublicRequestShell } from "@/components/request/public-request-shell";
import { getActiveClubs } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function PublicRequestPage() {
  const clubs = await getActiveClubs();

  return (
    <PublicRequestShell
      eyebrow="VIP Request"
      title="Your night, handled."
      description="Choose the venue, service, and date. The concierge team receives the details instantly."
    >
      <RequestFormSteps clubs={clubs} />
    </PublicRequestShell>
  );
}

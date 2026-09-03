import { RequestFormSteps } from "@/components/request/request-form-steps";
import { PublicRequestShell } from "@/components/request/public-request-shell";
import { getActiveClubs, getPublicUpcomingEvents } from "@/lib/data/public";
import { resolveRequestDeepLink } from "@/lib/request/deep-link";

export const dynamic = "force-dynamic";

export default async function PublicRequestPage({ searchParams }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const [clubs, events] = await Promise.all([getActiveClubs(), getPublicUpcomingEvents()]);
  const linkDefaults = resolveRequestDeepLink(clubs, await searchParams);

  return (
    <PublicRequestShell
      eyebrow="Marbella Concierge"
      title="What should we arrange?"
      description="Choose nightlife, boats, golf, villas, transfers, full planning, or a tailored package."
      hostLine="Fast request. Real person follow-up. No account needed."
    >
      <RequestFormSteps clubs={clubs} events={events} {...linkDefaults} />
    </PublicRequestShell>
  );
}

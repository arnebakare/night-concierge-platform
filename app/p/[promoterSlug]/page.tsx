import { notFound } from "next/navigation";
import { RequestFormSteps } from "@/components/request/request-form-steps";
import { PublicRequestShell } from "@/components/request/public-request-shell";
import { getActiveClubs, getPromoterLink, getPublicUpcomingEvents } from "@/lib/data/public";
import { resolveRequestDeepLink } from "@/lib/request/deep-link";

export const dynamic = "force-dynamic";

export default async function PromoterLinkPage({
  params,
  searchParams
}: Readonly<{ params: Promise<{ promoterSlug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const { promoterSlug } = await params;
  const [clubs, link, events] = await Promise.all([getActiveClubs(), getPromoterLink(promoterSlug), getPublicUpcomingEvents()]);

  if (!link?.active) notFound();
  const availableClubs = link.club_id ? clubs.filter((club) => club.id === link.club_id) : clubs;
  const linkDefaults = resolveRequestDeepLink(availableClubs, await searchParams);
  const startAtStep = linkDefaults.startAtStep ?? (link.club_id ? 3 : undefined);

  return (
    <PublicRequestShell
      eyebrow="Private guestlist"
      title={link.title ?? "VIP Request"}
      description="Send the request here and your promoter will know it came from you."
      hostLine={`Hosted by ${(link.profiles as { name?: string } | null)?.name ?? "your promoter"}. You can add special requests before sending.`}
    >
      <RequestFormSteps clubs={availableClubs} events={events} promoterSlug={promoterSlug} {...linkDefaults} startAtStep={startAtStep} />
    </PublicRequestShell>
  );
}

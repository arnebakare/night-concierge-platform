import { notFound } from "next/navigation";
import { RequestFormSteps } from "@/components/request/request-form-steps";
import { PublicRequestShell } from "@/components/request/public-request-shell";
import { getActiveClubs, getPromoterLink, getPublicConciergePackages, getPublicPackageUsageSignals, getPublicServicePathDefaults, getPublicUpcomingEvents } from "@/lib/data/public";
import { resolveRequestDeepLink, withPackageDeepLink } from "@/lib/request/deep-link";

export const dynamic = "force-dynamic";

export default async function PromoterLinkPage({
  params,
  searchParams
}: Readonly<{ params: Promise<{ promoterSlug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const { promoterSlug } = await params;
  const [clubs, link, events, packages, serviceDefaults] = await Promise.all([getActiveClubs(), getPromoterLink(promoterSlug), getPublicUpcomingEvents(), getPublicConciergePackages(), getPublicServicePathDefaults()]);
  const packageUsage = await getPublicPackageUsageSignals(packages);

  if (!link?.active) notFound();
  const availableClubs = link.club_id ? clubs.filter((club) => club.id === link.club_id) : clubs;
  const paramsValue = await searchParams;
  const linkDefaults = withPackageDeepLink(resolveRequestDeepLink(availableClubs, paramsValue), packages, paramsValue);
  const startAtStep = linkDefaults.startAtStep ?? (link.club_id ? 3 : undefined);
  const initialCategory = linkDefaults.initialCategory ?? (link.club_id ? "nightlife" : undefined);

  return (
    <PublicRequestShell
      eyebrow="Private guestlist"
      title={link.title ?? "VIP Request"}
      description="Send the request here and your promoter will know it came from you."
      hostLine={`Hosted by ${(link.profiles as { name?: string } | null)?.name ?? "your promoter"}. You can add special requests before sending.`}
    >
      <RequestFormSteps clubs={availableClubs} events={events} packages={packages} packageUsage={packageUsage} serviceDefaults={serviceDefaults} promoterSlug={promoterSlug} {...linkDefaults} initialCategory={initialCategory} startAtStep={startAtStep} />
    </PublicRequestShell>
  );
}

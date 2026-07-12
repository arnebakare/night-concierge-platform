import { notFound } from "next/navigation";
import { RequestFormSteps } from "@/components/request/request-form-steps";
import { PublicRequestShell } from "@/components/request/public-request-shell";
import { getActiveClubs, getPromoterLink } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function PromoterLinkPage({ params }: Readonly<{ params: Promise<{ promoterSlug: string }> }>) {
  const { promoterSlug } = await params;
  const [clubs, link] = await Promise.all([getActiveClubs(), getPromoterLink(promoterSlug)]);

  if (!link?.active) notFound();
  const availableClubs = link.club_id ? clubs.filter((club) => club.id === link.club_id) : clubs;

  return (
    <PublicRequestShell
      eyebrow="Private guestlist"
      title={link.title ?? "VIP Request"}
      description={`Hosted by ${(link.profiles as { name?: string } | null)?.name ?? "your promoter"}. Choose the service and send the request in under a minute.`}
    >
      <RequestFormSteps clubs={availableClubs} promoterSlug={promoterSlug} />
    </PublicRequestShell>
  );
}

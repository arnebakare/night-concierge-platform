import { notFound } from "next/navigation";
import { RequestFormSteps } from "@/components/request/request-form-steps";
import { getActiveClubs, getPromoterLink } from "@/lib/data/public";

export default async function PromoterLinkPage({ params }: Readonly<{ params: Promise<{ promoterSlug: string }> }>) {
  const { promoterSlug } = await params;
  const [clubs, link] = await Promise.all([getActiveClubs(), getPromoterLink(promoterSlug)]);

  if (!link?.active) notFound();
  const availableClubs = link.club_id ? clubs.filter((club) => club.id === link.club_id) : clubs;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.32em] text-champagne-300">Private guestlist</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">{link.title ?? "VIP Request"}</h1>
        <p className="mt-3 text-muted-foreground">Hosted by {(link.profiles as { name?: string } | null)?.name ?? "your promoter"}.</p>
      </header>
      <RequestFormSteps clubs={availableClubs} promoterSlug={promoterSlug} />
    </main>
  );
}

import { notFound } from "next/navigation";
import { RequestFormSteps } from "@/components/request/request-form-steps";
import { PublicRequestShell } from "@/components/request/public-request-shell";
import { getActiveClubs, getMagicLink, getPublicUpcomingEvents } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function MagicLinkPage({ params }: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const [clubs, link, events] = await Promise.all([getActiveClubs(), getMagicLink(token), getPublicUpcomingEvents()]);

  if (!link?.active) notFound();
  if (link.expires_at && new Date(link.expires_at) < new Date()) notFound();
  if (link.max_uses !== null && link.max_uses !== undefined && link.use_count >= link.max_uses) notFound();

  const client = link.clients as { name?: string; phone?: string; email?: string; instagram?: string } | null;
  const availableClubs = link.club_id ? clubs.filter((club) => club.id === link.club_id) : clubs;

  return (
    <PublicRequestShell
      eyebrow="Magic invitation"
      title="Your private link is ready."
      description="Choose a venue service, confirm your details, and the concierge team will take it from there."
    >
      <RequestFormSteps
        clubs={availableClubs}
        events={events}
        magicToken={token}
        defaults={{
          name: client?.name ?? "",
          phone: client?.phone ?? "",
          email: client?.email ?? "",
          instagram: client?.instagram ?? ""
        }}
      />
    </PublicRequestShell>
  );
}

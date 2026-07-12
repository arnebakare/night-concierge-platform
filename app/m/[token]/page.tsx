import { notFound } from "next/navigation";
import { RequestFormSteps } from "@/components/request/request-form-steps";
import { PublicRequestShell } from "@/components/request/public-request-shell";
import { getActiveClubs, getMagicLink, getPublicUpcomingEvents } from "@/lib/data/public";
import { LuxuryCard } from "@/components/ui/luxury-card";

export const dynamic = "force-dynamic";

export default async function MagicLinkPage({ params }: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const [clubs, link, events] = await Promise.all([getActiveClubs(), getMagicLink(token), getPublicUpcomingEvents()]);

  if (!link?.active) notFound();
  if (link.expires_at && new Date(link.expires_at) < new Date()) notFound();
  if (link.max_uses !== null && link.max_uses !== undefined && link.use_count >= link.max_uses) notFound();

  const client = link.clients as { name?: string; phone?: string; email?: string; instagram?: string } | null;
  const promoter = link.profiles as { name?: string } | null;
  const clientFirstName = client?.name?.split(" ").filter(Boolean)[0];
  const hostName = promoter?.name ?? "your concierge host";
  const availableClubs = link.club_id ? clubs.filter((club) => club.id === link.club_id) : clubs;

  return (
    <PublicRequestShell
      eyebrow="Private invitation"
      title={clientFirstName ? `${clientFirstName}, your night is reserved.` : "Your private night is reserved."}
      description={`This link was prepared for you by ${hostName}. Choose what you would like arranged and the concierge team will treat it as a priority request.`}
    >
      <LuxuryCard className="mb-4 border-champagne-400/50 bg-ink-950/78">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-champagne-300">VIP access</p>
            <h2 className="mt-2 font-serif text-2xl text-champagne-50">
              {client?.name ? `Welcome, ${client.name}` : "Welcome"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              If you have a special request, celebration, preferred table, privacy need, or timing question, you can always reach out directly to {hostName}. We will handle the details discreetly.
            </p>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-champagne-400/50 bg-champagne-500/10 font-serif text-sm text-champagne-100">
            VIP
          </div>
        </div>
      </LuxuryCard>
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

import { notFound } from "next/navigation";
import { RequestFormSteps } from "@/components/request/request-form-steps";
import { getActiveClubs, getMagicLink } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function MagicLinkPage({ params }: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const [clubs, link] = await Promise.all([getActiveClubs(), getMagicLink(token)]);

  if (!link?.active) notFound();
  if (link.expires_at && new Date(link.expires_at) < new Date()) notFound();
  if (link.max_uses !== null && link.max_uses !== undefined && link.use_count >= link.max_uses) notFound();

  const client = link.clients as { name?: string; phone?: string; email?: string; instagram?: string } | null;
  const availableClubs = link.club_id ? clubs.filter((club) => club.id === link.club_id) : clubs;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.32em] text-champagne-300">Magic invitation</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">Your private link is ready.</h1>
        <p className="mt-3 text-muted-foreground">Pre-filled where possible, protected by link limits.</p>
      </header>
      <RequestFormSteps
        clubs={availableClubs}
        magicToken={token}
        defaults={{
          name: client?.name ?? "",
          phone: client?.phone ?? "",
          email: client?.email ?? "",
          instagram: client?.instagram ?? ""
        }}
      />
    </main>
  );
}

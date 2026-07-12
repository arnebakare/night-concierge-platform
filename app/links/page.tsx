import { AppShell } from "@/components/layout/app-shell";
import { MagicLinkForm } from "@/components/promoter/magic-link-form";
import { PromoterLinkCard } from "@/components/promoter/promoter-link-card";
import { MagicLinkCard } from "@/components/promoter/magic-link-card";
import { PromoterLinkForm } from "@/components/promoter/promoter-link-form";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getClientsForProfile, getMagicLinksForProfile, getPromoterLinks, getTeamPromoters, getUsersForAdmin } from "@/lib/data/app";

export default async function LinksPage() {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const promoterPromise = profile.role === "PROMOTER" ? Promise.resolve([profile]) : profile.role === "SUPER_ADMIN" ? getUsersForAdmin({ role: "PROMOTER", active: "active" }) : getTeamPromoters(profile.id);
  const [links, clubs, magicLinks, promoters, clients] = await Promise.all([getPromoterLinks(profile), getActiveClubsForApp(), getMagicLinksForProfile(profile), promoterPromise, getClientsForProfile(profile)]);
  const activeLinks = links.filter((link) => link.active);
  const activeMagicLinks = magicLinks.filter((link) => link.active);

  return (
    <AppShell profile={profile} title="My links" eyebrow="QR and sharing">
      <div className="sticky top-0 z-10 mb-4 grid grid-cols-2 gap-2 bg-background/80 py-2 backdrop-blur md:static md:bg-transparent md:py-0">
        <a href="#permanent-links" className="rounded-md border border-champagne-700/40 bg-card px-3 py-3 text-center text-sm font-semibold text-champagne-100">Permanent links</a>
        <a href="#magic-links" className="rounded-md border border-champagne-700/40 bg-card px-3 py-3 text-center text-sm font-semibold text-champagne-100">Magic links</a>
      </div>

      <details id="permanent-links" open className="scroll-mt-20 rounded-lg border border-champagne-700/40 bg-card/70 p-3">
        <summary className="cursor-pointer list-none rounded-md px-1 py-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl">Permanent links</h2>
              <p className="mt-1 text-sm text-muted-foreground">Always-on promoter links and QR destinations.</p>
            </div>
            <span className="rounded-full border border-champagne-700/50 px-2 py-1 text-xs text-champagne-100">{activeLinks.length}</span>
          </div>
        </summary>
        <div className="mt-3 space-y-4">
          <PromoterLinkForm clubs={clubs} promoters={promoters} />
          <div className="grid gap-4 md:grid-cols-2">
            {activeLinks.map((link) => <PromoterLinkCard key={link.id} id={link.id} title={link.title} subtitle={(link.profiles as { name?: string } | null)?.name} url={`${appUrl}/p/${link.slug}`} active={link.active} />)}
            {!activeLinks.length && <LuxuryCard className="text-center text-sm text-muted-foreground md:col-span-2">No active permanent promoter links.</LuxuryCard>}
          </div>
        </div>
      </details>

      <details id="magic-links" open className="mt-4 scroll-mt-20 rounded-lg border border-champagne-700/40 bg-card/70 p-3">
        <summary className="cursor-pointer list-none rounded-md px-1 py-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl">Magic links</h2>
              <p className="mt-1 text-sm text-muted-foreground">Private VIP links for specific guests or occasions.</p>
            </div>
            <span className="rounded-full border border-champagne-700/50 px-2 py-1 text-xs text-champagne-100">{activeMagicLinks.length}</span>
          </div>
        </summary>
        <div className="mt-3 space-y-4">
          <MagicLinkForm clubs={clubs} promoters={promoters} clients={clients} />
          <div className="grid gap-3 md:grid-cols-2">
            {activeMagicLinks.map((link) => {
              const promoter = link.profiles as { name?: string; phone?: string } | null;
              return (
                <MagicLinkCard
                  key={link.id}
                  id={link.id}
                  url={`${appUrl}/m/${link.token}`}
                  clubName={`${(link.clubs as { name?: string } | null)?.name ?? "Any club"} · ${promoter?.name ?? "Promoter"}`}
                  active={link.active}
                  useCount={link.use_count}
                  maxUses={link.max_uses}
                  expiresAt={link.expires_at}
                  promoterPhone={promoter?.phone}
                />
              );
            })}
            {!activeMagicLinks.length && <LuxuryCard className="text-center text-sm text-muted-foreground md:col-span-2">No active magic links.</LuxuryCard>}
          </div>
        </div>
      </details>
    </AppShell>
  );
}

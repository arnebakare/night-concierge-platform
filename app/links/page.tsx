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

  return (
    <AppShell profile={profile} title="My links" eyebrow="QR and sharing">
      <div className="mb-4">
        <PromoterLinkForm clubs={clubs} promoters={promoters} />
      </div>
      <div className="mb-4">
        <MagicLinkForm clubs={clubs} promoters={promoters} clients={clients} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {links.map((link) => <PromoterLinkCard key={link.id} id={link.id} title={link.title} subtitle={(link.profiles as { name?: string } | null)?.name} url={`${appUrl}/p/${link.slug}`} active={link.active} />)}
        {!links.length && <LuxuryCard className="text-center text-sm text-muted-foreground md:col-span-2">No permanent promoter links are assigned yet.</LuxuryCard>}
      </div>
      <h2 className="mb-3 mt-8 font-serif text-2xl">Recent magic links</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {magicLinks.map((link) => {
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
        {!magicLinks.length && <LuxuryCard className="text-center text-sm text-muted-foreground md:col-span-2">No magic links created yet.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

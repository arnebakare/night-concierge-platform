import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireProfile } from "@/lib/auth";
import { createClub, setClubActive, updateClub } from "@/lib/actions/management-actions";
import { getClubsForAdmin } from "@/lib/data/app";
import { getClubVenueExperience, serializeServicesForAdmin } from "@/components/request/venue-experience";
import { ClubExperienceForm } from "@/components/admin/club-experience-form";

export default async function AdminClubsPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const clubs = await getClubsForAdmin();
  return (
    <AppShell profile={profile} title="Clubs" eyebrow="Admin">
      <LuxuryCard className="mb-4">
        <form action={createClub} className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="La Plage Casanis" /></div>
          <div className="space-y-2"><Label>Slug</Label><Input name="slug" placeholder="la-plage-casanis" /></div>
          <div className="space-y-2"><Label>City</Label><Input name="city" placeholder="Marbella" /></div>
          <div className="space-y-2"><Label>Address</Label><Input name="address" placeholder="Optional" /></div>
          <Button className="md:col-span-4" type="submit">Create club</Button>
        </form>
      </LuxuryCard>
      <div className="grid gap-3 md:grid-cols-2">
        {clubs.map((club) => (
          <LuxuryCard key={club.id} className={!club.active ? "opacity-70" : undefined}>
            {(() => {
              const experience = getClubVenueExperience(club);
              return (
                <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-champagne-500/50 bg-champagne-500/10 font-serif text-champagne-100">
                  {experience.monogram}
                </div>
                <div>
                <p className="font-semibold">{club.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{club.city} · /{club.slug}</p>
                <p className="mt-1 text-xs text-champagne-300">{experience.tagline}</p>
                </div>
              </div>
              <span className={club.active ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-muted-foreground"}>
                {club.active ? "ACTIVE" : "ARCHIVED"}
              </span>
            </div>
            <form action={updateClub} className="mt-4 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="clubId" value={club.id} />
              <Input name="name" defaultValue={club.name} aria-label="Club name" required />
              <Input name="slug" defaultValue={club.slug} aria-label="Club slug" required />
              <Input name="city" defaultValue={club.city} aria-label="Club city" required />
              <Input name="address" defaultValue={club.address ?? ""} aria-label="Club address" placeholder="Address optional" />
              <Button type="submit" variant="secondary" className="sm:col-span-2">Save details</Button>
            </form>
            <details className="mt-4 rounded-md border border-champagne-700/30 bg-background/35 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-champagne-200">Request page branding and services</summary>
              <ClubExperienceForm
                clubId={club.id}
                monogram={experience.monogram}
                tagline={experience.tagline}
                mood={experience.mood}
                services={serializeServicesForAdmin(club)}
              />
            </details>
            <form action={setClubActive} className="mt-4">
              <input type="hidden" name="clubId" value={club.id} />
              <input type="hidden" name="active" value={String(!club.active)} />
              <Button type="submit" variant={club.active ? "outline" : "secondary"} className="w-full">
                {club.active ? "Archive club" : "Reactivate club"}
              </Button>
            </form>
                </>
              );
            })()}
          </LuxuryCard>
        ))}
      </div>
    </AppShell>
  );
}

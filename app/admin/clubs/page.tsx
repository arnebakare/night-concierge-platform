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
      <LuxuryCard className="mb-4 bg-white text-ink-950">
        <details>
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-semibold">
            Add venue
            <span className="text-xs font-normal text-muted-foreground">Name, city, logo</span>
          </summary>
          <form action={createClub} className="mt-3 grid gap-2 md:grid-cols-4">
            <div className="space-y-1.5"><Label>Name</Label><Input name="name" placeholder="La Plage Casanis" /></div>
            <div className="space-y-1.5"><Label>Slug</Label><Input name="slug" placeholder="la-plage-casanis" /></div>
            <div className="space-y-1.5"><Label>City</Label><Input name="city" placeholder="Marbella" /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input name="address" placeholder="Optional" /></div>
            <div className="space-y-1.5 md:col-span-4"><Label>Logo URL</Label><Input name="imageUrl" placeholder="/venues/la-plage-casanis-logo.png" /></div>
            <Button className="md:col-span-4" type="submit">Create venue</Button>
          </form>
        </details>
      </LuxuryCard>
      <div className="compact-list grid gap-2">
        {clubs.map((club) => (
          <LuxuryCard key={club.id} className={`client-row bg-white text-ink-950 ${!club.active ? "opacity-70" : ""}`}>
            {(() => {
              const experience = getClubVenueExperience(club);
              return (
                <>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <ClubLogoPreview logoUrl={club.image_url} name={club.name} monogram={experience.monogram} />
                <div className="min-w-0">
                <p className="truncate font-semibold text-ink-950">{club.name}</p>
                <p className="mt-1 text-sm text-slate-500">{club.city} · /{club.slug}</p>
                <p className="mt-1 text-xs text-champagne-700">{experience.tagline}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <span className={club.active ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>
                  {club.active ? "Active" : "Archived"}
                </span>
              </div>
            </div>
            <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-950">Edit details and logo</summary>
              <form action={updateClub} className="mt-3 grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="clubId" value={club.id} />
                <Input name="name" defaultValue={club.name} aria-label="Club name" required />
                <Input name="slug" defaultValue={club.slug} aria-label="Club slug" required />
                <Input name="city" defaultValue={club.city} aria-label="Club city" required />
                <Input name="address" defaultValue={club.address ?? ""} aria-label="Club address" placeholder="Address optional" />
                <Input name="imageUrl" defaultValue={club.image_url ?? ""} aria-label="Club logo URL" placeholder="/venues/venue-logo.png" className="sm:col-span-2" />
                <Button type="submit" variant="secondary" className="sm:col-span-2">Save details</Button>
              </form>
            </details>
            <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-950">Booking page services</summary>
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

function ClubLogoPreview({ logoUrl, name, monogram }: Readonly<{ logoUrl: string | null; name: string; monogram: string }>) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 font-serif text-champagne-800">
      {logoUrl ? (
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-contain p-1" />
      ) : (
        monogram
      )}
    </div>
  );
}

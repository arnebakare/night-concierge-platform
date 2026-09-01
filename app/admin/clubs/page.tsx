import { AppShell } from "@/components/layout/app-shell";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { LuxuryCard } from "@/components/ui/luxury-card";
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
      <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-center text-slate-950">
        <Metric label="Venues" value={clubs.length} />
        <Metric label="Active" value={clubs.filter((club) => club.active).length} />
        <Metric label="Archived" value={clubs.filter((club) => !club.active).length} />
      </div>
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
            <StatusSubmitButton className="md:col-span-4" label="Create venue" pendingLabel="Creating" />
          </form>
        </details>
      </LuxuryCard>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {clubs.map((club) => (
          <div key={club.id} className={`px-3 py-2.5 text-ink-950 ${!club.active ? "opacity-70" : ""}`}>
            {(() => {
              const experience = getClubVenueExperience(club);
              const serviceCount = serializeServicesForAdmin(club).filter((service) => service.active !== false).length;
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
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{serviceCount} services</span>
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
                <StatusSubmitButton label="Save details" pendingLabel="Saving" variant="secondary" className="sm:col-span-2" />
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
              <StatusSubmitButton label={club.active ? "Archive club" : "Reactivate club"} pendingLabel="Saving" variant={club.active ? "outline" : "secondary"} className="w-full" />
            </form>
                </>
              );
            })()}
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="border-r border-slate-200 p-2.5 last:border-r-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
    </div>
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

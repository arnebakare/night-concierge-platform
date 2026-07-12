import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getManagerClubAssignments } from "@/lib/data/app";

export default async function ManagerClubsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const clubs = await getManagerClubAssignments(profile.id);
  return (
    <AppShell profile={profile} title="Assigned clubs" eyebrow="Venues">
      <div className="grid gap-3 md:grid-cols-2">
        {clubs.map((club) => <LuxuryCard key={club.id} className={!club.assigned ? "opacity-60" : undefined}><div className="flex items-start justify-between gap-3"><div><p className="text-xl font-semibold">{club.name}</p><p className="text-muted-foreground">{club.city}</p></div><span className={club.assigned ? "text-xs font-semibold text-emerald-400" : "text-xs text-muted-foreground"}>{club.assigned ? "ASSIGNED" : "NOT ASSIGNED"}</span></div></LuxuryCard>)}
      </div>
    </AppShell>
  );
}

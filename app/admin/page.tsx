import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getClubsForAdmin, getNotificationHistory, getUsersForAdmin } from "@/lib/data/app";

export default async function AdminPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const [clubs, users, notifications] = await Promise.all([getClubsForAdmin(), getUsersForAdmin(), getNotificationHistory()]);
  return (
    <AppShell profile={profile} title="Global control" eyebrow="Super admin">
      <div className="mb-4 grid grid-cols-3 gap-3"><LuxuryCard><p className="text-xs text-muted-foreground">Active clubs</p><p className="mt-2 font-serif text-3xl">{clubs.filter((club) => club.active).length}</p></LuxuryCard><LuxuryCard><p className="text-xs text-muted-foreground">Active users</p><p className="mt-2 font-serif text-3xl">{users.filter((user) => user.active).length}</p></LuxuryCard><LuxuryCard><p className="text-xs text-muted-foreground">WhatsApp failed</p><p className="mt-2 font-serif text-3xl">{notifications.filter((item) => item.status === "FAILED").length}</p></LuxuryCard></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/clubs"><LuxuryCard><p className="font-semibold">Clubs</p><p className="text-sm text-muted-foreground">Create, edit, archive venues</p></LuxuryCard></Link>
        <Link href="/admin/planner"><LuxuryCard><p className="font-semibold">Planner rules</p><p className="text-sm text-muted-foreground">Tune AI venue weighting and local flow</p></LuxuryCard></Link>
        <Link href="/admin/users"><LuxuryCard><p className="font-semibold">Users</p><p className="text-sm text-muted-foreground">Managers, promoters, clients</p></LuxuryCard></Link>
        <Link href="/admin/settings"><LuxuryCard><p className="font-semibold">Settings</p><p className="text-sm text-muted-foreground">Platform-wide controls</p></LuxuryCard></Link>
        <Link href="/admin/audit"><LuxuryCard><p className="font-semibold">Audit logs</p><p className="text-sm text-muted-foreground">Sensitive changes and operational trail</p></LuxuryCard></Link>
        <Link href="/notifications"><LuxuryCard><p className="font-semibold">WhatsApp delivery</p><p className="text-sm text-muted-foreground">Sent and failed notification attempts</p></LuxuryCard></Link>
        <Link href="/admin/system"><LuxuryCard><p className="font-semibold">Launch readiness</p><p className="text-sm text-muted-foreground">Environment, migrations, and provider health</p></LuxuryCard></Link>
      </div>
    </AppShell>
  );
}

import Link from "next/link";
import { Activity, Bell, BrainCircuit, Briefcase, Percent, Settings, Users, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getClubsForAdmin, getNotificationHistory, getUsersForAdmin } from "@/lib/data/app";

export default async function AdminPage() {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const [clubs, users, notifications] = await Promise.all([getClubsForAdmin(), getUsersForAdmin(), getNotificationHistory()]);
  return (
    <AppShell profile={profile} title="Global control" eyebrow="Super admin">
      <div className="ops-summary mb-4 overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-3 divide-x divide-border">
          <Metric label="Clubs" value={clubs.filter((club) => club.active).length} />
          <Metric label="Users" value={users.filter((user) => user.active).length} />
          <Metric label="Failed" value={notifications.filter((item) => item.status === "FAILED").length} />
        </div>
      </div>
      <div className="compact-list grid gap-2">
        <AdminLink href="/admin/clubs" icon={Briefcase} title="Clubs" description="Create, edit, archive venues" />
        <AdminLink href="/admin/planner" icon={BrainCircuit} title="Planner rules" description="Tune AI venue weighting and local flow" />
        <AdminLink href="/admin/commissions" icon={Percent} title="Commissions" description="Promoter, venue, and service rates" />
        <AdminLink href="/admin/users" icon={Users} title="Users" description="Managers, promoters, clients" />
        <AdminLink href="/notifications" icon={Bell} title="WhatsApp delivery" description="Sent and failed notification attempts" />
        <AdminLink href="/admin/settings" icon={Settings} title="Settings" description="Platform-wide controls" />
        <AdminLink href="/admin/audit" icon={Activity} title="Audit logs" description="Sensitive changes and operational trail" />
        <AdminLink href="/admin/system" icon={Activity} title="Launch readiness" description="Environment, migrations, and provider health" />
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function AdminLink({
  href,
  icon: Icon,
  title,
  description
}: Readonly<{ href: string; icon: LucideIcon; title: string; description: string }>) {
  return (
    <Link href={href}>
      <LuxuryCard className="client-row transition hover:border-champagne-300/60">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-champagne-700/30 bg-secondary text-champagne-300">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </LuxuryCard>
    </Link>
  );
}

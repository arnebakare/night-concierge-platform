import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getAuditLogsForAdmin } from "@/lib/data/app";
import { formatEnum } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AdminAuditPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string; entity?: string }> }>) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const filters = await searchParams;
  const logs = await getAuditLogsForAdmin(filters);

  return (
    <AppShell profile={profile} title="Audit logs" eyebrow="Admin">
      <form action="/admin/audit" className="mb-4 grid gap-2 rounded-lg border border-champagne-700/40 bg-card p-3 md:grid-cols-[1fr_200px_auto]"><Input name="q" defaultValue={filters.q ?? ""} placeholder="Search action or record" /><select name="entity" defaultValue={filters.entity ?? ""} className="h-12 rounded-md border bg-input px-3 text-sm"><option value="">All records</option>{["requests", "clients", "profiles", "clubs", "events", "promoter_links", "magic_links", "platform_settings"].map((entity) => <option key={entity} value={entity}>{formatEnum(entity)}</option>)}</select><Button type="submit">Filter</Button></form>
      <div className="space-y-3">
        {logs.map((log) => (
          <LuxuryCard key={log.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{formatEnum(log.action)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{log.entity_type} · {log.entity_id}</p>
              </div>
              <p className="text-right text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {(Array.isArray(log.profiles) ? log.profiles[0]?.name : log.profiles?.name) ?? "System"}
            </p>
            <pre className="mt-3 overflow-auto rounded-md bg-ink-900 p-3 text-xs text-muted-foreground">
              {JSON.stringify(log.metadata ?? {}, null, 2)}
            </pre>
          </LuxuryCard>
        ))}
        {!logs.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No audit records match these filters.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

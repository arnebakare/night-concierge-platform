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
      <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-center text-slate-950">
        <Metric label="Records" value={String(logs.length)} />
        <Metric label="Requests" value={String(logs.filter((log) => log.entity_type === "requests").length)} />
        <Metric label="Users" value={String(logs.filter((log) => log.entity_type === "profiles").length)} />
      </div>
      <form action="/admin/audit" className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-2.5 md:grid-cols-[1fr_200px_auto]"><Input name="q" defaultValue={filters.q ?? ""} placeholder="Search action or record" className="border-slate-200 bg-white text-slate-950" /><select name="entity" defaultValue={filters.entity ?? ""} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950"><option value="">All records</option>{["requests", "clients", "profiles", "clubs", "events", "promoter_links", "magic_links", "platform_settings"].map((entity) => <option key={entity} value={entity}>{formatEnum(entity)}</option>)}</select><Button type="submit">Filter</Button></form>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {logs.map((log) => (
          <div key={log.id} className="px-3 py-2.5 text-slate-950">
            <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <p className="font-semibold">{formatEnum(log.action)}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500 md:text-sm">{formatEnum(log.entity_type)} · {shortId(log.entity_id)}</p>
              </div>
              <p className="text-xs text-slate-500 md:text-right">{new Date(log.created_at).toLocaleString()}</p>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {(Array.isArray(log.profiles) ? log.profiles[0]?.name : log.profiles?.name) ?? "System"}
            </p>
            <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600">Details</summary>
              <pre className="audit-metadata mt-2 max-h-36 overflow-auto rounded-md bg-white p-2.5 text-xs text-slate-600">
                {JSON.stringify(log.metadata ?? {}, null, 2)}
              </pre>
            </details>
          </div>
        ))}
        {!logs.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No audit records match these filters.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="border-r border-slate-200 p-2.5 last:border-r-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}

function shortId(value: string | null) {
  if (!value) return "record";
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

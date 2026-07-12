import Link from "next/link";
import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getRequestsForProfile } from "@/lib/data/app";
import { formatEnum } from "@/lib/utils";

export default async function ReportsPage({ searchParams }: Readonly<{ searchParams: Promise<{ from?: string; to?: string; club?: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const [requests, clubs] = await Promise.all([getRequestsForProfile(profile, { dateFrom: filters.from, dateTo: filters.to, clubId: filters.club }), getActiveClubsForApp()]);
  const confirmed = requests.filter((request) => ["CONFIRMED", "ARRIVED"].includes(request.status)).length;
  const completed = requests.filter((request) => request.status === "ARRIVED").length;
  const archived = requests.filter((request) => ["NO_SHOW", "DECLINED", "CANCELLED"].includes(request.status)).length;
  const guests = requests.reduce((sum, request) => sum + request.guest_count, 0);
  const conversion = requests.length ? Math.round((confirmed / requests.length) * 100) : 0;
  const completionRate = requests.length ? Math.round((completed / requests.length) * 100) : 0;
  const exportQuery = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();

  return <AppShell profile={profile} title="Performance" eyebrow="Live reporting">
    <form action="/reports" className="mb-4 grid gap-2 rounded-lg border border-champagne-700/40 bg-card p-3 md:grid-cols-[1fr_1fr_1.4fr_auto]"><Input name="from" type="date" defaultValue={filters.from ?? ""} aria-label="From date" /><Input name="to" type="date" defaultValue={filters.to ?? ""} aria-label="To date" /><select name="club" defaultValue={filters.club ?? ""} className="h-12 rounded-md border bg-input px-3 text-sm"><option value="">All clubs</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><Button type="submit">Apply</Button></form>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric label="Requests" value={String(requests.length)} /><Metric label="Guests" value={String(guests)} /><Metric label="Conversion" value={`${conversion}%`} /><Metric label="Completion" value={`${completionRate}%`} /></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><LuxuryCard><h2 className="font-serif text-2xl">Sources</h2><div className="mt-4 space-y-3 text-sm">{breakdown(requests, "source").map((row) => <Row key={row.label} {...row} />)}</div></LuxuryCard><LuxuryCard><h2 className="font-serif text-2xl">Request types</h2><div className="mt-4 space-y-3 text-sm">{breakdown(requests, "request_type").map((row) => <Row key={row.label} {...row} />)}</div></LuxuryCard></div>
    <LuxuryCard className="mt-4"><h2 className="font-serif text-2xl">Status health</h2><div className="mt-4 space-y-3 text-sm"><Row label="Confirmed" value={String(confirmed)} /><Row label="Completed" value={String(completed)} /><Row label="Archived" value={String(archived)} /><Row label="Pending attention" value={String(requests.filter((request) => ["NEW", "PENDING"].includes(request.status)).length)} /></div></LuxuryCard>
    <Button asChild variant="secondary" className="mt-4 w-full md:w-auto"><Link href={`/api/reports/export${exportQuery ? `?${exportQuery}` : ""}`}><Download className="size-4" /> Export CSV</Link></Button>
  </AppShell>;
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) { return <LuxuryCard><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-serif text-3xl md:text-4xl">{value}</p></LuxuryCard>; }
function Row({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="flex justify-between border-b border-champagne-700/30 pb-2"><span>{label}</span><span className="text-champagne-300">{value}</span></div>; }
function breakdown(requests: Awaited<ReturnType<typeof getRequestsForProfile>>, key: "source" | "request_type") {
  if (!requests.length) return [{ label: "No data yet", value: "0%" }];
  const counts = requests.reduce<Record<string, number>>((result, request) => ({ ...result, [request[key]]: (result[request[key]] ?? 0) + 1 }), {});
  return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([label, count]) => ({ label: formatEnum(label), value: `${Math.round((count / requests.length) * 100)}%` }));
}

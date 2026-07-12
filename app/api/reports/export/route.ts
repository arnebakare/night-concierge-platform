import { getCurrentProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"].includes(profile.role)) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const requests = await getRequestsForProfile(profile, { dateFrom: url.searchParams.get("from") || undefined, dateTo: url.searchParams.get("to") || undefined, clubId: url.searchParams.get("club") || undefined });
  const rows = [["Date", "Client", "Phone", "Club", "Type", "Status", "Guests", "Source", "Promoter"], ...requests.map((item) => [item.requested_date, item.clients?.name ?? "", item.clients?.phone ?? "", item.clubs?.name ?? "", item.request_type, item.status, String(item.guest_count), item.source, item.promoter?.name ?? ""])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="night-concierge-report-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

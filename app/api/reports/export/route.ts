import { getCurrentProfile } from "@/lib/auth";
import { getCommissionRulesForProfile, getRequestsForProfile } from "@/lib/data/app";
import type { CommissionRule, ConciergeRequest } from "@/lib/types";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"].includes(profile.role)) return new Response("Unauthorized", { status: 401 });
  const url = new URL(request.url);
  const [requests, commissionRules] = await Promise.all([
    getRequestsForProfile(profile, { dateFrom: url.searchParams.get("from") || undefined, dateTo: url.searchParams.get("to") || undefined, clubId: url.searchParams.get("club") || undefined, includeArchived: true }),
    getCommissionRulesForProfile(profile)
  ]);
  const rows = [
    ["Date", "Client", "Phone", "Club", "Type", "Status", "Guests", "Budget", "Table cost EUR", "Commission rule", "Commission EUR", "Source", "Promoter"],
    ...requests.map((item) => {
      const tableCost = parseMoney(item.budget);
      const rule = findCommissionRule(item, commissionRules);
      const commission = tableCost * ((rule?.rate_percent ?? 10) / 100) + ((rule?.flat_fee_cents ?? 0) / 100);
      return [
        item.requested_date,
        item.clients?.name ?? "",
        item.clients?.phone ?? "",
        item.clubs?.name ?? "",
        item.request_type,
        item.status,
        String(item.guest_count),
        item.budget ?? "",
        tableCost ? String(tableCost) : "",
        rule ? `${Number(rule.rate_percent).toFixed(1)}% + ${((rule.flat_fee_cents ?? 0) / 100).toFixed(0)}` : "10% default",
        tableCost ? commission.toFixed(2) : "",
        item.source,
        item.promoter?.name ?? ""
      ];
    })
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="night-concierge-report-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

function parseMoney(value?: string | null) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function findCommissionRule(request: ConciergeRequest, rules: CommissionRule[]) {
  const active = rules.filter((rule) => rule.active);
  return active
    .filter((rule) => !rule.promoter_id || rule.promoter_id === request.promoter_id)
    .filter((rule) => !rule.club_id || rule.club_id === request.club_id)
    .filter((rule) => !rule.request_type || rule.request_type === request.request_type)
    .sort((a, b) => specificity(b) - specificity(a))[0] ?? null;
}

function specificity(rule: CommissionRule) {
  return Number(Boolean(rule.promoter_id)) + Number(Boolean(rule.club_id)) + Number(Boolean(rule.request_type));
}

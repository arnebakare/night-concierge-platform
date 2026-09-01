"use client";

import { useMemo, useState } from "react";
import { Calculator, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { updateRequestTableCost } from "@/lib/actions/management-actions";
import type { CommissionRule, ConciergeRequest } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

type SalaryRow = {
  reportDate: string;
  tableCost: string;
};

export function SalaryReport({
  requests,
  from,
  to,
  commissionRules = []
}: Readonly<{ requests: ConciergeRequest[]; from?: string; to?: string; commissionRules?: CommissionRule[] }>) {
  const reportableRequests = useMemo(
    () => requests.filter((request) => ["CONFIRMED", "ARRIVED"].includes(request.status)),
    [requests]
  );
  const [rows, setRows] = useState<Record<string, SalaryRow>>(() =>
    Object.fromEntries(
      reportableRequests.map((request) => [
        request.id,
        {
          reportDate: request.requested_date,
          tableCost: extractMoneyValue(request.budget)
        }
      ])
    )
  );
  const [commissionRate, setCommissionRate] = useState("10");

  const totalGuests = reportableRequests.reduce((total, request) => total + request.guest_count, 0);
  const totalCost = reportableRequests.reduce((total, request) => total + parseMoney(rows[request.id]?.tableCost), 0);
  const rulesCommission = reportableRequests.reduce((total, request) => {
    const cost = parseMoney(rows[request.id]?.tableCost);
    const rule = findCommissionRule(request, commissionRules);
    return total + (cost * (rule?.rate_percent ?? parseMoney(commissionRate)) / 100) + ((rule?.flat_fee_cents ?? 0) / 100);
  }, 0);
  const commission = commissionRules.some((rule) => rule.active) ? rulesCommission : totalCost * (parseMoney(commissionRate) / 100);
  const rangeLabel = from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `Until ${to}` : "Current filtered period";

  function updateRow(requestId: string, patch: Partial<SalaryRow>) {
    setRows((current) => ({
      ...current,
      [requestId]: {
        reportDate: current[requestId]?.reportDate ?? "",
        tableCost: current[requestId]?.tableCost ?? "",
        ...patch
      }
    }));
  }

  return (
    <LuxuryCard className="mt-4 salary-report">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-champagne-300">Salary report</p>
          <h2 className="mt-1 text-xl font-semibold">Printable table-cost sheet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the date filters above, adjust dates or table costs, then print or save as PDF.</p>
        </div>
        <Button type="button" variant="secondary" className="print:hidden" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print report
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-md border border-border md:grid-cols-4 md:divide-y-0">
        <ReportMetric label="Period" value={rangeLabel} />
        <ReportMetric label="Guests" value={String(totalGuests)} />
        <ReportMetric label="Table cost" value={formatCurrency(totalCost)} />
        <ReportMetric label="Commission" value={formatCurrency(commission)} />
      </div>

      <div className="mt-3 grid gap-2 rounded-lg border border-champagne-700/40 bg-ink-950/60 p-3 print:hidden sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-semibold">Commission estimate</p>
          <p className="text-xs text-muted-foreground">{commissionRules.some((rule) => rule.active) ? "Using active commission rules. Manual rate applies where no rule matches." : "Change the percentage for this report before printing."}</p>
        </div>
        <label className="grid grid-cols-[auto_5.5rem] items-center gap-2 text-sm">
          <span className="text-muted-foreground">Rate</span>
          <input
            value={commissionRate}
            onChange={(event) => setCommissionRate(event.target.value)}
            inputMode="decimal"
            className="h-10 rounded-md border bg-input px-2 text-right"
            aria-label="Commission rate"
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-champagne-700/40">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-ink-950/70 text-xs uppercase tracking-[0.16em] text-champagne-300">
            <tr>
              <th className="p-3">Report date</th>
              <th className="p-3">Client</th>
              <th className="p-3">Club</th>
              <th className="p-3">Type</th>
              <th className="p-3">Guests</th>
              <th className="p-3">Promoter</th>
              <th className="p-3">Table cost</th>
              <th className="p-3">Rule</th>
              <th className="p-3 print:hidden">Save</th>
            </tr>
          </thead>
          <tbody>
            {reportableRequests.length ? reportableRequests.map((request) => {
              const rule = findCommissionRule(request, commissionRules);
              return (
              <tr key={request.id} className="border-t border-champagne-700/30">
                <td className="p-3">
                  <input
                    type="date"
                    value={rows[request.id]?.reportDate ?? request.requested_date}
                    onChange={(event) => updateRow(request.id, { reportDate: event.target.value })}
                    className="h-10 w-36 rounded-md border bg-input px-2 text-sm print:border-0 print:bg-transparent print:p-0"
                  />
                </td>
                <td className="p-3">
                  <p className="font-semibold text-champagne-100">{request.clients?.name ?? "Client"}</p>
                  <p className="text-xs text-muted-foreground">{request.clients?.phone ?? ""}</p>
                </td>
                <td className="p-3">{request.clubs?.name ?? "Club"}</td>
                <td className="p-3">{formatEnum(request.request_type)}</td>
                <td className="p-3">{request.guest_count}</td>
                <td className="p-3">{request.promoter?.name ?? request.promoter?.email ?? "Unassigned"}</td>
                <td className="p-3">
                  <form id={`table-cost-${request.id}`} action={updateRequestTableCost}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input
                      name="tableCost"
                      type="text"
                      inputMode="decimal"
                      value={rows[request.id]?.tableCost ?? ""}
                      onChange={(event) => updateRow(request.id, { tableCost: event.target.value })}
                      placeholder="0"
                      className="h-10 w-28 rounded-md border bg-input px-2 text-sm print:border-0 print:bg-transparent print:p-0"
                    />
                  </form>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{rule ? `${Number(rule.rate_percent).toFixed(1)}% + ${formatCurrency(rule.flat_fee_cents / 100)}` : `${commissionRate}%`}</td>
                <td className="p-3 print:hidden">
                  <Button type="submit" form={`table-cost-${request.id}`} size="sm" variant="secondary">
                    Save
                  </Button>
                </td>
              </tr>
              );
            }) : (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={9}>No confirmed bookings in this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-champagne-700/40 bg-ink-950/60 p-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="size-4 text-champagne-300" />
          Salary report total
        </span>
        <span className="text-right">
          <span className="block text-xs text-muted-foreground">Table cost {formatCurrency(totalCost)}</span>
          <span className="block text-2xl font-semibold text-champagne-100">{formatCurrency(commission)}</span>
        </span>
      </div>
    </LuxuryCard>
  );
}

function ReportMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-semibold text-champagne-100">{value}</p>
    </div>
  );
}

function extractMoneyValue(value?: string | null) {
  if (!value) return "";
  const match = value.replace(",", ".").match(/\d+(?:\.\d{1,2})?/);
  return match?.[0] ?? "";
}

function parseMoney(value?: string) {
  if (!value) return 0;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
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

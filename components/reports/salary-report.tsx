"use client";

import { useMemo, useState } from "react";
import { Calculator, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { updateRequestTableCost } from "@/lib/actions/management-actions";
import type { ConciergeRequest } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

type SalaryRow = {
  reportDate: string;
  tableCost: string;
};

export function SalaryReport({
  requests,
  from,
  to
}: Readonly<{ requests: ConciergeRequest[]; from?: string; to?: string }>) {
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

  const totalGuests = reportableRequests.reduce((total, request) => total + request.guest_count, 0);
  const totalCost = reportableRequests.reduce((total, request) => total + parseMoney(rows[request.id]?.tableCost), 0);
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
          <h2 className="mt-1 font-serif text-2xl">Printable table-cost sheet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the date filters above, adjust dates or table costs, then print or save as PDF.</p>
        </div>
        <Button type="button" variant="secondary" className="print:hidden" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print report
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ReportMetric label="Period" value={rangeLabel} />
        <ReportMetric label="Guests" value={String(totalGuests)} />
        <ReportMetric label="Table cost" value={formatCurrency(totalCost)} />
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
              <th className="p-3 print:hidden">Save</th>
            </tr>
          </thead>
          <tbody>
            {reportableRequests.length ? reportableRequests.map((request) => (
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
                <td className="p-3 print:hidden">
                  <Button type="submit" form={`table-cost-${request.id}`} size="sm" variant="secondary">
                    Save
                  </Button>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={8}>No confirmed bookings in this period.</td>
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
        <span className="font-serif text-2xl text-champagne-100">{formatCurrency(totalCost)}</span>
      </div>
    </LuxuryCard>
  );
}

function ReportMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-champagne-700/30 bg-ink-950/50 p-3">
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

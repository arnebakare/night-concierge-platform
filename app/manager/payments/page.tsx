import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getPaymentsForProfile } from "@/lib/data/app";
import type { RequestPayment } from "@/lib/types";

export default async function ManagerPaymentsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const payments = await getPaymentsForProfile(profile);
  const pending = payments.filter((payment) => payment.status === "PENDING");
  const paid = payments.filter((payment) => payment.status === "PAID");
  const failed = payments.filter((payment) => payment.status === "FAILED" || payment.status === "CANCELLED");
  const paidTotal = paid.reduce((sum, payment) => sum + payment.amount_cents, 0);

  return (
    <AppShell profile={profile} title="Payments" eyebrow="Deposits">
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Pending" value={String(pending.length)} />
        <Metric label="Paid" value={String(paid.length)} />
        <Metric label="Failed" value={String(failed.length)} />
        <Metric label="Received" value={formatMoney(paidTotal, "eur")} />
      </div>

      <LuxuryCard className="bg-white text-slate-950">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Deposit ledger</p>
            <h2 className="mt-1 text-lg font-semibold">Latest payment links</h2>
          </div>
          <CreditCard className="size-5 text-champagne-700" />
        </div>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
          {payments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}
          {!payments.length && <div className="p-6 text-center text-sm text-slate-500">No payment links yet.</div>}
        </div>
      </LuxuryCard>
    </AppShell>
  );
}

function PaymentRow({ payment }: Readonly<{ payment: RequestPayment }>) {
  const request = Array.isArray(payment.requests) ? payment.requests[0] : payment.requests;
  const client = Array.isArray(request?.clients) ? request?.clients[0] : request?.clients;
  const club = Array.isArray(request?.clubs) ? request?.clubs[0] : request?.clubs;
  return (
    <div className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_0.8fr_0.7fr_auto] md:items-center">
      <div className="min-w-0">
        <Link href={`/manager/requests/${payment.request_id}`} className="truncate font-semibold text-slate-950">
          {client?.name ?? payment.description}
        </Link>
        <p className="mt-0.5 truncate text-xs text-slate-500">{club?.name ?? "Venue"} · {request?.requested_date ?? new Date(payment.created_at).toLocaleDateString()}</p>
      </div>
      <div>
        <p className="font-semibold text-slate-950">{formatMoney(payment.amount_cents, payment.currency)}</p>
        <p className="text-xs text-slate-500">{payment.description}</p>
      </div>
      <Status value={payment.status} />
      <div className="flex gap-2 md:justify-end">
        {payment.checkout_url && payment.status === "PENDING" && (
          <Button asChild size="sm" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200">
            <a href={payment.checkout_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Open</a>
          </Button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-slate-950">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold">{value}</p>
    </div>
  );
}

function Status({ value }: Readonly<{ value: RequestPayment["status"] }>) {
  const classes = value === "PAID" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : value === "PENDING" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700";
  return <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>{value.toLowerCase()}</span>;
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amountCents / 100);
}

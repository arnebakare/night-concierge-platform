import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { createDepositPayment } from "@/lib/actions/management-actions";
import { getStripeConfigStatus } from "@/lib/services/stripe";
import type { ConciergeRequest, RequestPayment } from "@/lib/types";

export function DepositPanel({
  request,
  payments,
  returnTo
}: Readonly<{ request: ConciergeRequest; payments: RequestPayment[]; returnTo?: string }>) {
  const config = getStripeConfigStatus();
  const defaultAmount = extractAmount(request.budget) ?? 500;
  const destination = request.clients?.phone ? whatsAppHref(request.clients.phone) : "";

  return (
    <LuxuryCard className="space-y-4 bg-white text-slate-950">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Deposits</p>
          <h3 className="mt-1 text-lg font-semibold">Secure the booking</h3>
          <p className="mt-1 text-sm text-slate-600">Create a Stripe checkout link for a table deposit or prepayment.</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          <ShieldCheck className="size-3.5" />
          {config.ready ? `Stripe ${config.mode}` : "Not connected"}
        </span>
      </div>

      {!config.ready && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {config.issue} Add it in Vercel, redeploy, then this form will create live checkout links.
        </div>
      )}

      <form action={createDepositPayment} className="grid gap-3 md:grid-cols-[0.7fr_0.7fr_1fr_auto] md:items-end">
        <input type="hidden" name="requestId" value={request.id} />
        <input type="hidden" name="clientId" value={request.client_id} />
        <input type="hidden" name="returnTo" value={returnTo ?? `/manager/requests/${request.id}`} />
        <div className="space-y-1.5">
          <Label className="text-slate-700">Amount</Label>
          <Input name="amount" type="number" min={5} step="1" defaultValue={defaultAmount} className="bg-white text-slate-950" disabled={!config.ready} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700">Currency</Label>
          <Input name="currency" defaultValue="eur" maxLength={3} className="uppercase bg-white text-slate-950" disabled={!config.ready} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700">Description</Label>
          <Input name="description" defaultValue={`${request.clubs?.name ?? "Booking"} deposit`} className="bg-white text-slate-950" disabled={!config.ready} />
        </div>
        <Button type="submit" disabled={!config.ready} className="bg-slate-950 text-white hover:bg-slate-800">
          <CreditCard className="size-4" /> Create link
        </Button>
      </form>

      {!!payments.length && (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
          {payments.map((payment) => (
            <div key={payment.id} className="grid gap-2 bg-white p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{payment.description}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatMoney(payment.amount_cents, payment.currency)} · {payment.status.toLowerCase()} · {new Date(payment.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {payment.checkout_url && payment.status === "PENDING" && (
                  <Button asChild size="sm" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200">
                    <a href={payment.checkout_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" /> Open
                    </a>
                  </Button>
                )}
                {payment.checkout_url && destination && payment.status === "PENDING" && (
                  <Button asChild size="sm" className="bg-slate-950 text-white hover:bg-slate-800">
                    <a href={`${destination}?text=${encodeURIComponent(buildDepositMessage(request, payment))}`} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </LuxuryCard>
  );
}

function extractAmount(value?: string | null) {
  if (!value) return null;
  const match = value.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amountCents / 100);
}

function whatsAppHref(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

function buildDepositMessage(request: ConciergeRequest, payment: RequestPayment) {
  const firstName = request.clients?.name?.split(" ")[0] ?? "there";
  return [
    `Hi ${firstName}, here is the secure deposit link for your ${request.clubs?.name ?? "booking"} request:`,
    "",
    payment.checkout_url,
    "",
    "Once it is done, I will keep everything connected to your booking."
  ].join("\n");
}

import { Archive, CalendarDays, Euro, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { CopyMessageButton } from "@/components/request/copy-message-button";
import { OfferComposer } from "@/components/request/offer-composer";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { createAvailabilitySlot, setAvailabilitySlotStatus, updateRequestOfferStatus } from "@/lib/actions/management-actions";
import type { AvailabilitySlot, ConciergeRequest, MessageTemplate, RequestOffer } from "@/lib/types";
import { formatEnum } from "@/lib/utils";
import { buildClientOfferFromTemplate, isTemporaryPhone } from "@/lib/sales/funnel";

export function AvailabilityOfferPanel({
  request,
  slots,
  offers,
  canManageAvailability,
  templates = []
}: Readonly<{ request: ConciergeRequest; slots: AvailabilitySlot[]; offers: RequestOffer[]; canManageAvailability: boolean; templates?: MessageTemplate[] }>) {
  const bestSlot = slots.find((slot) => slot.status === "AVAILABLE") ?? slots.find((slot) => slot.status === "LIMITED") ?? slots[0];
  const destination = visiblePhone(request.clients?.phone) || "";
  const draft = buildOfferDraft(request, bestSlot, destination, templates);

  return (
    <LuxuryCard className="offer-panel space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Availability and offer</p>
          <h3 className="mt-1 text-lg font-semibold">Turn this lead into a clear option</h3>
          <p className="mt-1 text-sm text-muted-foreground">Record what is available, then copy or send a simple WhatsApp offer.</p>
        </div>
        <StatusPill value={bestSlot?.status ?? "WAITLIST"} />
      </div>

      <div className="grid gap-2">
        {slots.length ? slots.map((slot) => (
          <div key={slot.id} className="availability-row rounded-md border border-champagne-700/30 bg-white p-3 text-ink-950 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{slot.title}</p>
                <p className="mt-1 text-xs text-ink-500">{formatEnum(slot.service_type)} · {slot.area || request.clubs?.name || "Venue"}</p>
              </div>
              <StatusPill value={slot.status} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-ink-500">
              <MiniFact icon={CalendarDays} label="Date" value={slot.slot_date} />
              <MiniFact icon={Users} label="Capacity" value={slot.capacity ? String(slot.capacity) : "TBC"} />
              <MiniFact icon={Euro} label="Spend" value={slot.min_spend || "TBC"} />
            </div>
            {slot.notes && <p className="mt-2 text-xs leading-5 text-ink-500">{slot.notes}</p>}
            {canManageAvailability && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <QuickSlotStatus slotId={slot.id} requestId={request.id} status="AVAILABLE" active={slot.status === "AVAILABLE"} />
                <QuickSlotStatus slotId={slot.id} requestId={request.id} status="LIMITED" active={slot.status === "LIMITED"} />
                <QuickSlotStatus slotId={slot.id} requestId={request.id} status="SOLD_OUT" active={slot.status === "SOLD_OUT"} />
                <form action={setAvailabilitySlotStatus}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="active" value="false" />
                  <Button type="submit" size="sm" variant="secondary" className="h-8 min-h-8 px-2.5 text-xs">
                    <Archive className="size-3.5" /> Archive
                  </Button>
                </form>
              </div>
            )}
          </div>
        )) : (
          <div className="rounded-md border border-dashed border-champagne-700/40 bg-secondary/40 p-3 text-sm text-muted-foreground">
            No availability recorded yet. Add the option you hear back from the venue.
          </div>
        )}
      </div>

      {canManageAvailability && (
        <details className="rounded-md border border-champagne-700/30 bg-secondary/40 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-champagne-100">Add availability</summary>
          <form action={createAvailabilitySlot} className="mt-3 grid gap-2 md:grid-cols-2">
            <input type="hidden" name="requestId" value={request.id} />
            <input type="hidden" name="clubId" value={request.club_id} />
            <input type="hidden" name="serviceType" value={request.request_type} />
            <Field label="Date"><Input name="slotDate" type="date" defaultValue={request.requested_date} required /></Field>
            <Field label="Option"><Input name="title" defaultValue={draft.serviceLabel} placeholder="Main room table" required /></Field>
            <Field label="Area"><Input name="area" defaultValue={request.clubs?.name ?? ""} placeholder="Main room, terrace..." /></Field>
            <Field label="Minimum spend"><Input name="minSpend" defaultValue={request.budget ?? ""} placeholder="From 1k" /></Field>
            <Field label="Capacity"><Input name="capacity" type="number" min={1} defaultValue={request.guest_count} /></Field>
            <Field label="Status">
              <select name="status" defaultValue="AVAILABLE" className="h-10 w-full rounded-md border bg-input px-3 text-sm">
                <option value="AVAILABLE">Available</option>
                <option value="LIMITED">Limited</option>
                <option value="WAITLIST">Waitlist</option>
                <option value="SOLD_OUT">Sold out</option>
              </select>
            </Field>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Internal note</Label>
              <Textarea name="notes" placeholder="Who confirmed it, deadline, backup condition..." className="min-h-20" />
            </div>
            <Button type="submit" className="md:col-span-2">Save availability</Button>
          </form>
        </details>
      )}

      <details open className="rounded-md border border-champagne-700/30 bg-secondary/40 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-champagne-100">Create offer message</summary>
        <OfferComposer draft={draft} />
      </details>

      {!!offers.length && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Offer history</p>
          {offers.map((offer) => (
            <div key={offer.id} className="rounded-md border border-champagne-700/30 bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{offer.service_label}</p>
                  <p className="text-xs text-muted-foreground">{offer.offer_date} · {offer.min_spend || "Spend TBC"} · {offer.profiles?.name ?? "Team"}</p>
                </div>
                <StatusPill value={offer.offer_status} />
              </div>
              <p className="mt-2 whitespace-pre-line rounded-md bg-secondary/70 p-2 text-xs leading-5 text-muted-foreground">{offer.message}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyMessageButton text={offer.message} label="Copy" />
                {(["SENT", "ACCEPTED", "DECLINED", "EXPIRED"] as const).map((status) => (
                  <form key={status} action={updateRequestOfferStatus}>
                    <input type="hidden" name="offerId" value={offer.id} />
                    <input type="hidden" name="requestId" value={request.id} />
                    <StatusSubmitButton value={status} label={statusLabel(status)} pendingLabel="Saving" variant="secondary" size="sm" />
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </LuxuryCard>
  );
}

function buildOfferDraft(request: ConciergeRequest, slot?: AvailabilitySlot, destination = "", templates: MessageTemplate[] = []) {
  const clientName = request.clients?.name?.split(" ")[0] ?? "";
  const venueName = request.clubs?.name ?? slot?.clubs?.name ?? "the venue";
  const serviceLabel = slot?.title ?? request.message?.match(/^Selected service:\s*(.+)$/m)?.[1] ?? formatEnum(request.request_type);
  const offerDate = slot?.slot_date ?? request.requested_date;
  const arrivalTime = request.arrival_time ?? "";
  const guestCount = request.guest_count;
  const minSpend = slot?.min_spend ?? request.budget ?? "";
  const templateMessage = buildClientOfferFromTemplate(request, { serviceLabel, venueName, offerDate, arrivalTime, minSpend }, templates);
  const message = templateMessage || [
    `Hi ${clientName || "there"}, I checked ${venueName} for ${formatDate(offerDate)}.`,
    "",
    `They can do ${serviceLabel.toLowerCase()} for ${guestCount} guests${arrivalTime ? ` around ${arrivalTime}` : ""}${minSpend ? ` with ${minSpend}` : ""}.`,
    "",
    "Would you like me to try to hold it for you?"
  ].join("\n");

  return { requestId: request.id, availabilitySlotId: slot?.id ?? "", venueName, serviceLabel, offerDate, arrivalTime, guestCount, minSpend, destination, message };
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function MiniFact({ icon: Icon, label, value }: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return (
    <div className="min-w-0 rounded-md bg-background/45 p-2">
      <p className="flex items-center gap-1 text-[11px]"><Icon className="size-3 text-champagne-700" />{label}</p>
      <p className="mt-1 truncate font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StatusPill({ value }: Readonly<{ value: string }>) {
  return <span className="w-fit rounded-full border border-champagne-700/40 px-2 py-1 text-[11px] font-semibold text-champagne-100">{statusLabel(value)}</span>;
}

function QuickSlotStatus({ slotId, requestId, status, active }: Readonly<{ slotId: string; requestId: string; status: AvailabilitySlot["status"]; active: boolean }>) {
  return (
    <form action={setAvailabilitySlotStatus}>
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="active" value="true" />
      <Button type="submit" name="status" value={status} size="sm" variant={active ? "default" : "secondary"} className="h-8 min-h-8 px-2.5 text-xs">
        {status === "SOLD_OUT" ? "Sold" : status.toLowerCase()}
      </Button>
    </form>
  );
}

function statusLabel(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function visiblePhone(phone?: string | null) {
  return isTemporaryPhone(phone) ? "" : phone ?? "";
}

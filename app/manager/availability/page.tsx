import Link from "next/link";
import { CalendarDays, ChevronDown, Euro, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { createAvailabilitySlot, setAvailabilitySlotStatus, updateAvailabilitySlot } from "@/lib/actions/management-actions";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getAvailabilitySlotsForProfile } from "@/lib/data/app";
import type { AvailabilitySlot, RequestType } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const requestTypes: RequestType[] = ["TABLE", "GUESTLIST", "VIP_SERVICE", "GENERAL"];

export default async function ManagerAvailabilityPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ date?: string; club?: string }> }>) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const today = localDate();
  const [clubs, slots] = await Promise.all([
    getActiveClubsForApp(),
    getAvailabilitySlotsForProfile(profile, { date: filters.date || today, clubId: filters.club || undefined })
  ]);
  const activeDate = filters.date || today;
  const counts = countSlots(slots);

  return (
    <AppShell profile={profile} title="Availability" eyebrow="Manager">
      <div className="space-y-4">
        <LuxuryCard className="ops-summary overflow-hidden bg-white text-ink-950">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Tonight board</p>
              <h2 className="text-lg font-semibold">What can we offer?</h2>
              <p className="mt-1 text-sm text-slate-500">A fast list of tables, guestlist options, and backups your team can send.</p>
            </div>
            <Button asChild variant="secondary"><Link href="/manager/requests">Open inbox</Link></Button>
          </div>
          <div className="grid grid-cols-4 gap-2 py-3 text-center text-xs">
            <Metric label="Available" value={counts.available} />
            <Metric label="Limited" value={counts.limited} />
            <Metric label="Waitlist" value={counts.waitlist} />
            <Metric label="Sold out" value={counts.soldOut} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <QuickDate href={availabilityHref(localDate())} active={activeDate === localDate()} label="Today" />
            <QuickDate href={availabilityHref(localDate(1))} active={activeDate === localDate(1)} label="Tomorrow" />
            <QuickDate href={availabilityHref(nextWeekendDate())} active={activeDate === nextWeekendDate()} label="Weekend" />
          </div>
          <form action="/manager/availability" className="grid gap-2 border-t border-slate-200 p-3 md:grid-cols-[1fr_1fr_auto]">
            <Input name="date" type="date" defaultValue={activeDate} />
            <select name="club" defaultValue={filters.club ?? ""} className="h-10 rounded-md border bg-input px-3 text-sm">
              <option value="">All venues</option>
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
            <Button type="submit">Filter</Button>
          </form>
        </LuxuryCard>

        <LuxuryCard className="bg-white text-ink-950">
          <details>
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-semibold">
              Add available option
              <Plus className="size-4 text-champagne-700" />
            </summary>
            <form action={createAvailabilitySlot} className="mt-3 grid gap-2 md:grid-cols-2">
              <input type="hidden" name="requestId" value="" />
              <Field label="Venue">
                <select name="clubId" defaultValue={filters.club ?? clubs[0]?.id ?? ""} className="h-10 w-full rounded-md border bg-white px-3 text-sm" required>
                  {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                </select>
              </Field>
              <Field label="Date"><Input name="slotDate" type="date" defaultValue={filters.date || today} required /></Field>
              <Field label="Type">
                <select name="serviceType" defaultValue="TABLE" className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                  {requestTypes.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
                </select>
              </Field>
              <Field label="Option"><Input name="title" placeholder="Main room table" required /></Field>
              <Field label="Area"><Input name="area" placeholder="Terrace, main room..." /></Field>
              <Field label="Minimum spend"><Input name="minSpend" placeholder="From 1k" /></Field>
              <Field label="Capacity"><Input name="capacity" type="number" min={1} placeholder="6" /></Field>
              <Field label="Status">
                <select name="status" defaultValue="AVAILABLE" className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                  <option value="AVAILABLE">Available</option>
                  <option value="LIMITED">Limited</option>
                  <option value="WAITLIST">Waitlist</option>
                  <option value="SOLD_OUT">Sold out</option>
                </select>
              </Field>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Internal note</Label>
                <Textarea name="notes" placeholder="Deadline, who confirmed, conditions..." className="min-h-20" />
              </div>
              <StatusSubmitButton label="Save option" pendingLabel="Saving" className="md:col-span-2" />
            </form>
          </details>
        </LuxuryCard>

        <div className="compact-list grid gap-2">
          {slots.length ? slots.map((slot) => <AvailabilityRow key={slot.id} slot={slot} clubs={clubs} />) : <EmptyState />}
        </div>
      </div>
    </AppShell>
  );
}

function AvailabilityRow({ slot, clubs }: Readonly<{ slot: AvailabilitySlot; clubs: Awaited<ReturnType<typeof getActiveClubsForApp>> }>) {
  return (
    <LuxuryCard className="client-row bg-white p-3 text-ink-950 md:p-3">
      <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold md:text-base">{slot.clubs?.name ?? "Venue"} · {slot.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{formatEnum(slot.service_type)} · {slot.area || "Area TBC"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={statusClass(slot.status)}>{slot.status.toLowerCase().replaceAll("_", " ")}</span>
          <QuickSlotStatus slotId={slot.id} status="AVAILABLE" active={slot.status === "AVAILABLE"} />
          <QuickSlotStatus slotId={slot.id} status="LIMITED" active={slot.status === "LIMITED"} />
          <QuickSlotStatus slotId={slot.id} status="SOLD_OUT" active={slot.status === "SOLD_OUT"} />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
        <MiniFact icon={CalendarDays} label="Date" value={slot.slot_date} />
        <MiniFact icon={Users} label="Capacity" value={slot.capacity ? String(slot.capacity) : "TBC"} />
        <MiniFact icon={Euro} label="Spend" value={slot.min_spend || "TBC"} />
      </div>
      {slot.notes && <p className="mt-2 text-xs leading-5 text-slate-500">{slot.notes}</p>}
      <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-xs font-semibold text-slate-700">
          Edit option
          <ChevronDown className="size-4 text-slate-400" />
        </summary>
        <form action={updateAvailabilitySlot} className="mt-2 grid gap-2 md:grid-cols-2">
          <input type="hidden" name="slotId" value={slot.id} />
          <input type="hidden" name="requestId" value="" />
          <Field label="Venue">
            <select name="clubId" defaultValue={slot.club_id} className="h-10 w-full rounded-md border bg-white px-3 text-sm" required>
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </Field>
          <Field label="Date"><Input name="slotDate" type="date" defaultValue={slot.slot_date} required /></Field>
          <Field label="Type">
            <select name="serviceType" defaultValue={slot.service_type} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
              {requestTypes.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
            </select>
          </Field>
          <Field label="Option"><Input name="title" defaultValue={slot.title} required /></Field>
          <Field label="Area"><Input name="area" defaultValue={slot.area ?? ""} /></Field>
          <Field label="Minimum spend"><Input name="minSpend" defaultValue={slot.min_spend ?? ""} /></Field>
          <Field label="Capacity"><Input name="capacity" type="number" min={1} defaultValue={slot.capacity ?? ""} /></Field>
          <Field label="Status">
            <select name="status" defaultValue={slot.status} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
              <option value="AVAILABLE">Available</option>
              <option value="LIMITED">Limited</option>
              <option value="WAITLIST">Waitlist</option>
              <option value="SOLD_OUT">Sold out</option>
            </select>
          </Field>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Internal note</Label>
            <Textarea name="notes" defaultValue={slot.notes ?? ""} className="min-h-20" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:col-span-2">
            <StatusSubmitButton label="Save" pendingLabel="Saving" size="sm" name="active" value="true" />
            <StatusSubmitButton label="Archive" pendingLabel="Saving" size="sm" variant="secondary" name="active" value="false" />
          </div>
        </form>
      </details>
    </LuxuryCard>
  );
}

function QuickSlotStatus({ slotId, status, active }: Readonly<{ slotId: string; status: AvailabilitySlot["status"]; active: boolean }>) {
  return (
    <form action={setAvailabilitySlotStatus}>
      <input type="hidden" name="slotId" value={slotId} />
      <input type="hidden" name="active" value="true" />
      <StatusSubmitButton label={status === "SOLD_OUT" ? "Sold" : status.toLowerCase()} pendingLabel="..." value={status} size="sm" variant={active ? "default" : "secondary"} className="h-7 min-h-7 px-2 text-[11px]">
      </StatusSubmitButton>
    </form>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function MiniFact({ icon: Icon, label, value }: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return <div className="rounded-md bg-slate-50 p-2"><p className="flex items-center gap-1 text-[11px]"><Icon className="size-3 text-champagne-700" />{label}</p><p className="mt-1 truncate font-semibold text-ink-950">{value}</p></div>;
}

function EmptyState() {
  return <LuxuryCard className="bg-white text-center text-sm text-slate-500">No availability saved for this date yet.</LuxuryCard>;
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-3">
      <p className="text-lg font-semibold text-ink-950">{value}</p>
      <p className="truncate text-slate-500">{label}</p>
    </div>
  );
}

function QuickDate({ href, label, active }: Readonly<{ href: string; label: string; active: boolean }>) {
  return (
    <Button asChild variant={active ? "default" : "secondary"} size="sm" className="shrink-0">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function countSlots(slots: AvailabilitySlot[]) {
  return {
    available: slots.filter((slot) => slot.status === "AVAILABLE").length,
    limited: slots.filter((slot) => slot.status === "LIMITED").length,
    waitlist: slots.filter((slot) => slot.status === "WAITLIST").length,
    soldOut: slots.filter((slot) => slot.status === "SOLD_OUT").length
  };
}

function statusClass(status: AvailabilitySlot["status"]) {
  const base = "w-fit rounded-full px-2 py-1 text-[11px] font-semibold capitalize";
  if (status === "AVAILABLE") return `${base} bg-emerald-50 text-emerald-700`;
  if (status === "LIMITED") return `${base} bg-amber-50 text-amber-700`;
  if (status === "WAITLIST") return `${base} bg-slate-100 text-slate-600`;
  return `${base} bg-rose-50 text-rose-700`;
}

function availabilityHref(date: string) {
  return `/manager/availability?date=${date}`;
}

function nextWeekendDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilFriday);
  return date.toISOString().slice(0, 10);
}

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

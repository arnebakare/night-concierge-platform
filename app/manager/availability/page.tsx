import Link from "next/link";
import { CalendarDays, Euro, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { createAvailabilitySlot } from "@/lib/actions/management-actions";
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

  return (
    <AppShell profile={profile} title="Availability" eyebrow="Manager">
      <div className="space-y-4">
        <LuxuryCard className="ops-summary overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Tonight board</p>
              <h2 className="text-lg font-semibold">What can we offer?</h2>
            </div>
            <Button asChild variant="secondary"><Link href="/manager/requests">Open inbox</Link></Button>
          </div>
          <form action="/manager/availability" className="grid gap-2 p-3 md:grid-cols-[1fr_1fr_auto]">
            <Input name="date" type="date" defaultValue={filters.date || today} />
            <select name="club" defaultValue={filters.club ?? ""} className="h-10 rounded-md border bg-input px-3 text-sm">
              <option value="">All venues</option>
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
            <Button type="submit">Filter</Button>
          </form>
        </LuxuryCard>

        <LuxuryCard>
          <details>
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-semibold">
              Add available option
              <Plus className="size-4 text-champagne-300" />
            </summary>
            <form action={createAvailabilitySlot} className="mt-3 grid gap-2 md:grid-cols-2">
              <input type="hidden" name="requestId" value="" />
              <Field label="Venue">
                <select name="clubId" defaultValue={filters.club ?? clubs[0]?.id ?? ""} className="h-10 w-full rounded-md border bg-input px-3 text-sm" required>
                  {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                </select>
              </Field>
              <Field label="Date"><Input name="slotDate" type="date" defaultValue={filters.date || today} required /></Field>
              <Field label="Type">
                <select name="serviceType" defaultValue="TABLE" className="h-10 w-full rounded-md border bg-input px-3 text-sm">
                  {requestTypes.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
                </select>
              </Field>
              <Field label="Option"><Input name="title" placeholder="Main room table" required /></Field>
              <Field label="Area"><Input name="area" placeholder="Terrace, main room..." /></Field>
              <Field label="Minimum spend"><Input name="minSpend" placeholder="From 1k" /></Field>
              <Field label="Capacity"><Input name="capacity" type="number" min={1} placeholder="6" /></Field>
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
                <Textarea name="notes" placeholder="Deadline, who confirmed, conditions..." className="min-h-20" />
              </div>
              <Button type="submit" className="md:col-span-2">Save option</Button>
            </form>
          </details>
        </LuxuryCard>

        <div className="compact-list grid gap-2">
          {slots.length ? slots.map((slot) => <AvailabilityRow key={slot.id} slot={slot} />) : <EmptyState />}
        </div>
      </div>
    </AppShell>
  );
}

function AvailabilityRow({ slot }: Readonly<{ slot: AvailabilitySlot }>) {
  return (
    <LuxuryCard className="client-row">
      <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold md:text-base">{slot.clubs?.name ?? "Venue"} · {slot.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatEnum(slot.service_type)} · {slot.area || "Area TBC"}</p>
        </div>
        <span className="w-fit rounded-full border border-champagne-700/40 px-2 py-1 text-[11px] font-semibold text-champagne-100">{slot.status.toLowerCase().replaceAll("_", " ")}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <MiniFact icon={CalendarDays} label="Date" value={slot.slot_date} />
        <MiniFact icon={Users} label="Capacity" value={slot.capacity ? String(slot.capacity) : "TBC"} />
        <MiniFact icon={Euro} label="Spend" value={slot.min_spend || "TBC"} />
      </div>
      {slot.notes && <p className="mt-2 text-xs leading-5 text-muted-foreground">{slot.notes}</p>}
    </LuxuryCard>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function MiniFact({ icon: Icon, label, value }: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return <div className="rounded-md bg-secondary/70 p-2"><p className="flex items-center gap-1 text-[11px]"><Icon className="size-3 text-champagne-300" />{label}</p><p className="mt-1 truncate font-semibold text-foreground">{value}</p></div>;
}

function EmptyState() {
  return <LuxuryCard className="text-center text-sm text-muted-foreground">No availability saved for this date yet.</LuxuryCard>;
}

function localDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

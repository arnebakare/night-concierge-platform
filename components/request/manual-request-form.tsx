"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createManualRequest } from "@/lib/actions/request-actions";
import { manualRequestSchema, type ManualRequestInput } from "@/lib/validation/request";
import type { Client, Club } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const requestTypes = ["GUESTLIST", "TABLE", "VIP_SERVICE", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE", "GENERAL"] as const;

export function ManualRequestForm({ clubs, clients }: Readonly<{ clubs: Club[]; clients: Client[] }>) {
  const [pending, startTransition] = useTransition();
  const [clientQuery, setClientQuery] = useState("");
  const form = useForm<ManualRequestInput>({
    resolver: zodResolver(manualRequestSchema),
    defaultValues: {
      clubId: clubs[0]?.id ?? "",
      requestType: "GUESTLIST",
      requestedDate: new Date().toISOString().slice(0, 10),
      guestCount: 2,
      name: "",
      phone: "",
      email: "",
      instagram: "",
      arrivalTime: "",
      budget: "",
      message: "",
      internalNote: ""
    }
  });
  const matchingClients = useMemo(() => clients.filter((client) => `${client.name} ${client.phone} ${client.client_code ?? ""} ${client.instagram ?? ""}`.toLowerCase().includes(clientQuery.toLowerCase())).slice(0, 8), [clients, clientQuery]);
  const values = form.watch();

  function chooseClient(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    form.setValue("clientId", clientId);
    if (client) { form.setValue("name", client.name); form.setValue("phone", client.phone); form.setValue("email", client.email ?? ""); form.setValue("instagram", client.instagram ?? ""); }
  }

  function submit(values: ManualRequestInput) {
    startTransition(async () => {
      const result = await createManualRequest(values);
      if (result && !result.ok) form.setError("root", { message: result.message ?? "Request could not be created." });
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">1. Client</p>
        <p className="text-sm text-muted-foreground">WhatsApp number is the customer code. Same phone means same portfolio, even if the name changes.</p>
        <Input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Search phone, SKU, name, Instagram" />
        {clientQuery && <div className="grid gap-2">{matchingClients.map((client) => <button key={client.id} type="button" onClick={() => chooseClient(client.id)} className="min-h-12 rounded-md border border-champagne-700/40 bg-secondary px-3 text-left text-sm"><span className="font-semibold">{client.name}</span><span className="ml-2 text-muted-foreground">{client.phone}</span></button>)}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="Name" />
          </Field>
          <Field label="WhatsApp number" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="+34..." />
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">2. Booking</p>
        <div className="grid grid-cols-4 gap-2">
          {requestTypes.map((type) => (
            <QuickPick key={type} active={values.requestType === type} label={shortType(type)} onClick={() => form.setValue("requestType", type, { shouldValidate: true })} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Club">
            <select {...form.register("clubId")} className="h-12 w-full rounded-md border bg-input px-3 text-sm">
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select {...form.register("requestType")} className="h-12 w-full rounded-md border bg-input px-3 text-sm">
              {requestTypes.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <Input {...form.register("requestedDate")} type="date" min={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Guests">
            <Input {...form.register("guestCount")} type="number" min={1} />
          </Field>
          <Field label="Arrival">
            <Input {...form.register("arrivalTime")} placeholder="01:00" />
          </Field>
          <Field label="Budget">
            <Input {...form.register("budget")} placeholder="Optional" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <QuickPick icon={CalendarDays} label="Today" onClick={() => form.setValue("requestedDate", dateString(0), { shouldValidate: true })} />
          <QuickPick icon={CalendarDays} label="Tomorrow" onClick={() => form.setValue("requestedDate", dateString(1), { shouldValidate: true })} />
          <QuickPick icon={CalendarDays} label="Weekend" onClick={() => form.setValue("requestedDate", nextWeekendDate(), { shouldValidate: true })} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["21:00", "23:00", "01:00", "TBC"].map((time) => (
            <QuickPick key={time} icon={Clock} active={values.arrivalTime === time} label={time} onClick={() => form.setValue("arrivalTime", time, { shouldValidate: true })} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[2, 4, 6, 8].map((count) => (
            <QuickPick key={count} icon={Users} active={Number(values.guestCount) === count} label={`${count} guests`} onClick={() => form.setValue("guestCount", count, { shouldValidate: true })} />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <Field label="Message">
          <Textarea {...form.register("message")} placeholder="Client request, preferences, occasion..." />
        </Field>
        <Field label="Internal note">
          <Textarea {...form.register("internalNote")} placeholder="Visible internally only." />
        </Field>
      </section>
      <Button className="w-full" size="lg" type="submit" disabled={pending}>
        {pending ? "Creating" : "Create request"}
      </Button>
      {form.formState.errors.root && <p className="text-sm text-red-200">{form.formState.errors.root.message}</p>}
    </form>
  );
}

function QuickPick({ label, icon: Icon, active, onClick }: Readonly<{ label: string; icon?: typeof CalendarDays; active?: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "flex min-h-10 items-center justify-center gap-1 rounded-md border border-champagne-500 bg-champagne-300/15 px-2 text-xs font-semibold text-champagne-100" : "flex min-h-10 items-center justify-center gap-1 rounded-md border border-champagne-700/35 bg-secondary px-2 text-xs text-muted-foreground"}
    >
      {Icon && <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

function shortType(type: typeof requestTypes[number]) {
  if (type === "GUESTLIST") return "Guestlist";
  if (type === "VIP_SERVICE") return "VIP";
  if (type === "BOAT") return "Boat";
  if (type === "GOLF") return "Golf";
  if (type === "VILLA") return "Villa";
  if (type === "TRANSFER") return "Transfer";
  if (type === "SCHEDULE") return "Schedule";
  if (type === "PACKAGE") return "Package";
  if (type === "GENERAL") return "General";
  return "Table";
}

function dateString(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function nextWeekendDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return date.toISOString().slice(0, 10);
}

function Field({ label, error, children }: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-200">{error}</p>}
    </div>
  );
}

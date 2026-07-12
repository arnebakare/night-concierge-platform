"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createManualRequest } from "@/lib/actions/request-actions";
import { manualRequestSchema, type ManualRequestInput } from "@/lib/validation/request";
import type { Client, Club } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const requestTypes = ["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL"] as const;

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
  const matchingClients = useMemo(() => clients.filter((client) => `${client.name} ${client.phone} ${client.instagram ?? ""}`.toLowerCase().includes(clientQuery.toLowerCase())).slice(0, 8), [clients, clientQuery]);

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
        <Input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Search phone, name, Instagram" />
        {clientQuery && <div className="grid gap-2">{matchingClients.map((client) => <button key={client.id} type="button" onClick={() => chooseClient(client.id)} className="min-h-12 rounded-md border border-champagne-700/40 bg-secondary px-3 text-left text-sm"><span className="font-semibold">{client.name}</span><span className="ml-2 text-muted-foreground">{client.phone}</span></button>)}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="Name" />
          </Field>
          <Field label="WhatsApp" error={form.formState.errors.phone?.message}>
            <Input {...form.register("phone")} placeholder="+34..." />
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">2. Booking</p>
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

function Field({ label, error, children }: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-200">{error}</p>}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { MessageCircle, Send, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Textarea } from "@/components/ui/textarea";
import { CopyMessageButton } from "@/components/request/copy-message-button";
import { createManualRequest } from "@/lib/actions/request-actions";
import { buildAvailabilityMessage, buildClientReply, parseWhatsAppLead, whatsAppHref, type LeadDraft } from "@/lib/sales/funnel";
import type { Client, Club, RequestType } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const requestTypes: RequestType[] = ["TABLE", "GUESTLIST", "VIP_SERVICE", "GENERAL"];

export function LeadAssistant({ clubs, clients }: Readonly<{ clubs: Club[]; clients: Client[] }>) {
  const [pending, startTransition] = useTransition();
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<LeadDraft>(() => parseWhatsAppLead("", clubs));
  const [error, setError] = useState("");
  const selectedClub = clubs.find((club) => club.id === draft.clubId) ?? clubs[0];
  const matchingClients = useMemo(() => {
    const query = `${draft.clientName} ${draft.phone}`.trim().toLowerCase();
    if (!query) return [];
    return clients
      .filter((client) => `${client.name} ${client.phone} ${client.instagram ?? ""}`.toLowerCase().includes(query))
      .slice(0, 4);
  }, [clients, draft.clientName, draft.phone]);
  const salesRequest = {
    request_type: draft.requestType,
    requested_date: draft.requestedDate,
    arrival_time: draft.arrivalTime || null,
    guest_count: draft.guestCount,
    budget: draft.budget || null,
    message: draft.message || raw,
    status: "NEW" as const,
    clients: { name: draft.clientName || "Guest", phone: draft.phone },
    clubs: { name: selectedClub?.name ?? "Venue", city: selectedClub?.city ?? "Marbella" }
  };
  const availabilityMessage = buildAvailabilityMessage(salesRequest);
  const clientReply = buildClientReply(salesRequest, draft.language);

  function readMessage() {
    const next = parseWhatsAppLead(raw, clubs);
    setDraft((current) => ({
      ...next,
      clientName: current.clientName,
      phone: next.phone || current.phone,
      message: raw
    }));
    setError("");
  }

  function chooseClient(client: Client) {
    setDraft((current) => ({
      ...current,
      clientName: client.name,
      phone: client.phone
    }));
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await createManualRequest({
        clubId: draft.clubId,
        requestType: draft.requestType,
        requestedDate: draft.requestedDate,
        guestCount: draft.guestCount,
        name: draft.clientName || "Unknown guest",
        phone: draft.phone || `000${Date.now()}`,
        email: "",
        instagram: "",
        arrivalTime: draft.arrivalTime,
        budget: draft.budget,
        message: draft.message || raw,
        internalNote: raw ? `Original WhatsApp lead:\n${raw}` : ""
      });
      if (result && !result.ok) setError(result.message ?? "Could not create request. Check the fields and try again.");
    });
  }

  return (
    <div className="space-y-4">
      <LuxuryCard className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">Fast intake</p>
          <h2 className="mt-2 font-serif text-3xl">Paste a WhatsApp lead</h2>
          <p className="mt-2 text-sm text-muted-foreground">Turn a client message into a clean request, venue check, and reply.</p>
        </div>
        <Textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="Example: Hi Julia, can we get a table for 6 at Mamzel tomorrow around 23:30? Budget around 1500..."
          className="min-h-36"
        />
        <Button type="button" size="lg" className="w-full" onClick={readMessage}>
          <Wand2 className="size-5" /> Read message
        </Button>
      </LuxuryCard>

      <LuxuryCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">Booking draft</p>
            <h3 className="mt-1 text-xl font-semibold">Check the essentials</h3>
          </div>
          <span className="rounded-md bg-secondary px-3 py-1 text-xs text-muted-foreground">{draft.language.toUpperCase()}</span>
        </div>

        {matchingClients.length > 0 && (
          <div className="grid gap-2">
            {matchingClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => chooseClient(client)}
                className="min-h-11 rounded-md border border-champagne-700/40 bg-secondary px-3 text-left text-sm"
              >
                <span className="font-semibold">{client.name}</span>
                <span className="ml-2 text-muted-foreground">{client.phone}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Client">
            <Input value={draft.clientName} onChange={(event) => setDraftField("clientName", event.target.value, setDraft)} placeholder="Name" />
          </Field>
          <Field label="WhatsApp">
            <Input value={draft.phone} onChange={(event) => setDraftField("phone", event.target.value, setDraft)} placeholder="+34..." />
          </Field>
          <Field label="Venue">
            <select value={draft.clubId} onChange={(event) => setDraftField("clubId", event.target.value, setDraft)} className="h-12 w-full rounded-md border bg-input px-3 text-sm">
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </Field>
          <Field label="Service">
            <select value={draft.requestType} onChange={(event) => setDraftField("requestType", event.target.value as RequestType, setDraft)} className="h-12 w-full rounded-md border bg-input px-3 text-sm">
              {requestTypes.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <Input value={draft.requestedDate} onChange={(event) => setDraftField("requestedDate", event.target.value, setDraft)} type="date" />
          </Field>
          <Field label="Guests">
            <Input value={draft.guestCount} onChange={(event) => setDraftField("guestCount", Number(event.target.value), setDraft)} type="number" min={1} />
          </Field>
          <Field label="Arrival">
            <Input value={draft.arrivalTime} onChange={(event) => setDraftField("arrivalTime", event.target.value, setDraft)} placeholder="23:30" />
          </Field>
          <Field label="Budget">
            <Input value={draft.budget} onChange={(event) => setDraftField("budget", event.target.value, setDraft)} placeholder="Optional" />
          </Field>
        </div>
        <Field label="Client message">
          <Textarea value={draft.message} onChange={(event) => setDraftField("message", event.target.value, setDraft)} />
        </Field>

        <Button type="button" size="lg" className="w-full" onClick={submit} disabled={pending || !draft.clubId}>
          <Send className="size-5" /> {pending ? "Creating" : "Create request"}
        </Button>
        {error && <p className="text-sm text-red-200">{error}</p>}
      </LuxuryCard>

      <div className="grid gap-3 md:grid-cols-2">
        <MessagePreview title="Ask venue" text={availabilityMessage} />
        <LuxuryCard className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="size-4 text-champagne-300" /> Reply client</p>
            <div className="flex gap-2">
              <CopyMessageButton text={clientReply} />
              <Button asChild variant="secondary" size="sm">
                <a href={whatsAppHref(draft.phone, clientReply)} target="_blank" rel="noreferrer">Open</a>
              </Button>
            </div>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{clientReply}</p>
        </LuxuryCard>
      </div>
    </div>
  );
}

function setDraftField<K extends keyof LeadDraft>(
  key: K,
  value: LeadDraft[K],
  setDraft: Dispatch<SetStateAction<LeadDraft>>
) {
  setDraft((current) => ({ ...current, [key]: value }));
}

function MessagePreview({ title, text }: Readonly<{ title: string; text: string }>) {
  return (
    <LuxuryCard className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <CopyMessageButton text={text} />
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{text}</p>
    </LuxuryCard>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

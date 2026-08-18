"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Copy, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createRequestOffer, sendRequestOffer } from "@/lib/actions/management-actions";

export type OfferDraft = {
  requestId: string;
  availabilitySlotId: string;
  venueName: string;
  offerDate: string;
  serviceLabel: string;
  arrivalTime: string;
  guestCount: number;
  minSpend: string;
  destination: string;
  message: string;
};

export function OfferComposer({ draft }: Readonly<{ draft: OfferDraft }>) {
  const [message, setMessage] = useState(draft.message);
  const [copied, setCopied] = useState(false);
  const whatsAppUrl = useMemo(() => buildWhatsAppHref(draft.destination, message), [draft.destination, message]);
  const canOpenWhatsApp = whatsAppUrl !== "#";

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <form className="mt-3 grid gap-3">
      <input type="hidden" name="requestId" value={draft.requestId} />
      <input type="hidden" name="availabilitySlotId" value={draft.availabilitySlotId} />
      <input type="hidden" name="venueName" value={draft.venueName} />
      <input type="hidden" name="offerDate" value={draft.offerDate} />
      <input type="hidden" name="serviceLabel" value={draft.serviceLabel} />
      <input type="hidden" name="arrivalTime" value={draft.arrivalTime} />
      <input type="hidden" name="guestCount" value={draft.guestCount} />
      <input type="hidden" name="minSpend" value={draft.minSpend} />
      <input type="hidden" name="destination" value={draft.destination} />
      <Textarea
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="min-h-40 resize-none leading-relaxed"
      />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <OfferActionButton action={createRequestOffer} icon="save" label="Save" pendingLabel="Saving" variant="secondary" />
        <Button type="button" variant="secondary" onClick={copyMessage}>
          <Copy className="size-4" /> {copied ? "Copied" : "Copy"}
        </Button>
        <Button asChild variant="secondary" aria-disabled={!canOpenWhatsApp}>
          <a href={whatsAppUrl} target="_blank" rel="noreferrer" className={!canOpenWhatsApp ? "pointer-events-none opacity-50" : ""}>
            <ExternalLink className="size-4" /> Open
          </a>
        </Button>
        <OfferActionButton action={sendRequestOffer} icon="send" label="Send" pendingLabel="Sending" />
      </div>
      {!draft.destination && <p className="text-xs text-amber-700">Add the client WhatsApp number before using Send or Open.</p>}
    </form>
  );
}

function OfferActionButton({
  action,
  icon,
  label,
  pendingLabel,
  variant = "default"
}: Readonly<{
  action: (formData: FormData) => void | Promise<void>;
  icon: "save" | "send";
  label: string;
  pendingLabel: string;
  variant?: "default" | "secondary";
}>) {
  const { pending } = useFormStatus();
  const Icon = icon === "save" ? CheckCircle2 : Send;

  return (
    <Button formAction={action} type="submit" variant={variant} disabled={pending}>
      <Icon className="size-4" /> {pending ? pendingLabel : label}
    </Button>
  );
}

function buildWhatsAppHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
